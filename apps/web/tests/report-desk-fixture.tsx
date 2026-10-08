import React from "react";
import {sampleAnswerV2,sampleEvidence} from "./work-research-fixture";
import type {WorkResearchView} from "../server/research/work-research-service";
export function reportDeskProps(){
 const item={id:"report-current",workId:"work",accountId:"account",accountName:"老师",title:"这条怎么写 #话题",summary:"内容推进",version:9,date:"2026-10-08T00:00:00Z",nodes:3,archived:false};
 const view={account:{name:"老师",platform:"DOUYIN"},current:sampleEvidence,sourceJob:null,sessionId:"session",latest:{id:item.id,sessionId:"session",version:9,saved:false,schemaVersion:"work-research-v2",finishedAt:item.date,model:null,evidence:sampleEvidence,answer:sampleAnswerV2(),currentEvidence:true,currentContent:true},active:null,failure:null,history:[{id:item.id,sessionId:"session",version:9,saved:false,date:item.date,fingerprint:sampleEvidence.fingerprint},{id:"report-old",sessionId:"session",version:1,saved:false,date:item.date,fingerprint:sampleEvidence.fingerprint}]} as WorkResearchView;
 return {library:{items:[item,{...item,id:"report-next",workId:"work-next"}],selected:item,count:2,activeCount:2,archivedCount:0,pages:1,page:1,bounded:false},view,baseline:{median:10,samples:8},canWrite:true,query:"report=report-current",original:<p>完整原文与视频</p>,operations:<p>关联资料与重新拆解</p>};
}
