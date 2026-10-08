import {after} from "next/server";
import {researchApiActor,researchApiError} from "@/server/research/api";
import {getObjectResearch,startObjectResearch} from "@/server/research/object-sessions";
import {executeResearchRun} from "@/server/research/service";
export const maxDuration=900;
export async function GET(request:Request){
 try{const raw=new URL(request.url).searchParams.get("object");if(!raw)return Response.json({message:"请选择研究对象。"}, {status:400});return Response.json(await getObjectResearch(await researchApiActor(),JSON.parse(raw)),{headers:{"cache-control":"no-store"}});}catch(error){return researchApiError(error);}
}
export async function POST(request:Request){
 try{const actor=await researchApiActor(),result=await startObjectResearch(actor,await request.json());if(result.created)after(()=>executeResearchRun(actor,result.sessionId,result.runId));return Response.json(result,{status:202,headers:{"cache-control":"no-store"}});}catch(error){return researchApiError(error);}
}
