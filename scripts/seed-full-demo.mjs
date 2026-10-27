import "dotenv/config";
import pg from "pg";
import { mkdir, writeFile } from "node:fs/promises";

const url = new URL(process.env.DATABASE_URL || "postgresql://invalid");
if (
  process.env.NODE_ENV === "production" ||
  url.hostname !== "127.0.0.1" ||
  url.port !== "55432" ||
  url.pathname !== "/oslc"
)
  throw new Error(
    "Full demo data is restricted to the isolated local development database on port 55432.",
  );
const pool = new pg.Pool({
  connectionString: url.href,
  connectionTimeoutMillis: 5000,
});
const palette = [
  "#142b4a",
  "#a5967d",
  "#526371",
  "#45484b",
  "#bcc1bd",
  "#775e4e",
];
function illustration(kind, color, title, variant = 0) {
  title = title
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const garment =
    kind === "shirt"
      ? `<path d="M220 140 300 110 350 140 400 110 480 140 550 230 480 290 440 245 440 590 260 590 260 245 220 290 150 230Z" fill="${color}"/><path d="m300 110 50 70 50-70M350 180v410M280 250h50v60h-50Z" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="4"/>`
      : `<path d="M250 130h200l30 210-40 270h-95l15-250-25 0-15 250h-95l-10-270Z" fill="${color}"/><path d="M252 165h190M350 165l10 195M252 180l50 65M444 180l-45 65M345 600h90M230 600h80" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="4"/><circle cx="350" cy="148" r="5" fill="#d4c1a1"/>`;
  const process =
    kind === "cutting"
      ? `<path d="M170 200h360v300H170Z" fill="${color}"/><path d="m200 235 280 225M200 460l280-225" stroke="#d7c8ac" stroke-width="3" stroke-dasharray="12 12"/><circle cx="290" cy="355" r="34" fill="none" stroke="#142b4a" stroke-width="12"/><circle cx="290" cy="445" r="34" fill="none" stroke="#142b4a" stroke-width="12"/><path d="m315 380 150-90m-150 110 150 90" stroke="#142b4a" stroke-width="12"/>`
      : kind === "stitching"
        ? `<path d="M170 240h350v80H370v110h-90V320H170Z" fill="${color}"/><path d="M430 320v140M150 470h410" stroke="#142b4a" stroke-width="14"/><circle cx="200" cy="280" r="27" fill="#d7c8ac"/><path d="M240 480h250" stroke="#9a8568" stroke-width="4" stroke-dasharray="10 7"/>`
        : kind === "packing"
          ? `<path d="m170 270 180-90 180 90v210l-180 90-180-90Z" fill="${color}"/><path d="m170 270 180 90 180-90M350 360v210m-90-345 180 90v100" fill="none" stroke="#d7c8ac" stroke-width="12"/>`
          : kind === "inspection"
            ? `<rect x="190" y="170" width="270" height="370" rx="8" fill="${color}"/><path d="M240 250h150m-150 60h150m-150 60h90" stroke="#e7e7e0" stroke-width="12"/><circle cx="430" cy="420" r="75" fill="#f7f7f4" stroke="#142b4a" stroke-width="14"/><path d="m485 475 65 65m-155-120 25 25 40-50" fill="none" stroke="#142b4a" stroke-width="14"/>`
            : kind === "facility"
              ? `<path d="M140 540V280l140 60V240l140 60v-90l140 90v240Z" fill="${color}"/><path d="M190 390h60v60h-60zm120 0h60v60h-60zm120 0h60v60h-60z" fill="#d7c8ac"/><path d="M310 540v-70h70v70" fill="#eceae4"/>`
              : `<path d="M170 200h340v330H170Z" fill="${color}"/><path d="M200 200v330m40-330v330m40-330v330m40-330v330m40-330v330m40-330v330m40-330v330m40-330v330" stroke="#fff" stroke-opacity=".2" stroke-width="4"/><path d="m170 230 340 30m-340 20 340 30m-340 20 340 30m-340 20 340 30m-340 20 340 30m-340 20 340 30" stroke="#fff" stroke-opacity=".12" stroke-width="3"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="800" viewBox="0 0 700 800"><rect width="700" height="800" fill="${variant ? "#e8e7e1" : "#f1f0eb"}"/><path d="M55 65h590M55 735h590" stroke="#cbd0d2"/><text x="55" y="100" font-family="Arial,sans-serif" font-size="12" letter-spacing="3" fill="#687386">OSLC · DEMONSTRATION COLLECTION</text>${kind === "trousers" || kind === "shirt" ? garment : process}<text x="350" y="680" text-anchor="middle" font-family="Georgia,serif" font-size="25" fill="#142b4a">${title}</text><text x="350" y="715" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#687386">ILLUSTRATION ONLY · NOT AN OSLC PRODUCT OR FACILITY</text></svg>`;
}
async function asset(name, kind, color, title, variant = 0) {
  await writeFile(
    "public/demo/" + name + ".svg",
    illustration(kind, color, title, variant),
  );
  return "/demo/" + name + ".svg";
}
async function run() {
  await mkdir("public/demo", { recursive: true });
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const original = (
      await c.query("SELECT value FROM content WHERE key='site' FOR UPDATE")
    ).rows[0].value;
    await c.query(
      "INSERT INTO content(key,value) VALUES('site:before-full-demo',$1) ON CONFLICT DO NOTHING",
      [JSON.stringify(original)],
    );
    const groups = [
      ["Formal trousers", "demo-formal-trousers", "trousers"],
      ["Casual chinos", "demo-casual-chinos", "trousers"],
      ["Casual shirts", "demo-casual-shirts", "shirt"],
    ];
    const products = [];
    for (let g = 0; g < groups.length; g++) {
      const [name, slug, kind] = groups[g];
      const image = await asset(slug, kind, palette[g], name);
      const category = (
        await c.query(
          "INSERT INTO categories(name,slug,description,image,position,published) VALUES($1,$2,$3,$4,$5,true) ON CONFLICT(slug) DO UPDATE SET description=excluded.description,image=excluded.image,published=true RETURNING id",
          [
            "Demo · " + name,
            slug,
            "Illustrative demonstration category. This range is not confirmed as manufactured by OSLC.",
            image,
            g,
          ],
        )
      ).rows[0].id;
      const names =
        g === 0
          ? [
              "Classic Fit",
              "Modern Slim",
              "Pleated",
              "Stretch Comfort",
              "Flat Front",
              "Tailored Fit",
            ]
          : g === 1
            ? [
                "Everyday",
                "Weekend",
                "Tapered",
                "Relaxed",
                "Cotton Stretch",
                "Utility",
              ]
            : [
                "Oxford",
                "Linen Look",
                "Everyday Poplin",
                "Textured",
                "Smart Casual",
                "Relaxed Collar",
              ];
      for (let i = 0; i < 6; i++) {
        const title =
            names[i] +
            " " +
            (g === 2 ? "Shirt" : g === 1 ? "Chino" : "Trouser"),
          sku = `DEMO-${g + 1}${String(i + 1).padStart(2, "0")}`,
          slug = `demo-${g + 1}-${i + 1}`;
        const images = [
          await asset(slug, kind, palette[i], title),
          await asset(
            slug + "-detail",
            "fabric",
            palette[i],
            "Illustrative fabric detail",
            1,
          ),
        ];
        const p = (
          await c.query(
            `INSERT INTO products(category_id,name,slug,sku,description,sizes,colours,fabric,customization,moq,published,featured,demo) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,true) ON CONFLICT(slug) DO UPDATE SET category_id=excluded.category_id,name=excluded.name,description=excluded.description,sizes=excluded.sizes,colours=excluded.colours,fabric=excluded.fabric,customization=excluded.customization,moq=excluded.moq,published=true,featured=excluded.featured,demo=true RETURNING id,name`,
            [
              category,
              title,
              slug,
              sku,
              "DEMONSTRATION PRODUCT ONLY. This fictional style and the specifications below illustrate the catalogue experience. They are not an OSLC offer, specification or availability claim.",
              g === 2
                ? "Demo: S, M, L, XL, XXL"
                : "Demo: 28, 30, 32, 34, 36, 38",
              "Demo: Navy, Stone, Charcoal",
              g === 2
                ? "Demo: cotton-blend fabric"
                : "Demo: cotton twill / blend; illustrative only",
              "Demo: label, colour and size options; subject to confirmation",
              "Demo: 100 pieces; not an OSLC order term",
              i < 2,
            ],
          )
        ).rows[0];
        await c.query("DELETE FROM product_images WHERE product_id=$1", [p.id]);
        for (let j = 0; j < images.length; j++)
          await c.query(
            "INSERT INTO product_images(product_id,url,alt,position) VALUES($1,$2,$3,$4)",
            [
              p.id,
              images[j],
              "Demonstration illustration: " +
                title +
                (j ? " fabric detail" : ""),
              j,
            ],
          );
        products.push({ ...p, sku });
      }
    }
    const caps = [
      [
        "Fabric sourcing",
        "fabric",
        "Sample content: compare swatches, composition and intended use before selecting fabric. This is not a verified OSLC capability.",
      ],
      [
        "Pattern development & cutting",
        "cutting",
        "Sample content: agree measurements and pattern requirements before cutting. This is not a verified OSLC process.",
      ],
      [
        "Stitching & assembly",
        "stitching",
        "Sample content: discuss seam construction, stitch details and sample approval. This is not a verified OSLC facility.",
      ],
      [
        "Finishing",
        "fabric",
        "Sample content: review pressing, loose thread removal and garment presentation. Company confirmation is required.",
      ],
      [
        "Quality inspection",
        "inspection",
        "Sample content: assess fit, measurements, stitching and finish against an agreed brief. No certification is implied.",
      ],
      [
        "Packaging & dispatch",
        "packing",
        "Sample content: agree labels, packing method and dispatch requirements. This is not a verified OSLC service.",
      ],
    ];
    for (let i = 0; i < caps.length; i++) {
      const [name, kind, description] = caps[i],
        title = "Demo · " + name,
        image = await asset("process-" + i, kind, palette[i], name);
      const exists = await c.query(
        "SELECT id FROM capabilities WHERE name=$1",
        [title],
      );
      if (exists.rowCount)
        await c.query(
          "UPDATE capabilities SET description=$1,image=$2,position=$3,published=true WHERE id=$4",
          [description, image, i, exists.rows[0].id],
        );
      else
        await c.query(
          "INSERT INTO capabilities(name,description,image,position,published) VALUES($1,$2,$3,$4,true)",
          [title, description, image, i],
        );
    }
    const gallery = [
      ["Collection study", "Products", "trousers"],
      ["Shirt study", "Products", "shirt"],
      ["Fabric selection", "Manufacturing", "fabric"],
      ["Cutting study", "Manufacturing", "cutting"],
      ["Assembly study", "Manufacturing", "stitching"],
      ["Facility concept", "Factory and facilities", "facility"],
      ["Workspace concept", "Factory and facilities", "facility"],
      ["Measurement review", "Quality inspection", "inspection"],
      ["Finishing review", "Quality inspection", "inspection"],
      ["Packing study", "Packaging and dispatch", "packing"],
      ["Dispatch study", "Packaging and dispatch", "packing"],
      ["Fabric detail", "Products", "fabric"],
    ];
    for (let i = 0; i < gallery.length; i++) {
      const [name, category, kind] = gallery[i],
        title = "Demo · " + name,
        image = await asset("gallery-" + i, kind, palette[i % 6], name, i % 2),
        description =
          "Demonstration vector illustration. This is not a photograph of an OSLC product, team or facility.";
      const exists = await c.query("SELECT id FROM gallery WHERE name=$1", [
        title,
      ]);
      if (exists.rowCount)
        await c.query(
          "UPDATE gallery SET description=$1,image=$2,category=$3,position=$4,published=true WHERE id=$5",
          [description, image, category, i, exists.rows[0].id],
        );
      else
        await c.query(
          "INSERT INTO gallery(name,description,image,category,position,published) VALUES($1,$2,$3,$4,$5,true)",
          [title, description, image, category, i],
        );
    }
    const site = {
      ...original,
      demoMode: true,
      heroTitle: "Your next collection. From concept to detail.",
      heroDescription:
        "DEMONSTRATION WEBSITE — Explore fictional apparel collections, illustrative workflows and sample business enquiries. No demo specification or process is a verified OSLC claim.",
      about:
        "DEMONSTRATION COMPANY OVERVIEW. OSLC House is based in Kosad, Surat. The rest of this populated preview uses fictional product ranges, specifications and workflows to demonstrate the website. Replace sample content with information approved by OSLC before launch.\n\nThis preview shows how a business can present its collections, explain confirmed processes and handle wholesale enquiries through a professional catalogue.",
      mission:
        "Demo mission: support clear product briefs, thoughtful communication and long-term business relationships. This wording is for review by OSLC.",
      vision:
        "Demo vision: a dependable apparel partnership built around agreed quality and product requirements. This is proposed demonstration copy.",
      quality:
        "DEMONSTRATION QUALITY APPROACH — not a verified OSLC procedure.\n\n1. Review the product brief and reference measurements.\n2. Compare fabric and colour with the approved sample.\n3. Review stitching and finishing details.\n4. Identify visible defects and record corrections.\n5. Check labels, sizes and packing against the agreed brief.\n\nThese example checks are provided to demonstrate the quality page. OSLC must confirm its actual procedures.",
      process:
        "Demo: requirement discussion and product brief\nDemo: sample development and review\nDemo: production planning\nDemo: cutting and assembly\nDemo: measurements and finishing review\nDemo: packing requirements\nDemo: dispatch coordination",
      heroImage: await asset(
        "hero",
        "trousers",
        "#142b4a",
        "The demonstration collection",
      ),
      aboutImage: await asset(
        "about",
        "fabric",
        "#a5967d",
        "A study in textile detail",
      ),
      hours: "Demo hours: Monday–Saturday, 10:00–18:00 (not confirmed)",
      email: "sales@oslc.example",
      phone: "",
      whatsapp: "",
      socialLinks: "https://example.com/oslc-demo",
      seoTitle: "OSLC | Demonstration Apparel Website",
      seoDescription:
        "Demonstration preview of the OSLC apparel website, with fictional catalogue data and illustrative images. Not a live product offer.",
      privacy:
        "DEMONSTRATION PRIVACY TEXT. This local preview uses fictional seeded buyer records. Any new enquiry you submit is stored in the local PostgreSQL database and visible to local administrators. Avoid entering sensitive personal data during testing. Replace this sample policy with company-reviewed information about data handling, retention and privacy contacts before deployment.",
      terms:
        "DEMONSTRATION TERMS. Products, fabrics, quantities, manufacturing workflows and hours shown in this preview are fictional examples. They are not OSLC commercial offers or verified capabilities. No order is placed through this website. Review and replace this sample text before public launch.",
    };
    await c.query(
      "UPDATE content SET value=$1,updated_at=now() WHERE key='site'",
      [JSON.stringify(site)],
    );
    const statuses = [
      "New",
      "Contacted",
      "Quotation in Progress",
      "Quotation Sent",
      "Converted",
      "Closed",
    ];
    for (let i = 0; i < 18; i++) {
      const email = `buyer${i + 1}@demo.oslc.example`;
      if (
        (await c.query("SELECT 1 FROM enquiries WHERE email=$1", [email]))
          .rowCount
      )
        continue;
      const p = products[i],
        status = statuses[i % 6],
        notes =
          "DEMONSTRATION RECORD — fictional buyer. " +
          (i % 6
            ? "Example follow-up notes for testing the enquiry workflow."
            : "Awaiting initial review.");
      const r = await c.query(
        `INSERT INTO enquiries(name,company,email,phone,buyer_type,category,product_id,product_name,quantity,customization,message,status,notes,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now()-($14::integer * interval '1 day')) RETURNING id`,
        [
          "Demo Buyer " + (i + 1),
          "Demo Business " + String(i + 1).padStart(2, "0"),
          email,
          "Not provided (demo)",
          [
            "Wholesaler",
            "Retailer",
            "Fashion brand",
            "Distributor",
            "Bulk buyer",
            "Other",
          ][i % 6],
          groups[Math.floor(i / 6)][0],
          p.id,
          p.name + " (" + p.sku + ")",
          (i + 1) * 100,
          "Demo: custom label and mixed sizes.",
          "DEMONSTRATION ENQUIRY — fictional buyer requesting sample specifications and an illustrative bulk quotation.",
          status,
          notes,
          i,
        ],
      );
      await c.query(
        "INSERT INTO enquiry_history(enquiry_id,status,note) VALUES($1,$2,$3)",
        [r.rows[0].id, "New", "Demonstration enquiry created."],
      );
      if (status !== "New")
        await c.query(
          "INSERT INTO enquiry_history(enquiry_id,status,note) VALUES($1,$2,$3)",
          [r.rows[0].id, status, notes],
        );
    }
    await c.query("COMMIT");
    console.log(
      "Full local demo ready: 3 published categories, 18 published products with 36 illustrations, 6 capabilities, 12 gallery entries and 18 sample enquiries. All content is labelled as demonstration data. No live phone or WhatsApp number was invented.",
    );
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
run()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
