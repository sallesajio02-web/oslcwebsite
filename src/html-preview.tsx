import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { PublicSite } from "./public";
import { withDemoContent } from "./demo-site";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "./styles.css";
import "./motion.css";
import "./creative.css";
import "./dropdowns.css";

declare global { interface Window { __HTML_SITE__: any } }
const site = withDemoContent(window.__HTML_SITE__, true);
window.fetch = async (input, options) => {
  const url = new URL(String(input), "https://preview.invalid");
  if (options?.method && options.method !== "GET") {
    return new Response(JSON.stringify({ error: "This is an offline HTML preview. Open the live website to submit this form." }), { status: 400 });
  }
  let data: unknown;
  if (url.pathname === "/api/site") data = site;
  else if (url.pathname === "/api/careers/config") data = { departments: [], maxResumeBytes: 5242880, retentionDays: 90, privacyNotice: "Offline preview only. Applications cannot be submitted here." };
  else if (url.pathname === "/api/careers/jobs") data = [];
  else return new Response(JSON.stringify({ error: "This content requires the live website." }), { status: 404 });
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
};
createRoot(document.getElementById("root")!).render(<HashRouter><PublicSite /></HashRouter>);
