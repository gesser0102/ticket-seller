import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { RegisterPayload, SessionUserDto } from "@ticket-seller/shared";
import { ApiError, apiClient } from "../../lib/apiClient";
import { formatCpf, formatPhone, onlyDigits } from "../../lib/masks";
import { evaluatePasswordStrength, type PasswordStrengthLevel } from "../../lib/passwordStrength";
import { MessageBar } from "../../ui/MessageBar";
import { DateField } from "../../ui/DateField";
import { IconEye, IconEyeOff } from "../../ui/icons";
import { useAuth } from "../auth/AuthContext";

const MIN_PASSWORD_LENGTH = 6;
const BARS_BY_LEVEL: Record<PasswordStrengthLevel, number> = {
  fraca: 1,
  media: 2,
  forte: 3,
  "muito-forte": 4,
};

export function RegistrationForm({ onDone }: { onDone: () => void }) {
  const { completeRegistration } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    cpf: "",
    phone: "",
    birthDate: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setField<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const passwordsMismatch =
    confirmTouched && form.confirmPassword.length > 0 && form.password !== form.confirmPassword;
  const strength = evaluatePasswordStrength(form.password);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setConfirmTouched(true);
    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: RegisterPayload = {
        name: form.name,
        email: form.email,
        password: form.password,
        cpf: onlyDigits(form.cpf),
        phone: onlyDigits(form.phone),
        birthDate: form.birthDate,
      };
      const user = await apiClient.post<SessionUserDto>("/auth/register", payload);
      completeRegistration(user);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir o cadastro.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface checkout-form">
      <h2 style={{ marginBottom: "var(--space-1)" }}>Quase lá</h2>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
        Complete seu cadastro pra continuar pro pagamento. Seus assentos continuam reservados.
      </p>

      <div className="field">
        <label htmlFor="reg-name">Nome completo</label>
        <input
          id="reg-name"
          required
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="field">
        <label htmlFor="reg-email">E-mail</label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="field">
        <label htmlFor="reg-password">Senha</label>
        <div className="password-field-wrap">
          <input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            disabled={busy}
          />
          <button
            type="button"
            className="password-field-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <IconEyeOff width={18} height={18} /> : <IconEye width={18} height={18} />}
          </button>
        </div>
        {form.password ? (
          <div className="password-strength">
            <div className="password-strength-bars">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`password-strength-bar ${i < BARS_BY_LEVEL[strength.level] ? `level-${strength.level}` : ""}`}
                />
              ))}
            </div>
            <span className={`password-strength-label level-${strength.level}`}>{strength.label}</span>
          </div>
        ) : (
          <p className="checkout-hint">Mínimo {MIN_PASSWORD_LENGTH} caracteres.</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="reg-confirm-password">Confirmar senha</label>
        <div className="password-field-wrap">
          <input
            id="reg-confirm-password"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            value={form.confirmPassword}
            onChange={(e) => setField("confirmPassword", e.target.value)}
            onBlur={() => setConfirmTouched(true)}
            disabled={busy}
            aria-invalid={passwordsMismatch}
          />
          <button
            type="button"
            className="password-field-toggle"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
          >
            {showConfirm ? <IconEyeOff width={18} height={18} /> : <IconEye width={18} height={18} />}
          </button>
        </div>
        {passwordsMismatch && <p className="field-error">As senhas não coincidem.</p>}
      </div>

      <div className="checkout-form-row">
        <div className="field">
          <label htmlFor="reg-cpf">CPF</label>
          <input
            id="reg-cpf"
            inputMode="numeric"
            placeholder="000.000.000-00"
            maxLength={14}
            required
            value={form.cpf}
            onChange={(e) => setField("cpf", formatCpf(e.target.value))}
            disabled={busy}
          />
        </div>
        <div className="field">
          <label htmlFor="reg-phone">Celular</label>
          <input
            id="reg-phone"
            inputMode="numeric"
            placeholder="(00) 0 0000-0000"
            maxLength={17}
            required
            value={form.phone}
            onChange={(e) => setField("phone", formatPhone(e.target.value))}
            disabled={busy}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="reg-birth">Data de nascimento</label>
        <DateField
          id="reg-birth"
          value={form.birthDate}
          onChange={(iso) => setField("birthDate", iso)}
          required
          disabled={busy}
        />
      </div>

      {error && <MessageBar tone="danger">{error}</MessageBar>}

      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? "Enviando…" : "Continuar para pagamento"}
      </button>

      <p className="checkout-hint" style={{ textAlign: "center" }}>
        Já possui conta? <Link to="/login">Entrar</Link>
      </p>
    </form>
  );
}
