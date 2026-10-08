import { researchApiActor, researchApiError } from "@/server/research/api";
import { attachWorkSource } from "@/server/research/work-research-service";
export async function POST(request:Request,route:{params:Promise<{id:string;workId:string}>}) {
 try { const actor=await researchApiActor();const {id,workId}=await route.params;
 return Response.json(await attachWorkSource(actor,id,workId,await request.json()));
 } catch(error){return researchApiError(error);}
}
