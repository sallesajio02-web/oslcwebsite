import {
  Facebook,
  Instagram,
  Linkedin,
  Github,
  Dribbble,
  Globe,
} from "lucide-react";
import type { ReactNode } from "react";
const platforms = [
  { name: "Facebook", hosts: ["facebook.com", "fb.com"], icon: <Facebook /> },
  {
    name: "X",
    hosts: ["x.com", "twitter.com"],
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.6-8.7L.8 2h6.5l4.5 6.8L18.9 2Zm-1.1 18h1.7L6.4 3.9H4.6L17.8 20Z" />
      </svg>
    ),
  },
  { name: "Instagram", hosts: ["instagram.com"], icon: <Instagram /> },
  { name: "LinkedIn", hosts: ["linkedin.com"], icon: <Linkedin /> },
  { name: "GitHub", hosts: ["github.com"], icon: <Github /> },
  { name: "Dribbble", hosts: ["dribbble.com"], icon: <Dribbble /> },
];
export function FooterSocials({ links }: { links: string }) {
  const urls = links
    .split("\n")
    .map((value) => {
      try {
        const url = new URL(value.trim());
        return url.protocol === "https:" && !url.username && !url.password
          ? url
          : null;
      } catch {
        return null;
      }
    })
    .filter((u): u is URL => !!u);
  const match = (host: string, domains: string[]) =>
    domains.some((d) => host === d || host.endsWith("." + d));
  const items: {
    name: string;
    icon: ReactNode;
    url?: string;
    dummy?: boolean;
  }[] = platforms.map((p) => {
    const configured = urls.find((u) => match(u.hostname, p.hosts))?.href;
    return {
      ...p,
      url: configured || "https://" + p.hosts[0] + "/",
      dummy: !configured,
    };
  });
  urls
    .filter((u) => !platforms.some((p) => match(u.hostname, p.hosts)))
    .forEach((u) =>
      items.push({ name: u.hostname, icon: <Globe />, url: u.href }),
    );
  return (
    <div className="footer-socials" role="group" aria-label="OSLC social media">
      {items.map((p) =>
        p.url ? (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={
              (p.dummy
                ? "Visit " + p.name + " homepage - sample link"
                : "OSLC on " + p.name) + " (opens in a new tab)"
            }
            title={p.dummy ? p.name + " - sample homepage link" : p.name}
          >
            {p.icon}
          </a>
        ) : (
          <span
            key={p.name}
            className="social-unavailable"
            role="img"
            aria-label={p.name + " - link coming soon"}
            title={p.name + " - link coming soon"}
          >
            {p.icon}
          </span>
        ),
      )}
    </div>
  );
}
