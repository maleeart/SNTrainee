import { DefaultSession } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role; profileDone: boolean; approved: boolean; school?: string | null } & DefaultSession["user"];
  }
}
