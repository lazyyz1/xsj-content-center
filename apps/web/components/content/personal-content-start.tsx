"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { guardedArtifactNavigation } from "../projects/use-artifact-editor";
export function PersonalContentStart({ canWrite, label = "写自己的内容" }: { canWrite: boolean; label?: string }) {
 const router = useRouter(), requestId = useRef<string | null>(null), lock = useRef(false);
 const [busy,setBusy] = useState(false), [error,setError] = useState("");
 async function begin() {
  if(lock.current || !canWrite) return; lock.current=true; setBusy(true); setError(""); requestId.current ||= crypto.randomUUID();
  try {
   const response=await fetch("/api/artifacts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({clientRequestId:requestId.current})}), value=await response.json();
   if(!response.ok) throw Error(value.message || "暂时没有创建成功，请重试。");
   requestId.current=null; router.push(value.href);
  } catch(cause) { setError(cause instanceof Error?cause.message:"网络暂时不可用。"); } finally { lock.current=false;setBusy(false); }
 }
 return <span className="personal-content-start"><button type="button" className="research-button research-primary" disabled={!canWrite||busy} onClick={()=>guardedArtifactNavigation(()=>void begin())}><Plus size={15}/>{busy?"正在打开…":label}</button>{error?<small role="alert">{error}</small>:null}</span>;
}
