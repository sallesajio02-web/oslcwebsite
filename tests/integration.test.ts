import { PDFDocument } from "pdf-lib";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import request from "supertest";
import "dotenv/config";
import { pageDescriptions } from "../src/seo.js";
import { csvCell, enquirySchema } from "../server/validation.js";

test("validation rejects spam, invalid quantities and markup; CSV neutralizes formulas", () => {
  const good = {
    name: "Buyer",
    company: "Example business",
    email: "buyer@example.test",
    phone: "+91 9876543210",
    buyer_type: "Retailer",
    quantity: 100,
    message: "Please discuss our order requirements.",
    website: "",
    consent: true,
  };
  assert.equal(enquirySchema.safeParse(good).success, true);
  for (const change of [
    { quantity: 0 },
    { quantity: 1.5 },
    { name: "<script>" },
    { website: "https://spam.test" },
    { consent: false },
    { email: "invalid" },
  ])
    assert.equal(
      enquirySchema.safeParse({ ...good, ...change }).success,
      false,
    );
  assert.equal(csvCell("=1+1"), '"\'=1+1"');
  assert.equal(csvCell('a"b'), '"a""b"');
});

test(
  "PostgreSQL-backed website, secure administration and enquiry lifecycle",
  { skip: !process.env.DATABASE_URL, timeout: 120000 },
  async (t) => {
    const schema = "test_" + randomUUID().replaceAll("-", "");
    const base = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    await base.query("CREATE SCHEMA " + schema);
    const url = new URL(process.env.DATABASE_URL!);
    url.searchParams.set("options", "-c search_path=" + schema);
    process.env.DATABASE_URL = url.href;
    process.env.SESSION_SECRET = randomUUID() + randomUUID();
    process.env.SITE_URL = "https://oslc.test";
    process.env.NODE_ENV = "production";
    process.env.TRUST_PROXY = "1";
    const uploadDir = path.resolve(".local", "test-uploads-" + schema);
    process.env.UPLOAD_DIR = uploadDir;
    const { app } = await import("../server/app.js");
    const { pool } = await import("../server/db.js");
    let cookie = "",
      csrf = "",
      categoryId = "",
      productId = "",
      enquiryId = "",
      reference = "";
    const send = (
      method: "get" | "post" | "put" | "patch" | "delete",
      url: string,
    ) => {
      let r = request(app)[method](url).set("X-Forwarded-Proto", "https");
      if (cookie) r = r.set("Cookie", cookie);
      if (method !== "get")
        r = r.set("Origin", "https://oslc.test").set("x-csrf-token", csrf);
      return r;
    };
    try {
      for (const f of (await readdir("migrations"))
        .filter((f) => f.endsWith(".sql"))
        .sort())
        await pool.query(await readFile("migrations/" + f, "utf8"));
      const password = randomUUID() + "Secure";
      await pool.query(
        "INSERT INTO admins(email,password_hash) VALUES($1,$2)",
        ["integration@example.test", await bcrypt.hash(password, 12)],
      );
      await t.test("private endpoints reject anonymous visitors", async () => {
        assert.equal((await send("get", "/api/admin/enquiries")).status, 401);
        assert.equal(
          (await send("get", "/api/admin/enquiries/export")).status,
          401,
        );
        assert.equal(
          (
            await send("post", "/api/auth/login").send({
              email: "integration@example.test",
              password,
            })
          ).status,
          403,
        );
      });
      await t.test(
        "login rotates session and enforces CSRF and origin",
        async () => {
          let r = await send("get", "/api/auth/session");
          assert.equal(r.status, 200);
          cookie = String(r.headers["set-cookie"][0]).split(";")[0];
          csrf = r.body.csrf;
          const old = cookie;
          r = await send("post", "/api/auth/login").send({
            email: "integration@example.test",
            password,
          });
          assert.equal(r.status, 200);
          cookie = String(r.headers["set-cookie"][0]).split(";")[0];
          csrf = r.body.csrf;
          assert.notEqual(old, cookie);
          assert.equal(
            (
              await send("post", "/api/admin/categories")
                .set("x-csrf-token", "wrong")
                .send({})
            ).status,
            403,
          );
          assert.equal(
            (
              await send("post", "/api/admin/categories")
                .set("Origin", "https://evil.test")
                .send({})
            ).status,
            403,
          );
        },
      );
      await t.test(
        "category and product CRUD, upload optimization, filters and detail",
        async () => {
          let r = await send("post", "/api/admin/categories").send({
            name: "Test trousers",
            slug: "test-trousers",
            description: "Integration test category",
            image: "",
            position: 1,
            published: true,
          });
          assert.equal(r.status, 201);
          categoryId = r.body.id;
          assert.equal(r.body.department, "Men");
          const image = await sharp({
            create: {
              width: 40,
              height: 40,
              channels: 3,
              background: "#142b4a",
            },
          })
            .png()
            .toBuffer();
          r = await send("post", "/api/admin/uploads").attach("images", image, {
            filename: "test.png",
            contentType: "image/png",
          });
          assert.equal(r.status, 201);
          assert.match(r.body[0].url, /\.webp$/);
          const uploaded = r.body[0].url;
          r = await send("post", "/api/admin/uploads").attach(
            "images",
            Buffer.from("not an image"),
            { filename: "bad.svg", contentType: "image/svg+xml" },
          );
          assert.equal(r.status, 400);
          r = await send("post", "/api/admin/uploads").attach(
            "images",
            Buffer.from(
              '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"></svg>',
            ),
            { filename: "spoof.png", contentType: "image/png" },
          );
          assert.equal(r.status, 400);
          const product = {
            name: "Test trouser",
            slug: "test-trouser",
            sku: "TEST-001",
            category_id: categoryId,
            description: "Integration test product only",
            sizes: "",
            colours: "",
            fabric: "",
            customization: "",
            moq: "",
            published: false,
            featured: true,
            demo: true,
            images: [{ url: uploaded, alt: "Test textile image", position: 0 }],
          };
          r = await send("post", "/api/admin/products").send(product);
          assert.equal(r.status, 200);
          productId = r.body.id;
          assert.equal(
            (await send("get", "/api/products/test-trouser")).status,
            404,
          );
          assert.equal(
            (
              await send("put", "/api/admin/products/" + productId).send({
                ...product,
                published: true,
              })
            ).status,
            200,
          );
          r = await send(
            "get",
            "/api/products?category=test-trousers&search=TEST-001",
          );
          assert.equal(r.body.total, 1);
          assert.equal(r.body.items[0].images.length, 1);
          assert.equal(
            (await send("get", "/api/products?department=Men")).body.total,
            1,
          );
          assert.equal(
            (await send("get", "/api/products?department=Women")).body.total,
            0,
          );
          assert.equal(
            (await send("get", "/api/products?department=Kids")).body.total,
            0,
          );
          assert.equal(
            (await send("get", "/api/products?department=Unknown")).status,
            400,
          );
          const categoryData = {
            name: "Test trousers",
            slug: "test-trousers",
            description: "Integration test category",
            image: "",
            position: 1,
            published: true,
          };
          assert.equal(
            (
              await send("put", "/api/admin/categories/" + categoryId).send({
                ...categoryData,
                department: "Women",
              })
            ).status,
            200,
          );
          assert.equal(
            (await send("get", "/api/products?department=Women")).body.total,
            1,
          );
          assert.equal(
            (await send("get", "/api/products?department=Men")).body.total,
            0,
          );
          assert.equal(
            (
              await send("put", "/api/admin/categories/" + categoryId).send({
                ...categoryData,
                department: "Men",
              })
            ).status,
            200,
          );
          assert.equal(
            (await send("get", "/api/products/test-trouser")).body.sku,
            "TEST-001",
          );
          assert.equal(
            (await send("get", "/api/products?search=absent")).body.total,
            0,
          );
          assert.equal((await send("get", uploaded)).status, 200);
        },
      );
      await t.test(
        "enquiry validation, persistence, search, update history and export",
        async () => {
          const body = {
            name: "Test buyer",
            company: "Test business",
            email: "buyer@example.test",
            phone: "+91 9876543210",
            buyer_type: "Retailer",
            category: "Test trousers",
            product_id: productId,
            product_name: "tampered",
            quantity: 100,
            message: "Please provide details for our business order.",
            customization: "",
            website: "",
            consent: true,
          };
          assert.equal(
            (
              await send("post", "/api/enquiries").send({
                ...body,
                quantity: -1,
              })
            ).status,
            400,
          );
          let r = await send("post", "/api/enquiries").send(body);
          assert.equal(r.status, 201);
          reference = r.body.reference;
          r = await send("get", "/api/admin/enquiries?search=" + reference);
          assert.equal(r.body.total, 1);
          enquiryId = r.body.items[0].id;
          assert.equal(r.body.items[0].product_name, "Test trouser (TEST-001)");
          assert.equal(
            (
              await pool.query("SELECT quantity FROM enquiries WHERE id=$1", [
                enquiryId,
              ])
            ).rows[0].quantity,
            100,
          );
          assert.equal(
            (
              await send("patch", "/api/admin/enquiries/" + enquiryId).send({
                status: "Quotation Sent",
                notes: "Confirmed requirements",
              })
            ).status,
            200,
          );
          assert.equal(
            (await send("get", "/api/admin/enquiries?status=Quotation%20Sent"))
              .body.total,
            1,
          );
          assert.equal(
            (
              await send(
                "get",
                "/api/admin/enquiries/" + enquiryId + "/history",
              )
            ).body[0].note,
            "Confirmed requirements",
          );
          r = await send("get", "/api/admin/enquiries/export");
          assert.equal(r.status, 200);
          assert.match(r.text, /buyer@example.test/);
        },
      );
      await t.test("CMS, gallery and capability publication", async () => {
        for (const kind of ["capabilities", "gallery"]) {
          const body = {
            name: "Test entry",
            description: "Test only",
            image:
              kind === "gallery" ? "/uploads/" + randomUUID() + ".webp" : "",
            position: 0,
            published: true,
            ...(kind === "gallery" ? { category: "Manufacturing" } : {}),
          };
          let r = await send("post", "/api/admin/" + kind).send(body);
          assert.equal(r.status, 201);
          const id = r.body.id;
          assert.equal(
            (
              await send("put", "/api/admin/" + kind + "/" + id).send({
                ...body,
                position: 2,
              })
            ).status,
            200,
          );
          assert.equal(
            (await send("delete", "/api/admin/" + kind + "/" + id)).status,
            200,
          );
        }
        const content = (await send("get", "/api/admin/content")).body;
        assert.equal(
          (
            await send("put", "/api/admin/content").send({
              ...content,
              hours: "By appointment",
            })
          ).status,
          200,
        );
        assert.equal(
          (await send("get", "/api/site")).body.hours,
          "By appointment",
        );
      });
      await t.test(
        "leadership and news remain private until publication; corporate enquiries need no quantity",
        async () => {
          for (const [kind, draft] of [
            [
              "leadership",
              {
                name: "Test leader",
                title: "Founder",
                biography: "Approved test biography",
                image: "",
                position: 1,
                published: false,
              },
            ],
            [
              "events",
              {
                name: "Test company event",
                date: "2026-10-23",
                category: "Company news",
                description: "Approved test announcement",
                image: "",
                position: 1,
                published: false,
              },
            ],
          ] as const) {
            let r = await send("post", "/api/admin/" + kind).send(draft);
            assert.equal(r.status, 201);
            const id = r.body.id;
            const key = kind === "leadership" ? "leadership" : "events";
            assert.equal(
              (await send("get", "/api/site")).body[key].some(
                (x: any) => x.id === id,
              ),
              false,
            );
            r = await send("put", "/api/admin/" + kind + "/" + id).send({
              ...draft,
              published: true,
            });
            assert.equal(r.status, 200);
            assert.equal(
              (await send("get", "/api/site")).body[key].some(
                (x: any) => x.id === id,
              ),
              true,
            );
            if (kind === "events")
              assert.equal(
                (await send("get", "/api/site")).body.events.find(
                  (x: any) => x.id === id,
                ).date,
                "2026-10-23",
              );
            assert.equal(
              (await send("delete", "/api/admin/" + kind + "/" + id)).status,
              200,
            );
          }
          const r = await send("post", "/api/enquiries").send({
            name: "Corporate visitor",
            company: "Example",
            email: "visitor@example.test",
            phone: "+91 9876543210",
            enquiry_type: "Company information",
            message: "Please share company information.",
            consent: true,
          });
          assert.equal(r.status, 201);
          const saved = await pool.query(
            "SELECT quantity,buyer_type FROM enquiries WHERE name='Corporate visitor'",
          );
          assert.equal(saved.rows[0].quantity, null);
          assert.equal(saved.rows[0].buyer_type, "Company information");
        },
      );
      await t.test(
        "public page navigation, server SEO, sitemap and errors",
        async () => {
          for (const route of [
            "/",
            "/about",
            "/leadership",
            "/capabilities",
            "/news",
            "/products",
            "/manufacturing",
            "/quality",
            "/gallery",
            "/contact",
            "/privacy",
            "/terms",
            "/products/test-trouser",
            "/admin",
          ]) {
            const r = await send("get", route);
            assert.equal(r.status, 200, route);
            assert.match(r.text, /<title>/);
            assert.match(r.text, /rel="canonical"/);
            assert.match(r.text, /og:title/);
            if (pageDescriptions[route])
              assert.ok(
                r.text.includes(`content="${pageDescriptions[route]}"`),
                `unique description for ${route}`,
              );
          }
          assert.match(
            (await send("get", "/products/test-trouser")).text,
            /<title>Test trouser/,
          );
          assert.equal((await send("get", "/not-a-page")).status, 404);
          assert.equal(
            (await send("get", "/products/not-a-product")).status,
            404,
          );
          assert.match((await send("get", "/sitemap.xml")).text, /leadership/);
          assert.match(
            (await send("get", "/robots.txt")).text,
            /Disallow: \/admin/,
          );
          assert.equal((await send("get", "/api/private-data")).status, 404);
        },
      );
      await t.test(
        "careers publication, filters, private resumes and application lifecycle",
        async () => {
          assert.equal(
            (await request(app).get("/api/admin/careers/jobs")).status,
            401,
          );
          assert.equal(
            (await request(app).get("/api/admin/careers/applications/export"))
              .status,
            401,
          );
          const deps = await send("get", "/api/careers/config");
          assert.equal(deps.status, 200);
          const department = deps.body.departments[0].id;
          let r = await send("post", "/api/admin/careers/departments").send({
            name: "Test recruitment area",
          });
          assert.equal(r.status, 201);
          assert.equal(
            (
              await send(
                "put",
                "/api/admin/careers/departments/" + r.body.id,
              ).send({ name: "Updated recruitment area" })
            ).status,
            200,
          );
          const draft = {
            title: "Test approved vacancy",
            slug: "test-career-role",
            department_id: department,
            location: "Surat, Gujarat",
            employment_type: "Full-time",
            experience_level: "Entry level",
            experience: "No previous experience required for this test",
            openings: 2,
            salary: "",
            description: "Test job description",
            responsibilities: "Test responsibilities",
            qualifications: "Test qualifications",
            skills: "Test skills",
            preferred_skills: "",
            deadline: "",
            status: "Open",
            published: false,
            featured: true,
            archived: false,
          };
          r = await send("post", "/api/admin/careers/jobs").send(draft);
          assert.equal(r.status, 201);
          const jobId = r.body.id;
          assert.equal(
            (await send("get", "/api/careers/jobs/test-career-role")).status,
            404,
          );
          assert.equal(
            (
              await send("put", "/api/admin/careers/jobs/" + jobId)
                .set("x-csrf-token", "bad")
                .send({ ...draft, published: true })
            ).status,
            403,
          );
          assert.equal(
            (
              await send("put", "/api/admin/careers/jobs/" + jobId).send({
                ...draft,
                published: true,
              })
            ).status,
            200,
          );
          const jobs = await send(
            "get",
            "/api/careers/jobs?search=approved&department=" +
              department +
              "&type=Full-time&experience=Entry%20level",
          );
          assert.equal(jobs.body.length, 1);
          assert.equal(
            (await send("get", "/api/careers/jobs?type=Internship")).body
              .length,
            0,
          );
          assert.equal(
            (await send("get", "/api/careers/jobs/test-career-role")).body.id,
            jobId,
          );
          assert.equal(
            (await send("get", "/careers/test-career-role")).status,
            200,
          );
          assert.match(
            (await send("get", "/sitemap.xml")).text,
            /careers\/test-career-role/,
          );
          const pdfDocument = await PDFDocument.create();
          pdfDocument.addPage().drawText("Recruitment integration test resume");
          const pdf = Buffer.from(
            await pdfDocument.save({ useObjectStreams: false }),
          );
          const details = {
            job_id: jobId,
            department_id: department,
            name: "Recruitment Test",
            email: "recruitment@example.test",
            phone: "+91 9876543210",
            city: "Surat",
            experience: "Entry level",
            education: "Test qualification",
            consent: "on",
            website: "",
          };
          let attempt = 0;
          const apply = (
            fields: Record<string, string>,
            bytes = pdf,
            type = "application/pdf",
            filename = "resume.pdf",
          ) => {
            let req = send("post", "/api/careers/applications").set(
              "X-Forwarded-For",
              "192.0.2." + ++attempt,
            );
            for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
            return req.attach("resume", bytes, { filename, contentType: type });
          };
          assert.equal((await apply({ ...details, consent: "" })).status, 400);
          assert.equal(
            (
              await apply(
                details,
                Buffer.from("MZ executable"),
                "application/pdf",
              )
            ).status,
            400,
          );
          assert.equal(
            (await apply(details, pdf, "application/msword", "resume.doc"))
              .status,
            400,
          );
          assert.equal(
            (
              await apply(
                details,
                Buffer.from(
                  pdf
                    .toString()
                    .replace("/Catalog", "/Catalog /JavaScript 3 0 R"),
                ),
              )
            ).status,
            400,
          );
          assert.equal(
            (await apply(details, Buffer.alloc(6 * 1024 * 1024))).status,
            400,
          );
          r = await apply(details);
          assert.equal(r.status, 201);
          assert.match(r.body.reference, /^OSLC-APP-/);
          const ref = r.body.reference;
          assert.equal((await apply(details)).status, 409);
          const stored = (
            await pool.query(
              "SELECT id FROM job_applications WHERE reference=$1",
              [ref],
            )
          ).rows[0];
          assert.equal(
            (
              await request(app).get(
                "/api/admin/careers/applications/" + stored.id + "/resume",
              )
            ).status,
            401,
          );
          r = await send(
            "get",
            "/api/admin/careers/applications/" + stored.id + "/resume",
          );
          assert.equal(r.status, 200);
          assert.match(r.headers["content-disposition"], /attachment/);
          assert.match(r.headers["cache-control"], /no-store/);
          assert.equal(
            (
              await send(
                "get",
                "/api/careers/applications/" + stored.id + "/resume",
              )
            ).status,
            404,
          );
          r = await send(
            "get",
            "/api/admin/careers/applications?search=" +
              ref +
              "&job=" +
              jobId +
              "&department=" +
              department +
              "&status=New%20Application&experience=Entry",
          );
          assert.equal(r.body.total, 1);
          assert.equal(
            (
              await send(
                "patch",
                "/api/admin/careers/applications/" + stored.id,
              ).send({
                status: "Shortlisted",
                notes: "Private interview review",
              })
            ).status,
            200,
          );
          r = await send("get", "/api/admin/careers/applications/" + stored.id);
          assert.equal(r.body.status, "Shortlisted");
          assert.equal(r.body.history.length, 2);
          assert.equal(r.body.notes, "Private interview review");
          assert.match(
            (
              await send(
                "get",
                "/api/admin/careers/applications/export?search=" + ref,
              )
            ).text,
            /recruitment@example.test/,
          );
          assert.equal(
            (
              await send("put", "/api/admin/careers/jobs/" + jobId).send({
                ...draft,
                published: true,
                status: "Closed",
              })
            ).status,
            200,
          );
          assert.equal(
            (await apply({ ...details, email: "closed@example.test" })).status,
            400,
          );
          assert.equal(
            (await send("get", "/api/careers/jobs/test-career-role")).status,
            404,
          );
          assert.equal(
            (
              await send("put", "/api/admin/careers/jobs/" + jobId).send({
                ...draft,
                published: true,
                deadline: "2000-01-01",
              })
            ).status,
            200,
          );
          assert.equal((await send("get", "/api/careers/jobs")).body.length, 0);
          assert.equal(
            (await send("post", "/api/admin/careers/jobs/archive-expired")).body
              .archived,
            1,
          );
          r = await apply({
            ...details,
            job_id: "",
            email: "general@example.test",
          });
          assert.equal(r.status, 201);
          assert.equal(
            (await send("get", "/api/admin/careers/applications?kind=general"))
              .body.total,
            1,
          );
          assert.equal(
            (
              await send(
                "delete",
                "/api/admin/careers/applications/" + stored.id,
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await pool.query(
                "SELECT id FROM resume_files WHERE application_id=$1",
                [stored.id],
              )
            ).rowCount,
            0,
          );
          assert.equal(
            (
              await pool.query(
                "SELECT id FROM application_status_history WHERE application_id=$1",
                [stored.id],
              )
            ).rowCount,
            0,
          );
        },
      );
      await t.test(
        "application endpoint throttles repeated attempts",
        async () => {
          for (let i = 0; i < 6; i++) {
            const r = await send("post", "/api/careers/applications")
              .set("X-Forwarded-For", "198.51.100.20")
              .send({});
            assert.equal(r.status, i < 5 ? 400 : 429);
          }
        },
      );
      await t.test("safe deletion and logout", async () => {
        assert.equal(
          (await send("delete", "/api/admin/categories/" + categoryId)).status,
          200,
        );
        assert.equal(
          (
            await pool.query("SELECT category_id FROM products WHERE id=$1", [
              productId,
            ])
          ).rows[0].category_id,
          null,
        );
        assert.equal(
          (await send("delete", "/api/admin/products/" + productId)).status,
          200,
        );
        assert.equal(
          (
            await pool.query("SELECT product_id FROM enquiries WHERE id=$1", [
              enquiryId,
            ])
          ).rows[0].product_id,
          null,
        );
        assert.equal((await send("post", "/api/auth/logout")).status, 200);
        assert.equal((await send("get", "/api/admin/dashboard")).status, 401);
      });
    } finally {
      await pool.end();
      await base.query("DROP SCHEMA " + schema + " CASCADE");
      await base.end();
      await rm(uploadDir, { recursive: true, force: true });
    }
  },
);
