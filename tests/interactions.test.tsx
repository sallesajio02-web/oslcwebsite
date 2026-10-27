import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { SiteHeader } from "../src/header.js";
import { PhotoLightbox } from "../src/lightbox.js";
import { usePublicMotion } from "../src/motion.js";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CreativeScene,
  FlowerBloom,
  ParticleField,
  FloatingPetals,
  TextReveal,
} from "../src/creative.js";
import type { Entry, Site } from "../src/api.js";

test("navigation, gallery and progressive motion interactions", async (t) => {
  const dom = new JSDOM(
    '<!doctype html><html><body><button id="trigger">Gallery trigger</button><div id="test-root"></div></body></html>',
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
  let reduced = false;
  const mediaHandlers = new Set<() => void>();
  Object.defineProperty(win, "matchMedia", {
    value: (query: string) => ({
      get matches() {
        return query.includes("reduced-motion") ? reduced : true;
      },
      media: query,
      addEventListener: (_name: string, callback: () => void) =>
        mediaHandlers.add(callback),
      removeEventListener: (_name: string, callback: () => void) =>
        mediaHandlers.delete(callback),
    }),
  });
  const observers: Array<{
    callback: IntersectionObserverCallback;
    elements: Set<Element>;
    disconnect: () => void;
  }> = [];
  class Observer {
    callback: IntersectionObserverCallback;
    elements = new Set<Element>();
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
      observers.push(this);
    }
    observe = (element: Element) => this.elements.add(element);
    unobserve = (element: Element) => this.elements.delete(element);
    disconnect = () => this.elements.clear();
  }
  Object.assign(globalThis, { IntersectionObserver: Observer });
  Object.assign(win, { IntersectionObserver: Observer });
  Object.defineProperty(win.HTMLDialogElement.prototype, "showModal", {
    value: function (this: HTMLDialogElement) {
      this.open = true;
      this.querySelector<HTMLButtonElement>("button")?.focus();
    },
  });
  Object.defineProperty(win.HTMLDialogElement.prototype, "close", {
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
  const host = document.getElementById("test-root")!;
  let root = createRoot(host);
  let path = "";
  function Location() {
    const location = useLocation();
    path = location.pathname + location.search;
    return null;
  }
  async function click(element: Element | null) {
    assert.ok(element);
    await act(async () =>
      element.dispatchEvent(
        new win.MouseEvent("click", { bubbles: true, cancelable: true }),
      ),
    );
  }
  async function clear() {
    await act(async () => root.unmount());
    host.replaceChildren();
    root = createRoot(host);
  }
  try {
    await t.test(
      "mobile disclosure supports corporate navigation and Escape focus return",
      async () => {
        await act(async () =>
          root.render(
            <MemoryRouter>
              <SiteHeader site={{ company: "OSLC" } as Site} />
              <Location />
            </MemoryRouter>,
          ),
        );
        const menu = host.querySelector<HTMLButtonElement>(".menu-toggle")!;
        assert.equal(menu.getAttribute("aria-expanded"), "false");
        assert.equal(host.querySelector("nav")?.hasAttribute("inert"), true);
        await click(menu);
        assert.equal(menu.getAttribute("aria-expanded"), "true");
        assert.equal(host.querySelector("nav")?.hasAttribute("inert"), false);
        await click(host.querySelector('a[href="/leadership"]'));
        assert.equal(path, "/leadership");
        assert.equal(menu.getAttribute("aria-expanded"), "false");
        await click(menu);
        await act(async () =>
          menu.dispatchEvent(
            new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
          ),
        );
        assert.equal(menu.getAttribute("aria-expanded"), "false");
        assert.equal(document.activeElement, menu);
        await clear();
      },
    );
    await t.test(
      "gallery changes photographs with arrow keys and restores focus after closing",
      async () => {
        const images: Entry[] = [
          {
            id: "one",
            name: "First photograph",
            image: "/one.webp",
            description: "First stock caption",
            position: 0,
            published: true,
          },
          {
            id: "two",
            name: "Second photograph",
            image: "/two.webp",
            description: "Second stock caption",
            position: 1,
            published: true,
          },
        ];
        function Harness() {
          const [selected, setSelected] = useState<string | null>("one");
          return (
            <PhotoLightbox
              images={images}
              selected={selected}
              onSelect={setSelected}
            />
          );
        }
        const trigger = document.getElementById("trigger") as HTMLButtonElement;
        trigger.focus();
        await act(async () => root.render(<Harness />));
        const dialog = host.querySelector("dialog")!;
        assert.equal(dialog.open, true);
        assert.equal(document.body.classList.contains("lightbox-open"), true);
        assert.equal(
          host.querySelector("#lightbox-title")?.textContent,
          "First photograph",
        );
        await act(async () =>
          dialog.dispatchEvent(
            new win.KeyboardEvent("keydown", {
              key: "ArrowRight",
              bubbles: true,
            }),
          ),
        );
        assert.equal(
          host.querySelector("#lightbox-title")?.textContent,
          "Second photograph",
        );
        await act(async () =>
          dialog.dispatchEvent(new win.Event("cancel", { cancelable: true })),
        );
        assert.equal(dialog.classList.contains("closing"), true);
        await act(
          async () => new Promise((resolve) => setTimeout(resolve, 180)),
        );
        assert.equal(dialog.open, false);
        assert.equal(document.activeElement, trigger);
        assert.equal(document.body.classList.contains("lightbox-open"), false);
        await clear();
      },
    );
    function MotionHarness() {
      const surface = usePublicMotion(true);
      return (
        <div ref={surface}>
          <main className="page-surface">
            <div className="section-heading">Always visible heading</div>
            <div className="ambient-zone">
              <span className="ambient-particle" />
            </div>
            <div className="card-grid">
              <article>First</article>
              <article>Second</article>
            </div>
          </main>
        </div>
      );
    }
    await t.test(
      "scroll reveal enhances visible content and disconnects on unmount",
      async () => {
        observers.length = 0;
        await act(async () =>
          root.render(
            <MemoryRouter>
              <MotionHarness />
            </MemoryRouter>,
          ),
        );
        const heading = host.querySelector(".section-heading")!;
        assert.equal(heading.classList.contains("is-revealed"), false);
        assert.equal((heading as HTMLElement).style.opacity, "");
        const observer = observers.at(-1)!;
        assert.ok(observer.elements.has(heading));
        await act(async () =>
          observer.callback(
            [
              {
                target: heading,
                isIntersecting: true,
              } as IntersectionObserverEntry,
            ],
            observer as unknown as IntersectionObserver,
          ),
        );
        assert.equal(heading.classList.contains("is-revealed"), true);
        assert.equal(observer.elements.has(heading), false);
        const zone = host.querySelector(".ambient-zone")!;
        const ambient = observers.find((item) => item.elements.has(zone))!;
        assert.ok(ambient);
        await act(async () =>
          ambient.callback(
            [
              {
                target: zone,
                isIntersecting: true,
              } as IntersectionObserverEntry,
            ],
            ambient as unknown as IntersectionObserver,
          ),
        );
        assert.equal(zone.classList.contains("effects-active"), true);
        assert.equal(zone.classList.contains("effects-seen"), true);
        await act(async () =>
          ambient.callback(
            [
              {
                target: zone,
                isIntersecting: false,
              } as IntersectionObserverEntry,
            ],
            ambient as unknown as IntersectionObserver,
          ),
        );
        assert.equal(zone.classList.contains("effects-active"), false);
        assert.equal(zone.classList.contains("effects-seen"), true);
        Object.defineProperty(document, "hidden", {
          configurable: true,
          value: true,
        });
        await act(async () =>
          document.dispatchEvent(new win.Event("visibilitychange")),
        );
        assert.ok(host.querySelector(".motion-paused"));
        Object.defineProperty(document, "hidden", {
          configurable: true,
          value: false,
        });
        await act(async () =>
          document.dispatchEvent(new win.Event("visibilitychange")),
        );
        assert.equal(host.querySelector(".motion-paused"), null);
        await clear();
        assert.equal(observer.elements.size, 0);
        assert.equal(ambient.elements.size, 0);
      },
    );
    await t.test(
      "reduced motion leaves content available without reveal observers",
      async () => {
        reduced = true;
        observers.length = 0;
        await act(async () =>
          root.render(
            <MemoryRouter>
              <MotionHarness />
            </MemoryRouter>,
          ),
        );
        assert.equal(observers.length, 0);
        assert.ok(host.querySelector(".motion-reduced"));
        assert.ok(host.querySelector(".effects-static"));
        assert.equal(
          host.querySelector(".section-heading")?.textContent,
          "Always visible heading",
        );
        assert.equal(
          host.querySelector(".section-heading")?.hasAttribute("hidden"),
          false,
        );
        await clear();
      },
    );
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test("animation styles preserve the 14px floor and include reduced-motion overrides", async () => {
  const css =
    (await readFile("src/styles.css", "utf8")) +
    "\n" +
    (await readFile("src/motion.css", "utf8")) +
    (await readFile("src/creative.css", "utf8"));
  for (const match of css.matchAll(/font-size:\s*([\d.]+)px/g))
    assert.ok(Number(match[1]) >= 14);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation: none !important/);
  assert.match(css, /\.collection-kids:hover/);
  assert.match(css, /\.ambient-zone:not\(\.effects-active\)/);
  assert.match(css, /pointer-events: none !important/);
});

test("creative decorations are bounded, non-interactive and keep readable heading text", () => {
  const html = renderToStaticMarkup(
    <>
      <CreativeScene variant="women" />
      <CreativeScene variant="hero" />
      <FlowerBloom visible={false} />
      <ParticleField count={100} />
      <FloatingPetals count={100} />
      <TextReveal text="Manufacturing Quality. Building Fashion." />
    </>,
  );
  const dom = new JSDOM(html);
  const document = dom.window.document;
  try {
    assert.equal(document.querySelectorAll(".flower-bloom").length, 1);
    assert.equal(document.querySelectorAll(".flower-petal").length, 13);
    const fields = document.querySelectorAll(".particle-field");
    assert.equal(fields[1].children.length, 12);
    const petals = document.querySelectorAll(".floating-petals");
    assert.equal(petals[1].children.length, 5);
    assert.equal(
      document.querySelectorAll(
        ".ambient-zone button,.ambient-zone a,.ambient-zone input",
      ).length,
      0,
    );
    for (const decoration of document.querySelectorAll(".ambient-zone"))
      assert.equal(decoration.getAttribute("aria-hidden"), "true");
    assert.equal(
      document.querySelector(".reveal-readable")?.textContent,
      "Manufacturing Quality. Building Fashion.",
    );
    assert.equal(document.querySelectorAll(".reveal-word").length, 4);
    const ids = [...document.querySelectorAll("[id]")].map((el) => el.id);
    assert.equal(new Set(ids).size, ids.length);
  } finally {
    dom.window.close();
  }
});
