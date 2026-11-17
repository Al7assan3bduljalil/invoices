export const dynamic = "force-dynamic";

import { getDashboardStats } from "@/server/stats";
import { getCurrentUser } from "@/server/current-user";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const stats = await getDashboardStats(user.id);
  return <DashboardClient stats={stats} />;
}
