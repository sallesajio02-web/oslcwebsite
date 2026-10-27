import { build } from "vite";
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

// Export the existing public components, styles and local images as one file.
const migration = await readFile("migrations/001_initial.sql", "utf8");
const initial = migration.match(/VALUES \('site', '(.+?)'(?:\:\:jsonb)?\)/s);
if (!initial) throw new Error("Cannot locate initial public site content");
const site = { ...JSON.parse(initial[1].replaceAll("''", "'")), demoMode: true,
  categories: [], capabilities: [], gallery: [], leadership: [], events: [], employees: [], logoImage: "/brand/oslc-logo.webp" };
const result = await build({ build: { write: false, minify: true, rollupOptions: {
  input: "src/html-preview.tsx", output: { format: "iife", inlineDynamicImports: true },
} } });
const output = (Array.isArray(result) ? result[0] : result).output;
let js = output.filter(x => x.type === "chunk").map(x => x.code).join("\n");
let css = output.filter(x => x.type === "asset" && x.fileName.endsWith(".css")).map(x => String(x.source)).join("\n");
const mime = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
const images = {};
async function collect(dir, prefix) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name), url = prefix + "/" + item.name;
    if (item.isDirectory()) await collect(file, url);
    else if (mime[path.extname(file)]) images[url] = `data:${mime[path.extname(file)]};base64,${(await readFile(file)).toString("base64")}`;
  }
}
await collect("public", "");
await collect("uploads", "/uploads");
// Resolve both literal and dynamically constructed image paths without a server.
const setup = `window.__HTML_SITE__=${JSON.stringify(site)};const images=${JSON.stringify(images)};const resolveImages=()=>{document.querySelectorAll('img').forEach(el=>{const src=el.getAttribute('src');if(images[src])el.src=images[src];});document.querySelectorAll('[style]').forEach(el=>{const bg=el.style.backgroundImage;if(!bg||bg.includes('data:'))return;const next=bg.replace(/url\\(["']?([^"')]+)["']?\\)/g,(match,url)=>images[url]?'url("'+images[url]+'")':match);if(next!==bg)el.style.backgroundImage=next;});};new MutationObserver(resolveImages).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src','style']});`;
for (const [url, data] of Object.entries(images)) {
  css = css.split(`(${url})`).join(`(${data})`).split(`("${url}")`).join(`("${data}")`);
}
const html = `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>OSLC — HTML Preview</title><style>${css.replaceAll("</style", "<\\/style")}</style></head><body><div id="root"></div><script>${(setup + js).replaceAll("</script", "<\\/script")}</script></body></html>`;
await writeFile("oslc-whole-site.html", html);
console.log(`Created oslc-whole-site.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB)`);

