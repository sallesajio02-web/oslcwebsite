import { useState, type FormEvent } from "react";
import { api, useApi } from "./api";
import { Notice, Pagination } from "./ui";
import {
  employmentTypes,
  experienceLevels,
  applicationStatuses,
  type Department,
  type Job,
} from "./careers-shared";
const base = "/api/admin/careers";
const emptyJob = {
  job_city: "",
  job_region: "",
  job_country: "",
  structured_data: false,
  title: "",
  slug: "",
  department_id: "",
  location: "Kosad, Surat, Gujarat, India",
  employment_type: "Full-time",
  experience_level: "Any level",
  experience: "",
  openings: null,
  salary: "",
  description: "",
  responsibilities: "",
  qualifications: "",
  skills: "",
  preferred_skills: "",
  deadline: "",
  status: "Open",
  published: false,
  featured: false,
  archived: false,
};
export function CareersAdmin() {
  const [tab, setTab] = useState("jobs"),
    [revision, setRevision] = useState(0),
    [edit, setEdit] = useState<any>(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const jobs = useApi<Job[]>(base + "/jobs", revision),
    departments = useApi<Department[]>(base + "/departments", revision);
  const change = (key: string, value: any) =>
    setEdit((old: any) => ({ ...old, [key]: value }));
  async function saveJob(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(base + "/jobs" + (edit.id ? "/" + edit.id : ""), {
        method: edit.id ? "PUT" : "POST",
        body: JSON.stringify(edit),
      });
      setEdit(null);
      setRevision((r) => r + 1);
      setMessage("Vacancy saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function departmentSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const id = String(data.get("id") || "");
    try {
      await api(base + "/departments" + (id ? "/" + id : ""), {
        method: id ? "PUT" : "POST",
        body: JSON.stringify({ name: data.get("name") }),
      });
      form.reset();
      setRevision((r) => r + 1);
      setMessage("Department saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function archive() {
    setError("");
    try {
      const r = await api(base + "/jobs/archive-expired", { method: "POST" });
      setRevision((v) => v + 1);
      setMessage(r.archived + " expired vacancies archived.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">RECRUITMENT</p>
          <h1>Careers Management</h1>
        </div>
        <button
          className="button"
          onClick={() => {
            setTab("jobs");
            setEdit({ ...emptyJob });
            setError("");
          }}
        >
          Create vacancy
        </button>
      </div>
      <div className="filter-tabs">
        {["jobs", "applications", "departments"].map((v) => (
          <button
            key={v}
            className={tab === v ? "active" : ""}
            onClick={() => {
              setTab(v);
              setEdit(null);
              setMessage("");
              setError("");
            }}
          >
            {v[0].toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {tab === "departments" && (
        <section className="editor">
          <h2>Departments & career areas</h2>
          <p>
            Career areas do not imply current vacancies. Renaming an area
            updates its related listings and applications.
          </p>
          {departments.error && <Notice error>{departments.error}</Notice>}
          {departments.data?.map((d) => (
            <form
              key={d.id}
              className="department-row"
              onSubmit={departmentSave}
            >
              <input type="hidden" name="id" value={d.id} />
              <label>
                Department name
                <input
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={d.name}
                />
              </label>
              <button disabled={busy}>Save name</button>
            </form>
          ))}
          <h3>Add department</h3>
          <form onSubmit={departmentSave}>
            <label>
              Name
              <input name="name" required maxLength={120} />
            </label>
            <button disabled={busy}>Add department</button>
          </form>
        </section>
      )}
      {tab === "jobs" && (
        <>
          {jobs.error && <Notice error>{jobs.error}</Notice>}
          <div className="actions">
            <button onClick={archive}>Archive expired vacancies</button>
            <a className="text-link" href="/careers">
              View Careers page
            </a>
          </div>
          {jobs.loading ? (
            <Notice>Loading vacancies...</Notice>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Department</th>
                    <th>Publication</th>
                    <th>Status</th>
                    <th>Deadline</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.data?.map((j) => (
                    <tr key={j.id}>
                      <td>{j.title}</td>
                      <td>{j.department}</td>
                      <td>{j.published ? "Published" : "Draft"}</td>
                      <td>{j.archived ? "Archived" : j.status}</td>
                      <td>{j.deadline || "None"}</td>
                      <td>
                        <button
                          onClick={() => {
                            setEdit({
                              ...j,
                              deadline: j.deadline?.slice(0, 10) || "",
                            });
                            setError("");
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!jobs.data?.length && (
                <p>
                  No vacancies yet. Create a verified vacancy to get started.
                </p>
              )}
            </div>
          )}
          {edit && (
            <form className="editor" onSubmit={saveJob}>
              <div className="admin-heading">
                <h2>{edit.id ? "Edit vacancy" : "Create vacancy"}</h2>
                <button type="button" onClick={() => setEdit(null)}>
                  Cancel
                </button>
              </div>
              <Notice>
                Publish only genuine, approved vacancies. Salary, openings,
                requirements and employment claims must be confirmed by OSLC.
              </Notice>
              <div className="form-grid">
                {[
                  ["job_city", "Verified city for job metadata (optional)"],
                  [
                    "job_region",
                    "Verified region/state for job metadata (optional)",
                  ],
                  ["job_country", "ISO country code, e.g. IN (optional)"],
                  ["title", "Job title"],
                  ["slug", "URL slug"],
                  ["location", "Location"],
                  ["experience", "Experience requirements"],
                  ["salary", "Salary range (optional)"],
                ].map(([k, l]) => (
                  <label key={k}>
                    {l}
                    <input
                      required={
                        ![
                          "salary",
                          "job_city",
                          "job_region",
                          "job_country",
                        ].includes(k)
                      }
                      maxLength={k === "experience" ? 1000 : 300}
                      pattern={
                        k === "slug" ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined
                      }
                      value={edit[k]}
                      onChange={(e) => change(k, e.target.value)}
                    />
                  </label>
                ))}
                <label>
                  Department
                  <select
                    required
                    value={edit.department_id}
                    onChange={(e) => change("department_id", e.target.value)}
                  >
                    <option value="">Choose department</option>
                    {departments.data?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                {[
                  ["employment_type", "Employment type", employmentTypes],
                  ["experience_level", "Experience level", experienceLevels],
                  ["status", "Applications", ["Open", "Closed"]],
                ].map(([key, label, options]) => (
                  <label key={String(key)}>
                    {label}
                    <select
                      value={edit[String(key)]}
                      onChange={(e) => change(String(key), e.target.value)}
                    >
                      {(options as readonly string[]).map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                ))}
                <label>
                  Confirmed openings (optional)
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={edit.openings ?? ""}
                    onChange={(e) =>
                      change(
                        "openings",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                </label>
                <label>
                  Application deadline (IST, optional)
                  <input
                    type="date"
                    value={edit.deadline}
                    onChange={(e) => change("deadline", e.target.value)}
                  />
                </label>
              </div>
              {[
                ["description", "Job description"],
                ["responsibilities", "Responsibilities"],
                ["qualifications", "Qualifications"],
                ["skills", "Required skills"],
                ["preferred_skills", "Preferred skills (optional)"],
              ].map(([k, l]) => (
                <label key={k}>
                  {l}
                  <textarea
                    rows={5}
                    maxLength={6000}
                    required={k !== "preferred_skills"}
                    value={edit[k]}
                    onChange={(e) => change(k, e.target.value)}
                  />
                </label>
              ))}
              {[
                [
                  "structured_data",
                  "Enable JobPosting metadata using the verified city, region and ISO country code",
                ],
                ["published", "Approved for publication"],
                ["featured", "Featured vacancy"],
                ["archived", "Archived"],
              ].map(([k, l]) => (
                <label className="checkbox" key={k}>
                  <input
                    type="checkbox"
                    checked={edit[k]}
                    onChange={(e) => change(k, e.target.checked)}
                  />
                  {l}
                </label>
              ))}
              {error && <Notice error>{error}</Notice>}
              <button className="button" disabled={busy}>
                {busy ? "Saving..." : "Save vacancy"}
              </button>
            </form>
          )}
        </>
      )}
      {tab === "applications" && (
        <Applications
          jobs={jobs.data || []}
          departments={departments.data || []}
        />
      )}
    </>
  );
}
function Applications({
  jobs,
  departments,
}: {
  jobs: Job[];
  departments: Department[];
}) {
  const [filters, setFilters] = useState<Record<string, string>>({
      search: "",
      job: "",
      department: "",
      status: "",
      kind: "",
      from: "",
      to: "",
      experience: "",
    }),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const params = new URLSearchParams({ ...filters, page: String(page) });
  const list = useApi<any>(base + "/applications?" + params, revision);
  const filter = (k: string, v: string) => {
    setFilters((old) => ({ ...old, [k]: v }));
    setPage(1);
  };
  async function open(id: string) {
    setError("");
    try {
      setSelected(await api(base + "/applications/" + id));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(base + "/applications/" + selected.id, {
        method: "PATCH",
        body: JSON.stringify({
          status: selected.status,
          notes: selected.notes,
        }),
      });
      await open(selected.id);
      setRevision((r) => r + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      !window.confirm(
        "Permanently delete this application, its private resume, notes and status history? This cannot be undone.",
      )
    )
      return;
    setBusy(true);
    try {
      await api(base + "/applications/" + selected.id, { method: "DELETE" });
      setSelected(null);
      setRevision((r) => r + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h2>Applications</h2>
      <Notice>
        Candidate details and resumes are private. Export only when needed for
        recruitment and keep downloaded records secure. CSV exports contain up
        to 10,000 matching records; use date filters for larger collections.
      </Notice>
      <div className="career-filters">
        <label>
          Search name or reference
          <input
            value={filters.search}
            onChange={(e) => filter("search", e.target.value)}
          />
        </label>
        <label>
          Job
          <select
            value={filters.job}
            onChange={(e) => filter("job", e.target.value)}
          >
            <option value="">All jobs</option>
            {jobs.map((j) => (
              <option value={j.id} key={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Department
          <select
            value={filters.department}
            onChange={(e) => filter("department", e.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={filters.status}
            onChange={(e) => filter("status", e.target.value)}
          >
            <option value="">All statuses</option>
            {applicationStatuses.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Application type
          <select
            value={filters.kind}
            onChange={(e) => filter("kind", e.target.value)}
          >
            <option value="">All applications</option>
            <option value="general">General applications</option>
            <option value="vacancy">Specific vacancies</option>
          </select>
        </label>
        <label>
          Experience contains
          <input
            value={filters.experience}
            onChange={(e) => filter("experience", e.target.value)}
          />
        </label>
        {["from", "to"].map((k) => (
          <label key={k}>
            {k === "from" ? "From date (IST)" : "To date (IST)"}
            <input
              type="date"
              value={filters[k]}
              onChange={(e) => filter(k, e.target.value)}
            />
          </label>
        ))}
      </div>
      <a
        className="button outline"
        href={base + "/applications/export?" + new URLSearchParams(filters)}
      >
        Export filtered CSV
      </a>
      {(error || list.error) && <Notice error>{error || list.error}</Notice>}
      {list.loading ? (
        <Notice>Loading applications...</Notice>
      ) : (
        <>
          <p>{list.data?.total || 0} applications</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {list.data?.items.map((a: any) => (
                  <tr key={a.id}>
                    <td>{a.reference}</td>
                    <td>{a.name}</td>
                    <td>{a.job_title}</td>
                    <td>{a.department}</td>
                    <td>{a.status}</td>
                    <td>
                      <button onClick={() => open(a.id)}>Review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pages={list.data?.pages || 0}
            onChange={setPage}
          />
        </>
      )}
      {selected && (
        <section className="editor">
          <div className="admin-heading">
            <h2>{selected.reference}</h2>
            <button onClick={() => setSelected(null)}>Close review</button>
          </div>
          <dl className="enquiry-details">
            {[
              "name",
              "email",
              "phone",
              "city",
              "job_title",
              "department",
              "experience",
              "education",
              "current_company",
              "skills",
              "expected_salary",
              "notice_period",
              "linkedin",
              "cover_letter",
              "created_at",
              "consent_at",
              "privacy_notice",
            ].map((k) => (
              <div key={k}>
                <dt>{k.replaceAll("_", " ")}</dt>
                <dd className="preserve">{selected[k] || "Not provided"}</dd>
              </div>
            ))}
          </dl>
          <a
            className="button outline"
            href={base + "/applications/" + selected.id + "/resume"}
          >
            Download private PDF resume
          </a>
          <form onSubmit={save}>
            <label>
              Recruitment status
              <select
                value={selected.status}
                onChange={(e) =>
                  setSelected({ ...selected, status: e.target.value })
                }
              >
                {applicationStatuses.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Private internal notes
              <textarea
                rows={5}
                maxLength={10000}
                value={selected.notes}
                onChange={(e) =>
                  setSelected({ ...selected, notes: e.target.value })
                }
              />
            </label>
            <button className="button" disabled={busy}>
              Save status & notes
            </button>
          </form>
          <h3>Status history</h3>
          {selected.history.map((h: any, i: number) => (
            <article key={i}>
              <strong>{h.status}</strong>
              <p>
                {new Date(h.created_at).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}{" "}
                IST
              </p>
              <p className="preserve">{h.note}</p>
            </article>
          ))}
          <button disabled={busy} onClick={remove}>
            Delete application & resume permanently
          </button>
        </section>
      )}
    </>
  );
}
