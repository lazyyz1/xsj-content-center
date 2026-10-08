import {after} from "next/server";
import {getApiWorkspaceContext,apiError} from "@/server/api-access";
import {canAddResearchAccount} from "@/server/experience-account";
import {researchApiError} from "@/server/research/api";
import {manualBenchmarkSyncStatus,startManualBenchmarkSync,executeManualBenchmarkSync} from "@/server/research/benchmark-sync";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const context=await getApiWorkspaceContext();if(!context)return apiError("UNAUTHORIZED",401);
 try{const{id}=await params;return Response.json(await manualBenchmarkSyncStatus({workspaceId:context.workspace.id,userId:context.session.user.id},id));}catch(error){return researchApiError(error);}
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const context=await getApiWorkspaceContext();if(!context)return apiError("UNAUTHORIZED",401);
 if(request.headers.get("origin")!==new URL(request.url).origin)return apiError("ORIGIN_DENIED",403);
 if(!canAddResearchAccount(context.role,context.session.user))return apiError("FORBIDDEN",403);
 try{const{id}=await params,actor={workspaceId:context.workspace.id,userId:context.session.user.id};const input=await request.text();const result=await startManualBenchmarkSync(actor,id,input.trim()?JSON.parse(input):{});after(()=>executeManualBenchmarkSync(actor,id,result.run.id));return Response.json(result,{status:202});}catch(error){return error instanceof SyntaxError?apiError("INVALID_INPUT",400,"请检查同步参数。"):researchApiError(error);}
}
