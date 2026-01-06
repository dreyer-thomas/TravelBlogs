import type { DefaultSession } from "next-auth";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    email: string | null;
    role: UserRole;
    mustChangePassword?: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: UserRole;
      mustChangePassword?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    email?: string;
    role?: UserRole;
    mustChangePassword?: boolean;
    sub?: string;
  }
}
