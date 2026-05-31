import { DefaultSession } from "next-auth";

type AppUserRole = "STUDENT" | "ADMIN";
type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER";

declare module "next-auth" {
  interface Session {
    user?: {
      role: AppUserRole;
      id: string;
      currentOrganizationId: string | null;
      currentOrganizationRole: OrganizationRole | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppUserRole;
    currentOrganizationId?: string | null;
    currentOrganizationRole?: OrganizationRole | null;
  }
}
