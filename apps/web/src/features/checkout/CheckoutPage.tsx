import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type {
  OrderDto,
  PaymentResultDto,
  ScreeningDetailDto,
  SeatDto,
  SessionUserDto,
} from "@ticket-seller/shared";
import { ApiError, apiClient } from "../../lib/apiClient";
import { formatCents, formatCountdown, formatDateTime } from "../../lib/format";
import { Spinner } from "../../ui/Spinner";
import { MessageBar } from "../../ui/MessageBar";
import { IconClock, IconCreditCard, IconInstantTransfer } from "../../ui/icons";
import { RegistrationForm } from "./RegistrationForm";
import "./checkout.css";

type PaymentMethod = "pix" | "card";

const MAGIC_DECLINE_CARD = "4000 0000 0000 0002";

export function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [screening, setScreening] = useState<ScreeningDetailDto | null>(null);
  const [seats, setSeats] = useState<SeatDto[] | null>(null);
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [cardNumber, setCardNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PaymentResultDto | null>(null);
  const [paying, setPaying] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!orderId) return;
    apiClient.get<OrderDto>(`/orders/${orderId}`).then(async (fetchedOrder) => {
      setOrder(fetchedOrder);
      const [screeningData, seatsData] = await Promise.all([
        apiClient.get<ScreeningDetailDto>(`/screenings/${fetchedOrder.screeningId}`),
        apiClient.get<SeatDto[]>(`/screenings/${fetchedOrder.screeningId}/seats`),
      ]);
      setScreening(screeningData);
      setSeats(seatsData.filter((s) => s.heldByMe));
    });
    apiClient.get<SessionUserDto>("/auth/me").then((user) => setRegistered(user.registered));
  }, [orderId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const msRemaining = useMemo(() => {
    if (!order?.holdExpires) return null;
    return new Date(order.holdExpires).getTime() - now;
  }, [order, now]);

  const expired = msRemaining !== null && msRemaining <= 0;

  async function handlePay(event: FormEvent) {
    event.preventDefault();
    if (!orderId) return;
    setPaying(true);
    setError(null);
    try {
      const paymentResult = await apiClient.post<PaymentResultDto>(`/orders/${orderId}/pay`, {
        paymentMethod: method,
        cardNumber: method === "card" ? cardNumber.replace(/\s/g, "") || undefined : undefined,
      });
      setResult(paymentResult);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível processar o pagamento.");
    } finally {
      setPaying(false);
    }
  }

  if (!order || registered === null) return <Spinner label="Carregando reserva…" />;

  if (result) {
    return (
      <div className="container checkout-result">
        {result.status === "approved" ? (
          <>
            <div className="badge badge-success">Pagamento aprovado</div>
            <h1 style={{ marginTop: "var(--space-3)" }}>Ingressos emitidos!</h1>
            <p style={{ color: "var(--color-text-muted)", marginTop: "var(--space-2)" }}>
              {result.tickets?.length} ingresso{result.tickets?.length === 1 ? "" : "s"} adicionado
              {result.tickets?.length === 1 ? "" : "s"} a "Meus ingressos", com QR pronto pra entrada.
            </p>
            <Link to="/tickets" className="btn btn-primary" style={{ marginTop: "var(--space-5)" }}>
              Ver meus ingressos
            </Link>
          </>
        ) : (
          <>
            <div className="badge badge-danger">Pagamento recusado</div>
            <h1 style={{ marginTop: "var(--space-3)" }}>Não foi dessa vez</h1>
            <p style={{ color: "var(--color-text-muted)", marginTop: "var(--space-2)" }}>
              Os assentos foram liberados automaticamente. Escolha novamente quando quiser tentar de novo.
            </p>
            <Link
              to={`/sessoes/${order.screeningId}/assentos`}
              className="btn btn-primary"
              style={{ marginTop: "var(--space-5)" }}
            >
              Voltar ao mapa de assentos
            </Link>
          </>
        )}
      </div>
    );
  }

  if (!registered) {
    return (
      <div className="container checkout-page">
        <RegistrationForm onDone={() => setRegistered(true)} />
      </div>
    );
  }

  if (!screening || !seats) return <Spinner label="Carregando reserva…" />;

  return (
    <div className="container checkout-payment-page">
      <h1>Pagamento</h1>

      {!expired ? (
        <div className="checkout-countdown">
          <IconClock width={18} height={18} />
          <span>
            Tempo para pagar: <span className="mono">{msRemaining !== null ? formatCountdown(msRemaining) : "—"}</span>
          </span>
        </div>
      ) : (
        <MessageBar tone="danger">Tempo esgotado. Os assentos foram liberados.</MessageBar>
      )}

      <div className="checkout-payment-grid">
        <div className="checkout-payment-col">
          <form onSubmit={handlePay} className="surface checkout-form">
            <div className="field">
              <label>Método de pagamento</label>
              <div className="payment-method-options">
                <button
                  type="button"
                  className={`payment-method-option ${method === "pix" ? "active" : ""}`}
                  onClick={() => setMethod("pix")}
                  disabled={paying || expired}
                >
                  <IconInstantTransfer width={20} height={20} />
                  Pix
                </button>
                <button
                  type="button"
                  className={`payment-method-option ${method === "card" ? "active" : ""}`}
                  onClick={() => setMethod("card")}
                  disabled={paying || expired}
                >
                  <IconCreditCard width={20} height={20} />
                  Cartão de Crédito
                </button>
              </div>
            </div>

            {method === "card" && (
              <div className="field">
                <label htmlFor="cardNumber">Número do cartão (simulado)</label>
                <input
                  id="cardNumber"
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  disabled={paying || expired}
                />
                <p className="checkout-hint">
                  Deixe em branco ou use qualquer número para <strong>aprovar</strong>. Use{" "}
                  <button
                    type="button"
                    className="checkout-hint-fill"
                    onClick={() => setCardNumber(MAGIC_DECLINE_CARD)}
                    disabled={paying || expired}
                  >
                    {MAGIC_DECLINE_CARD}
                  </button>{" "}
                  para simular <strong>recusa</strong>.
                </p>
              </div>
            )}

            {method === "pix" && (
              <p className="checkout-hint">Pagamento simulado — Pix aprova automaticamente nesta demonstração.</p>
            )}

            {error && <MessageBar tone="danger">{error}</MessageBar>}

            <button type="submit" className="btn btn-primary btn-block" disabled={paying || expired}>
              {paying ? "Processando…" : `Pagar ${formatCents(order.totalCents)}`}
            </button>
          </form>

          {expired && (
            <button className="btn btn-secondary" onClick={() => navigate(`/sessoes/${order.screeningId}/assentos`)}>
              Voltar ao mapa de assentos
            </button>
          )}
        </div>

        <div className="checkout-summary-col">
          <div className="surface checkout-summary-card">
            <h2 className="checkout-summary-title">Resumo da compra</h2>

            <div className="checkout-summary-block">
              <span className="checkout-summary-label">Filme</span>
              <div className="checkout-summary-movie">
                <img src={screening.moviePosterUrl} alt="" />
                <span>{screening.movieTitle}</span>
              </div>
            </div>

            <div className="checkout-summary-block">
              <span className="checkout-summary-label">Sessão</span>
              <p>{screening.venue}</p>
              <p className="mono checkout-summary-date">{formatDateTime(screening.startsAt)}</p>
            </div>

            <div className="checkout-summary-block">
              <span className="checkout-summary-label">Assentos</span>
              <div className="checkout-summary-seats">
                {seats.map((seat) => (
                  <span key={seat.id} className="checkout-summary-seat-badge">
                    {seat.row}
                    {seat.number}
                  </span>
                ))}
              </div>
            </div>

            <div className="checkout-summary-total">
              <span>Total</span>
              <strong>{formatCents(order.totalCents)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
