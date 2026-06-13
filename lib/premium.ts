export const PREMIUM_CODE_DAYS = 28;

export function premiumExpiresAt(from = new Date()) {
  return new Date(from.getTime() + PREMIUM_CODE_DAYS * 24 * 60 * 60 * 1000);
}
