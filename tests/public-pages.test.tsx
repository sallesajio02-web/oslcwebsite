import { test } from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { JSDOM } from "jsdom";
import { PublicSite } from "../src/public.js";
import { corporateNav } from "../src/corporate-config.js";

test("corporate pages render, link to all sections, and use an informational contact form", async () => {
  const dom = new JSDOM(
    '<!doctype html><html><head></head><body><div id="root"></div></body></html>',
    { url: "http://localhost", pretendToBeVisual: true },
  );
  const win = dom.window;
  Object.assign(globalThis, {
    window: win,
    document: win.document,
    HTMLElement: win.HTMLElement,
    MutationObserver: win.MutationObserver,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(win, "matchMedia", {
    value: () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }),
  });
  win.scrollTo = () => {};
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (input) =>
    new Response(
      JSON.stringify(
        String(input).includes("/api/careers/config")
          ? {
              departments: [],
              maxResumeBytes: 5242880,
              retentionDays: 180,
              privacyNotice: "Recruitment privacy notice",
            }
          : String(input).includes("/api/careers/jobs/verified-test-role")
            ? {
                id: "test-job",
                slug: "verified-test-role",
                title: "Verified test role",
                department_id: "test-department",
                department: "Production",
                location: "Surat",
                employment_type: "Full-time",
                experience_level: "Entry level",
                experience: "Test experience",
                openings: 1,
                salary: "",
                description: "Test description",
                responsibilities: "Test responsibilities",
                qualifications: "Test qualifications",
                skills: "Test skills",
                preferred_skills: "",
                deadline: "",
                status: "Open",
                published: true,
                featured: false,
                archived: false,
              }
            : String(input).includes("/api/careers/jobs")
              ? []
              : {
                  company: "OSLC",
                  heroTitle: "Crafting Apparel. Building Trust.",
                  heroDescription: "Discover OSLC",
                  tagline: "Quality Apparel for Every Generation.",
                  about: "OSLC - Om Sai Latest Creation, Surat.",
                  address: "Kosad, Surat, Gujarat, India",
                  categories: [],
                  capabilities: [],
                  gallery: [],
                  leadership: [],
                  events: [],
                  seoTitle: "OSLC",
                  seoDescription: "OSLC company information",
                  quality: "Approved quality information",
                  privacy: "Privacy information",
                  terms: "Website terms",
                },
      ),
      { headers: { "content-type": "application/json" } },
    );
  try {
    for (const [path, label] of [
      ...corporateNav,
      ["/careers/verified-test-role", "Job details"],
    ]) {
      const host = document.getElementById("root")!;
      const root = createRoot(host);
      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={[path]}>
            <PublicSite />
          </MemoryRouter>,
        );
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      assert.ok(host.querySelector("h1"), label + " has a heading");
      assert.ok(host.querySelector('a[href="/leadership"]'));
      assert.ok(host.querySelector('a[href="/news"]'));
      assert.equal(host.querySelector('a[href="/products"]'), null);
      if (path === "/") {
        const brands=host.querySelector(".our-brands");assert.ok(brands);assert.equal(host.querySelector(".corporate-hero")?.nextElementSibling,brands);assert.equal(brands.querySelectorAll("li").length,6);assert.equal(host.querySelectorAll(".our-brands").length,1);
        const strip = host.querySelector(".marketplace-strip");
        assert.ok(strip);
        assert.equal(strip.querySelector("h2"), null);
        assert.equal(strip.querySelectorAll("img").length, 5);
        const links = strip.querySelectorAll("a");
        assert.equal(links.length, 5);
        const hosts = [
          "www.amazon.in",
          "www.flipkart.com",
          "www.myntra.com",
          "www.ajio.com",
          "www.meesho.com",
        ];
        links.forEach((link, i) => {
          assert.equal(new URL(link.href).hostname, hosts[i]);
          assert.equal(link.target, "_blank");
          assert.match(link.rel, /noopener/);
        });
        assert.equal(
          host.querySelector(".our-brands")?.nextElementSibling,
          strip,
        );
      }

      if (path === "/careers/verified-test-role") {
        assert.match(
          host.querySelector("h1")?.textContent || "",
          /Verified test role/,
        );
        assert.equal(
          host.querySelector<HTMLInputElement>('[name="job_id"]')?.value,
          "test-job",
        );
        assert.equal(
          host.querySelector<HTMLInputElement>('[name="department_id"]')?.value,
          "test-department",
        );
        assert.ok(host.querySelector('a[href="#application"]'));
      }
      if (path === "/careers") {
        assert.match(
          host.textContent || "",
          /No current openings at the moment/,
        );
        for (const name of [
          "name",
          "email",
          "phone",
          "city",
          "experience",
          "education",
          "resume",
          "department_id",
          "consent",
        ])
          assert.ok(host.querySelector('[name="' + name + '"]'), name);
        assert.equal(
          host.querySelector('input[name="resume"]')?.getAttribute("accept"),
          ".pdf,application/pdf",
        );
        assert.ok(host.querySelector("#recruitment-privacy"));
      }
      if (path === "/contact") {
        for (const name of [
          "name",
          "company",
          "email",
          "phone",
          "enquiry_type",
          "message",
        ])
          assert.ok(host.querySelector('[name="' + name + '"]'), name);
        assert.equal(host.querySelector('[name="quantity"]'), null);
      }
      if (path === "/leadership")
        assert.match(
          host.textContent || "",
          /Approved founder, CEO and management profiles/,
        );
      await act(async () => root.unmount());
    }
  } finally {
    globalThis.fetch = previousFetch;
    dom.window.close();
  }
});
