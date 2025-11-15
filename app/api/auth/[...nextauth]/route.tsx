import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { verifyPassword, incrementarIntentos, resetearIntentos, verificarBloqueo } from "@/lib/auth"

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email y contraseña son requeridos");
                }

                const email = credentials.email;
                const password = credentials.password;
                const estaBloqueado = await verificarBloqueo(email);
                if (estaBloqueado) {
                    throw new Error("Tu cuenta está temporalmente bloqueada. Intenta en 15 minutos.");
                }
                const user = await prisma.user.findUnique({
                    where: { email },
                });

                if (!user || !user.password) {
                    await incrementarIntentos(email);
                    throw new Error("Email o contraseña incorrectos");
                }
                const esValida = await verifyPassword(password, user.password);

                if (!esValida) {
                    await incrementarIntentos(email);
                    throw new Error("Email o contraseña incorrectos");
                }
                await resetearIntentos(email);

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                };
            }
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === "google" || account?.provider === "github") {
                if (!user.email) return false;

                const existingUser = await prisma.user.findUnique({
                    where: { email: user.email },
                });

                if (!existingUser) {
                    await prisma.user.create({
                        data: {
                            email: user.email,
                            name: user.name || "",
                            image: user.image || null,
                        },
                    });
                } else {
                    if (user.image && !existingUser.image) {
                        await prisma.user.update({
                            where: { email: user.email },
                            data: { image: user.image },
                        });
                    }
                }
            }

            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
                token.image = user.image;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token) {
                session.user.id = token.id as string;
                session.user.name = token.name as string;
                session.user.email = token.email as string;
                if (token.image) {
                    session.user.image = token.image as string;
                }
            }
            return session;
        },
    },
    pages: {
        signIn: "/signIn",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };