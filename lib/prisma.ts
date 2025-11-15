import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.startsWith('file:')) {
    return new PrismaClient();
  }
  if (databaseUrl.startsWith('libsql://')) {
    try {
      const { createClient } = require('@libsql/client');
      const { PrismaLibSQL } = require('@prisma/adapter-libsql');
      const authToken = process.env.TURSO_AUTH_TOKEN || extractTokenFromUrl(databaseUrl);
      if (!authToken) {
        throw new Error('TURSO_AUTH_TOKEN is required when using Turso database');
      }
      const url = databaseUrl.split('?')[0];
      const libsql = createClient({
        url: url,
        authToken: authToken,
      });
      const adapter = new PrismaLibSQL(libsql);
      return new PrismaClient({ adapter });
    } catch (error) {
      console.error('Error loading Turso adapter:', error);
      throw error;
    }
  }
  return new PrismaClient();
}

function extractTokenFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('authToken');
  } catch {
    return null;
  }
}

export const prisma = globalForPrisma.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
