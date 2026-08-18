export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCpf(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 11);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)].filter(Boolean);
  let out = parts.join(".");
  const check = digits.slice(9, 11);
  if (check) out += `-${check}`;
  return out;
}

export function formatPhone(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 11);
  if (digits.length === 0) return "";
  let out = `(${digits.slice(0, 2)}`;
  if (digits.length >= 2) out += ") ";
  if (digits.length > 2) out += digits.slice(2, 3);
  if (digits.length > 3) out += ` ${digits.slice(3, 7)}`;
  if (digits.length > 7) out += `-${digits.slice(7, 11)}`;
  return out;
}
