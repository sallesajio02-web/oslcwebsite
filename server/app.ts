import { careersPublic, careersAdmin } from "./careers.js";
import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import multer from "multer";
import sharp from "sharp";
import { put } from "@vercel/blob";
import nodemailer from "nodemailer";
import { z, ZodError } from "zod";
import { pool, query } from "./db.js";
import { pageDescriptions } from "../src/seo.js";
import {
  leadershipSchema,
  eventSchema,
  employeeSchema,
  enquirySchema,
  productSchema,
  categorySchema,
  capabilitySchema,
  gallerySchema,
  contentSchema,
  statuses,
  csvCell,
} from "./validation.js";
declare module "express-session" {
  interface SessionData {
    adminId?: string;
    csrf?: string;
  }
}
const PgStore = connectPg(session);
export const app = express();
const production = process.env.NODE_ENV === "production";
const siteUrl = (process.env.SITE_URL || "https://oslcwebsite.vercel.app").replace(
  /\/$/,
  "",
);
const uploads = path.resolve(process.env.UPLOAD_DIR || "./uploads");
const allowedOrigins = new Set([
  siteUrl,
  ...(production
    ? []
    : (process.env.DEV_ALLOWED_ORIGINS || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)),
]);
if (
  production &&
  (!process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.length < 32 ||
    !process.env.DATABASE_URL ||
    !siteUrl.startsWith("https://"))
)
  throw new Error(
    "Production requires DATABASE_URL, a 32+ character SESSION_SECRET and HTTPS SITE_URL",
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
        frameAncestors: ["'none'"],
      },
    },
  }),
);
// Relax inline-script execution only in the opaque sandbox document, never the editor UI.
app.get("/__editor/oslc-source", async (_req, res) => {
  try { res.setHeader("Cache-Control", "no-store"); res.type("text/plain").send(await readFile(path.resolve("oslc-whole-site.html"), "utf8")); }
  catch { res.status(404).type("text/plain").send("OSLC HTML file not found. Use Import to choose your HTML file."); }
});
app.get("/editor-preview.html", (_req, res) => {
  res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline' data: blob:; style-src 'unsafe-inline' data: blob:; img-src data: blob:; font-src data: blob:; media-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.sendFile(path.resolve(production ? "dist/editor-preview.html" : "public/editor-preview.html"));
});
app.use(express.json({ limit: "128kb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 150,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
  }),
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
      maxAge: 8 * 3600000,
    },
  }),
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
const admin: express.RequestHandler = async (req, res, next) => {
  if (!req.session.adminId) {
    res.status(401).json({ error: "Please sign in" });
    return;
  }
  const result = await query("SELECT id FROM admins WHERE id=$1 AND role=$2", [
    req.session.adminId,
    "admin",
  ]);
  if (!result.rowCount) {
    res.status(401).json({ error: "Session no longer valid" });
    return;
  }
  next();
};
const csrf: express.RequestHandler = (req, res, next) => {
  const token = req.get("x-csrf-token") || "";
  const expected = req.session.csrf || "";
  if (
    !expected ||
    Buffer.byteLength(token) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  ) {
    res
      .status(403)
      .json({ error: "Security token expired. Refresh and try again." });
    return;
  }
  next();
};
const mutation: express.RequestHandler = (req, res, next) =>
  ["GET", "HEAD"].includes(req.method) ? next() : csrf(req, res, next);
