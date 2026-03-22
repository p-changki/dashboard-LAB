import { getOverviewData } from "@/lib/dashboard-data";
import { Dashboard } from "@/components/layout/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getOverviewData();

  return <Dashboard data={data} />;
}
