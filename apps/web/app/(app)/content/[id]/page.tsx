import { notFound } from "next/navigation";
import { db } from "@content-center/db";
import { requireWorkspace } from "@/server/access";
import { ResearchError } from "@/server/research/access";
import { getPersonalContent } from "@/server/artifacts/personal";
import { getPersonalContentThread } from "@/server/assistant/personal-content";
import { getCreationModels } from "@/server/creation/models";
import { listResearchMaterials } from "@/server/research/service";
import { PersonalContentEditor } from "@/components/content/personal-content-editor";
import "@/components/content/content.css";
export default async function ContentPage({params}:{params:Promise<{id:string}>}) {
 const {workspace,session,role}=await requireWorkspace(),{id}=await params,actor={workspaceId:workspace.id,userId:session.user.id};
 try {
  const [content,thread,projects,materials,assets,model]=await Promise.all([
   getPersonalContent(actor,id),getPersonalContentThread(actor,id),
   db.contentProject.findMany({where:{workspaceId:workspace.id,status:{not:"ARCHIVED"}},select:{id:true,title:true},orderBy:{updatedAt:"desc"},take:100}),
   listResearchMaterials(actor),
   db.methodAsset.findMany({where:{workspaceId:workspace.id,ownerUserId:actor.userId,status:{not:"DISABLED"}},select:{versions:{orderBy:{version:"desc"},take:1,select:{id:true,title:true,version:true}}},take:100}),
   getCreationModels(workspace.id),
  ]);
  return <PersonalContentEditor key={content.artifactId} initial={content} thread={thread} canWrite={role!=="VIEWER"} projects={projects} materials={materials} skills={assets.flatMap(asset=>asset.versions)} model={model}/>;
 } catch(error) { if(error instanceof ResearchError&&error.status===404)notFound();throw error; }
}
