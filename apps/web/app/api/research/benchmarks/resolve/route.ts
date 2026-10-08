import { canAddResearchAccount } from "@/server/experience-account";
import { getApiWorkspaceContext, apiError } from "@/server/api-access";
import { researchApiError } from "@/server/research/api";
import { discoveryApiError } from "@/server/discovery/api";
import { ResearchError } from "@/server/research/access";
import { resolveBenchmarkAccount } from "@/server/research/benchmark-import";
export async function POST(request:Request){
 const context=await getApiWorkspaceContext();if(!context)return apiError("UNAUTHORIZED",401);
 if(request.headers.get("origin")!==new URL(request.url).origin)return apiError("ORIGIN_DENIED",403);
 if(!canAddResearchAccount(context.role,context.session.user))return apiError("FORBIDDEN",403);
 try{return Response.json(await resolveBenchmarkAccount({workspaceId:context.workspace.id,userId:context.session.user.id},await request.json()));}
 catch(error){return error instanceof ResearchError?researchApiError(error):discoveryApiError(error);}
}
