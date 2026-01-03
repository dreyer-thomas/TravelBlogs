import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { validateCredentials } from "./auth";

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        const user = await validateCredentials(
          credentials.email,
          credentials.password,
        );
        if (!user) {
          throw new Error("Invalid email or password.");
        }

        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.sub) {
          session.user.id = token.sub;
        }
        if (token.email) {
          session.user.email = token.email;
        }
        if (token.role) {
          session.user.role = token.role;
        }
        if (typeof token.mustChangePassword === "boolean") {
          session.user.mustChangePassword = token.mustChangePassword;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
};
