import { SiteImage } from "./site-image";
import { Link } from "react-router-dom";
import { ArrowUpRight, Quote, UserRound } from "lucide-react";
import { useSite } from "./public";
import type { Leader } from "./corporate-config";
export function FounderMessage() {
  const site = useSite();
  const founder: Leader | undefined = site.leadership?.find((person: Leader) =>
    /\bfounder\b/i.test(person.title),
  );
  const demo =
    !!import.meta.env?.DEV &&
    !!site.demoMode &&
    (!founder || founder.id.startsWith("demo-leader-"));
  const message =
    site.founderMessage ||
    (!demo
      ? founder?.quote
      : "At OSLC, our story begins with people: the hands that work with care, the ideas that move us forward, and the relationships we build along the way.\n\nOur ambition is to bring thoughtful workmanship and clear communication to every conversation. We believe lasting progress comes from learning together, respecting one another and taking pride in the details.\n\nAs we look ahead, we remain inspired by the possibilities of apparel and the strength of a shared purpose.");
  return (
    <section
      className="founder-message section"
      aria-labelledby="founder-message-title"
    >
      <div className="container founder-message-layout">
        <div className="founder-message-portrait animated-reveal">
          {founder?.image ? (
            <SiteImage
              src={founder.image}
              alt={
                demo
                  ? "Stock portrait for fictional founder profile; not the OSLC founder"
                  : founder.name
              }
              width={650}
              height={780}
              loading="lazy"
            />
          ) : (
            <SiteImage src="" alt="Founder portrait" width={650} height={780} loading="lazy" />
          )}
          <div className="founder-message-signoff">
            <span>{founder?.name || "Our Founder"}</span>
            <small>
              {demo
                ? "Fictional demo profile"
                : founder?.title || "OSLC - Om Sai Latest Creation"}
            </small>
          </div>
        </div>
        <div className="founder-message-copy animated-reveal">
          <p className="eyebrow">A PERSONAL PERSPECTIVE</p>
          <h2 id="founder-message-title">
            Message from
            <br />
            Our Founder.
          </h2>
          <Quote
            className="founder-message-quote"
            size={36}
            strokeWidth={1}
            aria-hidden="true"
          />
          {demo && (
            <p className="founder-message-demo">
              SAMPLE MESSAGE / Fictional preview text and stock portrait. Not a
              statement from the OSLC founder.
            </p>
          )}
          {message ? (
            <div className="founder-message-body">
              {String(message)
                .split(/\n\s*\n/)
                .map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
            </div>
          ) : (
            <p className="lead">
              Our founder's approved message will be shared here soon.
            </p>
          )}
          <Link className="text-link" to="/leadership">
            Meet Our Leadership <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}
