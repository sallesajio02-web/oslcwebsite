import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { unzipSync, strFromU8 } from "fflate";
import { appendInlineStyles, bundleResources, exportZip, generatedHtml, patchNode, relativePath, sourceNodes, textFile, validateProject, type Project } from "../src/editor/model";
import { previewDocument } from "../src/editor/bridge";
const html = `<!DOCTYPE html>\n<!-- preserve comment -->\n<html><head><link rel="stylesheet" href="styles.css"><script src="app.js" defer></script></head><body><main class='original'><h1>Hello <em>world</em></h1><p data-test="keep">Keep &amp; preserve</p><img src="images/photo.svg" alt="Photo"></main></body></html>`;
const project = (): Project => ({ version: 1, name: "Fixture", page: "site/index.html", files: { "site/index.html": textFile(html), "site/styles.css": textFile('body{background-image:url("images/photo.svg")}', "text/css"), "site/app.js": textFile("window.behavior = true;", "text/javascript"), "site/images/photo.svg": textFile('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"></svg>', "image/svg+xml") }, edits: {}, css: {}, locks: [] });
test("source patches preserve unrelated markup and scripts byte for byte", () => {
  const node = sourceNodes(html).find(n => n.tag === "h1")!;
  const edited = patchNode(html, node, "text", "Edited & safe <text>");
  assert.equal(edited, html.slice(0, node.openEnd) + "Edited &amp; safe &lt;text&gt;" + html.slice(node.closeStart));
  const main = sourceNodes(edited).find(n => n.tag === "main")!;
  const styled = patchNode(edited, main, "attribute", "padding: 40px; color: red", "style");
  assert.match(styled, /class='original' style="padding: 40px; color: red"/);
  assert.match(styled, /<script src="app.js" defer><\/script>/);
  assert.match(styled, /<!-- preserve comment -->/);
});
test("inspector style edits retain unsupported declarations and comments", () => {
  const original = "unknown-future-property: keep-this; /* author note */ color: red !important";
  const edited = appendInlineStyles(original, [{ name: "color", value: "blue", important: true }]);
  assert.ok(edited.startsWith(original));
  assert.match(edited, /color: blue !important;/);
});
test("duplicate, reorder, delete and undo snapshots do not flatten markup", () => {
  const original = project(), node = sourceNodes(html).find(n => n.tag === "p")!;
  const duplicate = patchNode(html, node, "duplicate", "");
  assert.equal((duplicate.match(/data-test="keep"/g) || []).length, 2);
  assert.ok(patchNode(html, node, "move", "up").indexOf("<p") < patchNode(html, node, "move", "up").indexOf("<h1"));
  assert.doesNotMatch(patchNode(html, node, "delete", ""), /data-test="keep"/);
  assert.equal(original.files[original.page].data, html);
});
test("ZIP preserves original assets, scripts and adds only intended changes", () => {
  const p = project(); p.css[p.page] = "@media(max-width:600px){h1{font-size:24px}}";
  const zipped = unzipSync(exportZip(p));
  assert.equal(strFromU8(zipped["site/app.js"]), p.files["site/app.js"].data);
  assert.equal(strFromU8(zipped["site/styles.css"]), p.files["site/styles.css"].data);
  assert.match(strFromU8(zipped[p.page]), /data-design-overrides/);
  assert.equal(relativePath("site/index.html", "new.svg"), "../new.svg");
});
test("self-contained export embeds CSS, JS, image and nested CSS resources", () => {
  const p = project(), bundled = bundleResources(generatedHtml(p), p);
  assert.deepEqual(bundled.missing, []);
  assert.match(bundled.html, /src="data:text\/javascript;base64,/);
  assert.match(bundled.html, /href="data:text\/css;base64,/);
  assert.match(bundled.html, /src="data:image\/svg\+xml;base64,/);
  assert.equal(p.files[p.page].data, html);
});
test("runtime edits replay on generated content without cascading deletion", async () => {
  const p = project(); p.files[p.page] = textFile('<!doctype html><html><body><div id="root"></div><script>setTimeout(()=>document.getElementById("root").innerHTML="<h1>Generated</h1><p>Remove</p><p>Keep</p>",5)</script></body></html>');
  p.edits[p.page] = [{ selector: "#root h1", kind: "text", value: "Edited generated heading" }, { selector: "#root p:first-of-type", kind: "delete", value: "" }];
  const dom = new JSDOM(generatedHtml(p), { runScripts: "dangerously" });
  try { await new Promise(r => setTimeout(r, 70)); assert.equal(dom.window.document.querySelector("h1")?.textContent, "Edited generated heading"); assert.equal(dom.window.document.querySelector("p")?.textContent, "Keep"); } finally { dom.window.close(); }
});
test("preview isolates requests and source markers never enter exports", () => {
  const p = project(), preview = previewDocument(p, "test-token", true);
  assert.match(preview.html, /connect-src 'none'/);
  assert.match(preview.html, /form-action 'none'/);
  assert.match(preview.html, /data-vh-source/);
  assert.doesNotMatch(generatedHtml(p), /data-vh-source/);
  assert.equal(validateProject(JSON.parse(JSON.stringify(p))).version, 1);
  assert.throws(() => validateProject({ version: 2 }));
});
