import { DefaultSession } from "next-auth";
declare module "next-auth" {
  interface Session {
    user?: {
      role: "STUDENT" | "ADMIN";
      id: string;
      firstName: string;
      lastName: string;
    } & DefaultSession["user"];
  }
}
