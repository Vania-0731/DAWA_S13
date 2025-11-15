import bcrypt from 'bcrypt';
import { prisma } from './prisma';

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export async function incrementarIntentos(email: string) {
  const usuario = await prisma.user.findUnique({
    where: { email },
  });

  if (!usuario) return;

  const nuevosIntentos = (usuario.intentosLogin || 0) + 1;
  const ahora = new Date();
  let bloqueadoHasta: Date | null = null;
  if (nuevosIntentos >= 5) {
    bloqueadoHasta = new Date(ahora.getTime() + 15 * 60 * 1000);
  }

  await prisma.user.update({
    where: { email },
    data: {
      intentosLogin: nuevosIntentos,
      bloqueadoHasta,
    },
  });
}

export async function resetearIntentos(email: string) {
  await prisma.user.update({
    where: { email },
    data: {
      intentosLogin: 0,
      bloqueadoHasta: null,
    },
  });
}

export async function verificarBloqueo(email: string): Promise<boolean> {
  const usuario = await prisma.user.findUnique({
    where: { email },
  });

  if (!usuario || !usuario.bloqueadoHasta) {
    return false;
  }

  const ahora = new Date();
  if (ahora < usuario.bloqueadoHasta) {
    return true;
  }
  await prisma.user.update({
    where: { email },
    data: {
      bloqueadoHasta: null,
      intentosLogin: 0,
    },
  });

  return false;
}

