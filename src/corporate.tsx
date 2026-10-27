import { SiteImage } from "./site-image";
import { FounderMessage } from "./founder-message";
import { OurBrands } from "./our-brands";
import { EmployeesSection } from "./teams";
import { MarketplaceStrip } from "./marketplaces";
import { demoLeadership } from "./demo-leadership";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowRight, Users } from "lucide-react";
import { Meta, PageHead, Banner, Capabilities, useSite } from "./public";
import { CreativeScene, TextReveal, SectionTransition } from "./creative";
import type { Leader, CompanyEvent } from "./corporate-config";

export function Values() {
  const values = [
    ["Quality", "Care in the details."],
    ["Integrity", "Honest, clear communication."],
    ["Responsibility", "Thoughtful decisions and accountable relationships."],
    ["Continuous improvement", "A commitment to learning and developing."],
    ["Customer relationships", "A long-term view of every partnership."],
    ["Teamwork", "People working towards a shared purpose."],
  ];
  return (
    <section className="soft section">
      <div className="container">
        <p className="eyebrow">OUR GUIDING PRINCIPLES</p>
        <h2>What we stand for.</h2>
        <div className="values-list">
          {values.map(([title, text], i) => (
            <article key={title}>
              <span>0{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
export function Segments() {
  const s = useSite();
  return (
    <section className="container section" id="segments">
      <p className="eyebrow">OUR BUSINESS SEGMENTS</p>
      <h2>Quality apparel for every generation.</h2>
      <div className="segment-grid">
        {["Men", "Women", "Kids"].map((name, i) => (
          <article key={name}>
            <div className={"segment-image segment-" + i}>
              {s["collection" + name + "Image"] ? (
                <>
                  <SiteImage
                    src={s["collection" + name + "Image"]}
                    alt={
                      s.demoMode
                        ? name + " apparel inspiration — stock photograph"
                        : name + " apparel"
                    }
                    loading="lazy"
                  />
                  {s.demoMode && (
                    <small className="image-caption">
                      Apparel inspiration · stock photograph
                    </small>
                  )}
                </>
              ) : (
                <SiteImage src="" alt={`${name} apparel`} loading="lazy" />
              )}
            </div>
            <p className="eyebrow">
              0{i + 1} / {name.toUpperCase()}
            </p>
            <h3>
              {name === "Kids" ? "Kids’" : name === "Men" ? "Men’s" : "Women’s"}{" "}
              Apparel
            </h3>
            <p>
              {s["segment" + name] ||
                "Connect with our team to learn about the applicable apparel categories and confirmed manufacturing capabilities for this segment."}
            </p>
            <Link className="text-link" to="/contact">
              Explore a partnership <ArrowUpRight size={16} />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
function LeadershipPreview() {
  const s = useSite();
  const people: Leader[] = s.leadership || [];
  const featured = people.slice(0, 3);
  const demo =
    featured.length > 0 &&
    featured.every((p) => p.id.startsWith("demo-leader-"));
  return (
    <section
      className="leadership-editorial section"
      aria-labelledby="leadership-preview-title"
    >
      <div className="container">
        <div className="leadership-editorial-heading">
          <div>
            <p className="eyebrow">THE VISION. THE DIRECTION. THE PEOPLE.</p>
            <h2 id="leadership-preview-title">
              The People
              <br />
              Behind <em>OSLC.</em>
            </h2>
          </div>
          <div className="leadership-editorial-intro">
            <span className="leadership-rule" aria-hidden="true" />
            <p>
              The people, vision, and dedication behind our company. Discover
              the individuals shaping our shared direction.
            </p>
            <Link className="text-link" to="/leadership">
              Meet Our Leadership <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
        {demo && (
          <p className="leadership-sample-label">
            DEMO PROFILES / Fictional names and biographies for local preview.
          </p>
        )}
        {featured.length ? (
          <div className="leadership-editorial-profiles">
            {featured.map((p, i) => (
              <article
                className={"leadership-editorial-profile profile-" + i}
                key={p.id}
              >
                <Link
                  to="/leadership"
                  className="leadership-editorial-portrait"
                  aria-label={"Read about " + p.name}
                >
                  {p.image ? (
                    <SiteImage
                      src={p.image}
                      alt={
                        demo
                          ? "Stock portrait for fictional demo profile " +
                            p.name
                          : p.name
                      }
                      loading="lazy"
                      width={600}
                      height={750}
                    />
                  ) : (
                    <SiteImage src="" alt={`${p.name} portrait`} width={600} height={750} loading="lazy" />
                  )}
                  <span className="leadership-profile-index" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <span className="leadership-profile-link" aria-hidden="true">
                    <ArrowUpRight size={23} />
                  </span>
                </Link>
                <div className="leadership-editorial-copy">
                  {demo && (
                    <p className="sample-photo-caption">
                      Sample portrait - not an OSLC leader
                    </p>
                  )}
                  <p className="eyebrow">{p.title}</p>
                  <h3>
                    <Link to="/leadership">{p.name}</Link>
                  </h3>
                  <p className="leadership-profile-bio">{p.biography}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="leadership-editorial-empty">
            <Users size={46} strokeWidth={1} />
            <div>
              <h3>A company shaped by its people.</h3>
              <p>
                Approved founder, leadership and management profiles will be
                shared here.
              </p>
            </div>
            <Link className="text-link" to="/leadership">
              Explore leadership <ArrowUpRight size={18} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
export function CorporateHome() {
  const s = useSite();
  return (
    <>
      <Meta title="" />
      <section className="hero corporate-hero">
        <CreativeScene
          variant="hero"
          className="hero-ambient"
          size={120}
          intensity={0.4}
          speed={0.75}
        />
        <div className="hero-copy">
          <p className="eyebrow">OM SAI LATEST CREATION · SURAT, INDIA</p>
          <h1>
            <TextReveal
              text={s.heroTitle || "Crafting Apparel. Building Trust."}
              load
            />
          </h1>
          <p>{s.heroDescription}</p>
          <div className="actions">
            <Link className="button" to="/about">
              Discover Our Company <ArrowUpRight size={17} />
            </Link>
            <Link className="text-link" to="/leadership">
              Meet Our Leadership <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-foot">
            <span>MEN · WOMEN · KIDS</span>
            <span>Quality Apparel for Every Generation.</span>
          </div>
        </div>
        <div className={"hero-visual " + (!s.heroImage ? "textile-art" : "")}>
          {s.heroImage ? (
            <>
              <SiteImage
                src={s.heroImage}
                alt={
                  s.demoMode
                    ? "Stock apparel photograph for visual inspiration"
                    : "OSLC company photograph"
                }
                fetchPriority="high"
              />
              {s.demoMode && (
                <span className="visual-label">
                  APPAREL INSPIRATION
                  <small>Stock photograph · not an OSLC facility</small>
                </span>
              )}
            </>
          ) : (
            <>
              <SiteImage src="" alt="Homepage banner" fetchPriority="high" />
            </>
          )}
        </div>
      </section>
      <OurBrands />
      <MarketplaceStrip />
      <SectionTransition
        variant="fabric"
        size={70}
        intensity={0.5}
        speed={0.8}
      />
      <section className="container section intro-grid">
        <div>
          <p className="eyebrow">INTRODUCING OSLC</p>
          <h2>
            Rooted in Surat.
            <br />
            Looking ahead, together.
          </h2>
        </div>
        <div>
          <p className="lead preserve">{s.about}</p>
          <Link to="/about" className="text-link">
            Get to know OSLC <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      <Segments />
      <FounderMessage />
      <LeadershipPreview />
      <EmployeesSection />
      <section className="container section">
        <p className="eyebrow">MANUFACTURING</p>
        <h2>From fabric to possibility.</h2>
        <Capabilities />
        <p>
          <Link className="text-link" to="/manufacturing">
            Explore manufacturing <ArrowUpRight size={17} />
          </Link>
        </p>
      </section>
      <Values />
      <section className="container section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A CLOSER LOOK</p>
            <h2>Life at OSLC.</h2>
          </div>
          <Link to="/gallery" className="text-link">
            Explore the Gallery <ArrowUpRight size={17} />
          </Link>
        </div>
        {s.gallery.length ? (
          <div className="card-grid">
            {s.gallery.slice(0, 3).map((g) => (
              <figure key={g.id}>
                <Link to="/gallery">
                  <SiteImage src={g.image} alt={g.name} loading="lazy" />
                  <figcaption>{g.name}</figcaption>
                </Link>
              </figure>
            ))}
          </div>
        ) : (
          <p>
            Our company, people and facilities, through verified photographs.
            New photographs will appear here when available.
          </p>
        )}
      </section>
      <Banner />
    </>
  );
}
export function Leadership() {
  const s = useSite();
  const demo =
    (s.demoPreview &&
      s.leadership?.every((p: Leader) => p.id.startsWith("demo-leader-"))) ||
    (import.meta.env?.DEV && s.demoMode && !s.leadership?.length);
  const people: Leader[] = s.leadership?.length
    ? s.leadership
    : demo
      ? demoLeadership
      : [];
  return (
    <>
      <Meta title="Leadership & Team" />
      <PageHead
        label="THE PEOPLE BEHIND OSLC"
        title="Leadership at OSLC"
        description="The people, vision, and dedication behind our company."
      />
      {demo && (
        <div className="container">
          <div className="notice" role="status">
            <strong>Sample leadership profiles</strong>
            <p>
              These names, roles, biographies and messages are fictional demo
              content for previewing this page. They do not represent OSLC staff
              and appear only in development when no approved profiles are
              available.
            </p>
          </div>
        </div>
      )}
      <section className="container section leadership-intro">
        <p className="eyebrow">SHARED PURPOSE. PERSONAL COMMITMENT.</p>
        <h2>
          Building a company.
          <br />
          Bringing people together.
        </h2>
      </section>
      {people.length ? (
        people.map((p, i) => (
          <section
            key={p.id}
            className={
              "container section leader-profile " + (i % 2 ? "reverse" : "")
            }
          >
            <div className="leader-portrait">
              {p.image ? (
                <SiteImage
                  src={p.image}
                  alt={
                    demo
                      ? "Stock portrait for fictional demo profile " + p.name
                      : p.name
                  }
                  loading="lazy"
                />
              ) : (
                <SiteImage src="" alt={`${p.name} portrait`} loading="lazy" />
              )}
            </div>
            <article>
              {demo && (
                <p className="sample-photo-caption">
                  Sample portrait - not an OSLC leader
                </p>
              )}
              <p className="eyebrow">{p.title}</p>
              <h2>{p.name}</h2>
              <p className="lead preserve">{p.biography}</p>
              {[
                ["Founding vision", p.vision],
                ["Company-building journey", p.journey],
                ["Leadership philosophy", p.philosophy],
                ["Responsibilities & contribution", p.responsibilities],
                ["Qualifications", p.qualifications],
                ["Experience", p.experience],
              ]
                .filter(([, v]) => v)
                .map(([label, v]) => (
                  <div key={label}>
                    <h3>{label}</h3>
                    <p className="preserve">{v}</p>
                  </div>
                ))}
              {p.quote && (
                <blockquote>
                  {p.quote}
                  <cite>{p.name}</cite>
                </blockquote>
              )}
              {p.social && (
                <a
                  className="text-link"
                  href={p.social}
                  target="_blank"
                  rel="noreferrer"
                >
                  Professional profile <ArrowUpRight size={16} />
                </a>
              )}
            </article>
          </section>
        ))
      ) : (
        <section className="container section">
          <div className="people-placeholder">
            <Users size={48} strokeWidth={1} />
            <h2>Meet our leadership, soon.</h2>
            <p>
              Approved founder, CEO and management profiles will be shared here.
              <br />
              For company information, please contact our team.
            </p>
            <Link className="button outline" to="/contact">
              Contact Our Team <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
      )}
      {s.leadershipMessage && (
        <section className="soft section">
          <div className="container prose">
            <p className="eyebrow">A MESSAGE FROM OUR LEADERSHIP</p>
            <blockquote>{s.leadershipMessage}</blockquote>
          </div>
        </section>
      )}
      <section className="container section">
        <p className="eyebrow">TEAM CULTURE</p>
        <h2>Growing through collaboration.</h2>
        <p>Discover the people and shared moments behind OSLC.</p>
        <div className="card-grid">
          {s.gallery
            .filter((g) =>
              [
                "Leadership & Team",
                "Festivals & Celebrations",
                "Events & Activities",
              ].includes(g.category || ""),
            )
            .map((g) => (
              <figure key={g.id}>
                <SiteImage src={g.image} alt={g.name} loading="lazy" />
                <figcaption>{g.name}</figcaption>
              </figure>
            ))}
        </div>
        <Link className="text-link" to="/gallery">
          View our company gallery <ArrowUpRight size={17} />
        </Link>
      </section>
      <Banner />
    </>
  );
}
export function News() {
  const s = useSite();
  const [filter, setFilter] = useState("All");
  const events: CompanyEvent[] = s.events || [];
  const items = events.filter((e) => filter === "All" || e.category === filter);
  return (
    <>
      <Meta title="Company News & Events" />
      <PageHead
        label="LIFE AT OSLC"
        title="Company News & Events"
        description="Company milestones, shared celebrations and moments from our team."
      />
      <section className="container section">
        <div className="filter-tabs" aria-label="Filter company news">
          {["All", ...new Set(events.map((e) => e.category))].map((c) => (
            <button
              key={c}
              className={c === filter ? "active" : ""}
              aria-pressed={c === filter}
              onClick={() => setFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
        {items.length ? (
          <div className="news-list">
            {items.map((e) => (
              <article key={e.id}>
                <SiteImage src={e.image} alt={e.name} loading="lazy" />
                <div>
                  <p className="eyebrow">
                    {e.category} ·{" "}
                    <time dateTime={e.date}>
                      {new Date(e.date + "T12:00:00").toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "long", year: "numeric" },
                      )}
                    </time>
                  </p>
                  <h2>{e.name}</h2>
                  <p className="preserve">{e.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>More stories to share.</h2>
            <p>
              Company-approved news and event announcements will be published
              here.
            </p>
          </div>
        )}
      </section>
      <Banner />
    </>
  );
}
