/** Display formatting only: saved source titles and evidence are never rewritten. */
export function researchTitle(title: string) {
  return title.split("#")[0]?.trim() || title;
}
export function researchTopics(title: string) {
  return [...title.matchAll(/#([^\s#]+)/g)].map(match => match[1]!);
}
export function researchCount(value: number | null) {
  return value === null ? "—" : value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value.toLocaleString("zh-CN");
}
export function researchDuration(value: number | null) {
  return value === null ? "时长未提供" : `${Math.floor(value / 60000)}:${String(Math.floor(value / 1000) % 60).padStart(2, "0")}`;
}
