import {getApiWorkspaceContext,apiError} from "@/server/api-access";
import {researchApiError} from "@/server/research/api";
import {discoveryApiError} from "@/server/discovery/api";
import {ResearchError} from "@/server/research/access";
import {importWorkForReport} from "@/server/research/work-research-service";
export async function POST(request:Request){
 const context=await getApiWorkspaceContext();if(!context)return apiError("UNAUTHORIZED",401);
 if(request.headers.get("origin")!==new URL(request.url).origin)return apiError("ORIGIN_DENIED",403);
 try{return Response.json(await importWorkForReport({workspaceId:context.workspace.id,userId:context.session.user.id},await request.json()),{headers:{"cache-control":"no-store"}});}catch(error){return error instanceof ResearchError?researchApiError(error):discoveryApiError(error);}
}
