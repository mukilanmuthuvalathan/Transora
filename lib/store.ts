import { prisma } from "@/lib/prisma";
import { premiumExpiresAt } from "@/lib/premium";

export type UsageRecord = {
  id: string;
  deviceId: string;
  month: string;
  count: number;
};

export type PremiumDeviceRecord = {
  id: string;
  deviceId: string;
  active: boolean;
  expiresAt: Date | null;
};

export type PremiumCodeRecord = {
  id: string;
  code: string;
  active: boolean;
  expiresAt: Date | null;
  usedByDeviceId: string | null;
  createdAt: Date;
  usedAt: Date | null;
};

const globalStore = globalThis as unknown as {
  transoraMemory?: {
    videos: { id: string; url: string; transcript: string; createdAt: Date }[];
    premiumDevices: PremiumDeviceRecord[];
    premiumCodes: PremiumCodeRecord[];
    usage: UsageRecord[];
  };
};

const memory =
  globalStore.transoraMemory ??
  {
    videos: [],
    premiumDevices: [],
    premiumCodes: [],
    usage: []
  };

globalStore.transoraMemory = memory;

export function usesLocalStore() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  return !databaseUrl || databaseUrl.includes("USER:PASSWORD@HOST.neon.tech");
}

function id() {
  return crypto.randomUUID();
}

export async function getUsage(deviceId: string, month: string) {
  if (!usesLocalStore()) {
    return prisma.usage.upsert({
      where: { deviceId_month: { deviceId, month } },
      update: {},
      create: { deviceId, month, count: 0 }
    });
  }

  let usage = memory.usage.find((row) => row.deviceId === deviceId && row.month === month);
  if (!usage) {
    usage = { id: id(), deviceId, month, count: 0 };
    memory.usage.push(usage);
  }
  return usage;
}

export async function incrementUsageRecord(deviceId: string, month: string) {
  if (!usesLocalStore()) {
    return prisma.usage.upsert({
      where: { deviceId_month: { deviceId, month } },
      update: { count: { increment: 1 } },
      create: { deviceId, month, count: 1 }
    });
  }

  const usage = await getUsage(deviceId, month);
  usage.count += 1;
  return usage;
}

export async function setUsageCount(deviceId: string, month: string, count: number) {
  if (!usesLocalStore()) {
    return prisma.usage.upsert({
      where: { deviceId_month: { deviceId, month } },
      update: { count },
      create: { deviceId, month, count }
    });
  }

  const usage = await getUsage(deviceId, month);
  usage.count = count;
  return usage;
}

export async function getPremiumDevice(deviceId: string) {
  if (!usesLocalStore()) {
    return prisma.premiumDevice.findUnique({ where: { deviceId } });
  }

  return memory.premiumDevices.find((row) => row.deviceId === deviceId) ?? null;
}

export async function upsertPremiumDevice(
  deviceId: string,
  active: boolean,
  expiresAt: Date | null
) {
  if (!usesLocalStore()) {
    return prisma.premiumDevice.upsert({
      where: { deviceId },
      update: { active, expiresAt },
      create: { deviceId, active, expiresAt }
    });
  }

  let device = memory.premiumDevices.find((row) => row.deviceId === deviceId);
  if (!device) {
    device = { id: id(), deviceId, active, expiresAt };
    memory.premiumDevices.push(device);
  } else {
    device.active = active;
    device.expiresAt = expiresAt;
  }
  return device;
}

export async function listCurrentDevices(month: string) {
  if (!usesLocalStore()) {
    const [usageRows, premiumRows] = await Promise.all([
      prisma.usage.findMany({ where: { month }, orderBy: { updatedAt: "desc" } }),
      prisma.premiumDevice.findMany()
    ]);
    return { usageRows, premiumRows };
  }

  return {
    usageRows: memory.usage.filter((row) => row.month === month),
    premiumRows: memory.premiumDevices
  };
}

export async function listUsageRecords() {
  if (!usesLocalStore()) {
    return prisma.usage.findMany({
      orderBy: [{ month: "desc" }, { count: "desc" }],
      take: 200
    });
  }

  return [...memory.usage]
    .sort((a, b) => b.month.localeCompare(a.month) || b.count - a.count)
    .slice(0, 200);
}

export async function listPremiumCodes() {
  if (!usesLocalStore()) {
    return prisma.premiumCode.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  return [...memory.premiumCodes]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 100);
}

export async function createPremiumCode(code: string, expiresAt: Date | null) {
  if (!usesLocalStore()) {
    return prisma.premiumCode.create({ data: { code, expiresAt } });
  }

  const premiumCode = {
    id: id(),
    code,
    active: true,
    expiresAt,
    usedByDeviceId: null,
    createdAt: new Date(),
    usedAt: null
  };
  memory.premiumCodes.push(premiumCode);
  return premiumCode;
}

export async function redeemPremiumCode(code: string, deviceId: string) {
  if (!usesLocalStore()) {
    const premiumCode = await prisma.premiumCode.findUnique({ where: { code } });
    const codeActive =
      Boolean(premiumCode?.active) &&
      !premiumCode?.usedByDeviceId &&
      (!premiumCode?.expiresAt || premiumCode.expiresAt.getTime() > Date.now());

    if (!premiumCode || !codeActive) return null;

    const deviceExpiresAt = premiumExpiresAt();
    await prisma.$transaction([
      prisma.premiumDevice.upsert({
        where: { deviceId },
        update: { active: true, expiresAt: deviceExpiresAt },
        create: { deviceId, active: true, expiresAt: deviceExpiresAt }
      }),
      prisma.premiumCode.update({
        where: { id: premiumCode.id },
        data: { active: false, usedByDeviceId: deviceId, usedAt: new Date() }
      })
    ]);

    return premiumCode;
  }

  const premiumCode = memory.premiumCodes.find((row) => row.code === code);
  const codeActive =
    Boolean(premiumCode?.active) &&
    !premiumCode?.usedByDeviceId &&
    (!premiumCode?.expiresAt || premiumCode.expiresAt.getTime() > Date.now());

  if (!premiumCode || !codeActive) return null;

  premiumCode.active = false;
  premiumCode.usedByDeviceId = deviceId;
  premiumCode.usedAt = new Date();
  await upsertPremiumDevice(deviceId, true, premiumExpiresAt());
  return premiumCode;
}

export async function createVideo(url: string, transcript: string) {
  if (!usesLocalStore()) {
    const user = await prisma.user.upsert({
      where: { email: "guest@transora.local" },
      create: {
        name: "Guest User",
        email: "guest@transora.local",
        passwordHash: "guest-access",
        authProvider: "guest",
        settings: { create: {} }
      },
      update: {},
      select: { id: true }
    });

    return prisma.video.create({
      data: {
        userId: user.id,
        title: "YouTube Audio Transcript",
        sourceType: "YOUTUBE",
        sourceUrl: url,
        status: "COMPLETED",
        transcript: {
          create: {
            text: transcript,
            segments: [],
            srt: transcript,
            sourceLanguage: "auto",
            targetLanguage: "auto",
            originalText: transcript,
            originalSegments: []
          }
        }
      }
    });
  }

  const video = { id: id(), url, transcript, createdAt: new Date() };
  memory.videos.push(video);
  return video;
}
