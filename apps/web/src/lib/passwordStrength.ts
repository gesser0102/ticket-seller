export type PasswordStrengthLevel = "fraca" | "media" | "forte" | "muito-forte";

export interface PasswordStrength {
  score: number;
  level: PasswordStrengthLevel;
  label: string;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, level: "fraca", label: "Fraca" };
  if (score === 2) return { score, level: "media", label: "Média" };
  if (score <= 4) return { score, level: "forte", label: "Forte" };
  return { score, level: "muito-forte", label: "Muito forte" };
}
