export type ResearchObject =
 | {kind:"WORK"|"ACCOUNT"|"MATERIAL"|"NEWS"|"TREND";id:string;reportId?:string}
 | {kind:"COMPARE";ids:string[]}
 | {kind:"TOPIC";key:string};
export type ObjectResearchView = {
 object:ResearchObject;title:string;sessionId:string|null;
 runs:Array<{id:string;version:number;question:string;status:string;stage:string;errorMessage:string|null;blocks:import("@content-center/core").ResearchBlock[];createdAt:string}>;
};
