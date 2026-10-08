import {describe,it,expect} from "vitest";
import {transcriptionAvailable} from "./quality-resolver";
describe("transcription readiness",()=>{
 const base={disabled:false,source:"LOCAL_FUNASR" as const,qualityMode:"BALANCED" as const,selectionMode:"AUTO" as const,fallbackToDoubao:false,doubaoConfigured:true,local:{status:"NORMAL",models:[{key:"SENSEVOICE_SMALL" as const,installed:true,supported:true}],qualityModes:{BALANCED:{available:false,installed:false}}}};
 it("uses the selected manual model instead of the automatic profile",()=>expect(transcriptionAvailable({...base,selectionMode:"MANUAL",manualModel:"SENSEVOICE_SMALL"})).toBe(true));
 it("does not enable fallback unless explicitly configured",()=>{expect(transcriptionAvailable(base)).toBe(false);expect(transcriptionAvailable({...base,fallbackToDoubao:true})).toBe(true);});
 it("rejects disabled transcription even with a configured cloud service",()=>expect(transcriptionAvailable({...base,source:"DOUBAO",disabled:true})).toBe(false));
 it("rejects missing models and unconfigured cloud service",()=>{expect(transcriptionAvailable({...base,selectionMode:"MANUAL",manualModel:"FUN_ASR_NANO"})).toBe(false);expect(transcriptionAvailable({...base,source:"DOUBAO",doubaoConfigured:false})).toBe(false);});
});
