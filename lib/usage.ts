import { getPremiumDevice, getUsage, incrementUsageRecord } from "@/lib/store";

export const FREE_MONTHLY_LIMIT = 10;

export function currentMonthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getUsageStatus(deviceId: string) {
  const month = currentMonthKey();
  const [usage, premium] = await Promise.all([
    getUsage(deviceId, month),
    getPremiumDevice(deviceId)
  ]);

  const premiumActive =
    Boolean(premium?.active) &&
    (!premium?.expiresAt || premium.expiresAt.getTime() > Date.now());

  return {
    month,
    count: usage.count,
    remaining: premiumActive ? null : Math.max(0, FREE_MONTHLY_LIMIT - usage.count),
    limit: FREE_MONTHLY_LIMIT,
    premiumActive
  };
}

export async function incrementUsage(deviceId: string) {
  return incrementUsageRecord(deviceId, currentMonthKey());
}
