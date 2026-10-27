import { SiteImage } from "./site-image";
import { getDemoJobs, filterDemoJobs } from "./demo-jobs";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowUpRight, MapPin } from "lucide-react";
import { api, useApi } from "./api";
import { Meta, PageHead, useSite } from "./public";
import { Notice } from "./ui";
import { TextReveal, SectionTransition } from "./creative";
import {
  employmentTypes,
  experienceLevels,
  type Job,
  type RecruitmentConfig,
} from "./careers-shared";

export function Careers() {
  const site = useSite();
  const config = useApi<RecruitmentConfig>("/api/careers/config");
  const [search, setSearch] = useState(""),
    [department, setDepartment] = useState(""),
    [type, setType] = useState(""),
    [experience, setExperience] = useState("");
  const params = new URLSearchParams({ search, department, type, experience });
  const jobs = useApi<Job[]>("/api/careers/jobs?" + params);
  const allJobs = useApi<Job[]>("/api/careers/jobs");
  const demo =
    !!import.meta.env?.DEV &&
    !!site.demoMode &&
    !allJobs.loading &&
    !allJobs.error &&
    allJobs.data?.length === 0;
  const displayJobs = demo
    ? filterDemoJobs(getDemoJobs(config.data?.departments || []), {
        search,
        department,
        type,
        experience,
      })
    : jobs.data;

  return (
    <>
      <Meta title="Careers" />
      <section className="hero careers-hero">
        <div className="hero-copy">
          <p className="eyebrow">PEOPLE. PURPOSE. POSSIBILITY.</p>
          <h1>
            <TextReveal text="Build Your Future with OSLC" load />
          </h1>
          <p>
            Explore career opportunities and become part of our textile and
            apparel manufacturing team.
          </p>
          <a className="button" href="#open-positions">
            Explore Open Positions <ArrowUpRight size={17} />
          </a>
        </div>
        <figure className="careers-visual">
          <SiteImage
            src="/demo/photos/workspace.webp"
            alt="Stock workplace photograph for visual inspiration"
            fetchPriority="high"
          />
          <figcaption>
            Workplace inspiration - stock photograph, not an OSLC facility.
          </figcaption>
        </figure>
      </section>
      <SectionTransition
        variant="fabric"
        size={60}
        intensity={0.4}
        speed={0.7}
      />
      <section className="container section intro-grid">
        <div>
          <p className="eyebrow">WHY WORK WITH US</p>
          <h2>
            Bring your perspective.
            <br />
            Explore your potential.
          </h2>
        </div>
        <div>
          <p>
            Learn about OSLC, our guiding values and the people behind our
            company. Each published vacancy describes its own responsibilities
            and requirements.
          </p>
          <p>
            Benefits, workplace arrangements and employment terms will be
            discussed by authorized staff for the relevant position.
          </p>
          <Link className="text-link" to="/quality">
            Our values <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      <section className="soft section">
        <div className="container">
          <p className="eyebrow">OUR WORKPLACE</p>
          <h2>People at the heart of the company.</h2>
          <p>
            Get to know the company before exploring your next step. Visit our
            leadership and gallery pages for company information and approved
            photographs.
          </p>
          <div className="actions">
            <Link className="text-link" to="/leadership">
              Meet our leadership
            </Link>
            <Link className="text-link" to="/gallery">
              Company gallery
            </Link>
          </div>
          <h3>Departments & career areas</h3>
          <p>
            These are areas of interest for applications, not a list of
            confirmed departments or vacancies.
          </p>
          <div className="career-areas">
            {config.data?.departments.map((d) => (
              <span key={d.id}>{d.name}</span>
            ))}
          </div>
        </div>
      </section>
      <section className="container section" id="open-positions">
        <p className="eyebrow">YOUR NEXT STEP</p>
        <h2>Current Openings</h2>
        {demo && <Notice><strong>Sample jobs - local demo only</strong><p>These fictional vacancies, requirements, salaries and openings are for previewing the page. They are not real OSLC opportunities. Sample-job applications are simulated and never sent or saved. The general application form below remains live.</p></Notice>}
        <div className="career-filters">
          <label>
            Search positions
            <input
              type="search"
              maxLength={150}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Job title or keyword"
            />
          </label>
          <label>
            Department
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">All departments</option>
              {config.data?.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Employment type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              {employmentTypes.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Experience level
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
            >
              <option value="">All levels</option>
              {experienceLevels.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
        {jobs.loading ? (
          <Notice>Loading open positions...</Notice>
        ) : jobs.error ? (
          <Notice error>{jobs.error}</Notice>
        ) : displayJobs?.length ? (
          <div className="job-list">
            {displayJobs.map((j) => (
              <article key={j.id}>
                <div>
                  <p className="eyebrow">
                    {j.department}
                    {j.featured ? " / FEATURED" : ""}
                  </p>
                  <h3>
                    <Link to={"/careers/" + j.slug}>
                      {j.title} <ArrowUpRight size={20} />
                    </Link>
                  </h3>
                  <p>
                    {j.location} / {j.employment_type} / {j.experience_level}
                  </p>
                  <p>
                    {j.experience}
                    {j.deadline && " | Apply by " + j.deadline}
                  </p>
                </div>
                <Link className="button outline" to={"/careers/" + j.slug}>
                  View Position
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <Notice>
            {search || department || type || experience
              ? "No positions match these filters. Try another selection or submit a general application."
              : "No current openings at the moment. You can submit a general application for future opportunities."}
          </Notice>
        )}
      </section>
      <section className="soft section">
        <div className="container intro-grid">
          <div>
            <p className="eyebrow">EMPLOYEE CULTURE & COMPANY EVENTS</p>
            <h2>Discover the people behind the work.</h2>
          </div>
          <div>
            <p>
              Explore approved company stories, shared celebrations and moments
              from our team.
            </p>
            <Link className="text-link" to="/news">
              Company News & Events <ArrowUpRight size={16} />
            </Link>
            {site.demoPreview && (
              <p className="small">
                The company pages currently contain labelled sample content;
                sample vacancies are labelled fictional and available only in
                local development.
              </p>
            )}
          </div>
        </div>
      </section>
      <section className="container section">
        <p className="eyebrow">RECRUITMENT FAQ</p>
        <h2>A little clarity for your next step.</h2>
        <div className="recruitment-faq">
          {[
            [
              "How do I apply?",
              "Choose an open vacancy, review its requirements and complete the application form with a PDF resume. You can also submit a general application.",
            ],
            [
              "What if there is no suitable position?",
              "Use the general application form to express your interest in future opportunities. This does not guarantee employment or an interview.",
            ],
            [
              "Which resume formats are accepted?",
              "Standard, non-interactive PDF files only. Password-protected files and PDFs containing forms, scripts or attachments are not accepted. The configured upload limit appears on the form.",
            ],
            [
              "How is my application information used?",
              config.data?.privacyNotice ||
                "Application information is used for recruitment review and is accessible only to authorized staff. See the recruitment privacy notice below.",
            ],
            [
              "How can I update or withdraw my application?",
              "Keep your application reference and contact OSLC through the Contact Us page to request an update, withdrawal or deletion.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="soft section" id="general-application">
        <div className="container">
          <p className="eyebrow">STAY CONNECTED</p>
          <h2>General Application</h2>
          <p>
            Share your background and preferred career area for future
            consideration.
          </p>
          <ApplicationForm />
        </div>
      </section>
    </>
  );
}
export function JobDetail() {
  const site = useSite();
  const { slug } = useParams();
  const job = useApi<Job>(
    "/api/careers/jobs/" + encodeURIComponent(slug || ""),
  );
  const sample =
    !!import.meta.env?.DEV && site.demoMode
      ? getDemoJobs([]).find((j) => j.slug === slug)
      : undefined;
  if (job.loading && !sample)
    return (
      <section className="container section">
        <Notice>Loading vacancy...</Notice>
      </section>
    );
  if (!sample && (!job.data || job.error))
    return (
      <section className="container section">
        <Meta title="Vacancy unavailable" />
        <h1>Vacancy unavailable</h1>
        <Notice error>{job.error || "This vacancy is no longer open."}</Notice>
        <Link to="/careers">Back to Careers</Link>
      </section>
    );
  const j = sample || job.data!;
  return (
    <>
      {!site.demoMode &&
        j.structured_data &&
        j.job_city &&
        j.job_region &&
        j.job_country &&
        j.created_at && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "JobPosting",
              title: j.title,
              description: [
                j.description,
                j.responsibilities,
                j.qualifications,
                j.skills,
              ].join("\n\n"),
              datePosted: j.created_at,
              hiringOrganization: {
                "@type": "Organization",
                name: site.company,
                url: window.location.origin,
              },
              employmentType: (
                {
                  "Full-time": "FULL_TIME",
                  "Part-time": "PART_TIME",
                  Contract: "CONTRACTOR",
                  Internship: "INTERN",
                } as Record<string, string>
              )[j.employment_type],
              jobLocation: {
                "@type": "Place",
                address: {
                  "@type": "PostalAddress",
                  addressLocality: j.job_city,
                  addressRegion: j.job_region,
                  addressCountry: j.job_country,
                },
              },
              ...(j.deadline
                ? { validThrough: j.deadline + "T23:59:59+05:30" }
                : {}),
              directApply: true,
            }).replaceAll("<", "\\u003c")}
          </script>
        )}
      {sample && (
        <div className="container">
          <Notice>
            <strong>Fictional sample vacancy</strong>
            <p>
              This is not a real OSLC opening. Pay, requirements and opening
              counts are illustrative. Applications for this demo job are
              simulated without saving data.
            </p>
          </Notice>
        </div>
      )}
      <Meta
        title={j.title + " - Careers"}
        description={j.description.slice(0, 300)}
      />
      <PageHead
        label={j.department}
        title={j.title}
        description={j.location + " / " + j.employment_type}
      />
      <section className="container section job-detail">
        <article>
          <Link className="text-link" to="/careers">
            Back to all Careers listings
          </Link>
          <dl className="job-facts">
            {[
              ["Experience level", j.experience_level],
              ["Experience", j.experience],
              ["Openings", j.openings],
              ["Salary", j.salary],
              ["Application deadline", j.deadline],
              ["Status", j.status],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={String(k)}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
          {[
            ["About the role", j.description],
            ["Responsibilities", j.responsibilities],
            ["Qualifications", j.qualifications],
            ["Required skills", j.skills],
            ["Preferred skills", j.preferred_skills],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <section key={k}>
                <h2>{k}</h2>
                <p className="preserve">{v}</p>
              </section>
            ))}
        </article>
        <aside>
          <p className="eyebrow">BUILD YOUR FUTURE</p>
          <h3>Ready to take the next step?</h3>
          <p>
            Review the role and share your background with our recruitment team.
          </p>
          <a className="button" href="#application">
            Apply for This Position <ArrowUpRight size={16} />
          </a>
        </aside>
      </section>
      <section className="soft section" id="application">
        <div className="container">
          <h2>Apply for {j.title}</h2>
          <ApplicationForm job={j} />
        </div>
      </section>
    </>
  );
}
export function ApplicationForm({ job }: { job?: Job }) {
  const demo = !!import.meta.env?.DEV && !!job?.id.startsWith("demo-job-");
  const config = useApi<RecruitmentConfig>("/api/careers/config");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reference, setReference] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError("");
    setBusy(true);
    try {
      if (demo) {
        setReference("DEMO-APPLICATION-PREVIEW");
        form.reset();
        return;
      }
      const body = new FormData(form);
      const file = body.get("resume") as File;
      if (
        !file ||
        !/\.pdf$/i.test(file.name) ||
        (config.data && file.size > config.data.maxResumeBytes)
      )
        throw new Error("Choose a PDF resume within the stated size limit.");
      const result = await api("/api/careers/applications", {
        method: "POST",
        body,
      });
      setReference(result.reference);
      form.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (reference)
    return (
      <div className="application-form">
        <Notice>
          <h3>
            {demo ? "Demo application complete." : "Application received."}
          </h3>
          <p>
            Your reference: <strong>{reference}</strong>
          </p>
          <p>
            {demo
              ? "This was a local preview. No application, personal details or resume were sent or saved."
              : "Your application has been saved. Keep this reference for your records. Submission does not guarantee an interview or employment."}
          </p>
        </Notice>
        <button onClick={() => setReference("")}>
          Return to application form
        </button>
      </div>
    );
  return (
    <form
      className="application-form"
      onSubmit={submit}
      encType="multipart/form-data"
    >
      <p>
        {demo
          ? "Demo form: use fictional details only. Resume upload is optional. Submitting simulates confirmation without sending or saving any data."
          : "Fields marked * are required. This is a live recruitment form; do not submit demo or test personal details."}
      </p>
      {config.error && <Notice error>{config.error}</Notice>}
      <input type="hidden" name="job_id" value={job?.id || ""} />
      <label>
        Position applied for *
        <input
          value={job?.title || "General application - future opportunities"}
          readOnly
        />
      </label>
      {job ? (
        <input type="hidden" name="department_id" value={job.department_id} />
      ) : (
        <label>
          Preferred department *
          <select name="department_id" required>
            <option value="">Select an area of interest</option>
            {config.data?.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="form-grid">
        {[
          ["name", "Full name", "text", 100],
          ["email", "Email address", "email", 254],
          ["phone", "Mobile number", "tel", 25],
          ["city", "Current city", "text", 200],
          ["experience", "Relevant experience", "text", 1000],
          ["education", "Highest educational qualification", "text", 1000],
          ["current_company", "Current company (optional)", "text", 200],
          ["expected_salary", "Expected salary (optional)", "text", 200],
          ["notice_period", "Notice period (optional)", "text", 200],
          ["linkedin", "LinkedIn profile (optional)", "url", 1000],
        ].map(([key, label, type, max], i) => (
          <label key={key}>
            {label}
            {i < 6 ? " *" : ""}
            <input
              name={String(key)}
              type={String(type)}
              maxLength={Number(max)}
              required={i < 6}
              autoComplete={
                key === "name"
                  ? "name"
                  : key === "email"
                    ? "email"
                    : key === "phone"
                      ? "tel"
                      : key === "city"
                        ? "address-level2"
                        : "off"
              }
            />
          </label>
        ))}
      </div>
      <label>
        Skills (optional)
        <textarea name="skills" rows={3} maxLength={3000} />
      </label>
      <label>
        {job ? "Short cover letter" : "Short introduction"} (optional)
        <textarea name="cover_letter" rows={4} maxLength={6000} />
      </label>
      <label>
        Resume / CV (PDF) {demo ? "(optional for demo)" : "*"}
        <input
          type="file"
          name="resume"
          accept=".pdf,application/pdf"
          required={!demo}
          aria-describedby="resume-help"
        />
      </label>
      <p id="resume-help" className="small">
        Maximum {config.data ? config.data.maxResumeBytes / 1024 / 1024 : "..."}{" "}
        MB. Upload a standard, flattened PDF without passwords, forms, scripts
        or attachments. Files are private and accessible only to authorized
        staff.
      </p>
      <label className="honeypot" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <details id="recruitment-privacy" className="recruitment-privacy" open>
        <summary>Recruitment privacy notice</summary>
        <p>
          {config.data?.privacyNotice ||
            "Loading recruitment privacy notice..."}
        </p>
        <Link to="/privacy">Website Privacy Policy</Link>
        <p>
          For access, correction, withdrawal or deletion requests,{" "}
          <Link to="/contact">contact OSLC</Link> with your application
          reference.
        </p>
      </details>
      <label className="checkbox">
        <input type="checkbox" name="consent" required />
        <span>
          I have read the recruitment privacy notice and consent to the use of
          my information for recruitment. *
        </span>
      </label>
      {error && <Notice error>{error}</Notice>}
      <div aria-live="polite">
        {busy && <p>Uploading and saving your application...</p>}
      </div>
      <button className="button" disabled={busy || !config.data}>
        {busy ? "Submitting..." : "Submit Application"}{" "}
        <ArrowUpRight size={16} />
      </button>
    </form>
  );
}
