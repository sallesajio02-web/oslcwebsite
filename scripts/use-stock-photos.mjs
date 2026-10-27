import "dotenv/config";
import { mkdir, writeFile, access } from "node:fs/promises";
import pg from "pg";
import sharp from "sharp";

// Existing photographs only. No AI-generated assets are imported by this script.
const photos = [
  [
    "womenswear",
    4153098,
    "Pastel clothing arranged on hangers",
    "Татьяна Танатова",
    "collection-of-shirts-hanging-on-racks-in-closet-at-home",
  ],
  [
    "kidswear",
    28907988,
    "Children's clothing on bear-themed hangers",
    "Rumeysa Demir",
    "children-s-fashion-clothing-on-unique-hangers",
  ],
  [
    "trousers",
    4614224,
    "Black pants on brown textile",
    "cottonbro studio",
    "black-pants-on-brown-textile",
  ],
  [
    "chinos",
    9322977,
    "Man wearing a white shirt and beige pants",
    "SALOMON BYUMA",
    "man-in-white-long-sleeves-and-beige-pants",
  ],
  [
    "mens-shirts",
    22441295,
    "White men’s shirt on a hanger",
    "dayong tien",
    "white-shirt-on-hanger-on-branch",
  ],
  [
    "menswear",
    5975576,
    "Men’s clothing rack",
    "Pexels contributor (see source page)",
    "man-in-white-shirt-checking-clothes-haning-on-a-clothes-rack",
  ],
  [
    "fabric",
    36299788,
    "Blue fabric rolls",
    "Jonathan Borba",
    "close-up-texture-of-blue-fabric-rolls",
  ],
  [
    "cutting",
    7776115,
    "Tailor cutting fabric",
    "Ron Lach",
    "tailor-cutting-a-denim-fabric",
  ],
  [
    "stitching",
    7998342,
    "Sewing fabric with a machine",
    "Los Muertos Crew",
    "fabric-on-sewing-machine",
  ],
  [
    "inspection",
    17833394,
    "Tailor measuring fabric",
    "Chalo Garcia",
    "tailor-hand-holding-measure",
  ],
  [
    "packing",
    5775099,
    "Warehouse with cardboard boxes",
    "Handi Boyz LLC",
    "stacks-of-cardboard-boxes",
  ],
  [
    "finishing",
    4107224,
    "Ironing clothes",
    "cottonbro studio",
    "person-in-brown-button-up-shirt-holding-white-clothes-iron",
  ],
  [
    "workspace",
    11951427,
    "Sewing workspace",
    "Tatyana Novoselova",
    "person-sewing-a-cloth-in-front-of-a-sewing-machine",
  ],
];
const source = (photo) =>
  `https://www.pexels.com/photo/${photo[4]}-${photo[1]}/`;
const url = new URL(process.env.DATABASE_URL || "postgresql://invalid");
if (
  process.env.NODE_ENV === "production" ||
  url.hostname !== "127.0.0.1" ||
  url.port !== "55432" ||
  url.pathname !== "/oslc"
)
  throw new Error(
    "This script updates only the isolated local OSLC demo database.",
  );
