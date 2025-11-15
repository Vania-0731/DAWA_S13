import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email ya está registrado' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { message: 'Usuario registrado exitosamente' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en registro:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    if (error?.message?.includes('URL_INVALID') || error?.message?.includes('undefined')) {
      return NextResponse.json(
        { error: 'Error de configuración de base de datos. Verifica las variables de entorno.' },
        { status: 500 }
      );
    }
    
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Este email ya está registrado' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error?.message || 'Error al registrar usuario. Verifica la configuración de la base de datos.' },
      { status: 500 }
    );
  }
}

