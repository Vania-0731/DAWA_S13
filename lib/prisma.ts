import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  const databaseUrlEnv = process.env.DATABASE_URL?.trim();
  const databaseUrl = tursoUrl || databaseUrlEnv;
  console.log('🔍 Checking database URLs:');
  console.log('TURSO_DATABASE_URL:', tursoUrl ? `✅ "${tursoUrl.substring(0, 30)}..."` : '❌ not set or empty');
  console.log('DATABASE_URL:', databaseUrlEnv ? `✅ "${databaseUrlEnv.substring(0, 30)}..."` : '❌ not set or empty');
  console.log('Selected URL:', databaseUrl ? `✅ "${databaseUrl.substring(0, 30)}..."` : '❌ none');
  if (!databaseUrl || databaseUrl === 'undefined' || databaseUrl === '') {
    console.error('❌ DATABASE_URL or TURSO_DATABASE_URL is not set');
    console.error('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL ? '✅ set' : '❌ not set');
    console.error('DATABASE_URL:', process.env.DATABASE_URL ? '✅ set' : '❌ not set');
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      throw new Error('DATABASE_URL or TURSO_DATABASE_URL must be set in production environment. Check Vercel environment variables.');
    }
    return new PrismaClient();
  }
  if (databaseUrl.startsWith('file:')) {
    return new PrismaClient();
  }
  if (databaseUrl.startsWith('libsql://')) {
    try {
      const { createClient } = require('@libsql/client');
      const { PrismaLibSQL } = require('@prisma/adapter-libsql');
      
      const authToken = process.env.TURSO_AUTH_TOKEN || extractTokenFromUrl(databaseUrl);
      if (!authToken || authToken === 'undefined' || authToken.trim() === '') {
        console.error('❌ TURSO_AUTH_TOKEN is not set');
        throw new Error('TURSO_AUTH_TOKEN is required when using Turso database');
      }
      
      const url = databaseUrl.split('?')[0].trim();
      if (!url || url === 'undefined' || !url.startsWith('libsql://')) {
        console.error('❌ Invalid database URL:', url);
        throw new Error(`Invalid database URL: ${url}`);
      }
      
      const libsql = createClient({
        url: url,
        authToken: authToken,
      });
      
      const adapter = new PrismaLibSQL(libsql);
      return new PrismaClient({ adapter });
    } catch (error) {
      console.error('❌ Error loading Turso adapter:', error);
      console.error('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL ? '✅ set' : '❌ not set');
      console.error('DATABASE_URL:', process.env.DATABASE_URL ? '✅ set' : '❌ not set');
      console.error('TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? '✅ set' : '❌ not set');
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

let prismaInstance: PrismaClient | null = null;
function getPrismaInstance() {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    throw new Error('Prisma client should not be initialized during build phase');
  }
  
  if (!prismaInstance) {
    if (globalForPrisma.prisma) {
      prismaInstance = globalForPrisma.prisma;
    } else {
      prismaInstance = getPrismaClient();
      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = prismaInstance;
      }
    }
  }
  return prismaInstance;
}
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    try {
      return getPrismaInstance()[prop as keyof PrismaClient];
    } catch (error) {
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        return () => {};
      }
      throw error;
    }
  },
});
