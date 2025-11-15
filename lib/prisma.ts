import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const databaseUrl = tursoUrl || process.env.DATABASE_URL;
  
  if (!databaseUrl || databaseUrl.startsWith('file:')) {
    return new PrismaClient();
  }
  if (databaseUrl.startsWith('libsql://')) {
    try {
      const { createClient } = require('@libsql/client');
      const { PrismaLibSQL } = require('@prisma/adapter-libsql');
            if (!databaseUrl || databaseUrl === 'undefined') {
        throw new Error('DATABASE_URL or TURSO_DATABASE_URL must be set');
      }
      
      const authToken = process.env.TURSO_AUTH_TOKEN || extractTokenFromUrl(databaseUrl);
      if (!authToken) {
        throw new Error('TURSO_AUTH_TOKEN is required when using Turso database');
      }
      const url = databaseUrl.split('?')[0];
            if (!url || url === 'undefined' || !url.startsWith('libsql://')) {
        throw new Error(`Invalid database URL: ${url}`);
      }
      const libsql = createClient({
        url: url,
        authToken: authToken,
      });
      
      const adapter = new PrismaLibSQL(libsql);
      return new PrismaClient({ adapter });
    } catch (error) {
      console.error('Error loading Turso adapter:', error);
      console.error('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL);
      console.error('DATABASE_URL:', process.env.DATABASE_URL);
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
