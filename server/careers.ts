import { PDFDocument } from "pdf-lib";
import { Router } from "express";
import type { Request, Response } from "express";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { pool, query } from "./db.js";
import { csvCell } from "./validation.js";
import {
  employmentTypes,
  experienceLevels,
  applicationStatuses,
} from "../src/careers-shared.js";
const text = (max = 1000) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (v) => !/[<>\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v),
      "Plain text only",
    );
const required = (max = 1000) => text(max).refine((v) => !!v, "Required");
const id = z.uuid();
const fail = (message: string, status = 400) =>
  Object.assign(new Error(message), { status });
const boundedEnv = (key: string, fallback: number, max: number) =>
  Math.max(1, Math.min(max, Number(process.env[key]) || fallback));
export const maxResumeBytes = () =>
  boundedEnv("RESUME_MAX_MB", 5, 10) * 1024 * 1024;
export const retentionDays = () =>
  boundedEnv("RECRUITMENT_RETENTION_DAYS", 180, 3650);
export const privacyNotice = () =>
  process.env.RECRUITMENT_PRIVACY_NOTICE ||
  `We collect your application details and resume to assess suitability for current or future opportunities. Access is restricted to authorized recruitment staff. Applications are retained for up to ${retentionDays()} days under the configured retention policy. Contact OSLC using the Contact Us page to request access, correction or deletion, or to withdraw your application. Submitting an application does not guarantee employment or an interview.`;
export const jobSchema = z
  .object({
    job_city: text(120).default(""),
    job_region: text(120).default(""),
    job_country: z
      .string()
      .regex(/^[A-Z]{2}$|^$/)
      .default(""),
    structured_data: z.boolean().default(false),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(160),
    title: required(200),
    department_id: id,
    location: required(250),
    employment_type: z.enum(employmentTypes),
    experience_level: z.enum(experienceLevels),
    experience: required(1000),
    openings: z.number().int().min(1).max(10000).nullable().default(null),
    salary: text(300).default(""),
    description: required(10000),
    responsibilities: required(8000),
    qualifications: required(6000),
    skills: required(6000),
    preferred_skills: text(6000).default(""),
    deadline: z.union([z.iso.date(), z.literal("")]).default(""),
    status: z.enum(["Open", "Closed"]),
    published: z.boolean(),
    featured: z.boolean(),
    archived: z.boolean(),
  })
  .refine(
    (v) =>
      !v.structured_data || !!(v.job_city && v.job_region && v.job_country),
    "JobPosting metadata requires verified city, region and ISO country code.",
  );
const applicationSchema = z.object({
  job_id: z.union([id, z.literal("")]).default(""),
  department_id: id,
  name: required(100),
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  phone: z.string().regex(/^[+\d ()-]{7,25}$/, "Enter a valid mobile number"),
  city: required(200),
  experience: required(1000),
  education: required(1000),
  current_company: text(200).default(""),
  skills: text(3000).default(""),
  expected_salary: text(200).default(""),
  notice_period: text(200).default(""),
  linkedin: z
    .union([
      z
        .url()
        .refine(
          (v) =>
            v.startsWith("https://www.linkedin.com/") ||
            v.startsWith("https://linkedin.com/"),
          "Use a LinkedIn HTTPS URL",
        ),
      z.literal(""),
    ])
    .default(""),
  cover_letter: text(6000).default(""),
  consent: z.literal("on"),
  website: z.literal("").default(""),
});
export async function validateResume(
  bytes: Buffer,
  mime: string,
  filename: string,
) {
  if (mime !== "application/pdf" || !/\.pdf$/i.test(filename))
    throw fail("Upload a PDF resume.");
  const content = bytes.toString("latin1");
  if (
    bytes.length > maxResumeBytes() ||
    (!/^%PDF-1\.[0-7][\r\n]/.test(content) &&
      !/^%PDF-2\.0[\r\n]/.test(content)) ||
    !/%%EOF\s*$/.test(content) ||
    !/\/Type\s*\/Catalog\b/.test(content)
  )
    throw fail(
      "Invalid PDF. Upload a standard, unencrypted PDF resume within the size limit.",
    );
  // Reject interactive, encrypted, embedded and compressed object streams that could hide active content.
  const normalized = content.replace(/#([a-f0-9]{2})/gi, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  if (
    /\/(JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA|RichMedia|XFA|AcroForm|Encrypt|ObjStm)\b/i.test(
      normalized,
    ) ||
    /<script|MZ\x90|<html/i.test(normalized)
  )
    throw fail(
      "Interactive, encrypted or embedded-content PDFs are not accepted. Export a flattened PDF resume.",
    );
  try {
    const document = await PDFDocument.load(bytes, {
      throwOnInvalidObject: true,
      updateMetadata: false,
      parseSpeed: 500,
    });
    if (
      document.isEncrypted ||
      document.getPageCount() < 1 ||
      document.getPageCount() > 100 ||
      document.context.enumerateIndirectObjects().length > 10000
    )
      throw new Error("Unsupported resume document");
  } catch {
    throw fail(
      "The PDF could not be validated. Export a standard, flattened PDF with 1 to 100 pages.",
    );
  }
}
const active =
  "j.published=true AND j.status='Open' AND j.archived=false AND (j.deadline IS NULL OR j.deadline >= (now() AT TIME ZONE 'Asia/Kolkata')::date)";
