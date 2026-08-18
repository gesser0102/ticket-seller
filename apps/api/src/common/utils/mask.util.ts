const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'token',
  'hash',
  'cookie',
  'sessionId',
  'secret',
];

export function maskSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => maskSensitive(item));
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEYS.some((k) =>
        key.toLowerCase().includes(k.toLowerCase()),
      )
        ? '***'
        : maskSensitive(val);
    }
    return result;
  }
  return value;
}
