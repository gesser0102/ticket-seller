import { randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const GROUP_SIZE = 3;

export const SHORT_CODE_PATTERN = new RegExp(
  `^[${ALPHABET}]{${GROUP_SIZE}}-[${ALPHABET}]{${GROUP_SIZE}}$`,
);

export function generateShortCode(): string {
  const group = () =>
    Array.from(
      { length: GROUP_SIZE },
      () => ALPHABET[randomInt(ALPHABET.length)],
    ).join('');
  return `${group()}-${group()}`;
}
