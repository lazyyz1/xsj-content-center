import {personalContentActor,personalContentApiError} from "@/server/artifacts/personal-api";
import {addWorkReportToPool} from "@/server/research/work-research-service";
export async function POST(_request:Request,{params}:{params:Promise<{id:string;workId:string;runId:string}>}){
 try{const actor=await personalContentActor(),{id,workId,runId}=await params;return Response.json(await addWorkReportToPool(actor,id,workId,runId),{headers:{"cache-control":"no-store"}});}catch(error){return personalContentApiError(error);}
}