const uuid = (v: unknown) => z.uuid().parse(v);
const pagination = (req: express.Request) => ({
  page: Math.max(1, Math.min(10000, Math.floor(Number(req.query.page)) || 1)),
  limit: 12,
});
app.get("/api/health", async (_req, res) => {
  await query("SELECT 1");
  res.json({ ok: true });
});
app.get("/api/site", async (_req, res) => {
  const [content, categories, capabilities, gallery, leadership, events] =
    await Promise.all([
      query("SELECT value FROM content WHERE key='site'"),
      query(
        "SELECT * FROM categories WHERE published=true ORDER BY position,name",
      ),
      query(
        "SELECT * FROM capabilities WHERE published=true ORDER BY position",
      ),
      query("SELECT * FROM gallery WHERE published=true ORDER BY position"),
      query(
        "SELECT * FROM leadership WHERE published=true ORDER BY position,name",
      ),
      query(
        "SELECT *, to_char(date, 'YYYY-MM-DD') AS date FROM events WHERE published=true ORDER BY events.date DESC,position",
      ),
    ]);
  res.json({
    ...content.rows[0]?.value,
    categories: categories.rows,
    capabilities: capabilities.rows,
    gallery: gallery.rows,
    leadership: leadership.rows,
    events: events.rows,
    employees: (
      await query(
        "SELECT * FROM employees WHERE published=true ORDER BY position,name",
      )
    ).rows,
  });
});
const productSelect = `SELECT p.*, c.name AS category_name, COALESCE((SELECT json_agg(i ORDER BY i.position) FROM product_images i WHERE i.product_id=p.id),'[]'::json) AS images FROM products p LEFT JOIN categories c ON c.id=p.category_id`;
app.get("/api/products", async (req, res) => {
  const { page, limit } = pagination(req);
  const params: unknown[] = [];
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
    params.push(z.enum(["Men", "Women", "Kids"]).parse(req.query.department));
    where += ` AND c.department=$${params.length}`;
  }
  const total = await query(
    "SELECT count(*) FROM products p LEFT JOIN categories c ON c.id=p.category_id" +
      where,
    params,
  );
  params.push(limit, (page - 1) * limit);
  const result = await query(
    productSelect +
      where +
      ` ORDER BY p.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  res.json({
    items: result.rows,
    total: Number(total.rows[0].count),
    page,
    pages: Math.ceil(Number(total.rows[0].count) / limit),
  });
});
app.get("/api/products/:slug", async (req, res) => {
  const r = await query(
    productSelect + " WHERE p.slug=$1 AND p.published=true",
    [req.params.slug],
  );
  if (!r.rowCount) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(r.rows[0]);
});
app.post(
  "/api/enquiries",
  rateLimit({
    windowMs: 3600000,
    limit: 8,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many enquiries. Please try again in an hour." },
  }),
  async (req, res) => {
    const data = enquirySchema.parse(req.body);
    let productName = "";
    if (data.product_id) {
      const p = await query(
        "SELECT name,sku FROM products WHERE id=$1 AND published=true",
        [data.product_id],
      );
      if (!p.rowCount) {
        res
          .status(400)
          .json({ error: "This product is no longer available for enquiry" });
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
        data.message,
      ],
    );
    res.status(201).json({
      reference: "OSLC-" + result.rows[0].reference,
      message:
        "Your enquiry has been saved. OSLC can review it in the business enquiry inbox.",
    });
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_FROM &&
      process.env.ENQUIRY_NOTIFY_TO
    ) {
      try {
        const transport = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === "true",
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
            : undefined,
          connectionTimeout: 10000,
        });
        await transport.sendMail({
          from: process.env.SMTP_FROM,
          to: process.env.ENQUIRY_NOTIFY_TO,
          subject: "New OSLC business enquiry #" + result.rows[0].reference,
          text:
            "A new enquiry is available. Sign in at " +
            siteUrl +
            "/admin to review it.",
        });
      } catch {
        console.error(
          "SMTP notification failed; enquiry remains safely stored",
        );
      }
    }
  },
);
app.get("/api/auth/session", (req, res) => {
  req.session.csrf ||= randomBytes(32).toString("hex");
  res.json({ authenticated: !!req.session.adminId, csrf: req.session.csrf });
});
app.post(
  "/api/auth/login",
  rateLimit({
    windowMs: 900000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: "Too many login attempts. Please try again in 15 minutes.",
    },
  }),
  csrf,
  async (req, res) => {
    const data = z
      .object({
        email: z.email().max(254),
        password: z.string().min(1).max(128),
      })
      .parse(req.body);
    const r = await query("SELECT * FROM admins WHERE email=$1", [
      data.email.toLowerCase(),
    ]);
    const valid = await bcrypt.compare(
      data.password,
      r.rows[0]?.password_hash ||
        "$2b$12$Fo9wGB5mkVNQxyCVOmIu7u8gzfs9PO3JQlKejMqH3uXddmSEmZGT6",
    );
    if (!r.rowCount || !valid) {
      res.status(401).json({ error: "Incorrect email or password" });
      return;
    }
    await new Promise<void>((resolve, reject) =>
      req.session.regenerate((e) => (e ? reject(e) : resolve())),
    );
    req.session.adminId = r.rows[0].id;
    req.session.csrf = randomBytes(32).toString("hex");
    res.json({ authenticated: true, csrf: req.session.csrf });
  },
);
app.post("/api/auth/logout", csrf, (req, res) =>
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Could not end session" });
      return;
    }
    res.clearCookie("oslc.sid");
    res.json({ ok: true });
  }),
);
app.use("/api/careers", careersPublic);
app.use("/api/admin", admin, mutation);
app.use("/api/admin/careers", careersAdmin);
app.get("/api/admin/dashboard", async (_req, res) => {
  const counts = await query(
    `SELECT (SELECT count(*) FROM enquiries) AS total,(SELECT count(*) FROM enquiries WHERE status='New') AS new,(SELECT count(*) FROM enquiries WHERE status IN ('Contacted','Quotation in Progress','Quotation Sent')) AS progress,(SELECT count(*) FROM products WHERE published=true) AS products`,
  );
  const recent = await query(
    "SELECT id,reference,name,company,status,created_at FROM enquiries ORDER BY created_at DESC LIMIT 6",
  );
  res.json({ ...counts.rows[0], recent: recent.rows });
});
app.get("/api/admin/content", async (_req, res) =>
  res.json(
    (await query("SELECT value FROM content WHERE key='site'")).rows[0].value,
  ),
);
app.put("/api/admin/content", async (req, res) => {
  const data = contentSchema.parse(req.body);
  await query("UPDATE content SET value=$1,updated_at=now() WHERE key='site'", [
    JSON.stringify(data),
  ]);
  res.json(data);
});
app.get("/api/admin/products", async (_req, res) =>
  res.json((await query(productSelect + " ORDER BY p.created_at DESC")).rows),
);
async function saveProduct(req: express.Request, res: express.Response) {
  const data = productSchema.parse(req.body);
  const id = req.params.id ? uuid(req.params.id) : randomUUID();
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
      data.demo,
    ];
    if (req.params.id) {
      const updated = await client.query(
        "UPDATE products SET category_id=$1,name=$2,slug=$3,sku=$4,description=$5,sizes=$6,colours=$7,fabric=$8,customization=$9,moq=$10,published=$11,featured=$12,demo=$13,updated_at=now() WHERE id=$14 RETURNING id",
        [...values, id],
      );
      if (!updated.rowCount) {
        res.status(404).json({ error: "Product not found" });
        await client.query("ROLLBACK");
        return;
      }
    } else
      await client.query(
        "INSERT INTO products(category_id,name,slug,sku,description,sizes,colours,fabric,customization,moq,published,featured,demo,id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
        [...values, id],
      );
    await client.query("DELETE FROM product_images WHERE product_id=$1", [id]);
    for (const image of data.images)
      await client.query(
        "INSERT INTO product_images(product_id,url,alt,position) VALUES($1,$2,$3,$4)",
        [id, image.url, image.alt, image.position],
      );
    await client.query("COMMIT");
    res.json({ id });
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
  ["employees", employeeSchema],
] as const) {
  app.get("/api/admin/" + table, async (_req, res) =>
    res.json(
      (await query(`SELECT * FROM ${table} ORDER BY position,created_at`)).rows,
    ),
  );
  app.post("/api/admin/" + table, async (req, res) => {
    const data = schema.parse(req.body);
    const keys = Object.keys(data);
    const r = await query(
      `INSERT INTO ${table}(${keys.join(",")}) VALUES(${keys.map((_, i) => "$" + (i + 1)).join(",")}) RETURNING *`,
      Object.values(data),
    );
    res.status(201).json(r.rows[0]);
  });
  app.put("/api/admin/" + table + "/:id", async (req, res) => {
    const data = schema.parse(req.body);
    const keys = Object.keys(data);
    const r = await query(
      `UPDATE ${table} SET ${keys.map((k, i) => k + "=$" + (i + 1)).join(",")},updated_at=now() WHERE id=$${keys.length + 1} RETURNING *`,
      [...Object.values(data), uuid(req.params.id)],
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
  "employees",
])
  app.delete("/api/admin/" + table + "/:id", async (req, res) => {
    await query(`DELETE FROM ${table} WHERE id=$1`, [uuid(req.params.id)]);
    res.json({ ok: true });
  });
function enquiryFilter(req: express.Request) {
  const params: unknown[] = [];
  let where = " WHERE true";
  if (req.query.search) {
    params.push("%" + String(req.query.search).slice(0, 200) + "%");
    where += ` AND (name ILIKE $1 OR company ILIKE $1 OR email ILIKE $1 OR ('OSLC-' || reference::text) ILIKE $1)`;
  }
  if (req.query.status) {
    params.push(z.enum(statuses).parse(req.query.status));
    where += ` AND status=$${params.length}`;
  }
  return { where, params };
}
app.get("/api/admin/enquiries/export", async (req, res) => {
  const { where, params } = enquiryFilter(req);
  const r = await query(
    "SELECT reference,created_at,name,company,email,phone,buyer_type,category,product_name,quantity,customization,message,status,notes FROM enquiries" +
      where +
      " ORDER BY created_at DESC",
    params,
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
    "notes",
  ];
  res
    .type("text/csv")
    .attachment("oslc-enquiries.csv")
    .send(
      "\uFEFF" +
        columns.join(",") +
        "\r\n" +
        r.rows
          .map((row) =>
            columns
              .map((c) =>
                csvCell(row[c] instanceof Date ? row[c].toISOString() : row[c]),
              )
              .join(","),
          )
          .join("\r\n"),
    );
});
app.get("/api/admin/enquiries", async (req, res) => {
  const { where, params } = enquiryFilter(req);
  const { page, limit } = pagination(req);
  const total = await query("SELECT count(*) FROM enquiries" + where, params);
  params.push(limit, (page - 1) * limit);
  const r = await query(
    "SELECT * FROM enquiries" +
      where +
      ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  res.json({
    items: r.rows,
    page,
    pages: Math.ceil(Number(total.rows[0].count) / limit),
    total: Number(total.rows[0].count),
  });
});
app.get("/api/admin/enquiries/:id/history", async (req, res) =>
  res.json(
    (
      await query(
        "SELECT status,note,created_at FROM enquiry_history WHERE enquiry_id=$1 ORDER BY created_at DESC",
        [uuid(req.params.id)],
      )
    ).rows,
  ),
);
app.patch("/api/admin/enquiries/:id", async (req, res) => {
  const data = z
    .object({ status: z.enum(statuses), notes: z.string().max(10000) })
    .parse(req.body);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(
      "UPDATE enquiries SET status=$1,notes=$2,updated_at=now() WHERE id=$3 RETURNING id",
      [data.status, data.notes, uuid(req.params.id)],
    );
    if (!r.rowCount) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Enquiry not found" });
      return;
    }
    await client.query(
      "INSERT INTO enquiry_history(enquiry_id,admin_id,status,note) VALUES($1,$2,$3,$4)",
      [req.params.id, req.session.adminId, data.status, data.notes],
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
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) =>
    cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)),
});
app.post("/api/admin/uploads", upload.array("images", 8), async (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files?.length) {
    res
      .status(400)
      .json({ error: "Choose JPEG, PNG or WebP images, up to 8 MB each" });
    return;
  }
  const converted = await Promise.all(
    files.map(async (file) => {
      const image = sharp(file.buffer, { limitInputPixels: 40000000 });
      const metadata = await image.metadata().catch(() => {
        throw Object.assign(new Error("Invalid image file"), { status: 400 });
      });
      if (!["jpeg", "png", "webp"].includes(metadata.format || ""))
        throw Object.assign(
          new Error("Only JPEG, PNG and WebP image contents are accepted"),
          { status: 400 },
        );
      const bytes = await image
        .rotate()
        .resize({
          width: 1800,
          height: 1800,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 84 })
        .toBuffer();
      return { bytes, id: randomUUID() };
    }),
  );
  const urls = process.env.BLOB_READ_WRITE_TOKEN
    ? await Promise.all(
        converted.map(
          async (f) =>
            (
              await put("uploads/" + f.id + ".webp", f.bytes, {
                access: "public",
                contentType: "image/webp",
              })
            ).url,
        ),
      )
    : await (async () => {
        await mkdir(uploads, { recursive: true });
        for (const item of converted)
          await writeFile(path.join(uploads, item.id + ".webp"), item.bytes);
        return converted.map((f) => "/uploads/" + f.id + ".webp");
      })();
  res.status(201).json(
    urls.map((url) => ({
      url,
      alt: "",
      position: 0,
    })),
  );
});
app.use(
  "/uploads",
  express.static(uploads, { maxAge: "1y", immutable: true, dotfiles: "deny" }),
);
const xml = (v: string) =>
  v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
app.get("/robots.txt", (_req, res) =>
  res
    .type("text/plain")
    .send(
      `User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: ${siteUrl}/sitemap.xml\n`,
    ),
);
app.get("/sitemap.xml", async (_req, res) => {
  const openJobs = await query(
    "SELECT slug FROM job_vacancies WHERE published=true AND status='Open' AND archived=false AND (deadline IS NULL OR deadline >= (now() AT TIME ZONE 'Asia/Kolkata')::date)",
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
    ...openJobs.rows.map((r) => "careers/" + r.slug),
  ];
  res
    .type("application/xml")
    .send(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        pages
          .map((p) => "<url><loc>" + xml(siteUrl + "/" + p) + "</loc></url>")
          .join("") +
        "</urlset>",
    );
});
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "API endpoint not found" }),
);
if (production) {
  app.use(express.static(path.resolve("dist"), { index: false }));
  // The standalone editor needs no database content or public-site SEO lookup.
  app.get(["/editor", "/editor/{*path}"], (_req, res) => res.sendFile(path.resolve("dist/index.html")));
  app.get("/{*path}", async (req, res) => {
    let html = await readFile(path.resolve("dist/index.html"), "utf8");
    const content = (await query("SELECT value FROM content WHERE key='site'"))
      .rows[0].value;
    const names: Record<string, string> = {
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
      "/terms": "Terms and Conditions",
    };
    let title =
      names[req.path] === undefined ? "Page not found" : names[req.path];
    title = content.pageSeo?.[req.path]?.title || title;
    let description =
      content.pageSeo?.[req.path]?.description ||
      pageDescriptions[req.path] ||
      content.seoDescription;
    let status = names[req.path] === undefined ? 404 : 200;
    if (req.path.startsWith("/admin")) {
      title = "Administration";
      status = 200;
    }
    if (req.path.startsWith("/careers/")) {
      const vacancy = await query(
        "SELECT title,description FROM job_vacancies WHERE slug=$1 AND published=true AND status='Open' AND archived=false AND (deadline IS NULL OR deadline >= (now() AT TIME ZONE 'Asia/Kolkata')::date)",
        [req.path.slice(9)],
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
        [req.path.slice(10)],
      );
      if (p.rowCount) {
        title = p.rows[0].name;
        description = p.rows[0].description;
        status = 200;
      }
    }
    title = title ? title + " | OSLC" : content.seoTitle;
    html = html
      .replace(/<title>.*?<\/title>/, `<title>${xml(title)}</title>`)
      .replace(
        /<meta\s+name="description"[^>]*>/,
        `<meta name="description" content="${xml(description)}"/>`,
      )
      .replace(
        "</head>",
        `<link rel="canonical" href="${xml(siteUrl + req.path)}"/><meta property="og:title" content="${xml(title)}"/><meta property="og:description" content="${xml(description)}"/><meta property="og:url" content="${xml(siteUrl + req.path)}"/><meta property="og:type" content="website"/>${req.path.startsWith("/admin") || content.demoMode ? '<meta name="robots" content="noindex,nofollow"/>' : ""}</head>`,
      );
    res.status(status).type("html").send(html);
  });
}
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (res.headersSent) return;
    if (err instanceof ZodError) {
      res.status(400).json({
        error: err.issues
          .map((i) => i.path.join(".") + ": " + i.message)
          .join("; "),
      });
      return;
    }
    if ([400, 404, 409].includes((err as { status?: number }).status || 0)) {
      res.status((err as { status: number }).status).json({
        error:
          err instanceof SyntaxError
            ? "Malformed request body"
            : (err as Error).message,
      });
      return;
    }
    const code = (err as { code?: string }).code;
    if (code === "23505") {
      res.status(409).json({ error: "That code, name or URL already exists" });
      return;
    }
    if (err instanceof multer.MulterError) {
      res
        .status(400)
        .json({ error: "Upload exceeds file size or count limit" });
      return;
    }
    console.error("Request failed:", (err as Error).name, code || "");
    res.status(503).json({
      error: "Service temporarily unavailable. Please try again shortly.",
    });
  },
);
