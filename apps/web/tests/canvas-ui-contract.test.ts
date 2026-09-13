import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Phase 9C-1 canvas UI contract", () => {
  it("keeps system cards virtual and layers server CanvasObjects beside them", async () => {
    const canvas = await readFile(new URL("../components/projects/content-canvas.tsx", import.meta.url), "utf8");
    expect(canvas).toContain("return [...systemNodes, ...objectNodes]");
    expect(canvas).toContain("nodes.filter((node) => node.type === \"card\")");
    expect(canvas).toContain("edges={relationEdges}");
    expect(canvas).toContain('className: "canvas-generated-edge"');
  });

  it("supports direct text editing, 600ms autosave, recovery, resize and scoped shortcuts", async () => {
    const [canvas, freeNode] = await Promise.all([
      readFile(new URL("../components/projects/content-canvas.tsx", import.meta.url), "utf8"),
      readFile(new URL("../components/projects/canvas-free-node.tsx", import.meta.url), "utf8"),
    ]);
    expect(canvas).toContain("window.setTimeout(() => void flushTextRef.current(objectId), 600)");
    expect(canvas).toContain("canvas-text-recovery:");
    expect(canvas).toContain("expectedContentVersion");
    expect(canvas).toContain("expectedLayoutVersion");
    expect(canvas).toContain("event.target instanceof HTMLElement");
    expect(freeNode).toContain('aria-label="文本内容"');
    expect(freeNode).toContain("NodeResizer");
    expect(freeNode).toContain("从这里继续添加内容");
  });
});
