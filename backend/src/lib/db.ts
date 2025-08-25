import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | null = null;

declare global {
  var __prisma: PrismaClient | undefined;
}

export function getPrismaClient(): PrismaClient {
  if (prismaInstance) {
    return prismaInstance;
  }

  if (process.env.NODE_ENV === 'production') {
    prismaInstance = new PrismaClient();
  } else {
    if (!global.__prisma) {
      global.__prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
      });
    }
    prismaInstance = global.__prisma;
  }

  return prismaInstance;
}

// Deprecated: Use getPrismaClient() instead
// This is kept for backward compatibility but should be avoided
export const prisma = new Proxy({} as PrismaClient, {
  get: function(target, prop) {
    const client = getPrismaClient();
    return (client as any)[prop];
  }
});
