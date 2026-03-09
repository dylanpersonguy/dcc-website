import { prisma } from "@/lib/prisma";
import AutomationsClient from "./AutomationsClient";

export default async function AutomationsPage() {
  const automations = await prisma.automation.findMany({
    orderBy: { createdAt: "desc" },
    include: { runs: { orderBy: { createdAt: "desc" }, take: 5 } },
  });

  return <AutomationsClient automations={JSON.parse(JSON.stringify(automations))} />;
}
