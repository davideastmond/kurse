export type OrganizationMemberRow = {
  userId: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  state: "ACTIVE" | "REVOKED";
};

export type InviteNotice = {
  token: string;
  expiresAt: string;
};

export type OrganizationMembersManagerProps = {
  organizationId: string;
  organizationSlug: string;
  members: OrganizationMemberRow[];
};
