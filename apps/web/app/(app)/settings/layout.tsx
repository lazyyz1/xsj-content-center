import { SettingsWindow } from "@/components/settings-window";
import { requireWorkspace } from "@/server/access";
import "@/components/settings-v1.css";
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { workspace } = await requireWorkspace();
  return <SettingsWindow name={workspace.name}>{children}</SettingsWindow>;
}
