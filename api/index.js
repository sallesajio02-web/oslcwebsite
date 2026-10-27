// server/careers.ts
import { PDFDocument } from "pdf-lib";
import { Router } from "express";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import { z as z2 } from "zod";
import { createHash, randomUUID } from "node:crypto";
import nodemailer from "nodemailer";

// server/db.ts
import "dotenv/config";
import pg from "pg";
var pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : void 0,
  max: Number(process.env.DB_POOL_MAX || 10),
  connectionTimeoutMillis: 5e3
});
pool.on("error", () => console.error("PostgreSQL connection interrupted"));
var query = (sql, params = []) => pool.query(sql, params);

// server/validation.ts
import { z } from "zod";

// src/corporate-config.ts
var galleryCategories = [
  "Company & Premises",
  "Manufacturing",
  "Men",
  "Women",
  "Kids",
  "Leadership & Team",
  "Festivals & Celebrations",
  "Events & Activities"
];

// server/validation.ts
var text = (max = 500) => z.string().trim().max(max).refine(
  (v) => !/[<>\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v),
  "Plain text only"
);
var required = (max = 200) => text(max).refine((v) => v.length > 0, "Required");
var imageUrl = z.string().max(1e3).refine(
  (v) => v === "" || /^\/uploads\/[a-f0-9-]+\.webp$/.test(v) || /^\/demo\/[a-z0-9-]+\.svg$/.test(v) || /^\/demo\/photos\/[a-z0-9-]+\.webp$/.test(v) || /^https:\/\//.test(v),
  "Use an HTTPS image URL or an uploaded image"
);
var enquirySchema = z.object({
  name: required(100),
  company: required(160),
  email: z.email().max(254),
  phone: z.string().regex(/^[+\d ()-]{7,25}$/, "Enter a valid phone number"),
  enquiry_type: z.enum([
    "Company information",
    "Business partnership",
    "Manufacturing",
    "Careers",
    "Media",
    "Other"
  ]).optional(),
  buyer_type: z.enum([
    "Wholesaler",
    "Retailer",
    "Fashion brand",
    "Distributor",
    "Bulk buyer",
    "Other"
  ]).default("Other"),
  category: text(160).default(""),
  product_id: z.uuid().nullable().optional(),
  product_name: text(200).default(""),
  quantity: z.coerce.number().int().min(1).max(1e8).nullable().optional(),
  customization: text(2e3).default(""),
  message: required(4e3).refine(
    (v) => v.length >= 10,
    "Please provide at least 10 characters"
  ),
  website: z.literal("").default(""),
  consent: z.literal(true)
});
var statuses = [
  "New",
  "Contacted",
  "Quotation in Progress",
  "Quotation Sent",
  "Converted",
  "Closed"
];
var productSchema = z.object({
  name: required(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(200),
  sku: required(100),
  category_id: z.uuid().nullable(),
  description: text(6e3),
  sizes: text(),
  colours: text(),
  fabric: text(),
  customization: text(),
  moq: text(),
  published: z.boolean(),
  featured: z.boolean(),
  demo: z.boolean().default(false),
  images: z.array(
    z.object({
      url: imageUrl.refine((v) => !!v),
      alt: required(),
      position: z.number().int().min(0)
    })
  ).max(12)
});
var categorySchema = z.object({
  department: z.enum(["Men", "Women", "Kids"]).default("Men"),
  name: required(),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(200),
  description: text(2e3),
  image: imageUrl,
  position: z.number().int(),
  published: z.boolean()
});
var capabilitySchema = z.object({
  operation: z.enum(["In-house", "Managed externally", "To be confirmed"]).default("To be confirmed"),
  name: required(),
  description: text(4e3),
  image: imageUrl,
  position: z.number().int(),
  published: z.boolean()
});
var leadershipSchema = z.object({
  name: required(200),
  title: required(200),
  image: imageUrl,
  biography: required(6e3),
  vision: text(3e3).default(""),
  journey: text(4e3).default(""),
  philosophy: text(3e3).default(""),
  responsibilities: text(4e3).default(""),
  qualifications: text(1e3).default(""),
  experience: text(1e3).default(""),
  quote: text(2e3).default(""),
  social: z.union([
    z.url().refine((v) => v.startsWith("https://"), "Use HTTPS"),
    z.literal("")
  ]).default(""),
  position: z.number().int(),
  published: z.boolean()
});
var eventSchema = capabilitySchema.omit({ operation: true }).extend({
  date: z.iso.date(),
  category: required(100)
});
var employeeSchema = capabilitySchema.omit({ operation: true }).extend({ role: required(200) });
var gallerySchema = capabilitySchema.omit({ operation: true }).extend({
  image: imageUrl.refine((v) => !!v),
  category: z.enum([
    ...galleryCategories,
    "Products",
    "Factory and facilities",
    "Quality inspection",
    "Packaging and dispatch"
  ])
});
var marketplaceUrl = (domains) => z.string().trim().max(2e3).refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && domains.some(
      (domain) => url.hostname === domain || url.hostname.endsWith("." + domain)
    );
  } catch {
    return false;
  }
}, "Use an HTTPS store URL on the matching marketplace, or leave blank.").default("");
var contentSchema = z.object({
  marketplaceAmazonUrl: marketplaceUrl(["amazon.in", "amazon.com"]),
  marketplaceFlipkartUrl: marketplaceUrl(["flipkart.com"]),
  marketplaceMyntraUrl: marketplaceUrl(["myntra.com"]),
  marketplaceAjioUrl: marketplaceUrl(["ajio.com"]),
  marketplaceMeeshoUrl: marketplaceUrl(["meesho.com"]),
  history: text(6e3).default(""),
  leadershipMessage: text(6e3).default(""),
  founderMessage: text(6e3).default(""),
  segmentMen: text(2e3).default(""),
  segmentWomen: text(2e3).default(""),
  segmentKids: text(2e3).default(""),
  pageSeo: z.record(
    z.string().regex(/^\/[a-z-]*$/),
    z.object({ title: text(200), description: text(400) })
  ).default({}),
  company: required(100),
  tagline: required(),
  heroTitle: required(300),
  heroDescription: required(1e3),
  about: required(6e3),
  mission: text(3e3),
  vision: text(3e3),
  quality: text(6e3),
  address: required(500),
  phone: text(25),
  whatsapp: z.string().regex(/^\d{7,15}$|^$/),
  email: z.union([z.email(), z.literal("")]),
  hours: text(200),
  heroImage: imageUrl,
  logoImage: imageUrl.default(""),
  collectionMenImage: imageUrl.default(""),
  collectionWomenImage: imageUrl.default(""),
  collectionKidsImage: imageUrl.default(""),
  demoMode: z.boolean().default(false),
  aboutImage: imageUrl,
  socialLinks: text(2e3),
  seoTitle: required(200),
  seoDescription: required(400),
  process: text(6e3),
  privacy: required(1e4),
  terms: required(1e4)
});
function csvCell(value) {
  let s = String(value ?? "");
  if (/^[\s]*[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}

// src/careers-shared.ts
var employmentTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship"
];
var experienceLevels = [
  "Entry level",
  "Experienced",
  "Senior",
  "Any level"
];
var applicationStatuses = [
  "New Application",
  "Under Review",
  "Shortlisted",
  "Interview Scheduled",
  "Selected",
  "Rejected",
  "Withdrawn"
];

// server/careers.ts
var text2 = (max = 1e3) => z2.string().trim().max(max).refine(
  (v) => !/[<>\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v),
  "Plain text only"
);
var required2 = (max = 1e3) => text2(max).refine((v) => !!v, "Required");
var id = z2.uuid();
var fail = (message, status = 400) => Object.assign(new Error(message), { status });
var boundedEnv = (key, fallback, max) => Math.max(1, Math.min(max, Number(process.env[key]) || fallback));
var maxResumeBytes = () => boundedEnv("RESUME_MAX_MB", 5, 10) * 1024 * 1024;
var retentionDays = () => boundedEnv("RECRUITMENT_RETENTION_DAYS", 180, 3650);
var privacyNotice = () => process.env.RECRUITMENT_PRIVACY_NOTICE || `We collect your application details and resume to assess suitability for current or future opportunities. Access is restricted to authorized recruitment staff. Applications are retained for up to ${retentionDays()} days under the configured retention policy. Contact OSLC using the Contact Us page to request access, correction or deletion, or to withdraw your application. Submitting an application does not guarantee employment or an interview.`;
var jobSchema = z2.object({
  job_city: text2(120).default(""),
  job_region: text2(120).default(""),
  job_country: z2.string().regex(/^[A-Z]{2}$|^$/).default(""),
  structured_data: z2.boolean().default(false),
  slug: z2.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  title: required2(200),
  department_id: id,
  location: required2(250),
  employment_type: z2.enum(employmentTypes),
  experience_level: z2.enum(experienceLevels),
  experience: required2(1e3),
  openings: z2.number().int().min(1).max(1e4).nullable().default(null),
  salary: text2(300).default(""),
  description: required2(1e4),
  responsibilities: required2(8e3),
  qualifications: required2(6e3),
  skills: required2(6e3),
  preferred_skills: text2(6e3).default(""),
  deadline: z2.union([z2.iso.date(), z2.literal("")]).default(""),
  status: z2.enum(["Open", "Closed"]),
  published: z2.boolean(),
  featured: z2.boolean(),
  archived: z2.boolean()
}).refine(
  (v) => !v.structured_data || !!(v.job_city && v.job_region && v.job_country),
  "JobPosting metadata requires verified city, region and ISO country code."
);
var applicationSchema = z2.object({
  job_id: z2.union([id, z2.literal("")]).default(""),
  department_id: id,
  name: required2(100),
  email: z2.email().max(254).transform((v) => v.toLowerCase()),
  phone: z2.string().regex(/^[+\d ()-]{7,25}$/, "Enter a valid mobile number"),
  city: required2(200),
  experience: required2(1e3),
  education: required2(1e3),
  current_company: text2(200).default(""),
  skills: text2(3e3).default(""),
  expected_salary: text2(200).default(""),
  notice_period: text2(200).default(""),
  linkedin: z2.union([
    z2.url().refine(
      (v) => v.startsWith("https://www.linkedin.com/") || v.startsWith("https://linkedin.com/"),
      "Use a LinkedIn HTTPS URL"
    ),
    z2.literal("")
  ]).default(""),
  cover_letter: text2(6e3).default(""),
  consent: z2.literal("on"),
  website: z2.literal("").default("")
});
async function validateResume(bytes, mime, filename) {
  if (mime !== "application/pdf" || !/\.pdf$/i.test(filename))
    throw fail("Upload a PDF resume.");
  const content = bytes.toString("latin1");
  if (bytes.length > maxResumeBytes() || !/^%PDF-1\.[0-7][\r\n]/.test(content) && !/^%PDF-2\.0[\r\n]/.test(content) || !/%%EOF\s*$/.test(content) || !/\/Type\s*\/Catalog\b/.test(content))
    throw fail(
      "Invalid PDF. Upload a standard, unencrypted PDF resume within the size limit."
    );
  const normalized = content.replace(
    /#([a-f0-9]{2})/gi,
    (_, hex) => String.fromCharCode(parseInt(hex, 16))
  );
  if (/\/(JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA|RichMedia|XFA|AcroForm|Encrypt|ObjStm)\b/i.test(
    normalized
  ) || /<script|MZ\x90|<html/i.test(normalized))
    throw fail(
      "Interactive, encrypted or embedded-content PDFs are not accepted. Export a flattened PDF resume."
    );
  try {
    const document = await PDFDocument.load(bytes, {
      throwOnInvalidObject: true,
      updateMetadata: false,
      parseSpeed: 500
    });
    if (document.isEncrypted || document.getPageCount() < 1 || document.getPageCount() > 100 || document.context.enumerateIndirectObjects().length > 1e4)
      throw new Error("Unsupported resume document");
  } catch {
    throw fail(
      "The PDF could not be validated. Export a standard, flattened PDF with 1 to 100 pages."
    );
  }
}
var active = "j.published=true AND j.status='Open' AND j.archived=false AND (j.deadline IS NULL OR j.deadline >= (now() AT TIME ZONE 'Asia/Kolkata')::date)";
var selectJobs = "SELECT j.*,d.name AS department,coalesce(to_char(j.deadline,'YYYY-MM-DD'),'') AS deadline FROM job_vacancies j JOIN job_departments d ON d.id=j.department_id";
var careersPublic = Router();
careersPublic.get(
  "/config",
  async (_req, res) => res.json({
    departments: (await query("SELECT id,name FROM job_departments ORDER BY name")).rows,
    maxResumeBytes: maxResumeBytes(),
    retentionDays: retentionDays(),
    privacyNotice: privacyNotice()
  })
);
careersPublic.get("/jobs", async (req, res) => {
  const params = [];
  let where = active;
  for (const [key, column] of [
    ["department", "j.department_id"],
    ["type", "j.employment_type"],
    ["experience", "j.experience_level"]
  ])
    if (req.query[key]) {
      params.push(
        key === "department" ? id.parse(req.query[key]) : String(req.query[key]).slice(0, 100)
      );
      where += ` AND ${column}=$${params.length}`;
    }
  if (req.query.search) {
    params.push("%" + String(req.query.search).slice(0, 150) + "%");
    where += ` AND (j.title ILIKE $${params.length} OR j.description ILIKE $${params.length})`;
  }
  res.json(
    (await query(
      selectJobs + " WHERE " + where + " ORDER BY j.featured DESC,j.created_at DESC",
      params
    )).rows
  );
});
careersPublic.get("/jobs/:slug", async (req, res) => {
  const r = await query(selectJobs + " WHERE " + active + " AND j.slug=$1", [
    req.params.slug
  ]);
  if (!r.rowCount) {
    res.status(404).json({ error: "This vacancy is no longer open or available." });
    return;
  }
  res.json(r.rows[0]);
});
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxResumeBytes(),
    files: 1,
    fields: 20,
    fieldSize: 16e3,
    parts: 22
  }
});
careersPublic.post(
  "/applications",
  rateLimit({
    windowMs: 36e5,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: "Too many application attempts. Please try again later."
    }
  }),
  upload.single("resume"),
  async (req, res) => {
    const data = applicationSchema.parse(req.body);
    const file = req.file;
    if (!file) throw fail("A PDF resume is required.");
    await validateResume(file.buffer, file.mimetype, file.originalname);
    const hash = createHash("sha256").update(file.buffer).digest("hex");
    const dedupe = createHash("sha256").update(data.email + ":" + (data.job_id || "general") + ":" + hash).digest("hex");
    const reference = "OSLC-APP-" + randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase();
    const client = await pool.connect();
    let jobTitle = "General application";
    try {
      await client.query("BEGIN");
      if (data.job_id) {
        const job = await client.query(
          "SELECT j.title,j.department_id FROM job_vacancies j WHERE " + active + " AND j.id=$1 FOR SHARE",
          [data.job_id]
        );
        if (!job.rowCount)
          throw fail(
            "This vacancy has closed. Please choose another position or submit a general application."
          );
        if (job.rows[0].department_id !== data.department_id)
          throw fail("The selected department does not match this vacancy.");
        jobTitle = job.rows[0].title;
      }
      if (!(await client.query("SELECT id FROM job_departments WHERE id=$1", [
        data.department_id
      ])).rowCount)
        throw fail("Choose an available department.");
      const r = await client.query(
        `INSERT INTO job_applications(reference,job_id,department_id,name,email,phone,city,experience,education,current_company,skills,expected_salary,notice_period,linkedin,cover_letter,privacy_notice,dedupe_hash) VALUES(${Array.from({ length: 17 }, (_, i) => "$" + (i + 1)).join(",")}) RETURNING id`,
        [
          reference,
          data.job_id || null,
          data.department_id,
          data.name,
          data.email,
          data.phone,
          data.city,
          data.experience,
          data.education,
          data.current_company,
          data.skills,
          data.expected_salary,
          data.notice_period,
          data.linkedin,
          data.cover_letter,
          privacyNotice(),
          dedupe
        ]
      );
      await client.query(
        "INSERT INTO resume_files(application_id,filename,mime_type,size,sha256,data) VALUES($1,$2,'application/pdf',$3,$4,$5)",
        [r.rows[0].id, randomUUID() + ".pdf", file.size, hash, file.buffer]
      );
      await client.query(
        "INSERT INTO application_status_history(application_id,status) VALUES($1,'New Application')",
        [r.rows[0].id]
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      if (e.code === "23505")
        throw fail(
          "An identical application has already been received. Please contact OSLC if you need to update it.",
          409
        );
      throw e;
    } finally {
      client.release();
    }
    res.status(201).json({
      reference,
      message: "Your application has been saved. Keep this reference for your records. Submission does not guarantee an interview or employment."
    });
    void notifyRecruitment(
      data.email,
      reference,
      jobTitle,
      "New Application",
      true
    );
  }
);
async function notifyRecruitment(email, reference, title, status, initial = false) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) return;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : void 0,
    connectionTimeout: 1e4,
    socketTimeout: 15e3
  });
  const messages = [];
  if (initial && process.env.RECRUITMENT_NOTIFY_TO)
    messages.push({
      to: process.env.RECRUITMENT_NOTIFY_TO,
      subject: "New recruitment application " + reference,
      text: `A new application is available for ${title}. Sign in to the OSLC recruitment dashboard to review it. Reference: ${reference}.`
    });
  if (initial && process.env.RECRUITMENT_ACKNOWLEDGEMENTS === "true")
    messages.push({
      to: email,
      subject: "Application received: " + reference,
      text: `Your application for ${title} has been received. Reference: ${reference}. Submission does not guarantee an interview or employment.`
    });
  if (!initial && process.env.RECRUITMENT_STATUS_EMAILS === "true")
    messages.push({
      to: email,
      subject: "Application update: " + reference,
      text: `Your application ${reference} for ${title} has been updated to: ${status}. Please contact OSLC for further information.`
    });
  await Promise.all(
    messages.map(async (message) => {
      try {
        await transport.sendMail({ from: process.env.SMTP_FROM, ...message });
      } catch {
        console.error(
          "Recruitment notification failed; application remains stored. Reference:",
          reference
        );
      }
    })
  );
}
var careersAdmin = Router();
careersAdmin.get(
  "/departments",
  async (_req, res) => res.json(
    (await query("SELECT id,name FROM job_departments ORDER BY name")).rows
  )
);
careersAdmin.post("/departments", async (req, res) => {
  const name = required2(120).parse(req.body.name);
  res.status(201).json(
    (await query(
      "INSERT INTO job_departments(name) VALUES($1) RETURNING id,name",
      [name]
    )).rows[0]
  );
});
careersAdmin.put("/departments/:id", async (req, res) => {
  const r = await query(
    "UPDATE job_departments SET name=$1,updated_at=now() WHERE id=$2 RETURNING id,name",
    [required2(120).parse(req.body.name), id.parse(req.params.id)]
  );
  if (!r.rowCount) throw fail("Department not found", 404);
  res.json(r.rows[0]);
});
careersAdmin.get(
  "/jobs",
  async (_req, res) => res.json((await query(selectJobs + " ORDER BY j.created_at DESC")).rows)
);
async function saveJob(req, res) {
  const data = jobSchema.parse(req.body);
  const jobId = req.params.id ? id.parse(req.params.id) : randomUUID();
  const fields = { ...data, deadline: data.deadline || null };
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  if (!(await query("SELECT id FROM job_departments WHERE id=$1", [
    data.department_id
  ])).rowCount)
    throw fail("Choose an available department.");
  const r = req.params.id ? await query(
    `UPDATE job_vacancies SET ${keys.map((k, i) => k + "=$" + (i + 1)).join(",")},updated_at=now() WHERE id=$${keys.length + 1} RETURNING id`,
    [...values, jobId]
  ) : await query(
    `INSERT INTO job_vacancies(id,${keys.join(",")}) VALUES($1,${keys.map((_, i) => "$" + (i + 2)).join(",")}) RETURNING id`,
    [jobId, ...values]
  );
  if (!r.rowCount) throw fail("Vacancy not found", 404);
  res.status(req.params.id ? 200 : 201).json(r.rows[0]);
}
careersAdmin.post("/jobs", saveJob);
careersAdmin.put("/jobs/:id", saveJob);
careersAdmin.post("/jobs/archive-expired", async (_req, res) => {
  const r = await query(
    "UPDATE job_vacancies SET archived=true,status='Closed',updated_at=now() WHERE deadline < (now() AT TIME ZONE 'Asia/Kolkata')::date AND archived=false"
  );
  res.json({ archived: r.rowCount });
});
function filters(req) {
  const params = [];
  let where = " WHERE true";
  for (const [key, column] of [
    ["job", "a.job_id"],
    ["department", "a.department_id"],
    ["status", "a.status"]
  ])
    if (req.query[key]) {
      params.push(
        key === "status" ? z2.enum(applicationStatuses).parse(req.query[key]) : id.parse(req.query[key])
      );
      where += ` AND ${column}=$${params.length}`;
    }
  if (req.query.kind === "general") where += " AND a.job_id IS NULL";
  if (req.query.kind === "vacancy") where += " AND a.job_id IS NOT NULL";
  for (const [key, op] of [
    ["from", ">="],
    ["to", "<="]
  ])
    if (req.query[key]) {
      params.push(z2.iso.date().parse(req.query[key]));
      where += ` AND (a.created_at AT TIME ZONE 'Asia/Kolkata')::date ${op} $${params.length}::date`;
    }
  if (req.query.search) {
    params.push("%" + String(req.query.search).slice(0, 150) + "%");
    where += ` AND (a.name ILIKE $${params.length} OR a.reference ILIKE $${params.length})`;
  }
  if (req.query.experience) {
    params.push("%" + String(req.query.experience).slice(0, 150) + "%");
    where += ` AND a.experience ILIKE $${params.length}`;
  }
  return { where, params };
}
var selectApplications = "SELECT a.*,coalesce(j.title,'General application') AS job_title,d.name AS department FROM job_applications a LEFT JOIN job_vacancies j ON j.id=a.job_id JOIN job_departments d ON d.id=a.department_id";
careersAdmin.get("/applications/export", async (req, res) => {
  const { where, params } = filters(req);
  const rows = (await query(
    selectApplications + where + " ORDER BY a.created_at DESC LIMIT 10000",
    params
  )).rows;
  const fields = [
    "reference",
    "name",
    "email",
    "phone",
    "city",
    "job_title",
    "department",
    "experience",
    "education",
    "status",
    "created_at"
  ];
  res.type("text/csv").attachment("oslc-applications.csv").send(
    "\uFEFF" + fields.join(",") + "\r\n" + rows.map(
      (r) => fields.map(
        (f) => csvCell(r[f] instanceof Date ? r[f].toISOString() : r[f])
      ).join(",")
    ).join("\r\n")
  );
});
careersAdmin.get("/applications", async (req, res) => {
  const { where, params } = filters(req);
  const page = Math.max(
    1,
    Math.min(1e4, Math.floor(Number(req.query.page)) || 1)
  );
  const total = Number(
    (await query("SELECT count(*) FROM job_applications a" + where, params)).rows[0].count
  );
  const rows = await query(
    selectApplications + where + ` ORDER BY a.created_at DESC LIMIT 20 OFFSET $${params.length + 1}`,
    [...params, (page - 1) * 20]
  );
  res.json({ items: rows.rows, total, page, pages: Math.ceil(total / 20) });
});
careersAdmin.get("/applications/:id", async (req, res) => {
  const appId = id.parse(req.params.id);
  const r = await query(selectApplications + " WHERE a.id=$1", [appId]);
  if (!r.rowCount) throw fail("Application not found", 404);
  res.json({
    ...r.rows[0],
    history: (await query(
      "SELECT status,note,created_at FROM application_status_history WHERE application_id=$1 ORDER BY created_at DESC",
      [appId]
    )).rows
  });
});
careersAdmin.get("/applications/:id/resume", async (req, res) => {
  const r = await query(
    "SELECT filename,data FROM resume_files WHERE application_id=$1",
    [id.parse(req.params.id)]
  );
  if (!r.rowCount) throw fail("Resume not found", 404);
  res.set({
    "Cache-Control": "no-store, private",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'"
  }).type("application/pdf").attachment(r.rows[0].filename).send(r.rows[0].data);
});
careersAdmin.patch("/applications/:id", async (req, res) => {
  const data = z2.object({ status: z2.enum(applicationStatuses), notes: text2(1e4) }).parse(req.body);
  const client = await pool.connect();
  let updated;
  try {
    await client.query("BEGIN");
    const r = await client.query(
      "UPDATE job_applications SET status=$1,notes=$2,updated_at=now() WHERE id=$3 RETURNING email,reference,job_id",
      [data.status, data.notes, id.parse(req.params.id)]
    );
    if (!r.rowCount) throw fail("Application not found", 404);
    updated = r.rows[0];
    await client.query(
      "INSERT INTO application_status_history(application_id,admin_id,status,note) VALUES($1,$2,$3,$4)",
      [req.params.id, req.session.adminId, data.status, data.notes]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  res.json({ ok: true });
  const title = updated.job_id ? (await query("SELECT title FROM job_vacancies WHERE id=$1", [
    updated.job_id
  ])).rows[0]?.title : "General application";
  void notifyRecruitment(updated.email, updated.reference, title, data.status);
});
careersAdmin.delete("/applications/:id", async (req, res) => {
  const r = await query(
    "DELETE FROM job_applications WHERE id=$1 RETURNING id",
    [id.parse(req.params.id)]
  );
  if (!r.rowCount) throw fail("Application not found", 404);
  res.json({ ok: true });
});

// server/app.ts
import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import helmet from "helmet";
import { rateLimit as rateLimit2 } from "express-rate-limit";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID as randomUUID2, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import multer2 from "multer";
import sharp from "sharp";
import { put } from "@vercel/blob";
import nodemailer2 from "nodemailer";
import { z as z3, ZodError } from "zod";

// src/seo.ts
var pageDescriptions = {
  "/teams": "Meet the employees and teams behind OSLC apparel manufacturing in Surat.",
  "/careers": "Explore genuine career opportunities at OSLC in Surat and submit a secure job or general application.",
  "/": "OSLC \u2014 Om Sai Latest Creation. Textile and apparel manufacturing in Kosad, Surat, Gujarat, India.",
  "/about": "Discover OSLC, our company identity, mission, vision and apparel business segments in Surat.",
  "/leadership": "Meet the people, vision and dedication behind OSLC through company-approved leadership and team profiles.",
  "/capabilities": "Explore OSLC\u2019s Men, Women and Kids apparel segments and confirmed manufacturing capabilities.",
  "/manufacturing": "Discover OSLC\u2019s confirmed manufacturing processes, facilities and production approach.",
  "/quality": "Explore OSLC\u2019s guiding values and company-approved approach to quality and workmanship.",
  "/gallery": "Explore OSLC company, manufacturing, apparel, team and celebration photographs.",
  "/news": "Read company-approved OSLC news, milestones, celebrations and event announcements.",
  "/contact": "Contact OSLC \u2014 Om Sai Latest Creation in Kosad, Surat, Gujarat for business information and partnerships.",
  "/privacy": "Learn how OSLC handles business enquiry information and administrator cookies.",
  "/terms": "Read the terms for using the OSLC corporate website and business enquiry form."
};

// server/app.ts
var PgStore = connectPg(session);
var app = express();
var production = process.env.NODE_ENV === "production";
var siteUrl = (process.env.SITE_URL || "http://localhost:5173").replace(
  /\/$/,
  ""
);
var uploads = path.resolve(process.env.UPLOAD_DIR || "./uploads");
var allowedOrigins = /* @__PURE__ */ new Set([
  siteUrl,
  ...production ? [] : (process.env.DEV_ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean)
]);
if (production && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || !process.env.DATABASE_URL || !siteUrl.startsWith("https://")))
  throw new Error(
    "Production requires DATABASE_URL, a 32+ character SESSION_SECRET and HTTPS SITE_URL"
  );
app.set("trust proxy", Number(process.env.TRUST_PROXY || 0));
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "https:", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    }
  })
);
app.get("/__editor/oslc-source", async (_req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.type("text/plain").send(await readFile(path.resolve("oslc-whole-site.html"), "utf8"));
  } catch {
    res.status(404).type("text/plain").send("OSLC HTML file not found. Use Import to choose your HTML file.");
  }
});
app.get("/editor-preview.html", (_req, res) => {
  res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline' data: blob:; style-src 'unsafe-inline' data: blob:; img-src data: blob:; font-src data: blob:; media-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.sendFile(path.resolve(production ? "dist/editor-preview.html" : "public/editor-preview.html"));
});
app.use(express.json({ limit: "128kb" }));
app.use(
  "/api",
  rateLimit2({
    windowMs: 6e4,
    limit: 150,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." }
  })
);
app.use(
  session({
    store: new PgStore({ pool, createTableIfMissing: false }),
    secret: process.env.SESSION_SECRET || randomBytes(48).toString("hex"),
    resave: false,
    saveUninitialized: false,
    name: "oslc.sid",
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      secure: production,
      maxAge: 8 * 36e5
    }
  })
);
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    if (origin && !allowedOrigins.has(origin)) {
      res.status(403).json({ error: "Untrusted request origin" });
      return;
    }
  }
  next();
});
var admin = async (req, res, next) => {
  if (!req.session.adminId) {
    res.status(401).json({ error: "Please sign in" });
    return;
  }
  const result = await query("SELECT id FROM admins WHERE id=$1 AND role=$2", [
    req.session.adminId,
    "admin"
  ]);
  if (!result.rowCount) {
    res.status(401).json({ error: "Session no longer valid" });
    return;
  }
  next();
};
var csrf = (req, res, next) => {
  const token = req.get("x-csrf-token") || "";
  const expected = req.session.csrf || "";
  if (!expected || Buffer.byteLength(token) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
    res.status(403).json({ error: "Security token expired. Refresh and try again." });
    return;
  }
  next();
};
var mutation = (req, res, next) => ["GET", "HEAD"].includes(req.method) ? next() : csrf(req, res, next);
var uuid = (v) => z3.uuid().parse(v);
var pagination = (req) => ({
  page: Math.max(1, Math.min(1e4, Math.floor(Number(req.query.page)) || 1)),
  limit: 12
});
app.get("/api/health", async (_req, res) => {
  await query("SELECT 1");
  res.json({ ok: true });
});
app.get("/api/site", async (_req, res) => {
  const [content, categories, capabilities, gallery, leadership, events] = await Promise.all([
    query("SELECT value FROM content WHERE key='site'"),
    query(
      "SELECT * FROM categories WHERE published=true ORDER BY position,name"
    ),
    query(
      "SELECT * FROM capabilities WHERE published=true ORDER BY position"
    ),
    query("SELECT * FROM gallery WHERE published=true ORDER BY position"),
    query(
      "SELECT * FROM leadership WHERE published=true ORDER BY position,name"
    ),
    query(
      "SELECT *, to_char(date, 'YYYY-MM-DD') AS date FROM events WHERE published=true ORDER BY events.date DESC,position"
    )
  ]);
  res.json({
    ...content.rows[0]?.value,
    categories: categories.rows,
    capabilities: capabilities.rows,
    gallery: gallery.rows,
    leadership: leadership.rows,
    events: events.rows,
    employees: (await query(
      "SELECT * FROM employees WHERE published=true ORDER BY position,name"
    )).rows
  });
});
var productSelect = `SELECT p.*, c.name AS category_name, COALESCE((SELECT json_agg(i ORDER BY i.position) FROM product_images i WHERE i.product_id=p.id),'[]'::json) AS images FROM products p LEFT JOIN categories c ON c.id=p.category_id`;
app.get("/api/products", async (req, res) => {
  const { page, limit } = pagination(req);
  const params = [];
  let where = " WHERE p.published=true";
  if (req.query.search) {
    params.push("%" + String(req.query.search).slice(0, 200) + "%");
    where += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`;
  }
  if (req.query.category) {
    params.push(String(req.query.category));
    where += ` AND c.slug=$${params.length}`;
  }
  if (req.query.featured === "true") where += " AND p.featured=true";
  if (req.query.department) {
    params.push(z3.enum(["Men", "Women", "Kids"]).parse(req.query.department));
    where += ` AND c.department=$${params.length}`;
  }
  const total = await query(
    "SELECT count(*) FROM products p LEFT JOIN categories c ON c.id=p.category_id" + where,
    params
  );
  params.push(limit, (page - 1) * limit);
  const result = await query(
    productSelect + where + ` ORDER BY p.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  res.json({
    items: result.rows,
    total: Number(total.rows[0].count),
    page,
    pages: Math.ceil(Number(total.rows[0].count) / limit)
  });
});
app.get("/api/products/:slug", async (req, res) => {
  const r = await query(
    productSelect + " WHERE p.slug=$1 AND p.published=true",
    [req.params.slug]
  );
  if (!r.rowCount) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(r.rows[0]);
});
app.post(
  "/api/enquiries",
  rateLimit2({
    windowMs: 36e5,
    limit: 8,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many enquiries. Please try again in an hour." }
  }),
  async (req, res) => {
    const data = enquirySchema.parse(req.body);
    let productName = "";
    if (data.product_id) {
      const p = await query(
        "SELECT name,sku FROM products WHERE id=$1 AND published=true",
        [data.product_id]
      );
      if (!p.rowCount) {
        res.status(400).json({ error: "This product is no longer available for enquiry" });
        return;
      }
      productName = p.rows[0].name + " (" + p.rows[0].sku + ")";
    }
    const result = await query(
      "INSERT INTO enquiries(name,company,email,phone,buyer_type,category,product_id,product_name,quantity,customization,message) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING reference",
      [
        data.name,
        data.company,
        data.email,
        data.phone,
        data.enquiry_type || data.buyer_type,
        data.category,
        data.product_id || null,
        productName,
        data.quantity ?? null,
        data.customization,
        data.message
      ]
    );
    res.status(201).json({
      reference: "OSLC-" + result.rows[0].reference,
      message: "Your enquiry has been saved. OSLC can review it in the business enquiry inbox."
    });
    if (process.env.SMTP_HOST && process.env.SMTP_FROM && process.env.ENQUIRY_NOTIFY_TO) {
      try {
        const transport = nodemailer2.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === "true",
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : void 0,
          connectionTimeout: 1e4
        });
        await transport.sendMail({
          from: process.env.SMTP_FROM,
          to: process.env.ENQUIRY_NOTIFY_TO,
          subject: "New OSLC business enquiry #" + result.rows[0].reference,
          text: "A new enquiry is available. Sign in at " + siteUrl + "/admin to review it."
        });
      } catch {
        console.error(
          "SMTP notification failed; enquiry remains safely stored"
        );
      }
    }
  }
);
app.get("/api/auth/session", (req, res) => {
  req.session.csrf ||= randomBytes(32).toString("hex");
  res.json({ authenticated: !!req.session.adminId, csrf: req.session.csrf });
});
app.post(
  "/api/auth/login",
  rateLimit2({
    windowMs: 9e5,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: "Too many login attempts. Please try again in 15 minutes."
    }
  }),
  csrf,
  async (req, res) => {
    const data = z3.object({
      email: z3.email().max(254),
      password: z3.string().min(1).max(128)
    }).parse(req.body);
    const r = await query("SELECT * FROM admins WHERE email=$1", [
      data.email.toLowerCase()
    ]);
    const valid = await bcrypt.compare(
      data.password,
      r.rows[0]?.password_hash || "$2b$12$Fo9wGB5mkVNQxyCVOmIu7u8gzfs9PO3JQlKejMqH3uXddmSEmZGT6"
    );
    if (!r.rowCount || !valid) {
      res.status(401).json({ error: "Incorrect email or password" });
      return;
    }
    await new Promise(
      (resolve, reject) => req.session.regenerate((e) => e ? reject(e) : resolve())
    );
    req.session.adminId = r.rows[0].id;
    req.session.csrf = randomBytes(32).toString("hex");
    res.json({ authenticated: true, csrf: req.session.csrf });
  }
);
app.post(
  "/api/auth/logout",
  csrf,
  (req, res) => req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Could not end session" });
      return;
    }
    res.clearCookie("oslc.sid");
    res.json({ ok: true });
  })
);
app.use("/api/careers", careersPublic);
app.use("/api/admin", admin, mutation);
app.use("/api/admin/careers", careersAdmin);
app.get("/api/admin/dashboard", async (_req, res) => {
  const counts = await query(
    `SELECT (SELECT count(*) FROM enquiries) AS total,(SELECT count(*) FROM enquiries WHERE status='New') AS new,(SELECT count(*) FROM enquiries WHERE status IN ('Contacted','Quotation in Progress','Quotation Sent')) AS progress,(SELECT count(*) FROM products WHERE published=true) AS products`
  );
  const recent = await query(
    "SELECT id,reference,name,company,status,created_at FROM enquiries ORDER BY created_at DESC LIMIT 6"
  );
  res.json({ ...counts.rows[0], recent: recent.rows });
});
app.get(
  "/api/admin/content",
  async (_req, res) => res.json(
    (await query("SELECT value FROM content WHERE key='site'")).rows[0].value
  )
);
app.put("/api/admin/content", async (req, res) => {
  const data = contentSchema.parse(req.body);
  await query("UPDATE content SET value=$1,updated_at=now() WHERE key='site'", [
    JSON.stringify(data)
  ]);
  res.json(data);
});
app.get(
  "/api/admin/products",
  async (_req, res) => res.json((await query(productSelect + " ORDER BY p.created_at DESC")).rows)
);
async function saveProduct(req, res) {
  const data = productSchema.parse(req.body);
  const id2 = req.params.id ? uuid(req.params.id) : randomUUID2();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const values = [
      data.category_id,
      data.name,
      data.slug,
      data.sku,
      data.description,
      data.sizes,
      data.colours,
      data.fabric,
      data.customization,
      data.moq,
      data.published,
      data.featured,
      data.demo
    ];
    if (req.params.id) {
      const updated = await client.query(
        "UPDATE products SET category_id=$1,name=$2,slug=$3,sku=$4,description=$5,sizes=$6,colours=$7,fabric=$8,customization=$9,moq=$10,published=$11,featured=$12,demo=$13,updated_at=now() WHERE id=$14 RETURNING id",
        [...values, id2]
      );
      if (!updated.rowCount) {
        res.status(404).json({ error: "Product not found" });
        await client.query("ROLLBACK");
        return;
      }
    } else
      await client.query(
        "INSERT INTO products(category_id,name,slug,sku,description,sizes,colours,fabric,customization,moq,published,featured,demo,id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
        [...values, id2]
      );
    await client.query("DELETE FROM product_images WHERE product_id=$1", [id2]);
    for (const image of data.images)
      await client.query(
        "INSERT INTO product_images(product_id,url,alt,position) VALUES($1,$2,$3,$4)",
        [id2, image.url, image.alt, image.position]
      );
    await client.query("COMMIT");
    res.json({ id: id2 });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
app.post("/api/admin/products", saveProduct);
app.put("/api/admin/products/:id", saveProduct);
for (const [table, schema] of [
  ["categories", categorySchema],
  ["capabilities", capabilitySchema],
  ["gallery", gallerySchema],
  ["leadership", leadershipSchema],
  ["events", eventSchema],
  ["employees", employeeSchema]
]) {
  app.get(
    "/api/admin/" + table,
    async (_req, res) => res.json(
      (await query(`SELECT * FROM ${table} ORDER BY position,created_at`)).rows
    )
  );
  app.post("/api/admin/" + table, async (req, res) => {
    const data = schema.parse(req.body);
    const keys = Object.keys(data);
    const r = await query(
      `INSERT INTO ${table}(${keys.join(",")}) VALUES(${keys.map((_, i) => "$" + (i + 1)).join(",")}) RETURNING *`,
      Object.values(data)
    );
    res.status(201).json(r.rows[0]);
  });
  app.put("/api/admin/" + table + "/:id", async (req, res) => {
    const data = schema.parse(req.body);
    const keys = Object.keys(data);
    const r = await query(
      `UPDATE ${table} SET ${keys.map((k, i) => k + "=$" + (i + 1)).join(",")},updated_at=now() WHERE id=$${keys.length + 1} RETURNING *`,
      [...Object.values(data), uuid(req.params.id)]
    );
    if (!r.rowCount) {
      res.status(404).json({ error: "Record not found" });
      return;
    }
    res.json(r.rows[0]);
  });
}
for (const table of [
  "products",
  "categories",
  "capabilities",
  "gallery",
  "leadership",
  "events",
  "employees"
])
  app.delete("/api/admin/" + table + "/:id", async (req, res) => {
    await query(`DELETE FROM ${table} WHERE id=$1`, [uuid(req.params.id)]);
    res.json({ ok: true });
  });
function enquiryFilter(req) {
  const params = [];
  let where = " WHERE true";
  if (req.query.search) {
    params.push("%" + String(req.query.search).slice(0, 200) + "%");
    where += ` AND (name ILIKE $1 OR company ILIKE $1 OR email ILIKE $1 OR ('OSLC-' || reference::text) ILIKE $1)`;
  }
  if (req.query.status) {
    params.push(z3.enum(statuses).parse(req.query.status));
    where += ` AND status=$${params.length}`;
  }
  return { where, params };
}
app.get("/api/admin/enquiries/export", async (req, res) => {
  const { where, params } = enquiryFilter(req);
  const r = await query(
    "SELECT reference,created_at,name,company,email,phone,buyer_type,category,product_name,quantity,customization,message,status,notes FROM enquiries" + where + " ORDER BY created_at DESC",
    params
  );
  const columns = [
    "reference",
    "created_at",
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
    "status",
    "notes"
  ];
  res.type("text/csv").attachment("oslc-enquiries.csv").send(
    "\uFEFF" + columns.join(",") + "\r\n" + r.rows.map(
      (row) => columns.map(
        (c) => csvCell(row[c] instanceof Date ? row[c].toISOString() : row[c])
      ).join(",")
    ).join("\r\n")
  );
});
app.get("/api/admin/enquiries", async (req, res) => {
  const { where, params } = enquiryFilter(req);
  const { page, limit } = pagination(req);
  const total = await query("SELECT count(*) FROM enquiries" + where, params);
  params.push(limit, (page - 1) * limit);
  const r = await query(
    "SELECT * FROM enquiries" + where + ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  res.json({
    items: r.rows,
    page,
    pages: Math.ceil(Number(total.rows[0].count) / limit),
    total: Number(total.rows[0].count)
  });
});
app.get(
  "/api/admin/enquiries/:id/history",
  async (req, res) => res.json(
    (await query(
      "SELECT status,note,created_at FROM enquiry_history WHERE enquiry_id=$1 ORDER BY created_at DESC",
      [uuid(req.params.id)]
    )).rows
  )
);
app.patch("/api/admin/enquiries/:id", async (req, res) => {
  const data = z3.object({ status: z3.enum(statuses), notes: z3.string().max(1e4) }).parse(req.body);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(
      "UPDATE enquiries SET status=$1,notes=$2,updated_at=now() WHERE id=$3 RETURNING id",
      [data.status, data.notes, uuid(req.params.id)]
    );
    if (!r.rowCount) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Enquiry not found" });
      return;
    }
    await client.query(
      "INSERT INTO enquiry_history(enquiry_id,admin_id,status,note) VALUES($1,$2,$3,$4)",
      [req.params.id, req.session.adminId, data.status, data.notes]
    );
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});
var upload2 = multer2({
  storage: multer2.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype))
});
app.post("/api/admin/uploads", upload2.array("images", 8), async (req, res) => {
  const files = req.files;
  if (!files?.length) {
    res.status(400).json({ error: "Choose JPEG, PNG or WebP images, up to 8 MB each" });
    return;
  }
  const converted = await Promise.all(
    files.map(async (file) => {
      const image = sharp(file.buffer, { limitInputPixels: 4e7 });
      const metadata = await image.metadata().catch(() => {
        throw Object.assign(new Error("Invalid image file"), { status: 400 });
      });
      if (!["jpeg", "png", "webp"].includes(metadata.format || ""))
        throw Object.assign(
          new Error("Only JPEG, PNG and WebP image contents are accepted"),
          { status: 400 }
        );
      const bytes = await image.rotate().resize({
        width: 1800,
        height: 1800,
        fit: "inside",
        withoutEnlargement: true
      }).webp({ quality: 84 }).toBuffer();
      return { bytes, id: randomUUID2() };
    })
  );
  const urls = process.env.BLOB_READ_WRITE_TOKEN ? await Promise.all(
    converted.map(
      async (f) => (await put("uploads/" + f.id + ".webp", f.bytes, {
        access: "public",
        contentType: "image/webp"
      })).url
    )
  ) : await (async () => {
    await mkdir(uploads, { recursive: true });
    for (const item of converted)
      await writeFile(path.join(uploads, item.id + ".webp"), item.bytes);
    return converted.map((f) => "/uploads/" + f.id + ".webp");
  })();
  res.status(201).json(
    urls.map((url) => ({
      url,
      alt: "",
      position: 0
    }))
  );
});
app.use(
  "/uploads",
  express.static(uploads, { maxAge: "1y", immutable: true, dotfiles: "deny" })
);
var xml = (v) => v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
app.get(
  "/robots.txt",
  (_req, res) => res.type("text/plain").send(
    `User-agent: *
Disallow: /admin
Disallow: /api/
Sitemap: ${siteUrl}/sitemap.xml
`
  )
);
app.get("/sitemap.xml", async (_req, res) => {
  const openJobs = await query(
    "SELECT slug FROM job_vacancies WHERE published=true AND status='Open' AND archived=false AND (deadline IS NULL OR deadline >= (now() AT TIME ZONE 'Asia/Kolkata')::date)"
  );
  const pages = [
    "",
    "about",
    "leadership",
    "careers",
    "teams",
    "capabilities",
    "news",
    "manufacturing",
    "quality",
    "gallery",
    "contact",
    "privacy",
    "terms",
    ...openJobs.rows.map((r) => "careers/" + r.slug)
  ];
  res.type("application/xml").send(
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + pages.map((p) => "<url><loc>" + xml(siteUrl + "/" + p) + "</loc></url>").join("") + "</urlset>"
  );
});
app.use(
  "/api",
  (_req, res) => res.status(404).json({ error: "API endpoint not found" })
);
if (production) {
  app.use(express.static(path.resolve("dist"), { index: false }));
  app.get(["/editor", "/editor/{*path}"], (_req, res) => res.sendFile(path.resolve("dist/index.html")));
  app.get("/{*path}", async (req, res) => {
    let html = await readFile(path.resolve("dist/index.html"), "utf8");
    const content = (await query("SELECT value FROM content WHERE key='site'")).rows[0].value;
    const names = {
      "/": "",
      "/about": "About OSLC",
      "/products": "Our Business Segments",
      "/leadership": "Leadership & Team",
      "/careers": "Careers",
      "/teams": "Teams",
      "/capabilities": "Our Capabilities",
      "/news": "Company News & Events",
      "/manufacturing": "Manufacturing",
      "/quality": "Quality",
      "/gallery": "Gallery",
      "/contact": "Contact",
      "/privacy": "Privacy Policy",
      "/terms": "Terms and Conditions"
    };
    let title = names[req.path] === void 0 ? "Page not found" : names[req.path];
    title = content.pageSeo?.[req.path]?.title || title;
    let description = content.pageSeo?.[req.path]?.description || pageDescriptions[req.path] || content.seoDescription;
    let status = names[req.path] === void 0 ? 404 : 200;
    if (req.path.startsWith("/admin")) {
      title = "Administration";
      status = 200;
    }
    if (req.path.startsWith("/careers/")) {
      const vacancy = await query(
        "SELECT title,description FROM job_vacancies WHERE slug=$1 AND published=true AND status='Open' AND archived=false AND (deadline IS NULL OR deadline >= (now() AT TIME ZONE 'Asia/Kolkata')::date)",
        [req.path.slice(9)]
      );
      if (vacancy.rowCount) {
        title = vacancy.rows[0].title;
        description = vacancy.rows[0].description;
        status = 200;
      }
    }
    if (req.path.startsWith("/products/")) {
      const p = await query(
        "SELECT name,description FROM products WHERE slug=$1 AND published=true",
        [req.path.slice(10)]
      );
      if (p.rowCount) {
        title = p.rows[0].name;
        description = p.rows[0].description;
        status = 200;
      }
    }
    title = title ? title + " | OSLC" : content.seoTitle;
    html = html.replace(/<title>.*?<\/title>/, `<title>${xml(title)}</title>`).replace(
      /<meta\s+name="description"[^>]*>/,
      `<meta name="description" content="${xml(description)}"/>`
    ).replace(
      "</head>",
      `<link rel="canonical" href="${xml(siteUrl + req.path)}"/><meta property="og:title" content="${xml(title)}"/><meta property="og:description" content="${xml(description)}"/><meta property="og:url" content="${xml(siteUrl + req.path)}"/><meta property="og:type" content="website"/>${req.path.startsWith("/admin") || content.demoMode ? '<meta name="robots" content="noindex,nofollow"/>' : ""}</head>`
    );
    res.status(status).type("html").send(html);
  });
}
app.use(
  (err, _req, res, _next) => {
    if (res.headersSent) return;
    if (err instanceof ZodError) {
      res.status(400).json({
        error: err.issues.map((i) => i.path.join(".") + ": " + i.message).join("; ")
      });
      return;
    }
    if ([400, 404, 409].includes(err.status || 0)) {
      res.status(err.status).json({
        error: err instanceof SyntaxError ? "Malformed request body" : err.message
      });
      return;
    }
    const code = err.code;
    if (code === "23505") {
      res.status(409).json({ error: "That code, name or URL already exists" });
      return;
    }
    if (err instanceof multer2.MulterError) {
      res.status(400).json({ error: "Upload exceeds file size or count limit" });
      return;
    }
    console.error("Request failed:", err.name, code || "");
    res.status(503).json({
      error: "Service temporarily unavailable. Please try again shortly."
    });
  }
);

// server/vercel.ts
var vercel_default = app;
export {
  vercel_default as default
};
