import type {WorkDeepAnswer,WorkDeepAnswerV2} from "@/server/research/work-research-contract";
type Block=WorkDeepAnswer["structureBlocks"][number]|WorkDeepAnswerV2["structureBlocks"][number];
export function reportStructure(blocks:Block[]){
 const timed=blocks.length>0&&blocks.every((block,index)=>block.startMs!==null&&block.endMs!==null&&block.endMs>block.startMs&&(index===0||block.startMs>=(blocks[index-1]!.endMs??0)));
 const start=timed?blocks[0]!.startMs!:0,end=timed?blocks.at(-1)!.endMs!:0,span=end-start;
 const assessed=blocks.length>0&&blocks.every(block=>block.display&&block.display.mainlineRelation!=="UNCERTAIN"),detours=blocks.filter(block=>block.display?.mainlineRelation==="DETOUR"),covered=timed?blocks.reduce((sum,block)=>sum+block.endMs!-block.startMs!,0):0;
 const detourMs=timed&&assessed?detours.reduce((sum,block)=>sum+block.endMs!-block.startMs!,0):null;
 const nodes=blocks.map((block,index)=>{const label=block.display?.label??block.role;const tone=block.display?.mainlineRelation==="DETOUR"?"detour":/钩子|开场|开头|引入/.test(label)?"opening":/收束|结尾|总结|结束/.test(label)?"closing":/案例|故事|演示|证据|证明/.test(label)?"example":/论点|观点|主张|判断|解释/.test(label)?"argument":/背景|过渡|承接|铺垫/.test(label)?"transition":"other";return {block,label,tone,index,left:timed?(block.startMs!-start)/span*100:null,width:timed?(block.endMs!-block.startMs!)/span*100:null};});
 const toneNames:Record<string,string>={opening:"开场",closing:"收束",example:"案例与证据",argument:"观点",transition:"背景与承接",detour:"偏离主线",other:"其他推进"};
 const legend=Array.from(new Map(nodes.map(node=>[node.tone,{label:toneNames[node.tone]!,tone:node.tone}])).values());
 return {timed,start,end,span,nodes,legend,assessed,detourCount:detours.length,detourMs,detourPercent:detourMs!==null&&covered>0?detourMs/covered*100:null};
}
