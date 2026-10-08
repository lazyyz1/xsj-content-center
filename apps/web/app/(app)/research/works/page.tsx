import {redirect} from "next/navigation";
/** Existing work-queue URLs now address the same account/work library. */
export default async function ResearchWorks({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const value=await searchParams,query=new URLSearchParams();
 if(value.q)query.set("workQuery",value.q);
 if(value.accountId)query.set("accountId",value.accountId);
 if(value.platform)query.set("platform",value.platform);
 query.set("period",["3","7","30"].includes(value.days||"")?value.days!:"all");
 query.set("view",["all","unread","favorites","read","dismissed"].includes(value.view||"")?value.view!:"unread");
 redirect("/research/benchmarks?"+query+"#works");
}