const directory = "public/demo/photos";
await mkdir(directory, { recursive: true });
for (const photo of photos) {
  const file = directory + "/" + photo[0] + ".webp";
  try {
    await access(file);
    continue;
  } catch {}
  const response = await fetch(
    `https://images.pexels.com/photos/${photo[1]}/pexels-photo-${photo[1]}.jpeg?auto=compress&cs=tinysrgb&w=1400`,
    { signal: AbortSignal.timeout(45000) },
  );
  if (!response.ok)
    throw new Error(
      "Photo download failed: " + photo[0] + " HTTP " + response.status,
    );
  if (!response.headers.get("content-type")?.startsWith("image/"))
    throw new Error("Invalid photo response: " + photo[0]);
  const input = Buffer.from(await response.arrayBuffer());
  await sharp(input)
    .rotate()
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(file);
  console.log("Downloaded existing photograph: " + photo[0]);
}
await writeFile(
  directory + "/credits.json",
  JSON.stringify(
    photos.map((p) => ({
      file: p[0] + ".webp",
      description: p[2],
      photographer: p[3],
      source: source(p),
      license: "https://www.pexels.com/license/",
      usage:
        "Stock photograph for demonstration only; not an OSLC product or facility.",
    })),
    null,
    2,
  ),
);
await writeFile(
  directory + "/CREDITS.md",
  "# Stock photography credits\n\nExisting photographs downloaded from Pexels, not AI-generated. Images were resized and converted to WebP without generative changes. Used only as clearly labelled demo imagery. No OSLC affiliation or endorsement is implied.\n\nLicense: https://www.pexels.com/license/\n\n" +
    photos
      .map(
        (p) =>
          `- **${p[0]}.webp** — ${p[2]}, ${p[3]}. [Original photograph](${source(p)})`,
      )
      .join("\n") +
    "\n",
);
const image = (name) => "/demo/photos/" + name + ".webp";
const pool = new pg.Pool({
  connectionString: url.href,
  connectionTimeoutMillis: 5000,
});
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const site = (
    await client.query("SELECT value FROM content WHERE key='site' FOR UPDATE")
  ).rows[0].value;
  if (!site.demoMode)
    throw new Error(
      "Full demo mode must be enabled before replacing demo images.",
    );
  const collectionImages = {
    collectionMenImage: image("menswear"),
    collectionWomenImage: image("womenswear"),
    collectionKidsImage: image("kidswear"),
  };
  if (process.argv.includes("--collections-only")) {
    await client.query(
      "UPDATE content SET value=value || $1::jsonb,updated_at=now() WHERE key='site'",
      [JSON.stringify(collectionImages)],
    );
  } else {
    const next = {
      ...site,
      ...collectionImages,
      heroImage: image("menswear"),
      aboutImage: image("fabric"),
      heroDescription:
        "DEMONSTRATION WEBSITE — Explore sample apparel collections and example workflows with real stock photography. Photos are not of OSLC products, people or facilities. Product specifications and workflows are fictional.",
    };
    await client.query(
      "UPDATE content SET value=$1,updated_at=now() WHERE key='site'",
      [JSON.stringify(next)],
    );
    const mapping = [
      ["demo-formal-trousers", "trousers"],
      ["demo-casual-chinos", "chinos"],
      ["demo-casual-shirts", "mens-shirts"],
    ];
    for (const [slug, key] of mapping) {
      await client.query("UPDATE categories SET image=$1 WHERE slug=$2", [
        image(key),
        slug,
      ]);
      const products = await client.query(
        "SELECT p.id FROM products p JOIN categories c ON c.id=p.category_id WHERE c.slug=$1 AND p.demo=true",
        [slug],
      );
      for (const p of products.rows) {
        await client.query("DELETE FROM product_images WHERE product_id=$1", [
          p.id,
        ]);
        for (const [i, name] of [key, "fabric"].entries())
          await client.query(
            "INSERT INTO product_images(product_id,url,alt,position) VALUES($1,$2,$3,$4)",
            [
              p.id,
              image(name),
              "Stock photograph for demo: " +
                photos.find((ph) => ph[0] === name)[2] +
                ". Not an OSLC product.",
              i,
            ],
          );
      }
    }
    const capabilityNames = [
      "Fabric sourcing",
      "Pattern development & cutting",
      "Stitching & assembly",
      "Finishing",
      "Quality inspection",
      "Packaging & dispatch",
    ];
    const capabilityImages = [
      "fabric",
      "cutting",
      "stitching",
      "finishing",
      "inspection",
      "packing",
    ];
    for (let i = 0; i < capabilityNames.length; i++)
      await client.query("UPDATE capabilities SET image=$1 WHERE name=$2", [
        image(capabilityImages[i]),
        "Demo · " + capabilityNames[i],
      ]);
    const galleryNames = [
      "Collection study",
      "Shirt study",
      "Fabric selection",
      "Cutting study",
      "Assembly study",
      "Facility concept",
      "Workspace concept",
      "Measurement review",
      "Finishing review",
      "Packing study",
      "Dispatch study",
      "Fabric detail",
    ];
    const galleryImages = [
      "trousers",
      "mens-shirts",
      "fabric",
      "cutting",
      "stitching",
      "workspace",
      "workspace",
      "inspection",
      "finishing",
      "packing",
      "packing",
      "fabric",
    ];
    for (let i = 0; i < galleryNames.length; i++) {
      const photo = photos.find((p) => p[0] === galleryImages[i]);
      await client.query(
        "UPDATE gallery SET image=$1,description=$2 WHERE name=$3",
        [
          image(photo[0]),
          "Real stock photograph: " +
            photo[2] +
            ". Source: Pexels. Not an OSLC product, employee or facility.",
          "Demo · " + galleryNames[i],
        ],
      );
    }
  }
  await client.query("COMMIT");
  console.log(
    process.argv.includes("--collections-only")
      ? "Updated only the three collection photographs; all existing copy and records are preserved."
      : "Updated the hero, about section, 3 categories, 18 products, 6 capabilities and 12 gallery entries with existing stock photographs.",
  );
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
  await pool.end();
}
