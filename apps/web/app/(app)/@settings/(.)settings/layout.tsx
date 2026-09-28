import { requireWorkspace } from "@/server/access";
import { SettingsWindow } from "@/components/settings-window";
export default async function ModalLayout({children}:{children:React.ReactNode}) { const {workspace}=await requireWorkspace(); return <SettingsWindow name={workspace.name} intercepted>{children}</SettingsWindow>; }
