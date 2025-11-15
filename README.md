# NextAuth App - Sistema de Autenticación Multi-Proveedor

Aplicación web moderna desarrollada con Next.js que implementa un sistema completo de autenticación usando NextAuth.js con múltiples proveedores: credenciales (email/password), Google OAuth y GitHub OAuth.

## 🚀 Características

- **Registro de usuarios** con email y contraseña
- **Autenticación con credenciales** (email/password)
- **Autenticación con Google OAuth**
- **Autenticación con GitHub OAuth**
- **Cifrado de contraseñas** con bcrypt
- **Sistema de bloqueo** después de 5 intentos fallidos (15 minutos)
- **Protección de rutas** con middleware
- **Base de datos SQLite** con Prisma ORM
- **Interfaz moderna** con Tailwind CSS

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Cuenta de Google Cloud Console (para Google OAuth)
- Cuenta de GitHub (para GitHub OAuth)

## 📦 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/Vania-0731/DAWA_S13.git
cd DAWA_S13
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu_secret_generado_aqui

# Google OAuth
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=tu_github_client_id
GITHUB_CLIENT_SECRET=tu_github_client_secret
```

#### Generar NEXTAUTH_SECRET

Puedes generar un secret en: https://generate-secret.vercel.app/32

#### Configurar Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a "APIs & Services" > "Credentials"
4. Click en "Create Credentials" > "OAuth client ID"
5. Configura:
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
6. Copia el Client ID y Client Secret al `.env.local`

#### Configurar GitHub OAuth

1. Ve a [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Click en "New OAuth App"
3. Configura:
   - Application name: `Next Auth App` (o el nombre que prefieras)
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copia el Client ID y Client Secret al `.env.local`

### 4. Configurar la base de datos

```bash
# Generar el cliente de Prisma
npx prisma generate

# Crear las migraciones y la base de datos
npx prisma migrate dev --name init
```

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🗂️ Estructura del Proyecto

```
next-auth-app/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.tsx      # Configuración de NextAuth
│   │   └── register/
│   │       └── route.ts           # API de registro
│   ├── components/
│   │   ├── LogoutButton.tsx       # Botón de cerrar sesión
│   │   └── SessionProvider.tsx    # Proveedor de sesión
│   ├── dashboard/
│   │   └── page.tsx               # Página del dashboard
│   ├── profile/
│   │   └── page.tsx               # Página de perfil
│   ├── register/
│   │   └── page.tsx               # Página de registro
│   ├── signIn/
│   │   └── page.tsx               # Página de login
│   ├── layout.tsx                 # Layout principal
│   └── page.tsx                   # Página de inicio
├── lib/
│   ├── auth.ts                    # Funciones de autenticación (hash, verify, bloqueo)
│   └── prisma.ts                  # Cliente de Prisma
├── prisma/
│   ├── schema.prisma              # Esquema de la base de datos
│   └── migrations/                # Migraciones de la base de datos
├── middleware.ts                  # Middleware para proteger rutas
└── .env.local                     # Variables de entorno (no se sube a git)
```

## 🔐 Funcionalidades de Seguridad

### Sistema de Bloqueo

- Después de **5 intentos fallidos** de login, la cuenta se bloquea por **15 minutos**
- Los intentos se resetean automáticamente después de un login exitoso
- El bloqueo se elimina automáticamente después de los 15 minutos

### Cifrado de Contraseñas

- Las contraseñas se cifran usando **bcrypt** con 10 rounds
- Nunca se almacenan en texto plano

### Protección de Rutas

Las siguientes rutas están protegidas y requieren autenticación:
- `/dashboard`
- `/profile`

## 🛠️ Tecnologías Utilizadas

- **Next.js 16** - Framework de React
- **NextAuth.js 4** - Librería de autenticación
- **Prisma** - ORM para la base de datos
- **SQLite** - Base de datos
- **bcrypt** - Cifrado de contraseñas
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Framework de estilos
- **React Icons** - Iconos

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start

# Linting
npm run lint
```

## 🔄 Flujo de Autenticación

### 1. Registro
- Usuario llena el formulario en `/register`
- Se valida el email y la contraseña (mínimo 8 caracteres)
- La contraseña se cifra con bcrypt
- Se crea el usuario en la base de datos
- Redirección a `/signIn`

### 2. Login con Credenciales
- Usuario ingresa email y contraseña
- Se verifica si la cuenta está bloqueada
- Se busca el usuario en la base de datos
- Se compara la contraseña con bcrypt
- Si falla, se incrementan los intentos
- Si llega a 5 intentos, se bloquea por 15 minutos
- Si es exitoso, se resetean los intentos y se crea la sesión

### 3. Login con OAuth (Google/GitHub)
- Usuario clickea el botón del proveedor
- Redirección a la página de OAuth del proveedor
- Usuario autoriza la aplicación
- Callback a `/api/auth/callback/[provider]`
- Se crea o actualiza el usuario en la base de datos
- Se crea la sesión

## 🐛 Solución de Problemas

### Error: "Missing required environment variable: DATABASE_URL"
Asegúrate de tener `DATABASE_URL` en tu archivo `.env.local`

### Error: "Prisma Client not generated"
Ejecuta `npx prisma generate`

### Error: "Migration not found"
Ejecuta `npx prisma migrate dev --name init`

### La sesión no se mantiene
Verifica que `NEXTAUTH_SECRET` esté configurado correctamente

## 📚 Recursos

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
