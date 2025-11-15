import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const databaseUrl = tursoUrl || process.env.DATABASE_URL;
  
  // Validar que la URL existe y no es undefined
  if (!databaseUrl || databaseUrl === 'undefined' || databaseUrl.trim() === '') {
    console.error('❌ DATABASE_URL or TURSO_DATABASE_URL is not set');
    console.error('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL ? '✅ set' : '❌ not set');
    console.error('DATABASE_URL:', process.env.DATABASE_URL ? '✅ set' : '❌ not set');
    
    // En producción, lanzar error; en desarrollo, usar SQLite local
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL or TURSO_DATABASE_URL must be set in production environment');
    }
    return new PrismaClient();
  }
  
  // Si es SQLite local (file:), usar PrismaClient normal
  if (databaseUrl.startsWith('file:')) {
    return new PrismaClient();
  }
  
  // Si es Turso (libsql://), usar el adaptador
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

export const prisma = globalForPrisma.prisma ?? getPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
