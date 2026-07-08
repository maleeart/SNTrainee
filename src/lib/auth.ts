import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "tuangphetch@gmail.com";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true, profileDone: true },
      });
      session.user.id = user.id;
      session.user.role = dbUser?.role ?? "STUDENT";
      session.user.profileDone = dbUser?.profileDone ?? false;
      return session;
    },
  },
  events: {
    // Promote the fixed admin email on first sign-in
    async signIn({ user }) {
      if (user.email === ADMIN_EMAIL && user.id) {
        await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      }
    },
  },
});
