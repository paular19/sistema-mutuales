// app/dashboard/layout.tsx

import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getServerUser } from "@/lib/auth/get-server-user";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const info = await getServerUser();

  if (!info?.userId) {
    redirect("/sign-in");
  }

  if (!info.mutualId) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        context={{
          user: info.user,
          usuario: null,
          mutualId: info.mutualId,
        }}
      />

      <div className="flex">
        <DashboardNav />
        <main className="flex-1 p-8 overflow-x-hidden min-w-0">{children}</main>
      </div>
    </div>
  );
}
