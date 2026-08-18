import { useEffect, useState, type FormEvent } from "react";
import type { ChangePasswordRequest, UpdateProfileRequest, UserProfileDto } from "@ticket-seller/shared";
import { ApiError, apiClient } from "../../lib/apiClient";
import { formatCpf, formatPhone, onlyDigits } from "../../lib/masks";
import { evaluatePasswordStrength, type PasswordStrengthLevel } from "../../lib/passwordStrength";
import { MessageBar } from "../../ui/MessageBar";
import { Spinner } from "../../ui/Spinner";
import { DateField } from "../../ui/DateField";
import { IconEye, IconEyeOff } from "../../ui/icons";
import { showToast } from "../../ui/toast";
import { useAuth } from "../auth/AuthContext";
import "./account.css";

const MIN_PASSWORD_LENGTH = 6;
const BARS_BY_LEVEL: Record<PasswordStrengthLevel, number> = {
  fraca: 1,
  media: 2,
  forte: 3,
  "muito-forte": 4,
};

interface ProfileFormState {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  birthDate: string;
}

function toFormState(profile: UserProfileDto): ProfileFormState {
  return {
    name: profile.name ?? "",
    email: profile.email ?? "",
    cpf: formatCpf(profile.cpf ?? ""),
    phone: formatPhone(profile.phone ?? ""),
    birthDate: profile.birthDate ?? "",
  };
}

export function AccountPage() {
  const { completeRegistration } = useAuth();
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    apiClient.get<UserProfileDto>("/users/me").then((data) => {
      setProfile(data);
      setForm(toFormState(data));
    });
  }, []);

  function setField<K extends keyof ProfileFormState>(key: K, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setProfileBusy(true);
    setProfileError(null);
    try {
      const payload: UpdateProfileRequest = {
        name: form.name,
        email: form.email,
        cpf: onlyDigits(form.cpf),
        phone: onlyDigits(form.phone),
        birthDate: form.birthDate,
      };
      const updated = await apiClient.patch<UserProfileDto>("/users/me", payload);
      setProfile(updated);
      setForm(toFormState(updated));
      completeRegistration({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        registered: true,
      });
      showToast("Dados atualizados com sucesso!");
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : "Não foi possível atualizar seus dados.");
    } finally {
      setProfileBusy(false);
    }
  }

  const passwordsMismatch =
    confirmTouched && passwordForm.confirmPassword.length > 0 && passwordForm.newPassword !== passwordForm.confirmPassword;
  const strength = evaluatePasswordStrength(passwordForm.newPassword);

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setConfirmTouched(true);
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("As senhas não coincidem.");
      return;
    }
    setPasswordBusy(true);
    setPasswordError(null);
    try {
      const payload: ChangePasswordRequest = {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      };
      await apiClient.patch("/users/me/password", payload);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setConfirmTouched(false);
      showToast("Senha alterada com sucesso!");
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Não foi possível alterar sua senha.");
    } finally {
      setPasswordBusy(false);
    }
  }

  if (!profile || !form) return <Spinner label="Carregando seus dados…" />;

  return (
    <div className="container account-page">
      <div className="section-header">
        <p className="section-eyebrow">Minha conta</p>
        <h2>Dados pessoais</h2>
      </div>

      <form onSubmit={handleProfileSubmit} className="surface account-form">
        <div className="field">
          <label htmlFor="acc-name">Nome completo</label>
          <input
            id="acc-name"
            required
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            disabled={profileBusy}
          />
        </div>

        <div className="field">
          <label htmlFor="acc-email">E-mail</label>
          <input
            id="acc-email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            disabled={profileBusy}
          />
        </div>

        <div className="account-form-row">
          <div className="field">
            <label htmlFor="acc-cpf">CPF</label>
            <input
              id="acc-cpf"
              inputMode="numeric"
              placeholder="000.000.000-00"
              maxLength={14}
              required
              value={form.cpf}
              onChange={(e) => setField("cpf", formatCpf(e.target.value))}
              disabled={profileBusy}
            />
          </div>
          <div className="field">
            <label htmlFor="acc-phone">Celular</label>
            <input
              id="acc-phone"
              inputMode="numeric"
              placeholder="(00) 0 0000-0000"
              maxLength={17}
              required
              value={form.phone}
              onChange={(e) => setField("phone", formatPhone(e.target.value))}
              disabled={profileBusy}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="acc-birth">Data de nascimento</label>
          <DateField
            id="acc-birth"
            value={form.birthDate}
            onChange={(iso) => setField("birthDate", iso)}
            required
            disabled={profileBusy}
          />
        </div>

        {profileError && <MessageBar tone="danger">{profileError}</MessageBar>}

        <button type="submit" className="btn btn-primary" disabled={profileBusy}>
          {profileBusy ? "Salvando…" : "Salvar alterações"}
        </button>
      </form>

      <div className="section-header account-section-spacer">
        <h2>Alterar senha</h2>
      </div>

      <form onSubmit={handlePasswordSubmit} className="surface account-form">
        <div className="field">
          <label htmlFor="acc-current-password">Senha atual</label>
          <div className="password-field-wrap">
            <input
              id="acc-current-password"
              type={showCurrent ? "text" : "password"}
              autoComplete="current-password"
              required
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              disabled={passwordBusy}
            />
            <button
              type="button"
              className="password-field-toggle"
              onClick={() => setShowCurrent((v) => !v)}
              aria-label={showCurrent ? "Ocultar senha" : "Mostrar senha"}
            >
              {showCurrent ? <IconEyeOff width={18} height={18} /> : <IconEye width={18} height={18} />}
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="acc-new-password">Nova senha</label>
          <div className="password-field-wrap">
            <input
              id="acc-new-password"
              type={showNew ? "text" : "password"}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              disabled={passwordBusy}
            />
            <button
              type="button"
              className="password-field-toggle"
              onClick={() => setShowNew((v) => !v)}
              aria-label={showNew ? "Ocultar senha" : "Mostrar senha"}
            >
              {showNew ? <IconEyeOff width={18} height={18} /> : <IconEye width={18} height={18} />}
            </button>
          </div>
          {passwordForm.newPassword ? (
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
          <label htmlFor="acc-confirm-password">Confirmar nova senha</label>
          <input
            id="acc-confirm-password"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            onBlur={() => setConfirmTouched(true)}
            disabled={passwordBusy}
            aria-invalid={passwordsMismatch}
          />
          {passwordsMismatch && <p className="field-error">As senhas não coincidem.</p>}
        </div>

        {passwordError && <MessageBar tone="danger">{passwordError}</MessageBar>}

        <button type="submit" className="btn btn-secondary" disabled={passwordBusy}>
          {passwordBusy ? "Alterando…" : "Alterar senha"}
        </button>
      </form>
    </div>
  );
}
