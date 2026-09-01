"use client";

import { Card } from "@content-center/ui";
import { useState } from "react";
import { BriefEditor } from "./brief-editor";
import { EvidenceBoard } from "./evidence-board";
import { MotherContentEditor } from "./mother-content-editor";
import { ProjectStatusPanel } from "./project-status-panel";
import { StudioSources } from "./studio-sources";
import { AICreationPanel, type AIAction, type RewriteRequest } from "./ai-creation-panel";

type Source = {
  role: string;
  sourceItem: { id: string; title: string | null; sourcePlatform: string; sourceType: string; rawText: string | null; transcript: { fullText: string } | null };
};
type Evidence = { id: string; type: string; excerpt: string | null; claim: string | null; note: string | null; sourceItemId: string | null; sourceItem: { title: string | null } | null };
type AvailableSource = { id: string; title: string | null; sourcePlatform: string; sourceType: string };
type ProjectStatus = "DRAFT" | "RESEARCHING" | "BRIEF_READY" | "WRITING" | "IN_REVIEW" | "APPROVED" | "ARCHIVED";

export function StudioShell({ project, availableSources, editable, ai }: {
  project: {
    id: string;
    title: string;
    status: ProjectStatus;
    description: string | null;
    goal: string | null;
    audience: string | null;
    sources: Source[];
    evidenceItems: Evidence[];
    creativeBrief: { topic: string; angle: string; audience: string; coreMessage: string; keyPoints: string[]; structure: string[]; tone: string; risks: string[]; version: number };
    motherContent: { title: string; body: string; outline: string[]; version: number };
  };
  availableSources: AvailableSource[];
  editable: boolean;
  ai: { integrationStatus: "CONFIGURED" | "UNCONFIGURED" | "DISABLED" | "ERROR" | "MOCK"; hasCreatorProfile: boolean; recentRuns: Array<{ id: string; action: AIAction; status: string; outputJson?: unknown; contextTruncated?: boolean; errorCode?: string | null; appliedAt?: string | null; discardedAt?: string | null }> };
}) {
  const [tab, setTab] = useState<"research" | "writing" | "brief">("writing");
  const [rewriteRequest, setRewriteRequest] = useState<RewriteRequest | null>(null);
  const [appliedMotherContent, setAppliedMotherContent] = useState<typeof project.motherContent | null>(null);
  const motherContent = appliedMotherContent ?? project.motherContent;
  const tabClass = (name: typeof tab) => `h-10 flex-1 rounded-[var(--radius)] text-sm font-medium ${tab === name ? "bg-[var(--text-primary)] text-white" : "text-[var(--text-secondary)]"}`;

  return (
    <>
      <nav aria-label="工作台面板" className="mb-4 flex rounded-xl border bg-[var(--surface)] p-1 xl:hidden">
        <button className={tabClass("research")} onClick={() => setTab("research")}>素材与证据</button>
        <button className={tabClass("writing")} onClick={() => setTab("writing")}>母稿</button>
        <button className={tabClass("brief")} onClick={() => setTab("brief")}>AI 与 Brief</button>
      </nav>
      <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <Card className={`${tab === "research" ? "block" : "hidden"} p-4 xl:block`}>
          <StudioSources projectId={project.id} sources={project.sources} availableSources={availableSources} editable={editable} />
          <EvidenceBoard projectId={project.id} evidence={project.evidenceItems} sources={project.sources} editable={editable} />
        </Card>
        <Card className={`${tab === "writing" ? "block" : "hidden"} p-5 xl:block`}>
          <MotherContentEditor key={motherContent.version} projectId={project.id} initial={motherContent} editable={editable && project.status !== "ARCHIVED"} aiConfigured={ai.integrationStatus === "CONFIGURED" || ai.integrationStatus === "MOCK"} onRewriteRequest={(request) => { setRewriteRequest(request); setTab("brief"); }} />
        </Card>
        <Card className={`${tab === "brief" ? "block" : "hidden"} p-4 xl:block`}>
          <AICreationPanel projectId={project.id} integrationStatus={ai.integrationStatus} hasCreatorProfile={ai.hasCreatorProfile} editable={editable && project.status !== "ARCHIVED"} briefVersion={project.creativeBrief.version} motherVersion={motherContent.version} motherHasContent={Boolean(motherContent.body.trim())} recentRuns={ai.recentRuns} rewriteRequest={rewriteRequest} onMotherContentApplied={setAppliedMotherContent} />
          <div className="my-6 border-t" />
          <BriefEditor key={project.creativeBrief.version} projectId={project.id} initial={project.creativeBrief} editable={editable && project.status !== "ARCHIVED"} />
          <ProjectStatusPanel project={project} editable={editable} />
        </Card>
      </div>
    </>
  );
}
