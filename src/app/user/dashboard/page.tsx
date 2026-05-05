import { getDashboardPathForEmail } from "@/auth/dashboard";
import { getSessionSafely } from "@/auth/session";
import { redirect } from "next/navigation";

export default async function UserDashboardPage() {
  const session = await getSessionSafely();
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const dashboardPath = await getDashboardPathForEmail(session.user.email);
  if (dashboardPath !== "/user/dashboard") {
    redirect(dashboardPath);
  }

  return (
    <div>
      <h1>User Dashboard placeholder</h1>
    </div>
  );
}
