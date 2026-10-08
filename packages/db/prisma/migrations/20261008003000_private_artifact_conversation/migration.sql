-- Existing project artifacts retain WORKSPACE visibility. New private writers
-- explicitly set PRIVATE; classification never changes that visibility.
CREATE TYPE "ArtifactVisibility" AS ENUM ('PRIVATE', 'WORKSPACE');
ALTER TABLE "Artifact" ADD COLUMN "visibility" "ArtifactVisibility" NOT NULL DEFAULT 'WORKSPACE',
  ADD COLUMN "clientRequestId" TEXT, ADD COLUMN "creationRequestHash" TEXT;
ALTER TABLE "Artifact" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "DraftBranch" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "DraftRevision" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "AssistantThread" ALTER COLUMN "projectId" DROP NOT NULL,
  ADD COLUMN "artifactId" TEXT, ADD COLUMN "contextSnapshot" JSONB,
  ADD COLUMN "contextVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Artifact" DROP CONSTRAINT "Artifact_projectId_fkey";
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssistantThread" ADD CONSTRAINT "AssistantThread_artifactId_fkey"
  FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssistantThread" ADD CONSTRAINT "AssistantThread_content_target_check"
  CHECK ("artifactId" IS NULL OR ("canvasObjectId" IS NULL AND "projectId" IS NULL));
CREATE UNIQUE INDEX "AssistantThread_artifactId_key" ON "AssistantThread"("artifactId");
CREATE UNIQUE INDEX "Artifact_workspaceId_createdById_clientRequestId_key"
  ON "Artifact"("workspaceId", "createdById", "clientRequestId");
CREATE INDEX "Artifact_workspaceId_createdById_visibility_updatedAt_idx"
  ON "Artifact"("workspaceId", "createdById", "visibility", "updatedAt");
