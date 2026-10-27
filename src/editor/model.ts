import { parse, type DefaultTreeAdapterMap } from "parse5";
import { unzipSync, zipSync, strToU8, strFromU8 } from "fflate";

export type Asset = { data: string; type: string };
export type RuntimeEdit = { selector: string; kind: "style" | "text" | "attribute" | "delete" | "duplicate" | "insert" | "move"; name?: string; value: string; breakpoint?: number };
export type Project = { version: 1; name: string; page: string; files: Record<string, Asset>; edits: Record<string, RuntimeEdit[]>; css: Record<string, string>; locks: string[] };
type Node = DefaultTreeAdapterMap["node"];
export type SourceNode = { start: number; end: number; openEnd: number; closeStart: number; tag: string; selector: string; attrs: Record<string, string> };
const mime: Record<string, string> = { html: "text/html", htm: "text/html", css: "text/css", js: "text/javascript", mjs: "text/javascript", json: "application/json", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", ico: "image/x-icon", woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", mp4: "video/mp4" };
export const typeFor = (name: string) => mime[name.split(".").pop()?.toLowerCase() || ""] || "application/octet-stream";
export function normalize(name: string) { const out: string[] = []; for (const bit of name.replaceAll("\\", "/").split("/")) { if (bit === "..") out.pop(); else if (bit && bit !== ".") out.push(bit); } return out.join("/"); }
export function resolvePath(page: string, ref: string) { return normalize(ref.startsWith("/") ? ref : page.slice(0, page.lastIndexOf("/") + 1) + ref); }
export function relativePath(page: string, target: string) { const from = normalize(page).split("/").slice(0, -1), to = normalize(target).split("/"); while (from.length && from[0] === to[0]) { from.shift(); to.shift(); } return "../".repeat(from.length) + to.join("/"); }
export const textFile = (value: string, type = "text/html"): Asset => ({ data: value, type });
export const isText = (type: string) => /^(text\/)|javascript|json|svg/.test(type);
export function bytes(asset: Asset) { return isText(asset.type) ? strToU8(asset.data) : Uint8Array.from(atob(asset.data), c => c.charCodeAt(0)); }
export function dataUrl(asset: Asset) { if (!isText(asset.type)) return `data:${asset.type};base64,${asset.data}`; return `data:${asset.type};base64,${btoa(Array.from(strToU8(asset.data), x => String.fromCharCode(x)).join(""))}`; }
export function fromBytes(name: string, data: Uint8Array): Asset { const type = typeFor(name); return { type, data: isText(type) ? strFromU8(data) : btoa(Array.from(data, x => String.fromCharCode(x)).join("")) }; }
export async function importFiles(files: FileList | File[], current?: Project): Promise<Project> {
  const imported: Record<string, Asset> = {};
  let total = 0;
  for (const file of Array.from(files)) {
    if (file.size > 80 * 1024 * 1024) throw new Error("Import files smaller than 80 MB.");
    const raw = new Uint8Array(await file.arrayBuffer());
    if (/\.zip$/i.test(file.name)) {
      const contents = unzipSync(raw, { filter: entry => { if (entry.originalSize > 80 * 1024 * 1024) throw new Error("ZIP entry exceeds 80 MB."); total += entry.originalSize; if (total > 150 * 1024 * 1024) throw new Error("ZIP exceeds 150 MB unpacked."); return !entry.name.endsWith("/"); } });
      for (const [name, content] of Object.entries(contents)) imported[normalize(name)] = fromBytes(name, content);
    } else imported[normalize(file.webkitRelativePath || file.name)] = fromBytes(file.name, raw);
  }
  const merged = { ...(current?.files || {}), ...imported };
  const pages = Object.keys(merged).filter(p => /\.html?$/i.test(p));
  const page = current?.page || pages.find(p => /(^|\/)index\.html$/i.test(p)) || pages[0];
  if (!page) throw new Error("Choose an HTML file or ZIP containing HTML first.");
  return { version: 1, name: current?.name || page.split("/").pop()!, page, files: merged, edits: current?.edits || {}, css: current?.css || {}, locks: current?.locks || [] };
}
const nodeCache = new Map<string, SourceNode[]>();
export function sourceNodes(html: string): SourceNode[] {
  const cached = nodeCache.get(html);
  if (cached) return cached;
  const root = parse(html, { sourceCodeLocationInfo: true });
  const nodes: SourceNode[] = [];
  function visit(node: Node, parent: string) {
    let selector = parent;
    if ("tagName" in node) {
      const siblings = node.parentNode && "childNodes" in node.parentNode ? node.parentNode.childNodes.filter(n => "tagName" in n && n.tagName === node.tagName) : [node];
      selector = parent ? `${parent} > ${node.tagName}:nth-of-type(${siblings.indexOf(node) + 1})` : node.tagName;
      const loc = node.sourceCodeLocation;
      if (loc?.startTag) nodes.push({ start: loc.startOffset, end: loc.endOffset, openEnd: loc.startTag.endOffset, closeStart: loc.endTag?.startOffset ?? loc.endOffset, tag: node.tagName, selector, attrs: Object.fromEntries(node.attrs.map(a => [a.name, a.value])) });
    }
    if ("childNodes" in node) node.childNodes.forEach(n => visit(n, selector));
  }
  visit(root, "");
  if (nodeCache.size >= 3) nodeCache.delete(nodeCache.keys().next().value!);
  nodeCache.set(html, nodes);
  return nodes;
}
export const escapeAttr = (value: string) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
export const escapeText = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
export function appendInlineStyles(original: string, changes: { name: string; value: string; important?: boolean }[]) {
  // Keep vendor, experimental and unknown declarations byte-for-byte. Later declarations override earlier ones.
  return original + (original.trim() && !original.trimEnd().endsWith(";") ? ";" : "") + changes.map(c => ` ${c.name}: ${c.value || "revert"}${c.important ? " !important" : ""};`).join("");
}
export function patchAttribute(html: string, node: SourceNode, name: string, value: string) {
  if (!/^[a-zA-Z_:][\w:.-]*$/.test(name) || /^on/i.test(name) || name === "srcdoc") throw new Error("Use the code panel for executable attributes.");
  const tree = parse(html, { sourceCodeLocationInfo: true }); let location: { startOffset: number; endOffset: number } | undefined;
  function find(n: Node) { if ("tagName" in n && n.sourceCodeLocation?.startOffset === node.start) location = n.sourceCodeLocation.attrs?.[name.toLowerCase()]; if ("childNodes" in n) n.childNodes.forEach(find); }
  find(tree);
  if (location) return html.slice(0, location.startOffset) + `${name}="${escapeAttr(value)}"` + html.slice(location.endOffset);
  const pos = node.openEnd - (html.slice(node.openEnd - 2, node.openEnd) === "/>" ? 2 : 1);
  return html.slice(0, pos) + ` ${name}="${escapeAttr(value)}"` + html.slice(pos);
}
export function patchNode(html: string, node: SourceNode, kind: RuntimeEdit["kind"], value: string, name?: string): string {
  if (kind === "attribute") return patchAttribute(html, node, name!, value);
  if (kind === "text") return html.slice(0, node.openEnd) + escapeText(value) + html.slice(node.closeStart);
  if (kind === "delete") return html.slice(0, node.start) + html.slice(node.end);
  if (kind === "duplicate") return html.slice(0, node.end) + html.slice(node.start, node.end).replace(/\s+id\s*=\s*("[^"]*"|'[^']*')/gi, "") + html.slice(node.end);
  if (kind === "insert") return html.slice(0, node.closeStart) + value + html.slice(node.closeStart);
  if (kind === "move") {
    const nodes = sourceNodes(html), siblings = nodes.filter(n => n.selector.slice(0, n.selector.lastIndexOf(" > ")) === node.selector.slice(0, node.selector.lastIndexOf(" > ")));
    const index = siblings.findIndex(n => n.start === node.start), other = siblings[index + (value === "up" ? -1 : 1)];
    if (!other) return html;
    const a = other.start < node.start ? other : node, b = other.start < node.start ? node : other;
    return html.slice(0, a.start) + html.slice(b.start, b.end) + html.slice(a.end, b.start) + html.slice(a.start, a.end) + html.slice(b.end);
  }
  return html;
}

// This function is serialized into exports; it deliberately has no editor dependencies.
export function replayEdits(edits: RuntimeEdit[]) {
  const done = new Map<number, Element>();
  const structural = new Set<number>();
  function run() {
    edits.forEach((edit, index) => {
      if (structural.has(index)) return;
      const el = document.querySelector(edit.selector) as HTMLElement | null;
      if (!el || done.get(index) === el) return;
      if (edit.kind === "style") { if (el.style.getPropertyValue(edit.name!) !== edit.value) el.style.setProperty(edit.name!, edit.value); }
      if (edit.kind === "attribute" && el.getAttribute(edit.name!) !== edit.value) el.setAttribute(edit.name!, edit.value);
      if (edit.kind === "text" && el.textContent !== edit.value) el.textContent = edit.value;
      if (edit.kind === "insert") el.insertAdjacentHTML("beforeend", edit.value);
      if (edit.kind === "duplicate") { const clone = el.cloneNode(true) as Element; clone.removeAttribute("id"); el.after(clone); }
      if (edit.kind === "delete") el.remove();
      if (edit.kind === "move") { const other = edit.value === "up" ? el.previousElementSibling : el.nextElementSibling; if (other) edit.value === "up" ? other.before(el) : other.after(el); }
      if (["insert", "duplicate", "delete", "move"].includes(edit.kind)) structural.add(index);
      done.set(index, el);
    });
  }
  let queued = false;
  const observer = new MutationObserver(() => { if (!queued) { queued = true; queueMicrotask(() => { queued = false; run(); }); } });
  const start = () => { run(); observer.observe(document.documentElement, { childList: true, subtree: true }); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
}
export function generatedHtml(project: Project, page = project.page, embed = false): string {
  let html = project.files[page].data;
  const css = project.css[page] || "", edits = (project.edits[page] || []).map(edit => { if (embed && edit.kind === "attribute" && ["src", "poster"].includes(edit.name || "") && !/^(data:|https?:|blob:)/.test(edit.value)) { const asset = project.files[resolvePath(page, edit.value)]; if (asset) return { ...edit, value: dataUrl(asset) }; } return edit; });
  const additions = `${css ? `<style data-design-overrides>${css.replaceAll("</style", "<\\/style")}</style>` : ""}${edits.length ? `<script data-design-replay>{const __name=(target)=>target;(${replayEdits.toString()})(${JSON.stringify(edits).replaceAll("<", "\\u003c")});}</script>` : ""}`;
  const end = html.toLowerCase().lastIndexOf("</body>");
  return end < 0 ? html + additions : html.slice(0, end) + additions + html.slice(end);
}
export function bundleResources(html: string, project: Project, page = project.page, embedded = true): { html: string; missing: string[] } {
  const missing = new Set<string>(), cache = new Map<string, string>();
  function resource(ref: string, owner: string, chain: string[] = []): string {
    if (!ref || /^(data:|blob:|https?:|\/\/|#|mailto:|tel:|javascript:)/i.test(ref)) return ref;
    const [pathname] = ref.split(/[?#]/), key = resolvePath(owner, decodeURIComponent(pathname)), fragment = ref.includes("#") ? ref.slice(ref.indexOf("#")) : "";
    const asset = project.files[key];
    if (!asset) { missing.add(key); return ref; }
    if (!embedded || chain.includes(key)) return ref;
    if (cache.has(key)) return cache.get(key)! + fragment;
    let data = asset.data;
    if (asset.type === "text/css") data = cssResources(data, key, [...chain, key]);
    if (asset.type === "text/javascript") data = data.replace(/(\b(?:from|import)\s*\(?\s*["'])(\.{1,2}\/[^"']+)(["'])/g, (_, before, url, after) => before + resource(url, key, [...chain, key]) + after);
    const result = dataUrl({ ...asset, data }); cache.set(key, result); return result + fragment;
  }
  function cssResources(css: string, owner: string, chain: string[] = []) { return css.replace(/url\(\s*(["']?)([^)'"\s]+)\1\s*\)/g, (_, quote, url) => `url("${resource(url, owner, chain)}")`).replace(/(@import\s+)(["'])([^"']+)\2/g, (_, start, quote, url) => `${start}"${resource(url, owner, chain)}"`); }
  const nodes = sourceNodes(html), patches: { start: number; end: number; text: string }[] = [];
  // Patch source ranges, never parse/serialize the complete imported document.
  for (const node of nodes) {
    let tag = html.slice(node.start, node.openEnd);
    for (const attr of ["src", "poster", ...(node.tag === "link" ? ["href"] : [])]) {
      if (node.attrs[attr]) { const next = resource(node.attrs[attr], page); if (next !== node.attrs[attr]) tag = patchAttribute(tag, { ...node, start: 0, openEnd: tag.length }, attr, next); }
    }
    if (node.attrs.srcset && !node.attrs.srcset.includes("data:")) { const next = node.attrs.srcset.split(",").map(entry => { const [url, ...size] = entry.trim().split(/\s+/); return resource(url, page) + (size.length ? " " + size.join(" ") : ""); }).join(", "); tag = patchAttribute(tag, { ...node, start: 0, openEnd: tag.length }, "srcset", next); }
    if (node.attrs.style) tag = patchAttribute(tag, { ...node, start: 0, openEnd: tag.length }, "style", cssResources(node.attrs.style, page));
    if (tag !== html.slice(node.start, node.openEnd)) patches.push({ start: node.start, end: node.openEnd, text: tag });
    if (node.tag === "style") patches.push({ start: node.openEnd, end: node.closeStart, text: cssResources(html.slice(node.openEnd, node.closeStart), page) });
  }
  for (const patch of patches.sort((a, b) => b.start - a.start)) html = html.slice(0, patch.start) + patch.text + html.slice(patch.end);
  return { html, missing: [...missing] };
}
export function exportZip(project: Project) { const files: Record<string, Uint8Array> = {}; for (const [name, asset] of Object.entries(project.files)) files[name] = /\.html?$/i.test(name) ? strToU8(generatedHtml(project, name)) : bytes(asset); return zipSync(files); }
export function validateProject(value: unknown): Project {
  const p = value as Project;
  if (p?.version !== 1 || typeof p.name !== "string" || typeof p.page !== "string" || !p.files || !p.files[p.page] || !p.edits || !p.css || !Array.isArray(p.locks)) throw new Error("Invalid visual editor project.");
  for (const [name, asset] of Object.entries(p.files)) if (normalize(name) !== name || typeof asset.data !== "string" || typeof asset.type !== "string") throw new Error("Invalid project file.");
  for (const edits of Object.values(p.edits)) if (!Array.isArray(edits) || edits.some(e => typeof e.selector !== "string" || typeof e.value !== "string" || !["style", "text", "attribute", "delete", "duplicate", "insert", "move"].includes(e.kind))) throw new Error("Invalid edit history.");
  return p;
}
