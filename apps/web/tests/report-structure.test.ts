import {describe,it,expect} from "vitest";
import {reportStructure} from "../lib/report-structure";
import {sampleAnswer} from "./work-research-fixture";
describe("report structure evidence and navigation",()=>{
 it("does not call an old unassessed report zero-detour",()=>{const model=reportStructure(sampleAnswer().structureBlocks);expect(model.assessed).toBe(false);expect(model.detourMs).toBeNull();expect(model.detourPercent).toBeNull();});
 it("uses real intervals including gaps and counts detours only from saved assessments",()=>{const blocks=sampleAnswer().structureBlocks;blocks.forEach((block,index)=>{block.display={label:index===1?"补充":"观点",summary:"该段实际内容",mainlineRelation:index===1?"DETOUR":"SERVES",mainlineReason:"依据引用判断"};});blocks[1]!.startMs=7000;const result=reportStructure(blocks);expect(result.nodes[1]!.left).toBeCloseTo(7000/18000*100);expect(result.nodes[1]!.width).toBeCloseTo(5000/18000*100);expect(result.detourMs).toBe(5000);expect(result.detourPercent).toBeCloseTo(5000/17000*100);expect(result.nodes[1]!.tone).toBe("detour");});
 it("uses paragraph counts rather than fake seconds when times are absent",()=>{const blocks=sampleAnswer().structureBlocks.map(block=>({...block,startMs:null,endMs:null,display:{label:"观点",summary:"内容",mainlineRelation:"SERVES" as const,mainlineReason:"服务主线"}}));const result=reportStructure(blocks);expect(result.assessed).toBe(true);expect(result.timed).toBe(false);expect(result.detourCount).toBe(0);expect(result.detourMs).toBeNull();expect(result.nodes.every(node=>node.width===null)).toBe(true);});
});
