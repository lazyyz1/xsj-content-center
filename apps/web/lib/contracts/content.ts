import type { ResearchBlock } from "@content-center/core";
import type { ArtifactView } from "./artifacts";
import type { DraftRevisionDTO } from "../../server/drafts/service";

export type AdoptedResearch = {
  kind: "run" | "study";
  sourceId: string;
  version: number;
  title: string;
  adoptedAt: string;
  fingerprint: string;
  blocks: ResearchBlock[];
};
export type ContentContextSnapshot = { schemaVersion: "content-context-v1"; adoptedResearch: AdoptedResearch[]; ownAngle: string; sourceItemIds: string[]; skillVersionIds: string[] };
export type PersonalContentView = ArtifactView & {
  projectId: string | null;
  projectTitle: string | null;
  visibility: "PRIVATE";
  threadId: string;
  contextVersion: number;
  ownAngle: string;
  sourceItemIds: string[];
  skillVersionIds: string[];
  references: AdoptedResearch[];
  revisions: DraftRevisionDTO[];
};
