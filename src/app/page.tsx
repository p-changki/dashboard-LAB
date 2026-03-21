import { Dashboard } from "@/components/Dashboard";
import { getOverviewData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const overview = await getOverviewData();

  return <Dashboard data={overview} />;
}
