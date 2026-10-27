import { JSDOM, VirtualConsole } from "jsdom";
import { readFileSync } from "node:fs";
const errors = [];
const console = new VirtualConsole();
console.on("jsdomError", error => errors.push(error.message));
const dom = new JSDOM(readFileSync("oslc-whole-site.html", "utf8"), {
  runScripts: "dangerously", url: "file:///preview.html", pretendToBeVisual: true, virtualConsole: console,
  beforeParse(w) {
    w.Response = Response; w.Headers = Headers;
    w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    w.scrollTo = () => {};
    w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  },
});
try {
  for (const route of ["/", "/about", "/leadership", "/teams", "/products", "/manufacturing", "/quality", "/gallery", "/news", "/careers", "/contact", "/privacy", "/terms"]) {
    dom.window.location.hash = route;
    await new Promise(resolve => setTimeout(resolve, 500));
    const title = dom.window.document.querySelector("h1, h2")?.textContent;
    if (!title) throw new Error(`Missing page heading at ${route}`);
    process.stdout.write(`${route}: ${title}\n`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
} finally { dom.window.close(); }

