import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import AutomationDetailClient from "./AutomationDetailClient";

export default async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const automation = await prisma.automation.findUnique({
    where: { id },
    include: { runs: { orderBy: { createdAt: "desc" }, take: 20 } },
  });

  if (!automation) notFound();

  return (
    <AutomationDetailClient
      automation={JSON.parse(JSON.stringify(automation))}
    />
  );
}
