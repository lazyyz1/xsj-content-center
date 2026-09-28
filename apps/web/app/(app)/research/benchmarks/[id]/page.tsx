import { z } from "zod";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/server/access";
import { researchBenchmarkDossier } from "@/server/research/benchmark-dossier";
import { ResearchError } from "@/server/research/access";
import { BenchmarkDossierPage, type DossierFilters } from "@/components/research/benchmark-dossier";
import "@/components/research/benchmark-dossier.css";

export default async function ResearchBenchmarkDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<DossierFilters & { runId?: string; tab?: string }> }) {
  const { workspace, session, role } = await requireWorkspace();
  const { id } = await params; const raw = await searchParams;
  const from = z.string().date().safeParse(raw.from); const to = z.string().date().safeParse(raw.to);
  const validRange = !from.success || !to.success || from.data <= to.data;
  const query = { ...raw, from: validRange && from.success ? from.data : undefined, to: validRange && to.success ? to.data : undefined };
  try {
    const data = await researchBenchmarkDossier({ workspaceId: workspace.id, userId: session.user.id }, id, query.runId, { from: query.from, to: query.to });
    return <BenchmarkDossierPage data={data} canWrite={role !== "VIEWER"} initialSection={query.tab} initialFilters={query} />;
  } catch (error) { if (error instanceof ResearchError && error.status === 404) notFound(); throw error; }
}
