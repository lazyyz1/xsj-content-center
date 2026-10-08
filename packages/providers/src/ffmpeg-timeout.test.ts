import {EventEmitter} from "node:events";
import {describe,it,expect,vi} from "vitest";
const state=vi.hoisted(()=>({kill:vi.fn()}));
vi.mock("node:child_process",()=>({spawn:()=>{const child=new EventEmitter();Object.assign(child,{stdout:new EventEmitter(),stderr:new EventEmitter(),kill:state.kill});return child;}}));
import {FFmpegMediaProcessor} from "./ffmpeg-media-processor";
describe("hung media processing",()=>{it("terminates a stuck child process within the configured timeout",async()=>{
 await expect(new FFmpegMediaProcessor({timeoutMs:20}).checkAvailability()).rejects.toMatchObject({code:"ASR_AUDIO_PROCESSING_TIMEOUT"});
 expect(state.kill).toHaveBeenCalledWith("SIGKILL");
});});
