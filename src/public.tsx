import { SiteImage } from "./site-image";
import { FooterSocials } from "./social-icons";
import { BrandLoading } from "./loading";
import { Teams } from "./teams";
import { Careers, JobDetail } from "./careers";
import { withDemoContent } from "./demo-site";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type CSSProperties,
} from "react";
import {
  Link,
  Route,
  Routes,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  MapPin,
  MessageCircle,
  Search,
  Check,
  Layers,
} from "lucide-react";
import { api, useApi, type Site, type Product, type Page } from "./api";
import { Notice, Pagination } from "./ui";
import { pageDescriptions } from "./seo";
import { SiteHeader } from "./header";
import { CorporateHome, Leadership, News, Segments, Values } from "./corporate";
import { corporateNav, galleryCategories } from "./corporate-config";
import { PhotoLightbox } from "./lightbox";
import { usePublicMotion } from "./motion";
import { CreativeScene, SectionTransition, TextReveal } from "./creative";
const Context = createContext<Site | null>(null);
export const useSite = () => useContext(Context)!;
const nav = corporateNav;
export const directions = (address: string) =>
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("OSLC House " + address);
const whatsapp = (number: string, message: string) =>
  "https://wa.me/" + number + "?text=" + encodeURIComponent(message);
export function Meta({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const site = useSite(),
    location = useLocation();
  useEffect(() => {
    document.title =
      site.pageSeo?.[location.pathname]?.title ||
      (title ? title + " | OSLC" : site.seoTitle);
    if (site.demoMode) {
      let robots = document.querySelector('meta[name="robots"]');
      if (!robots) {
        robots = document.createElement("meta");
        robots.setAttribute("name", "robots");
        document.head.append(robots);
      }
      robots.setAttribute("content", "noindex,nofollow");
    }
    const set = (key: string, content: string, property = false) => {
      const attr = property ? "property" : "name";
      let node = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!node) {
        node = document.createElement("meta");
        node.setAttribute(attr, key);
        document.head.append(node);
      }
      node.setAttribute("content", content);
    };
    set(
      "description",
      site.pageSeo?.[location.pathname]?.description ||
        description ||
        pageDescriptions[location.pathname] ||
        site.seoDescription,
    );
    set("og:title", document.title, true);
    set(
      "og:description",
      site.pageSeo?.[location.pathname]?.description ||
        description ||
        pageDescriptions[location.pathname] ||
        site.seoDescription,
      true,
    );
    set("og:url", window.location.origin + location.pathname, true);
    let canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = window.location.origin + location.pathname;
    window.scrollTo(0, 0);
  }, [title, description, site, location.pathname]);
  return null;
}
function Structured({ data }: { data: object }) {
  return (
    <script type="application/ld+json">
      {JSON.stringify(data).replaceAll("<", "\\u003c")}
    </script>
  );
}
export function PublicSite() {
  const { data: savedSite, error, loading } = useApi<Site>("/api/site");
  const data = savedSite
    ? withDemoContent(savedSite, !!import.meta.env?.DEV)
    : null;
  const motionRoot = usePublicMotion(!!data);
  if (loading) return <BrandLoading />;
  if (!data)
    return (
      <main className="container section">
        <h1>OSLC House</h1>
        <Notice error>
          {error || "The website is temporarily unavailable."}
        </Notice>
        <button onClick={() => window.location.reload()}>Try again</button>
        <p>Kosad, Surat, Gujarat, India</p>
      </main>
    );
  return (
    <Context.Provider value={data}>
      <div className="public-site" ref={motionRoot}>
        <a className="skip" href="#main">
          Skip to content
        </a>
        {data.demoMode && (
          <div className="demo-banner" role="status">
            <strong>
              {data.demoPreview
                ? "LOCAL DEMO - FICTIONAL SAMPLE CONTENT"
                : "DEMONSTRATION WEBSITE"}
            </strong>{" "}
            · Preview content for company review. Sample profiles, history,
            processes and events are fictional. Stock photographs do not show
            OSLC products, staff or facilities. Only company-approved content
            should be published.
          </div>
        )}
        <div className="topline">
          TEXTILE & APPAREL MANUFACTURING <span>KOSAD, SURAT · INDIA</span>
        </div>
        <SiteHeader site={data} />
        <main id="main" className="page-surface">
          <Routes>
            <Route index element={<CorporateHome />} />
            <Route path="leadership" element={<Leadership />} />
            <Route
              path="capabilities"
              element={
                <>
                  <Meta title="Our Capabilities" />
                  <PageHead
                    label="OUR CAPABILITIES"
                    title="Apparel for every generation."
                  />
                  <Segments />
                  <section className="container section">
                    <Capabilities />
                  </section>
                  <Banner />
                </>
              }
            />
            <Route path="teams" element={<Teams />} />
            <Route path="news" element={<News />} />
            <Route path="careers" element={<Careers />} />
            <Route path="careers/:slug" element={<JobDetail />} />
            <Route path="about" element={<About />} />
            <Route path="products" element={<Segments />} />

            <Route path="manufacturing" element={<Manufacturing />} />
            <Route path="quality" element={<Quality />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="contact" element={<Contact />} />
            <Route path="privacy" element={<Legal kind="privacy" />} />
            <Route path="terms" element={<Legal kind="terms" />} />
            <Route
              path="*"
              element={
                <section className="container section">
                  <Meta title="Page not found" />
                  <h1>Page not found</h1>
                  <Link to="/" className="button">
                    Return home
                  </Link>
                </section>
              }
            />
          </Routes>
        </main>
        <footer className="footer">
          <div className="container footer-grid">
            <div>
              <Link className="wordmark" to="/">
                {data.logoImage ? (
                  <SiteImage
                    className="brand-logo"
                    src={data.logoImage}
                    alt={data.company + " — Om Sai Latest Creation"}
                    width={180}
                    height={80}
                  />
                ) : (
                  <>
                    {data.company}
                    <small>OM SAI LATEST CREATION</small>
                  </>
                )}
              </Link>
              <p>{data.tagline}</p>
              <FooterSocials links={String(data.socialLinks || "")} />
              <p>
                Textile and apparel manufacturing.
                <br />
                Kosad, Surat, Gujarat.
              </p>
            </div>
            <div>
              <h3>Explore</h3>
              {nav.slice(1).map(([url, name]) => (
                <Link key={url} to={url}>
                  {name}
                </Link>
              ))}
            </div>
            <div>
              <h3>People & purpose</h3>
              <Link to="/leadership">Leadership & Team</Link>
              <Link to="/capabilities">Our Capabilities</Link>
              <Link to="/news">Company News & Events</Link>
              <Link to="/contact">Business enquiries</Link>
            </div>
            <div>
              <h3>Visit OSLC</h3>
              <p>{data.address}</p>
              {data.email && <a href={"mailto:" + data.email}>{data.email}</a>}
              {data.phone && <a href={"tel:" + data.phone}>{data.phone}</a>}
              <a
                href={directions(data.address)}
                target="_blank"
                rel="noreferrer"
              >
                Get directions ↗
              </a>

            </div>
          </div>
          <div className="container footer-bottom">
            <span>
              © {new Date().getFullYear()} {data.company}. All rights reserved.
            </span>
            <div>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms & Conditions</Link>
            </div>
          </div>
        </footer>
        {data.whatsapp && (
          <a
            className="whatsapp"
            href={whatsapp(
              data.whatsapp,
              "Hello OSLC, I would like to discuss my apparel requirements.",
            )}
            aria-label="Contact OSLC on WhatsApp"
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={23} />
          </a>
        )}
        <Structured
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: data.company,
            url: window.location.origin,
            address: {
              "@type": "PostalAddress",
              streetAddress: data.address,
              addressLocality: "Surat",
              addressRegion: "Gujarat",
              addressCountry: "IN",
            },
            ...(data.phone ? { telephone: data.phone } : {}),
          }}
        />
      </div>
    </Context.Provider>
  );
}
function SectionHead({
  eyebrow,
  title,
  link,
}: {
  eyebrow: string;
  title: string;
  link?: [string, string];
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>
          <TextReveal text={title} />
        </h2>
      </div>
      {link && (
        <Link className="text-link" to={link[0]}>
          {link[1]} <ArrowUpRight size={17} />
        </Link>
      )}
    </div>
  );
}
export function Banner() {
  return (
    <section className="banner">
      <CreativeScene
        variant="bloom"
        className="banner-bloom"
        size={170}
        intensity={0.8}
        speed={0.75}
      />
      <div className="container">
        <p className="eyebrow">LET’S BUILD A BUSINESS PARTNERSHIP</p>
        <h2>Let’s Build a Stronger Partnership.</h2>
        <Link className="button light" to="/contact">
          Contact Our Team <ArrowUpRight size={18} />
        </Link>
      </div>
    </section>
  );
}
export function PageHead({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <section className="page-head container">
      <p className="eyebrow">{label}</p>
      <h1>{title}</h1>
      {description && <p className="lead">{description}</p>}
    </section>
  );
}
function About() {
  const s = useSite();
  return (
    <>
      <Meta title="About Us" />
      <PageHead
        label="THE COMPANY"
        title="Built on a shared commitment."
        description={s.tagline}
      />
      <section className="container section about-grid">
        <div>
          {s.aboutImage ? (
            <SiteImage
              className="about-image"
              src={s.aboutImage}
              alt={
                s.demoMode
                  ? "Stock textile photograph — demonstration only"
                  : "OSLC company"
              }
            />
          ) : (
            <SiteImage className="about-image" src="" alt="Company photograph" />
          )}
        </div>
        <div>
          <p className="eyebrow">OSLC HOUSE</p>
          <h2>Your next business conversation starts here.</h2>
          <p className="preserve">{s.about}</p>
          <p>
            Learn about our people, our business segments and our approach to
            long-term partnerships.
          </p>
          <Link className="text-link" to="/contact">
            Explore a partnership <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <section className="container section two-col">
        <article>
          <p className="eyebrow">OUR MISSION</p>
          <h2>A purpose behind every conversation.</h2>
          <p>
            {s.mission || "Our company-approved mission will be shared here."}
          </p>
        </article>
        <article>
          <p className="eyebrow">OUR VISION</p>
          <h2>Partnerships with a future.</h2>
          <p>
            {s.vision || "Our company-approved vision will be shared here."}
          </p>
        </article>
      </section>
      <section className="container section">
        <SectionHead
          eyebrow="OUR APPROACH"
          title="Clear requirements. Considered decisions."
        />
        <p className="lead preserve">{s.quality}</p>
        <Link to="/quality" className="text-link">
          Our quality commitment <ArrowRight size={17} />
        </Link>
      </section>
      <section className="container section">
        <h2>Our story</h2>
        <p className="preserve">
          {s.history ||
            "Our founding story and company milestones will be shared following company review."}
        </p>
      </section>
      <Segments />
      <Values />
      <Banner />
    </>
  );
}
export function Capabilities() {
  const s = useSite();
  return s.capabilities.length ? (
    <div className="card-grid">
      {s.capabilities.map((c) => (
        <article key={c.id} className="capability">
          <SiteImage src={c.image} alt={c.name} loading="lazy" />
          <p className="eyebrow">
            {c.operation || "Operation location to be confirmed"}
          </p>
          <h3>{c.name}</h3>
          <p className="preserve">{c.description}</p>
        </article>
      ))}
    </div>
  ) : (
    <div className="empty">
      <h3>A considered approach to apparel.</h3>
      <p>
        OSLC’s confirmed manufacturing capabilities and facility photographs
        will be published here. Contact the team to confirm the processes
        available for your requirements.
      </p>
      <Link to="/contact" className="text-link">
        Discuss manufacturing requirements <ArrowRight size={16} />
      </Link>
    </div>
  );
}
function Process() {
  const s = useSite();
  return s.process ? (
    <div
      className="process"
      style={
        {
          "--process-steps": String(s.process).split("\n").filter(Boolean)
            .length,
        } as CSSProperties
      }
    >
      <p className="eyebrow">
        {s.demoMode
          ? "ILLUSTRATIVE WORKFLOW · DEMONSTRATION"
          : "THE CONFIRMED WORKFLOW"}
      </p>
      <SectionTransition
        variant="stitch"
        size={40}
        intensity={0.45}
        speed={0.8}
      />
      <ol>
        {String(s.process)
          .split("\n")
          .filter(Boolean)
          .map((line, i) => (
            <li key={i}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <p>{line}</p>
            </li>
          ))}
      </ol>
    </div>
  ) : null;
}
function Manufacturing() {
  return (
    <>
      <Meta title="Manufacturing" />
      <PageHead
        label="MANUFACTURING"
        title="From your brief to the finer details."
        description="Start with your product requirements. Confirm the manufacturing approach with OSLC."
      />
      <section className="container section">
        <Capabilities />
        <Process />
      </section>
      <Banner />
    </>
  );
}
function Quality() {
  const s = useSite();
  return (
    <>
      <Meta title="Quality & Values" />
      <PageHead
        label="OUR QUALITY COMMITMENT"
        title="Quality is in the details."
      />
      <Values />
      <section className="container section quality-body">
        <p className="lead preserve">{s.quality}</p>
        <div className="quality-note">
          <Check />
          <div>
            <h3>A shared understanding of quality.</h3>
            <p>
              Ask OSLC to confirm the measurements, fit, stitching, finishing
              and packaging checks applicable to your products. Any
              certification or formal inspection procedure should be verified
              directly with the team.
            </p>
          </div>
        </div>
      </section>
      <Banner />
    </>
  );
}
function Gallery() {
  const s = useSite();
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<string | null>(null);
  const items = s.gallery.filter(
    (g) => filter === "All" || g.category === filter,
  );
  return (
    <>
      <Meta title="Gallery" />
      <PageHead
        label="A CLOSER LOOK"
        title="The people, products and process."
        description="OSLC photography, published as verified company images become available."
      />
      <section className="container section">
        <div className="filter-tabs">
          {["All", ...galleryCategories].map((f) => (
            <button
              key={f}
              aria-pressed={f === filter}
              className={f === filter ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        {items.length ? (
          <div className="card-grid">
            {items.map((g) => (
              <figure key={g.id}>
                <button
                  className="gallery-trigger"
                  type="button"
                  onClick={() => setSelected(g.id)}
                  aria-label={"Enlarge " + g.name}
                >
                  <SiteImage
                    src={g.image}
                    alt={g.name}
                    loading="lazy"
                    width={700}
                    height={525}
                  />
                  <span className="gallery-enlarge" aria-hidden="true">
                    <ArrowUpRight size={22} />
                  </span>
                </button>
                <figcaption>
                  <strong>{g.name}</strong>
                  <p>{g.description}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="empty">
            No verified photographs have been published in this selection yet.
          </p>
        )}
      </section>
      <PhotoLightbox
        images={items}
        selected={selected}
        onSelect={setSelected}
      />
    </>
  );
}
function Contact() {
  const s = useSite();

  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      if (s.demoPreview) {
        setSuccess(
          "Demo submission complete. No enquiry was sent or saved. Replace the sample content and disable demonstration mode to use the live business enquiry form.",
        );
        form.reset();
        return;
      }
      const result = await api("/api/enquiries", {
        method: "POST",
        body: JSON.stringify({
          ...values,

          consent: values.consent === "on",
        }),
      });
      setSuccess(
        "Your enquiry has been saved. Reference: " +
          result.reference +
          ". Keep this reference for your records.",
      );
      form.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Meta title="Contact Us" />
      <PageHead
        label="LET’S TALK BUSINESS"
        title="Let’s start a conversation."
        description="Connect with OSLC for company information, manufacturing discussions and business partnerships."
      />
      <section className="container section contact-grid">
        <aside>
          <p className="eyebrow">OSLC HOUSE</p>
          <h2>
            Visit. Connect.
            <br />
            Build a partnership.
          </h2>
          <p>{s.address}</p>
          <a
            className="text-link"
            href={directions(s.address)}
            target="_blank"
            rel="noreferrer"
          >
            Get directions <ArrowUpRight size={17} />
          </a>
          {s.phone && (
            <p>
              <a href={"tel:" + s.phone}>{s.phone}</a>
            </p>
          )}
          {s.email && (
            <p>
              <a href={"mailto:" + s.email}>{s.email}</a>
            </p>
          )}
          {s.demoPreview && (
            <p>
              {s.demoPhoneLabel}
              <br />
              Email above is a reserved demonstration address.
            </p>
          )}
          {s.hours && <p>Business hours: {s.hours}</p>}
          {s.whatsapp && (
            <a
              className="button outline"
              target="_blank"
              rel="noreferrer"
              href={whatsapp(
                s.whatsapp,
                "Hello OSLC, I would like to discuss a business enquiry.",
              )}
            >
              Chat on WhatsApp
            </a>
          )}
        </aside>
        <div>
          {success ? (
            <Notice>
              <h3>Thank you for your enquiry.</h3>
              {success}
              <p>
                <button onClick={() => setSuccess("")}>
                  Send another enquiry
                </button>
              </p>
            </Notice>
          ) : (
            <form className="enquiry-form" onSubmit={submit}>
              <h2>Business enquiry</h2>
              {s.demoPreview && (
                <Notice>
                  Demo form: submissions are simulated and are not sent or
                  stored. Use sample details to try the form.
                </Notice>
              )}
              <p className="small">Fields marked * are required.</p>
              <div className="form-grid">
                <label>
                  Full name *
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                </label>
                <label>
                  Company name *
                  <input
                    name="company"
                    autoComplete="organization"
                    required
                    maxLength={160}
                  />
                </label>
                <label>
                  Business email *
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                  />
                </label>
                <label>
                  Phone number *
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    required
                    minLength={7}
                    maxLength={25}
                  />
                </label>
                <label>
                  Enquiry type *
                  <select name="enquiry_type" required>
                    <option value="">Select a topic</option>
                    {[
                      "Company information",
                      "Business partnership",
                      "Manufacturing",
                      "Careers",
                      "Media",
                      "Other",
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Message *
                <textarea
                  name="message"
                  rows={4}
                  minLength={10}
                  maxLength={4000}
                  required
                  placeholder="Product, fabric, sizing, expected quantities and other details…"
                />
              </label>
              <label className="honeypot" aria-hidden="true">
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
              <label className="checkbox">
                <input type="checkbox" name="consent" required />{" "}
                <span>
                  I agree that OSLC may use these details to respond to my
                  enquiry. <Link to="/privacy">Privacy Policy</Link>
                </span>
              </label>
              {error && <Notice error>{error}</Notice>}
              <button className="button" disabled={busy}>
                {busy ? "Saving enquiry…" : "Submit Business Enquiry"}{" "}
                <ArrowUpRight size={17} />
              </button>
              <p className="small">
                Submitting an enquiry does not place an order.
              </p>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
function Legal({ kind }: { kind: "privacy" | "terms" }) {
  const s = useSite();
  return (
    <>
      <Meta
        title={kind === "privacy" ? "Privacy Policy" : "Terms & Conditions"}
      />
      <PageHead
        label="OSLC HOUSE"
        title={kind === "privacy" ? "Privacy Policy" : "Terms & Conditions"}
      />
      <section className="container section prose preserve">{s[kind]}</section>
      {kind === "privacy" && (
        <section className="container section prose">
          <h2>Recruitment applications</h2>
          <p>
            Careers applications and resumes are collected for recruitment
            review and are accessible only to authorized staff. The Careers form
            is live even when company pages display demo content.
          </p>
          <Link className="text-link" to="/careers#recruitment-privacy">
            Read the recruitment privacy notice
          </Link>
          <p>
            For access, correction, withdrawal or deletion requests, contact
            OSLC with your application reference.
          </p>
        </section>
      )}
    </>
  );
}
