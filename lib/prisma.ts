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
      // Validar que las variables necesarias estén disponibles ANTES de requerir los módulos
      const authTokenEnv = process.env.TURSO_AUTH_TOKEN?.trim();
      const authTokenFromUrl = extractTokenFromUrl(databaseUrl);
      const authToken = authTokenEnv || authTokenFromUrl;
      
      if (!authToken || authToken === 'undefined' || authToken === '') {
        console.error('❌ TURSO_AUTH_TOKEN is not set or empty');
        console.error('TURSO_AUTH_TOKEN from env:', authTokenEnv ? '✅ exists' : '❌ MISSING');
        console.error('Auth token from URL:', authTokenFromUrl ? '✅ exists' : '❌ not found');
        throw new Error('TURSO_AUTH_TOKEN is required when using Turso database. Check Vercel environment variables.');
      }
      
      const url = databaseUrl.split('?')[0].trim();
      if (!url || url === 'undefined' || url === '' || !url.startsWith('libsql://')) {
        console.error('❌ Invalid database URL');
        console.error('URL value:', url);
        console.error('Original databaseUrl:', databaseUrl);
        throw new Error(`Invalid database URL: ${url || 'undefined'}. Check DATABASE_URL or TURSO_DATABASE_URL in Vercel.`);
      }
      
      console.log('✅ Initializing Turso client with URL:', url.substring(0, 50) + '...');
      
      // Ahora sí, requerir los módulos
      const { createClient } = require('@libsql/client');
      const { PrismaLibSQL } = require('@prisma/adapter-libsql');
      
      const libsql = createClient({
        url: url,
        authToken: authToken,
      });
      
      const adapter = new PrismaLibSQL(libsql);
      const client = new PrismaClient({ adapter });
      
      console.log('✅ Prisma Client with Turso adapter initialized successfully');
      return client;
    } catch (error: any) {
      console.error('❌ ERROR loading Turso adapter:', error?.message || error);
      console.error('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL ? '✅ set' : '❌ not set');
      console.error('DATABASE_URL:', process.env.DATABASE_URL ? '✅ set' : '❌ not set');
      console.error('TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? '✅ set (length: ' + process.env.TURSO_AUTH_TOKEN.length + ')' : '❌ not set');
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
  // Durante el build, no inicializar
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    throw new Error('Prisma client should not be initialized during build phase');
  }
  
  // Si ya existe una instancia, reutilizarla
  if (!prismaInstance) {
    if (globalForPrisma.prisma) {
      prismaInstance = globalForPrisma.prisma;
    } else {
      // Validar que las variables estén disponibles antes de inicializar
      const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
      const databaseUrlEnv = process.env.DATABASE_URL?.trim();
      
      if (!tursoUrl && !databaseUrlEnv) {
        console.error('❌ ERROR: No database URL found at Prisma initialization');
        console.error('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL ? 'exists' : 'MISSING');
        console.error('DATABASE_URL:', process.env.DATABASE_URL ? 'exists' : 'MISSING');
        
        if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
          throw new Error('DATABASE_URL or TURSO_DATABASE_URL must be set. Check Vercel environment variables are configured for Production environment.');
        }
      }
      
      prismaInstance = getPrismaClient();
      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = prismaInstance;
      }
    }
  }
  return prismaInstance;
}

// Exportar usando Proxy para lazy initialization
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    try {
      return getPrismaInstance()[prop as keyof PrismaClient];
    } catch (error: any) {
      // Durante el build, retornar función vacía
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        return () => {};
      }
      // Si es error de variables de entorno, hacer un log más detallado
      if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('TURSO')) {
        console.error('❌ CRITICAL: Prisma initialization failed due to missing environment variables');
        console.error('Error:', error.message);
      }
      throw error;
    }
  },
});
