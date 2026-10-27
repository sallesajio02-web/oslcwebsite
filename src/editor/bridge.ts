import { bundleResources, generatedHtml, sourceNodes, type Project } from "./model";

export type Layer = { selector: string; tag: string; label: string; depth: number; hidden: boolean; source: number | null; children: number };
export type Selection = { selector: string; tag: string; source: number | null; text: string; leaf: boolean; attrs: Record<string, string>; styles: Record<string, string>; inline: string; rect: { width: number; height: number }; };
export const properties = ["width", "height", "min-height", "max-width", "display", "position", "top", "left", "right", "bottom", "margin", "padding", "gap", "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "text-align", "color", "background-color", "border", "border-radius", "box-shadow", "object-fit", "object-position", "flex-direction", "justify-content", "align-items", "grid-template-columns", "opacity", "transform"];

// Runs only in the opaque-origin iframe. Imported scripts never run in the editor window.
function bridge(token: string, properties: string[]) {
  let selected: HTMLElement | null = null, editing = false, interactive = false, locked: string[] = [], lastLayers = "";
  const send = (kind: string, data: unknown) => parent.postMessage({ visualEditor: token, kind, data }, "*");
  const ignored = (el: Element) => !!el.closest("[data-vh-ui],script,style,link,meta,head,noscript");
  function selector(el: Element): string {
    if (el.tagName === "HTML") return "html";
    const parent = el.parentElement;
    if (!parent) return el.tagName.toLowerCase();
    const siblings = Array.from(parent.children).filter(n => n.tagName === el.tagName && !n.hasAttribute("data-vh-ui"));
    return selector(parent) + " > " + el.tagName.toLowerCase() + ":nth-of-type(" + (siblings.indexOf(el) + 1) + ")";
  }
  const source = (el: Element) => el.hasAttribute("data-vh-source") ? Number(el.getAttribute("data-vh-source")) : null;
  let box: HTMLDivElement, vertical: HTMLDivElement, horizontal: HTMLDivElement;
  function draw() {
    if (!box) return;
    if (!selected || !selected.isConnected || interactive) { box.style.display = "none"; return; }
    const r = selected.getBoundingClientRect();
    Object.assign(box.style, { display: "block", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
  }
  function report(el = selected) {
    if (!el) return;
    selected = el; const styles = getComputedStyle(el), rect = el.getBoundingClientRect();
    send("selection", { selector: selector(el), tag: el.tagName.toLowerCase(), source: source(el), text: el.textContent?.slice(0, 50000) || "", leaf: el.children.length === 0, attrs: Object.fromEntries(Array.from(el.attributes).filter(a => !a.name.startsWith("data-vh-")).map(a => [a.name, a.value])), inline: el.getAttribute("style") || "", styles: Object.fromEntries(properties.map(p => [p, styles.getPropertyValue(p)])), rect: { width: rect.width, height: rect.height } });
    draw();
  }
  function layers() {
    if (!document.body) return;
    const list: unknown[] = [];
    function visit(el: Element, depth: number) {
      if (ignored(el) || list.length >= 1800) return;
      list.push({ selector: selector(el), tag: el.tagName.toLowerCase(), label: el.id ? "#" + el.id : el.getAttribute("aria-label") || el.getAttribute("alt") || (el.children.length === 0 ? el.textContent?.trim().slice(0, 38) : el.classList[0]) || el.tagName.toLowerCase(), depth, hidden: getComputedStyle(el).display === "none", source: source(el), children: el.children.length });
      Array.from(el.children).forEach(child => visit(child, depth + 1));
    }
    visit(document.body, 0);
    const json = JSON.stringify(list); if (json !== lastLayers) { lastLayers = json; send("layers", list); }
  }
  function choose(el: HTMLElement) { if (!ignored(el) && !locked.includes(selector(el))) report(el); }
  document.addEventListener("click", event => {
    const el = event.target as HTMLElement;
    if (el.closest("[data-vh-ui]")) return;
    if (interactive) {
      const a = el.closest("a");
      if (a) { const href = a.getAttribute("href") || ""; if (!href.startsWith("#")) { event.preventDefault(); event.stopImmediatePropagation(); send("navigate", href); } }
      return;
    }
    if (editing) return;
    event.preventDefault(); event.stopImmediatePropagation(); choose(el);
  }, true);
  document.addEventListener("submit", event => { event.preventDefault(); send("notice", "Form submissions are disabled inside the sandbox. Export the site to test its backend."); }, true);
  document.addEventListener("dblclick", event => {
    if (interactive) return;
    const el = event.target as HTMLElement;
    if (ignored(el) || locked.includes(selector(el)) || el.children.length || /^(INPUT|TEXTAREA|SELECT|IMG|VIDEO|SVG)$/.test(el.tagName)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    selected = el; const original = el.textContent || ""; editing = true;
    el.contentEditable = "true"; el.focus();
    const finish = () => { el.removeAttribute("contenteditable"); editing = false; if (el.textContent !== original) send("edit", { kind: "text", value: el.textContent || "", selection: { selector: selector(el), source: source(el) } }); report(el); };
    el.addEventListener("blur", finish, { once: true });
    el.addEventListener("keydown", e => { if (e.key === "Escape") { el.textContent = original; el.blur(); } if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); el.blur(); } });
  }, true);
  let drag: { x: number; y: number; left: number; top: number; width: number; height: number; resize: boolean; transform: string } | null = null;
  function pointer(event: PointerEvent, resize: boolean) {
    if (!selected || interactive || locked.includes(selector(selected))) return;
    if (!resize && !event.altKey) return;
    if (selected === document.body || selected === document.documentElement) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const r = selected.getBoundingClientRect(); drag = { x: event.clientX, y: event.clientY, left: r.left, top: r.top, width: r.width, height: r.height, resize, transform: selected.style.transform || (getComputedStyle(selected).transform === "none" ? "" : getComputedStyle(selected).transform) };
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }
  document.addEventListener("pointerdown", event => { if (!(event.target as Element).closest("[data-vh-ui]")) pointer(event, false); }, true);
  document.addEventListener("pointermove", event => {
    if (!drag || !selected) return;
    let dx = Math.round((event.clientX - drag.x) / 8) * 8, dy = Math.round((event.clientY - drag.y) / 8) * 8;
    vertical.style.display = horizontal.style.display = "none";
    const container = selected.parentElement?.getBoundingClientRect();
    if (container) {
      const edgesX = [container.left, container.left + container.width / 2, container.right], edgesY = [container.top, container.top + container.height / 2, container.bottom];
      const targetX = drag.left + dx + (drag.resize ? drag.width : 0), targetY = drag.top + dy + (drag.resize ? drag.height : 0);
      const snapX = edgesX.find(edge => Math.abs(edge - targetX) <= 5), snapY = edgesY.find(edge => Math.abs(edge - targetY) <= 5);
      if (snapX !== undefined) { dx += snapX - targetX; Object.assign(vertical.style, { display: "block", left: snapX + "px" }); }
      if (snapY !== undefined) { dy += snapY - targetY; Object.assign(horizontal.style, { display: "block", top: snapY + "px" }); }
    }
    if (drag.resize) { selected.style.width = Math.max(8, drag.width + dx) + "px"; selected.style.height = Math.max(8, drag.height + dy) + "px"; }
    else selected.style.transform = `${drag.transform} translate(${dx}px, ${dy}px)`;
    box.style.borderStyle = "dashed"; draw();
  }, true);
  document.addEventListener("pointerup", () => {
    if (!drag || !selected) return;
    const selection = { selector: selector(selected), source: source(selected) };
    const changes = drag.resize ? [{ name: "width", value: selected.style.width }, { name: "height", value: selected.style.height }] : [{ name: "transform", value: selected.style.transform }];
    send("styles", { selection, changes }); drag = null; box.style.borderStyle = "solid"; vertical.style.display = horizontal.style.display = "none"; report();
  }, true);
  document.addEventListener("dragover", event => { if (event.dataTransfer?.types.includes("text/x-visual-element")) event.preventDefault(); });
  document.addEventListener("drop", event => { const html = event.dataTransfer?.getData("text/x-visual-element"); if (html && !interactive) { event.preventDefault(); choose(event.target as HTMLElement); send("insert", { html, selection: { selector: selector(event.target as HTMLElement), source: source(event.target as HTMLElement) } }); } });
  window.addEventListener("message", event => {
    if (event.source !== parent || event.data?.visualEditor !== token) return;
    const { kind, data } = event.data;
    if (kind === "apply") {
      const el = document.querySelector(data.selector) as HTMLElement | null;
      if (el) {
        for (const change of data.changes || []) {
          if (change.kind === "style") el.style.setProperty(change.name, change.value, change.important ? "important" : "");
          if (change.kind === "text" && el.textContent !== change.value) el.textContent = change.value;
          if (change.kind === "attribute") el.setAttribute(change.name, change.value);
        }
        requestAnimationFrame(() => { report(el); layers(); });
      }
    }
    if (kind === "css") {
      let style = document.querySelector('style[data-vh-live-css]');
      if (!style) { style = document.createElement("style"); style.setAttribute("data-vh-live-css", ""); document.head.append(style); }
      style.textContent = data;
      requestAnimationFrame(() => report());
    }
    if (kind === "initialize") {
      interactive = data.preview; locked = data.locks;
      const el = data.selector ? document.querySelector(data.selector) as HTMLElement : null;
      if (el) choose(el);
      send("initialized", null);
    }
    if (kind === "select") { const el = document.querySelector(data) as HTMLElement; if (el) { choose(el); const rect = el.getBoundingClientRect(); if (rect.top < 0 || rect.top > innerHeight) window.scrollTo({ top: Math.max(0, scrollY + rect.top - 40), behavior: "instant" }); } }
    if (kind === "parent" && selected?.parentElement && selected.parentElement !== document.documentElement) choose(selected.parentElement);
    if (kind === "mode") { interactive = data; draw(); }
    if (kind === "locks") locked = data;
    if (kind === "refresh") { layers(); report(); }
    if (kind === "style-preview" && selected) { selected.style.setProperty(data.name, data.value); draw(); }
  });
  const ready = () => {
    box = document.createElement("div"); box.setAttribute("data-vh-ui", "selection");
    box.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;border:2px solid #7756f6;box-sizing:border-box;display:none;";
    const handle = document.createElement("div"); handle.style.cssText = "position:absolute;right:-6px;bottom:-6px;width:12px;height:12px;background:white;border:2px solid #7756f6;pointer-events:auto;cursor:nwse-resize";
    handle.addEventListener("pointerdown", e => pointer(e, true)); box.append(handle); document.documentElement.append(box);
    vertical = document.createElement("div"); horizontal = document.createElement("div");
    for (const guide of [vertical, horizontal]) { guide.setAttribute("data-vh-ui", "guide"); guide.style.cssText = "position:fixed;z-index:2147483646;pointer-events:none;background:#ee69ad;display:none;"; document.documentElement.append(guide); }
    Object.assign(vertical.style, { top: "0", height: "100vh", width: "1px" }); Object.assign(horizontal.style, { left: "0", width: "100vw", height: "1px" });
    layers(); send("ready", null);
    let timer: ReturnType<typeof setTimeout>;
    new MutationObserver(records => {
      const relevant = records.some(r => !(r.target as Element).closest?.("[data-vh-ui],head") && (r.type !== "attributes" || ["id", "hidden", "aria-label", "alt"].includes(r.attributeName || "")));
      if (!relevant) return;
      clearTimeout(timer); timer = setTimeout(() => { layers(); draw(); }, 200);
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true, attributeFilter: ["id", "hidden", "aria-label", "alt"] });
    window.addEventListener("scroll", draw, true); window.addEventListener("resize", draw);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
  window.addEventListener("error", event => send("error", event.message));
  window.addEventListener("unhandledrejection", event => send("error", String(event.reason)));
}
export function previewDocument(project: Project, token: string, scripts: boolean) {
  let html = project.files[project.page].data;
  const patches = sourceNodes(html).map(n => ({ at: n.openEnd - (html.slice(n.openEnd - 2, n.openEnd) === "/>" ? 2 : 1), text: ` data-vh-source="${n.start}"` }));
  for (const patch of patches.sort((a, b) => b.at - a.at)) html = html.slice(0, patch.at) + patch.text + html.slice(patch.at);
  html = generatedHtml({ ...project, files: { ...project.files, [project.page]: { ...project.files[project.page], data: html } } }, project.page, true);
  const bundled = bundleResources(html, project);
  html = bundled.html.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi, "").replace(/<base\b[^>]*>/gi, "");
  if (!scripts) html = html.replace(/<script\b[\s\S]*?<\/script\s*>/gi, "");
  // CSP is placed before any imported resource, including malformed early head content.
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' data: blob:; style-src 'unsafe-inline' data: blob:; img-src data: blob:; font-src data: blob:; media-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'">`;
  const boot = `<script>{const __name=(target)=>target;(${bridge.toString()})(${JSON.stringify(token)},${JSON.stringify(properties)});}</script>`;
  html = html.replace(/<!doctype[^>]*>/i, "");
  return { html: "<!doctype html>" + csp + boot + html, missing: bundled.missing };
}
