import {notFound} from "next/navigation";
import {isLocalReviewOffline} from "@content-center/providers";
import {requireWorkspace} from "@/server/access";
import {ResearchError} from "@/server/research/access";
import {researchBenchmarkDossier} from "@/server/research/benchmark-dossier";
import {BenchmarkDossierPage} from "@/components/research/benchmark-dossier";
import "@/components/research/benchmark-dossier.css";
export default async function AccountAnalysis({params}:{params:Promise<{id:string}>}){
 const {workspace,session,role}=await requireWorkspace(),{id}=await params;
 try{const data=await researchBenchmarkDossier({workspaceId:workspace.id,userId:session.user.id},id);return <BenchmarkDossierPage data={data} canWrite={role!=="VIEWER"} externalAvailable={!isLocalReviewOffline()}/>;}catch(error){if(error instanceof ResearchError&&error.status===404)notFound();throw error;}
}
