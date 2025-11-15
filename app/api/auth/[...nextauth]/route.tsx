import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { verifyPassword, incrementarIntentos, resetearIntentos, verificarBloqueo } from "@/lib/auth"

const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

const providers: any[] = [
    GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
];

if (githubClientId && githubClientSecret) {
    providers.push(
        GitHubProvider({
            clientId: githubClientId,
            clientSecret: githubClientSecret,
            authorization: {
                params: {
                    scope: "read:user user:email",
                },
            },
        })
    );
} else {
    console.warn("⚠️ GitHub OAuth no está configurado. GITHUB_CLIENT_ID o GITHUB_CLIENT_SECRET faltan en .env.local");
}

providers.push(
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
    })
);

export const authOptions: NextAuthOptions = {
    providers,
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === "google" || account?.provider === "github") {
                let userEmail = user.email;
                if (account?.provider === "github" && !userEmail && profile) {
                    userEmail = (profile as any).email || (profile as any).login + "@users.noreply.github.com";
                }
                if (!userEmail) {
                    return false;
                }

                const existingUser = await prisma.user.findUnique({
                    where: { email: userEmail },
                });

                if (!existingUser) {
                    await prisma.user.create({
                        data: {
                            email: userEmail,
                            name: user.name || (profile as any)?.name || (profile as any)?.login || "Usuario",
                            image: user.image || null,
                        },
                    });
                } else {
                    const updateData: any = {};
                    if (user.name && !existingUser.name) {
                        updateData.name = user.name;
                    }
                    if (user.image && !existingUser.image) {
                        updateData.image = user.image;
                    }
                    if (Object.keys(updateData).length > 0) {
                        await prisma.user.update({
                            where: { email: userEmail },
                            data: updateData,
                        });
                    }
                }
            }

            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                (token as any).id = user.id;
                (token as any).email = user.email;
                (token as any).name = user.name;
                (token as any).image = user.image;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token) {
                (session.user as any).id = (token as any).id as string;
                (session.user as any).name = (token as any).name as string;
                (session.user as any).email = (token as any).email as string;
                if ((token as any).image) {
                    (session.user as any).image = (token as any).image as string;
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