import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/** Progressive enhancement: elements stay visible if observers or animations fail. */
export function usePublicMotion(ready: boolean) {
  const location = useLocation();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ready || !root.current) return;
    const surface = root.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    let ambientObserver: IntersectionObserver | undefined;
    let pageAnimation: Animation | undefined;
    const seen = new WeakSet<Element>();
    const ambientSeen = new WeakSet<Element>();
    const selector =
      ".section-heading, .intro-grid > div, .about-grid > div, .card-grid > *, .commitment-grid > *, .process, .process li, .quality-note, .contact-grid > *, .contact-strip, .footer-grid > *, .collection-card, .animated-reveal";
    const discover = () => {
      surface.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        if (seen.has(element)) return;
        seen.add(element);
        const siblings = Array.from(element.parentElement?.children || []);
        element.style.setProperty(
          "--reveal-delay",
          `${Math.min(siblings.indexOf(element) % 4, 2) * 70}ms`,
        );
        observer?.observe(element);
      });
      surface
        .querySelectorAll<HTMLElement>(".ambient-zone")
        .forEach((element) => {
          if (ambientSeen.has(element)) return;
          ambientSeen.add(element);
          if (!ambientObserver) element.classList.add("effects-static");
          else ambientObserver.observe(element);
        });
    };
    const configure = () => {
      observer?.disconnect();
      ambientObserver?.disconnect();
      observer = undefined;
      ambientObserver = undefined;
      surface.classList.toggle("motion-reduced", preference.matches);
      if (preference.matches) pageAnimation?.cancel();
      if (preference.matches || !("IntersectionObserver" in window)) {
        surface
          .querySelectorAll(".ambient-zone")
          .forEach((el) => el.classList.add("effects-static"));
        return;
      }
      ambientObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            entry.target.classList.toggle(
              "effects-active",
              entry.isIntersecting,
            );
            if (entry.isIntersecting)
              entry.target.classList.add("effects-seen");
          }
        },
        { threshold: 0.01, rootMargin: "40px" },
      );
      surface.querySelectorAll(".ambient-zone").forEach((el) => {
        el.classList.remove("effects-static");
        ambientObserver?.observe(el);
      });
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            if (entry.isIntersecting) {
              const element = entry.target as HTMLElement;
              if (!document.hidden) element.classList.add("is-revealed");
              observer?.unobserve(element);
            }
        },
        { threshold: 0.08, rootMargin: "0px 0px -20px 0px" },
      );
      // Re-observe existing targets if the user changes their motion preference.
      surface
        .querySelectorAll<HTMLElement>(selector)
        .forEach((el) => observer?.observe(el));
      discover();
    };
    configure();
    const main = surface.querySelector<HTMLElement>(".page-surface");
    pageAnimation =
      !preference.matches && main?.animate
        ? main.animate(
            [
              { opacity: 0.85, transform: "translateY(5px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 230, easing: "ease-out" },
          )
        : undefined;
    const mutations = new MutationObserver(discover);
    mutations.observe(surface, { childList: true, subtree: true });
    preference.addEventListener("change", configure);
    const visibility = () => {
      surface.classList.toggle("motion-paused", document.hidden);
      if (document.hidden) pageAnimation?.pause();
      else if (pageAnimation?.playState === "paused") pageAnimation.play();
    };
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => {
      pageAnimation?.cancel();
      observer?.disconnect();
      ambientObserver?.disconnect();
      mutations.disconnect();
      preference.removeEventListener("change", configure);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [ready, location.pathname]);
  return root;
}
