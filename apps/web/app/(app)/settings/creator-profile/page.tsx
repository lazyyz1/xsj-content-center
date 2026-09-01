import { Card } from "@content-center/ui";
import { CreatorProfileForm } from "@/components/settings/creator-profile-form";
import { PageHeader } from "@/components/page";
import { requireWorkspace } from "@/server/access";
import { getCreatorProfile } from "@/server/creator-profile-service";

function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }

export default async function CreatorProfilePage() {
  const { session, workspace } = await requireWorkspace();
  const profile = await getCreatorProfile(workspace.id, session.user.id);
  const initial = { displayName: profile?.displayName || session.user.name, positioning: profile?.positioning || "", targetAudience: profile?.targetAudience || "", tone: profile?.tone || "", preferredStyle: profile?.preferredStyle || "", forbiddenStyle: profile?.forbiddenStyle || "", coreTopics: strings(profile?.coreTopics), personalViews: strings(profile?.personalViews), brandTerms: strings(profile?.brandTerms), forbiddenTerms: strings(profile?.forbiddenTerms), hookPreferences: strings(profile?.hookPreferences), structurePreferences: strings(profile?.structurePreferences), ctaPreferences: strings(profile?.ctaPreferences), examplePhrases: strings(profile?.examplePhrases), notes: profile?.notes || "" };
  return <><PageHeader title="个人创作画像" description="这些偏好会作为 AI 创作上下文；没有画像时仍可仅使用项目上下文。" /><Card className="mx-auto max-w-3xl p-6"><CreatorProfileForm initial={initial} /></Card></>;
}