const selectJobs =
  "SELECT j.*,d.name AS department,coalesce(to_char(j.deadline,'YYYY-MM-DD'),'') AS deadline FROM job_vacancies j JOIN job_departments d ON d.id=j.department_id";
export const careersPublic = Router();
careersPublic.get("/config", async (_req, res) =>
  res.json({
    departments: (
      await query("SELECT id,name FROM job_departments ORDER BY name")
    ).rows,
    maxResumeBytes: maxResumeBytes(),
    retentionDays: retentionDays(),
    privacyNotice: privacyNotice(),
  }),
);
careersPublic.get("/jobs", async (req, res) => {
  const params: unknown[] = [];
  let where = active;
  for (const [key, column] of [
    ["department", "j.department_id"],
    ["type", "j.employment_type"],
    ["experience", "j.experience_level"],
  ])
    if (req.query[key]) {
      params.push(
        key === "department"
          ? id.parse(req.query[key])
          : String(req.query[key]).slice(0, 100),
      );
      where += ` AND ${column}=$${params.length}`;
    }
  if (req.query.search) {
    params.push("%" + String(req.query.search).slice(0, 150) + "%");
    where += ` AND (j.title ILIKE $${params.length} OR j.description ILIKE $${params.length})`;
  }
  res.json(
    (
      await query(
        selectJobs +
          " WHERE " +
          where +
          " ORDER BY j.featured DESC,j.created_at DESC",
        params,
      )
    ).rows,
  );
});
careersPublic.get("/jobs/:slug", async (req, res) => {
  const r = await query(selectJobs + " WHERE " + active + " AND j.slug=$1", [
    req.params.slug,
  ]);
  if (!r.rowCount) {
    res
      .status(404)
      .json({ error: "This vacancy is no longer open or available." });
    return;
  }
  res.json(r.rows[0]);
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxResumeBytes(),
    files: 1,
    fields: 20,
    fieldSize: 16000,
    parts: 22,
  },
});
careersPublic.post(
  "/applications",
  rateLimit({
    windowMs: 3600000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: "Too many application attempts. Please try again later.",
    },
  }),
  upload.single("resume"),
  async (req, res) => {
    const data = applicationSchema.parse(req.body);
    const file = req.file;
    if (!file) throw fail("A PDF resume is required.");
    await validateResume(file.buffer, file.mimetype, file.originalname);
    const hash = createHash("sha256").update(file.buffer).digest("hex");
    const dedupe = createHash("sha256")
      .update(data.email + ":" + (data.job_id || "general") + ":" + hash)
      .digest("hex");
    const reference =
      "OSLC-APP-" + randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase();
    const client = await pool.connect();
    let jobTitle = "General application";
    try {
      await client.query("BEGIN");
      if (data.job_id) {
        const job = await client.query(
          "SELECT j.title,j.department_id FROM job_vacancies j WHERE " +
            active +
            " AND j.id=$1 FOR SHARE",
          [data.job_id],
        );
        if (!job.rowCount)
          throw fail(
            "This vacancy has closed. Please choose another position or submit a general application.",
          );
        if (job.rows[0].department_id !== data.department_id)
          throw fail("The selected department does not match this vacancy.");
        jobTitle = job.rows[0].title;
      }
      if (
        !(
          await client.query("SELECT id FROM job_departments WHERE id=$1", [
            data.department_id,
          ])
        ).rowCount
      )
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
          dedupe,
        ],
      );
      await client.query(
        "INSERT INTO resume_files(application_id,filename,mime_type,size,sha256,data) VALUES($1,$2,'application/pdf',$3,$4,$5)",
        [r.rows[0].id, randomUUID() + ".pdf", file.size, hash, file.buffer],
      );
      await client.query(
        "INSERT INTO application_status_history(application_id,status) VALUES($1,'New Application')",
        [r.rows[0].id],
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      if ((e as any).code === "23505")
        throw fail(
          "An identical application has already been received. Please contact OSLC if you need to update it.",
          409,
        );
      throw e;
    } finally {
      client.release();
    }
    res
      .status(201)
      .json({
        reference,
        message:
          "Your application has been saved. Keep this reference for your records. Submission does not guarantee an interview or employment.",
      });
    void notifyRecruitment(
      data.email,
      reference,
      jobTitle,
      "New Application",
      true,
    );
  },
);
async function notifyRecruitment(
  email: string,
  reference: string,
  title: string,
  status: string,
  initial = false,
) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) return;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });
  const messages = [];
  if (initial && process.env.RECRUITMENT_NOTIFY_TO)
    messages.push({
      to: process.env.RECRUITMENT_NOTIFY_TO,
      subject: "New recruitment application " + reference,
      text: `A new application is available for ${title}. Sign in to the OSLC recruitment dashboard to review it. Reference: ${reference}.`,
    });
  if (initial && process.env.RECRUITMENT_ACKNOWLEDGEMENTS === "true")
    messages.push({
      to: email,
      subject: "Application received: " + reference,
      text: `Your application for ${title} has been received. Reference: ${reference}. Submission does not guarantee an interview or employment.`,
    });
  if (!initial && process.env.RECRUITMENT_STATUS_EMAILS === "true")
    messages.push({
      to: email,
      subject: "Application update: " + reference,
      text: `Your application ${reference} for ${title} has been updated to: ${status}. Please contact OSLC for further information.`,
    });
  await Promise.all(
    messages.map(async (message) => {
      try {
        await transport.sendMail({ from: process.env.SMTP_FROM, ...message });
      } catch {
        console.error(
          "Recruitment notification failed; application remains stored. Reference:",
          reference,
        );
      }
    }),
  );
}
export const careersAdmin = Router();
careersAdmin.get("/departments", async (_req, res) =>
  res.json(
    (await query("SELECT id,name FROM job_departments ORDER BY name")).rows,
  ),
);
careersAdmin.post("/departments", async (req, res) => {
  const name = required(120).parse(req.body.name);
  res
    .status(201)
    .json(
      (
        await query(
          "INSERT INTO job_departments(name) VALUES($1) RETURNING id,name",
          [name],
        )
      ).rows[0],
    );
});
careersAdmin.put("/departments/:id", async (req, res) => {
  const r = await query(
    "UPDATE job_departments SET name=$1,updated_at=now() WHERE id=$2 RETURNING id,name",
    [required(120).parse(req.body.name), id.parse(req.params.id)],
  );
  if (!r.rowCount) throw fail("Department not found", 404);
  res.json(r.rows[0]);
});
careersAdmin.get("/jobs", async (_req, res) =>
  res.json((await query(selectJobs + " ORDER BY j.created_at DESC")).rows),
);
async function saveJob(req: Request, res: Response) {
  const data = jobSchema.parse(req.body);
  const jobId = req.params.id ? id.parse(req.params.id) : randomUUID();
  const fields = { ...data, deadline: data.deadline || null };
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  if (
    !(
      await query("SELECT id FROM job_departments WHERE id=$1", [
        data.department_id,
      ])
    ).rowCount
  )
    throw fail("Choose an available department.");
  const r = req.params.id
    ? await query(
        `UPDATE job_vacancies SET ${keys.map((k, i) => k + "=$" + (i + 1)).join(",")},updated_at=now() WHERE id=$${keys.length + 1} RETURNING id`,
        [...values, jobId],
      )
    : await query(
        `INSERT INTO job_vacancies(id,${keys.join(",")}) VALUES($1,${keys.map((_, i) => "$" + (i + 2)).join(",")}) RETURNING id`,
        [jobId, ...values],
      );
  if (!r.rowCount) throw fail("Vacancy not found", 404);
  res.status(req.params.id ? 200 : 201).json(r.rows[0]);
}
careersAdmin.post("/jobs", saveJob);
careersAdmin.put("/jobs/:id", saveJob);
careersAdmin.post("/jobs/archive-expired", async (_req, res) => {
  const r = await query(
    "UPDATE job_vacancies SET archived=true,status='Closed',updated_at=now() WHERE deadline < (now() AT TIME ZONE 'Asia/Kolkata')::date AND archived=false",
  );
  res.json({ archived: r.rowCount });
});
function filters(req: Request) {
  const params: unknown[] = [];
  let where = " WHERE true";
  for (const [key, column] of [
    ["job", "a.job_id"],
    ["department", "a.department_id"],
    ["status", "a.status"],
  ])
    if (req.query[key]) {
      params.push(
        key === "status"
          ? z.enum(applicationStatuses).parse(req.query[key])
          : id.parse(req.query[key]),
      );
      where += ` AND ${column}=$${params.length}`;
    }
  if (req.query.kind === "general") where += " AND a.job_id IS NULL";
  if (req.query.kind === "vacancy") where += " AND a.job_id IS NOT NULL";
  for (const [key, op] of [
    ["from", ">="],
    ["to", "<="],
  ])
    if (req.query[key]) {
      params.push(z.iso.date().parse(req.query[key]));
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
const selectApplications =
  "SELECT a.*,coalesce(j.title,'General application') AS job_title,d.name AS department FROM job_applications a LEFT JOIN job_vacancies j ON j.id=a.job_id JOIN job_departments d ON d.id=a.department_id";
careersAdmin.get("/applications/export", async (req, res) => {
  const { where, params } = filters(req);
  const rows = (
    await query(
      selectApplications + where + " ORDER BY a.created_at DESC LIMIT 10000",
      params,
    )
  ).rows;
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
    "created_at",
  ];
  res
    .type("text/csv")
    .attachment("oslc-applications.csv")
    .send(
      "\uFEFF" +
        fields.join(",") +
        "\r\n" +
        rows
          .map((r) =>
            fields
              .map((f) =>
                csvCell(r[f] instanceof Date ? r[f].toISOString() : r[f]),
              )
              .join(","),
          )
          .join("\r\n"),
    );
});
careersAdmin.get("/applications", async (req, res) => {
  const { where, params } = filters(req);
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(req.query.page)) || 1),
  );
  const total = Number(
    (await query("SELECT count(*) FROM job_applications a" + where, params))
      .rows[0].count,
  );
  const rows = await query(
    selectApplications +
      where +
      ` ORDER BY a.created_at DESC LIMIT 20 OFFSET $${params.length + 1}`,
    [...params, (page - 1) * 20],
  );
  res.json({ items: rows.rows, total, page, pages: Math.ceil(total / 20) });
});
careersAdmin.get("/applications/:id", async (req, res) => {
  const appId = id.parse(req.params.id);
  const r = await query(selectApplications + " WHERE a.id=$1", [appId]);
  if (!r.rowCount) throw fail("Application not found", 404);
  res.json({
    ...r.rows[0],
    history: (
      await query(
        "SELECT status,note,created_at FROM application_status_history WHERE application_id=$1 ORDER BY created_at DESC",
        [appId],
      )
    ).rows,
  });
});
careersAdmin.get("/applications/:id/resume", async (req, res) => {
  const r = await query(
    "SELECT filename,data FROM resume_files WHERE application_id=$1",
    [id.parse(req.params.id)],
  );
  if (!r.rowCount) throw fail("Resume not found", 404);
  res
    .set({
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
    })
    .type("application/pdf")
    .attachment(r.rows[0].filename)
    .send(r.rows[0].data);
});
careersAdmin.patch("/applications/:id", async (req, res) => {
  const data = z
    .object({ status: z.enum(applicationStatuses), notes: text(10000) })
    .parse(req.body);
  const client = await pool.connect();
  let updated: any;
  try {
    await client.query("BEGIN");
    const r = await client.query(
      "UPDATE job_applications SET status=$1,notes=$2,updated_at=now() WHERE id=$3 RETURNING email,reference,job_id",
      [data.status, data.notes, id.parse(req.params.id)],
    );
    if (!r.rowCount) throw fail("Application not found", 404);
    updated = r.rows[0];
    await client.query(
      "INSERT INTO application_status_history(application_id,admin_id,status,note) VALUES($1,$2,$3,$4)",
      [req.params.id, req.session.adminId, data.status, data.notes],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  res.json({ ok: true });
  const title = updated.job_id
    ? (
        await query("SELECT title FROM job_vacancies WHERE id=$1", [
          updated.job_id,
        ])
      ).rows[0]?.title
    : "General application";
  void notifyRecruitment(updated.email, updated.reference, title, data.status);
});
careersAdmin.delete("/applications/:id", async (req, res) => {
  const r = await query(
    "DELETE FROM job_applications WHERE id=$1 RETURNING id",
    [id.parse(req.params.id)],
  );
  if (!r.rowCount) throw fail("Application not found", 404);
  res.json({ ok: true });
});
