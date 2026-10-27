import { CareersAdmin } from "./careers-admin";
import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { api, useApi, type Image, type Entry, type Product } from "./api";
import { galleryCategories, corporateNav } from "./corporate-config";
import { Notice, Pagination } from "./ui";
import { ArrowUpRight, LogOut, Plus, Trash2, GripVertical } from "lucide-react";
const statuses = [
  "New",
  "Contacted",
  "Quotation in Progress",
  "Quotation Sent",
  "Converted",
  "Closed",
];
const sections = [
  ["", "Overview"],
  ["enquiries", "Enquiries"],
  ["careers", "Careers Management"],
  ["leadership", "Leadership & Team"],
  ["events", "News & Events"],
  ["employees", "Employees / Teams"],

  ["capabilities", "Manufacturing"],
  ["gallery", "Gallery"],
  ["content", "Website content"],
];
export function Admin() {
  const [revision, setRevision] = useState(0);
  const {
    data: session,
    error,
    loading,
  } = useApi("/api/auth/session", revision);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    document.title = "Administration | OSLC";
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.append(meta);
    }
    meta.setAttribute("content", "noindex,nofollow");
    return () => meta?.remove();
  }, []);
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const form = new FormData(e.currentTarget);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      setRevision((n) => n + 1);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
      setRevision((n) => n + 1);
      navigate("/admin");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  if (loading)
    return (
      <main className="container section">
        <Notice>Checking administrator session…</Notice>
      </main>
    );
  if (!session?.authenticated)
    return (
      <main className="login">
        <Link className="wordmark" to="/">
          OSLC<small>HOUSE</small>
        </Link>
        <h1>Administration</h1>
        <p>Sign in to manage the website and business enquiries.</p>
        {(error || message) && <Notice error>{error || message}</Notice>}
        <form onSubmit={login}>
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          <button className="button" disabled={!session}>
            Sign in <ArrowUpRight size={16} />
          </button>
        </form>
        <p className="small">
          First administrator? Use the secure administrator creation command
          described in README.md.
        </p>
        <Link to="/">← Back to website</Link>
      </main>
    );
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link className="wordmark" to="/admin">
          OSLC<small>ADMINISTRATION</small>
        </Link>
        <nav aria-label="Administration">
          {sections.map(([url, name]) => (
            <NavLink key={url} end={!url} to={"/admin/" + url}>
              {name}
            </NavLink>
          ))}
        </nav>
        <Link to="/">View website ↗</Link>
        <button onClick={logout}>
          <LogOut size={16} /> Sign out
        </button>
      </aside>
      <main className="admin-main">
        {message && <Notice error>{message}</Notice>}
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="careers" element={<CareersAdmin />} />
          <Route
            path="employees"
            element={<Collection key="employees" kind="employees" />}
          />
          <Route
            path="leadership"
            element={<Collection key="leadership" kind="leadership" />}
          />
          <Route
            path="events"
            element={<Collection key="events" kind="events" />}
          />
          <Route
            path="products"
            element={<Collection key="products" kind="products" />}
          />
          <Route
            path="categories"
            element={<Collection key="categories" kind="categories" />}
          />
          <Route
            path="capabilities"
            element={<Collection key="capabilities" kind="capabilities" />}
          />
          <Route
            path="gallery"
            element={<Collection key="gallery" kind="gallery" />}
          />
          <Route path="content" element={<Content />} />
          <Route
            path="*"
            element={
              <Notice>Choose a section from the administration menu.</Notice>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
function Dashboard() {
  const { data, error, loading } = useApi("/api/admin/dashboard");
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">OSLC HOUSE</p>
          <h1>Business overview</h1>
        </div>
        <Link className="button outline" to="/admin/leadership">
          Manage leadership
        </Link>
      </div>
      {error && <Notice error>{error}</Notice>}
      {loading ? (
        <Notice>Loading dashboard…</Notice>
      ) : (
        data && (
          <>
            <div className="stats">
              {[
                ["total", "Total enquiries"],
                ["new", "New enquiries"],
                ["progress", "In progress"],
                ["products", "Published products"],
              ].map(([k, t]) => (
                <article key={k}>
                  <span>{t}</span>
                  <strong>{data[k]}</strong>
                </article>
              ))}
            </div>
            <div className="admin-heading">
              <h2>Recent enquiries</h2>
              <Link to="/admin/enquiries">View all enquiries →</Link>
            </div>
            <EnquiryTable rows={data.recent} />
            <Notice>
              Publish only company-approved products, capabilities and
              photographs. Contact buttons appear when contact details are
              configured in Website content.
            </Notice>
          </>
        )
      )}
    </>
  );
}
function EnquiryTable({
  rows,
  onSelect,
}: {
  rows: any[];
  onSelect?: (row: any) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Contact</th>
            <th>Company</th>
            <th>Status</th>
            <th>Received</th>
            {onSelect && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r) => (
              <tr key={r.id}>
                <td>OSLC-{r.reference}</td>
                <td>{r.name}</td>
                <td>{r.company}</td>
                <td>
                  <span className="status">{r.status}</span>
                </td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                {onSelect && (
                  <td>
                    <button onClick={() => onSelect(r)}>Review</button>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6}>No enquiries found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function Enquiries() {
  const [search, setSearch] = useState(""),
    [term, setTerm] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState<any>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const params = new URLSearchParams({
    search: term,
    status,
    page: String(page),
  });
  const { data, error, loading } = useApi(
    "/api/admin/enquiries?" + params,
    revision,
  );
  const history = useApi<any[]>(
    selected
      ? "/api/admin/enquiries/" + selected.id + "/history"
      : "/api/admin/enquiries?page=1",
    revision,
  );
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/enquiries/" + selected.id, {
        method: "PATCH",
        body: JSON.stringify({
          status: selected.status,
          notes: selected.notes,
        }),
      });
      setRevision((n) => n + 1);
      setMessage("Enquiry updated.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">BUSINESS INBOX</p>
          <h1>Enquiries</h1>
        </div>
        <a
          className="button outline"
          href={"/api/admin/enquiries/export?" + params}
        >
          Export CSV
        </a>
      </div>
      <div className="catalogue-tools">
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            setTerm(search);
            setPage(1);
          }}
        >
          <input
            aria-label="Search enquiries"
            placeholder="Name, company, email or reference"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button>Search</button>
        </form>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {error && <Notice error>{error}</Notice>}
      {loading ? (
        <Notice>Loading enquiries…</Notice>
      ) : (
        data && (
          <>
            <p className="small">{data.total} enquiries</p>
            <EnquiryTable
              rows={data.items}
              onSelect={(r) => {
                setSelected(r);
                setMessage("");
              }}
            />
            <Pagination page={page} pages={data.pages} onChange={setPage} />
          </>
        )
      )}
      {selected && (
        <section className="editor">
          <div className="admin-heading">
            <h2>OSLC-{selected.reference}</h2>
            <button onClick={() => setSelected(null)}>Close review</button>
          </div>
          <dl className="enquiry-details">
            {[
              "name",
              "company",
              "email",
              "phone",
              "buyer_type",
              "category",
              "product_name",
              "quantity",
              "customization",
              "message",
              "created_at",
            ].map((k) => (
              <div key={k}>
                <dt>{k.replaceAll("_", " ")}</dt>
                <dd>{String(selected[k] || "—")}</dd>
              </div>
            ))}
          </dl>
          <form onSubmit={save}>
            <label>
              Status
              <select
                value={selected.status}
                onChange={(e) =>
                  setSelected({ ...selected, status: e.target.value })
                }
              >
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Internal notes
              <textarea
                rows={4}
                value={selected.notes}
                maxLength={10000}
                onChange={(e) =>
                  setSelected({ ...selected, notes: e.target.value })
                }
              />
            </label>
            {message && <Notice>{message}</Notice>}
            <button className="button" disabled={busy}>
              {busy ? "Saving…" : "Update enquiry"}
            </button>
          </form>
          <h3>Status history</h3>
          {Array.isArray(history.data) &&
            history.data.map((h, i) => (
              <article className="history" key={i}>
                <strong>{h.status}</strong> ·{" "}
                {new Date(h.created_at).toLocaleString()}
                <p className="preserve">{h.note}</p>
              </article>
            ))}
        </section>
      )}
    </>
  );
}
const emptyProduct = {
  name: "",
  slug: "",
  sku: "",
  category_id: null,
  description: "",
  sizes: "",
  colours: "",
  fabric: "",
  customization: "",
  moq: "",
  published: false,
  featured: false,
  demo: false,
  images: [],
};
function ImageEditor({
  images,
  onChange,
  multiple = true,
}: {
  images: Image[];
  onChange: (images: Image[]) => void;
  multiple?: boolean;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("images", f));
      const result = await api<Image[]>("/api/admin/uploads", {
        method: "POST",
        body: form,
      });
      onChange(
        multiple ? [...images, ...result].slice(0, 12) : result.slice(0, 1),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset>
      <legend>Images</legend>
      <p className="small">
        Upload real, approved JPEG, PNG or WebP images (8 MB each). Images are
        optimized to WebP.
      </p>
      <input
        aria-label="Upload images"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        disabled={busy}
        onChange={(e) => {
          upload(e.target.files);
          e.target.value = "";
        }}
      />
      {busy && <Notice>Uploading images…</Notice>}
      {error && <Notice error>{error}</Notice>}
      {images.map((image, i) => (
        <div className="image-row" key={i}>
          <img src={image.url} alt={image.alt || "Uploaded preview"} />
          <label>
            {multiple
              ? "Descriptive alternative text"
              : "Alternative text (uses entry title)"}
            <input
              required
              readOnly={!multiple}
              value={image.alt}
              onChange={(e) =>
                onChange(
                  images.map((im, n) =>
                    n === i ? { ...im, alt: e.target.value } : im,
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            aria-label="Move image earlier"
            disabled={i === 0}
            onClick={() => {
              const next = [...images];
              [next[i - 1], next[i]] = [next[i], next[i - 1]];
              onChange(next);
            }}
          >
            <GripVertical size={18} /> ↑
          </button>
          <button
            type="button"
            aria-label="Remove image"
            onClick={() => onChange(images.filter((_, n) => n !== i))}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </fieldset>
  );
}
type Kind =
  | "products"
  | "categories"
  | "capabilities"
  | "gallery"
  | "leadership"
  | "events"
  | "employees";
function Collection({ kind }: { kind: Kind }) {
  const [revision, setRevision] = useState(0),
    [edit, setEdit] = useState<any>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const {
    data,
    loading,
    error: loadError,
  } = useApi<any[]>("/api/admin/" + kind, revision);
  const categories = useApi<Entry[]>("/api/admin/categories", revision);
  const title =
    kind === "capabilities"
      ? "Manufacturing capabilities"
      : kind[0].toUpperCase() + kind.slice(1);
  function start(row?: any) {
    setEdit(
      row
        ? {
            ...row,
            ...(kind === "events" ? { date: row.date.slice(0, 10) } : {}),
            images: row.images?.map((i: Image) => ({ ...i })),
          }
        : kind === "products"
          ? { ...emptyProduct, images: [] }
          : {
              name: "",
              description: "",
              image: "",
              position: 0,
              published: false,
              ...(kind === "employees" ? { role: "" } : {}),
              ...(kind === "categories" ? { slug: "", department: "Men" } : {}),
              ...(kind === "capabilities"
                ? { operation: "To be confirmed" }
                : {}),
              ...(kind === "gallery" ? { category: "Company & Premises" } : {}),
              ...(kind === "leadership"
                ? {
                    title: "",
                    biography: "",
                    vision: "",
                    journey: "",
                    philosophy: "",
                    responsibilities: "",
                    qualifications: "",
                    experience: "",
                    quote: "",
                    social: "",
                  }
                : {}),
              ...(kind === "events"
                ? { category: "Company news", date: "" }
                : {}),
            },
    );
    setError("");
    setMessage("");
  }
  function field(key: string, value: any) {
    setEdit((old: any) => ({ ...old, [key]: value }));
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body =
        kind === "products"
          ? {
              ...edit,
              images: edit.images.map((im: Image, i: number) => ({
                ...im,
                position: i,
              })),
            }
          : edit;
      await api("/api/admin/" + kind + (edit.id ? "/" + edit.id : ""), {
        method: edit.id ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      setRevision((n) => n + 1);
      setEdit(null);
      setMessage("Changes saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(row: any) {
    if (
      !window.confirm(
        "Delete " +
          row.name +
          "? Products in deleted categories will become uncategorized.",
      )
    )
      return;
    try {
      await api("/api/admin/" + kind + "/" + row.id, { method: "DELETE" });
      setRevision((n) => n + 1);
      setMessage("Record deleted.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">WEBSITE MANAGEMENT</p>
          <h1>{title}</h1>
        </div>
        <button className="button" onClick={() => start()}>
          <Plus size={17} /> Add {kind === "products" ? "product" : "entry"}
        </button>
      </div>
      {message && <Notice>{message}</Notice>}
      {(loadError || (!edit && error)) && (
        <Notice error>{loadError || error}</Notice>
      )}
      {loading ? (
        <Notice>Loading records…</Notice>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>{kind === "products" ? "Code" : "Order"}</th>
                <th>Visibility</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.length ? (
                data.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.name}
                      {row.demo && <span className="status">Demo</span>}
                    </td>
                    <td>{row.sku ?? row.position}</td>
                    <td>
                      <span className="status">
                        {row.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => start(row)}>Edit</button>
                        {kind === "products" && row.published && (
                          <Link to={"/products/" + row.slug}>View ↗</Link>
                        )}
                        <button
                          aria-label={"Delete " + row.name}
                          onClick={() => remove(row)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
                    No records yet. Add an entry to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <section className="editor">
          <div className="admin-heading">
            <h2>
              {edit.id ? "Edit" : "Add"}{" "}
              {kind === "products" ? "product" : "entry"}
            </h2>
            <button onClick={() => setEdit(null)}>Cancel</button>
          </div>
          <form onSubmit={save}>
            <div className="form-grid">
              <label>
                Name *
                <input
                  required
                  maxLength={200}
                  value={edit.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setEdit({
                      ...edit,
                      name,
                      ...(!edit.id && "slug" in edit
                        ? {
                            slug: name
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/^-|-$/g, ""),
                          }
                        : {}),
                    });
                  }}
                />
              </label>
              {"slug" in edit && (
                <label>
                  URL slug *
                  <input
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    value={edit.slug}
                    onChange={(e) => field("slug", e.target.value)}
                  />
                </label>
              )}
              {kind === "products" ? (
                <>
                  <label>
                    Product code / SKU *
                    <input
                      required
                      maxLength={100}
                      value={edit.sku}
                      onChange={(e) => field("sku", e.target.value)}
                    />
                  </label>
                  <label>
                    Category
                    <select
                      value={edit.category_id || ""}
                      onChange={(e) =>
                        field("category_id", e.target.value || null)
                      }
                    >
                      <option value="">Uncategorized</option>
                      {categories.data?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {["sizes", "colours", "fabric", "customization", "moq"].map(
                    (k) => (
                      <label key={k}>
                        {k === "moq"
                          ? "Minimum order quantity"
                          : k[0].toUpperCase() + k.slice(1)}
                        <input
                          maxLength={500}
                          value={edit[k]}
                          onChange={(e) => field(k, e.target.value)}
                        />
                      </label>
                    ),
                  )}
                </>
              ) : (
                <label>
                  Display order
                  <input
                    type="number"
                    step={1}
                    required
                    value={edit.position}
                    onChange={(e) => field("position", Number(e.target.value))}
                  />
                </label>
              )}
              {kind === "gallery" && (
                <label>
                  Gallery category
                  <select
                    value={edit.category}
                    onChange={(e) => field("category", e.target.value)}
                  >
                    {[...galleryCategories].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              )}
              {kind === "categories" && (
                <label>
                  Collection department
                  <select
                    value={edit.department || "Men"}
                    onChange={(e) => field("department", e.target.value)}
                  >
                    {["Men", "Women", "Kids"].map((department) => (
                      <option key={department}>{department}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {kind === "capabilities" && (
              <label>
                Operation location
                <select
                  value={edit.operation || "To be confirmed"}
                  onChange={(e) => field("operation", e.target.value)}
                >
                  {["In-house", "Managed externally", "To be confirmed"].map(
                    (v) => (
                      <option key={v}>{v}</option>
                    ),
                  )}
                </select>
              </label>
            )}
            {kind === "employees" && (
              <label>
                Official role
                <input
                  required
                  maxLength={200}
                  value={edit.role || ""}
                  onChange={(e) => field("role", e.target.value)}
                />
              </label>
            )}
            {kind === "leadership" && (
              <>
                <Notice>
                  Publish only company-approved names, roles, biographies and
                  photographs. Leave optional information blank until verified.
                </Notice>
                {[
                  ["title", "Official designation"],
                  ["biography", "Biography"],
                  ["vision", "Founding vision"],
                  ["journey", "Company-building journey"],
                  ["philosophy", "Leadership / management philosophy"],
                  [
                    "responsibilities",
                    "Confirmed responsibilities & contribution",
                  ],
                  ["qualifications", "Verified qualifications"],
                  ["experience", "Verified experience"],
                  ["quote", "Approved message / quote"],
                  ["social", "Professional profile (HTTPS)"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    {["title", "social"].includes(key) ? (
                      <input
                        type={key === "social" ? "url" : "text"}
                        required={key === "title"}
                        value={edit[key] || ""}
                        onChange={(e) => field(key, e.target.value)}
                      />
                    ) : (
                      <textarea
                        rows={4}
                        required={key === "biography"}
                        value={edit[key] || ""}
                        onChange={(e) => field(key, e.target.value)}
                      />
                    )}
                  </label>
                ))}
              </>
            )}
            {kind === "events" && (
              <div className="form-grid">
                <label>
                  Event / announcement date *
                  <input
                    type="date"
                    required
                    value={edit.date || ""}
                    onChange={(e) => field("date", e.target.value)}
                  />
                </label>
                <label>
                  Category *
                  <input
                    required
                    maxLength={100}
                    value={edit.category}
                    onChange={(e) => field("category", e.target.value)}
                  />
                </label>
              </div>
            )}
            {kind !== "leadership" && (
              <label>
                Description
                <textarea
                  rows={4}
                  maxLength={kind === "products" ? 6000 : 2000}
                  value={edit.description}
                  onChange={(e) => field("description", e.target.value)}
                />
              </label>
            )}
            <ImageEditor
              multiple={kind === "products" || kind === "capabilities"}
              images={
                kind === "products"
                  ? edit.images
                  : kind === "capabilities" && edit.images?.length
                    ? edit.images.map((url: string, position: number) => ({ url, alt: edit.name, position }))
                  : edit.image
                    ? [{ url: edit.image, alt: edit.name, position: 0 }]
                    : []
              }
              onChange={(images) =>
                kind === "products"
                  ? field("images", images)
                  : kind === "capabilities"
                    ? setEdit((old: any) => ({ ...old, image: images[0]?.url || "", images: images.map(im => im.url) }))
                  : field("image", images[0]?.url || "")
              }
            />
            <label className="checkbox">
              <input
                type="checkbox"
                checked={edit.published}
                onChange={(e) => field("published", e.target.checked)}
              />{" "}
              Published — I have confirmed this information with OSLC.
            </label>
            {kind === "products" && (
              <>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={edit.featured}
                    onChange={(e) => field("featured", e.target.checked)}
                  />{" "}
                  Featured on homepage
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={edit.demo}
                    onChange={(e) => field("demo", e.target.checked)}
                  />{" "}
                  Demonstration product (clearly labelled publicly)
                </label>
              </>
            )}
            {error && <Notice error>{error}</Notice>}
            <button className="button" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </form>
        </section>
      )}
    </>
  );
}
const contentLabels: Record<string, string> = {
  marketplaceMyntraUrl: "Myntra URL (optional; blank uses platform homepage)",
  marketplaceAjioUrl: "AJIO URL (optional; blank uses platform homepage)",
  marketplaceMeeshoUrl: "Meesho URL (optional; blank uses platform homepage)",
  company: "Company wordmark",
  tagline: "Tagline",
  heroTitle: "Homepage headline",
  heroDescription: "Homepage description",
  about: "Company overview",
  history: "Approved company history and milestones",
  leadershipMessage: "Approved leadership message",
  founderMessage:
    "Approved founder message (homepage; separate paragraphs with a blank line)",
  segmentMen: "Men’s apparel ? confirmed capabilities",
  segmentWomen: "Women’s apparel ? confirmed capabilities",
  segmentKids: "Kids’ apparel ? confirmed categories",
  mission: "Mission",
  vision: "Vision",
  quality: "Confirmed quality approach",
  address: "Business address",
  phone: "Phone number",
  whatsapp: "WhatsApp number (country code, digits only)",
  email: "Business email",
  hours: "Confirmed business hours",
  process: "Confirmed manufacturing workflow (one step per line)",
  socialLinks: "Social links (one HTTPS URL per line)",
  marketplaceAmazonUrl:
    "Amazon OSLC store URL (HTTPS; leave blank until available)",
  marketplaceFlipkartUrl:
    "Flipkart OSLC store URL (HTTPS; leave blank until available)",
  seoTitle: "Homepage SEO title",
  seoDescription: "SEO description",
  privacy: "Privacy Policy",
  terms: "Terms & Conditions",
};
function Content() {
  const {
    data,
    error: loadError,
    loading,
  } = useApi<Record<string, any>>("/api/admin/content");
  const [form, setForm] = useState<Record<string, any> | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/api/admin/content", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setMessage("Website content saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">BRAND & INFORMATION</p>
          <h1>Website content</h1>
        </div>
      </div>
      {loadError && <Notice error>{loadError}</Notice>}
      {loading ? (
        <Notice>Loading content…</Notice>
      ) : (
        form && (
          <form className="editor" onSubmit={save}>
            <Notice>
              Leave unconfirmed contact details blank. Publish only verified
              processes. Privacy and terms text require company review before
              launch.
            </Notice>
            {Object.entries(contentLabels).map(([key, label]) => (
              <label key={key}>
                {label}
                {[
                  "company",
                  "tagline",
                  "heroTitle",
                  "phone",
                  "whatsapp",
                  "email",
                  "hours",
                  "seoTitle",
                  "marketplaceAmazonUrl",
                  "marketplaceFlipkartUrl",
                  "marketplaceMyntraUrl",
                  "marketplaceAjioUrl",
                  "marketplaceMeeshoUrl",
                ].includes(key) ? (
                  <input
                    type={
                      key === "email"
                        ? "email"
                        : key.startsWith("marketplace")
                          ? "url"
                          : "text"
                    }
                    value={form[key] || ""}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                ) : (
                  <textarea
                    rows={
                      ["about", "quality", "privacy", "terms"].includes(key)
                        ? 5
                        : 3
                    }
                    value={form[key] || ""}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                )}
              </label>
            ))}
            <fieldset>
              <legend>Page titles & SEO descriptions</legend>
              {corporateNav.map(([path, label]) => (
                <div key={path}>
                  <h3>{label}</h3>
                  {["title", "description"].map((key) => (
                    <label key={key}>
                      {key}
                      <input
                        maxLength={key === "title" ? 200 : 400}
                        value={form.pageSeo?.[path]?.[key] || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            pageSeo: {
                              ...form.pageSeo,
                              [path]: {
                                title: "",
                                description: "",
                                ...form.pageSeo?.[path],
                                [key]: e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              ))}
            </fieldset>
            {[
              "logoImage",
              "heroImage",
              "aboutImage",
              "collectionMenImage",
              "collectionWomenImage",
              "collectionKidsImage",
            ].map((key) => (
              <div key={key}>
                <h3>
                  {key.startsWith("collection")
                    ? key.replace("collection", "").replace("Image", "") +
                      " collection image"
                    : key === "logoImage"
                      ? "Company logo — used in the header and footer"
                      : key === "heroImage"
                        ? "Homepage hero image"
                        : "Company image"}
                </h3>
                <ImageEditor
                  multiple={false}
                  images={
                    form[key]
                      ? [
                          {
                            url: form[key],
                            alt: "OSLC company image",
                            position: 0,
                          },
                        ]
                      : []
                  }
                  onChange={(images) =>
                    setForm({ ...form, [key]: images[0]?.url || "" })
                  }
                />
              </div>
            ))}
            {error && <Notice error>{error}</Notice>}
            {message && <Notice>{message}</Notice>}
            <button className="button" disabled={busy}>
              {busy ? "Saving…" : "Save website content"}
            </button>
          </form>
        )
      )}
    </>
  );
}
