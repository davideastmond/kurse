"use client";

import {
  inviteOrganizationMember,
  revokeOrganizationMembership,
} from "@/app/actions/organizations";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  InviteNotice,
  OrganizationMemberRow,
  OrganizationMembersManagerProps,
} from "./definitions";

function sortMembers(rows: OrganizationMemberRow[]) {
  return [...rows].sort((left, right) => {
    if (left.role !== right.role) {
      const roleRank = { OWNER: 0, ADMIN: 1, MEMBER: 2 } as const;
      return roleRank[left.role] - roleRank[right.role];
    }

    return left.name.localeCompare(right.name);
  });
}

export default function OrganizationMembersManager({
  organizationId,
  organizationSlug,
  members,
}: OrganizationMembersManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<InviteNotice | null>(null);

  const sortedMembers = useMemo(() => sortMembers(members), [members]);

  const withAction = (action: () => Promise<void>) => {
    startTransition(async () => {
      setNotice(null);
      await action();
      router.refresh();
    });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <header>
        <h2 className="text-xl font-semibold text-foreground">Members</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite admins or learners and revoke access when needed.
        </p>
      </header>

      <form
        className="grid gap-3 rounded-xl border border-border bg-background p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]"
        onSubmit={(event) => {
          event.preventDefault();

          withAction(async () => {
            const result = await inviteOrganizationMember({
              organizationId,
              email,
              role,
            });

            if (!result.ok) {
              setNotice(result.message ?? "Unable to create invite.");
              return;
            }

            setEmail("");
            setRole("MEMBER");
            setInviteNotice({
              token: result.inviteToken,
              expiresAt: result.expiresAt,
            });
          });
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="learner@company.com"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary focus:ring-1"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Role
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value as "ADMIN" | "MEMBER")
            }
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary focus:ring-1"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send invite
        </button>
      </form>

      {inviteNotice ? (
        <p className="rounded-lg border border-success/40 bg-success/15 px-3 py-2 text-sm text-success">
          Invite created. Token: {inviteNotice.token} (expires{" "}
          {new Date(inviteNotice.expiresAt).toLocaleString()})
        </p>
      ) : null}

      {notice ? (
        <p className="rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
          {notice}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member) => (
              <tr
                key={member.userId}
                className="border-b border-border/70 last:border-b-0"
              >
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  {member.name}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {member.email}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {member.role}
                </td>
                <td className="px-4 py-3 text-right">
                  {member.role === "OWNER" ? (
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Owner
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        withAction(async () => {
                          const result = await revokeOrganizationMembership({
                            organizationId,
                            userId: member.userId,
                          });

                          if (!result.ok) {
                            setNotice(
                              result.message ?? "Unable to revoke member.",
                            );
                          }
                        });
                      }}
                      className="rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-danger transition hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Manage URL: /admin/org/{organizationSlug}/members
      </p>
    </section>
  );
}
