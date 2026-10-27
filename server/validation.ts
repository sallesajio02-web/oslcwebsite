import { z } from "zod";
import { galleryCategories } from "../src/corporate-config.js";
const text = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (v) => !/[<>\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v),
      "Plain text only",
    );
const required = (max = 200) =>
  text(max).refine((v) => v.length > 0, "Required");
export const imageUrl = z
  .string()
  .max(1000)
  .refine(
    (v) =>
      v === "" ||
      /^\/uploads\/[a-f0-9-]+\.webp$/.test(v) ||
      /^\/demo\/[a-z0-9-]+\.svg$/.test(v) ||
      /^\/demo\/photos\/[a-z0-9-]+\.webp$/.test(v) ||
      /^https:\/\//.test(v),
    "Use an HTTPS image URL or an uploaded image",
  );
export const enquirySchema = z.object({
  name: required(100),
  company: required(160),
  email: z.email().max(254),
  phone: z.string().regex(/^[+\d ()-]{7,25}$/, "Enter a valid phone number"),
  enquiry_type: z
    .enum([
      "Company information",
      "Business partnership",
      "Manufacturing",
      "Careers",
      "Media",
      "Other",
    ])
    .optional(),
  buyer_type: z
    .enum([
      "Wholesaler",
      "Retailer",
      "Fashion brand",
      "Distributor",
      "Bulk buyer",
      "Other",
    ])
    .default("Other"),
  category: text(160).default(""),
  product_id: z.uuid().nullable().optional(),
  product_name: text(200).default(""),
  quantity: z.coerce.number().int().min(1).max(100000000).nullable().optional(),
  customization: text(2000).default(""),
  message: required(4000).refine(
    (v) => v.length >= 10,
    "Please provide at least 10 characters",
  ),
  website: z.literal("").default(""),
  consent: z.literal(true),
});
export const statuses = [
  "New",
  "Contacted",
  "Quotation in Progress",
  "Quotation Sent",
  "Converted",
  "Closed",
] as const;
export const productSchema = z.object({
  name: required(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(200),
  sku: required(100),
  category_id: z.uuid().nullable(),
  description: text(6000),
  sizes: text(),
  colours: text(),
  fabric: text(),
  customization: text(),
  moq: text(),
  published: z.boolean(),
  featured: z.boolean(),
  demo: z.boolean().default(false),
  images: z
    .array(
      z.object({
        url: imageUrl.refine((v) => !!v),
        alt: required(),
        position: z.number().int().min(0),
      }),
    )
    .max(12),
});
export const categorySchema = z.object({
  department: z.enum(["Men", "Women", "Kids"]).default("Men"),
  name: required(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(200),
  description: text(2000),
  image: imageUrl,
  position: z.number().int(),
  published: z.boolean(),
});
const capabilityBaseSchema = z.object({
  operation: z
    .enum(["In-house", "Managed externally", "To be confirmed"])
    .default("To be confirmed"),
  name: required(),
  description: text(4000),
  image: imageUrl,
  position: z.number().int(),
  published: z.boolean(),
});
export const capabilitySchema = capabilityBaseSchema.extend({
  images: z.array(imageUrl).max(12).default([]),
});
export const leadershipSchema = z.object({
  name: required(200),
  title: required(200),
  image: imageUrl,
  biography: required(6000),
  vision: text(3000).default(""),
  journey: text(4000).default(""),
  philosophy: text(3000).default(""),
  responsibilities: text(4000).default(""),
  qualifications: text(1000).default(""),
  experience: text(1000).default(""),
  quote: text(2000).default(""),
  social: z
    .union([
      z.url().refine((v) => v.startsWith("https://"), "Use HTTPS"),
      z.literal(""),
    ])
    .default(""),
  position: z.number().int(),
  published: z.boolean(),
});
export const eventSchema = capabilityBaseSchema.omit({ operation: true }).extend({
  date: z.iso.date(),
  category: required(100),
});
export const employeeSchema = capabilityBaseSchema
  .omit({ operation: true })
  .extend({ role: required(200) });
export const gallerySchema = capabilityBaseSchema.omit({ operation: true }).extend({
  image: imageUrl.refine((v) => !!v),
  category: z.enum([
    ...galleryCategories,
    "Products",
    "Factory and facilities",
    "Quality inspection",
    "Packaging and dispatch",
  ]),
});
const marketplaceUrl = (domains: string[]) =>
  z
    .string()
    .trim()
    .max(2000)
    .refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return (
          url.protocol === "https:" &&
          !url.username &&
          !url.password &&
          !url.port &&
          domains.some(
            (domain) =>
              url.hostname === domain || url.hostname.endsWith("." + domain),
          )
        );
      } catch {
        return false;
      }
    }, "Use an HTTPS store URL on the matching marketplace, or leave blank.")
    .default("");
export const contentSchema = z.object({
  marketplaceAmazonUrl: marketplaceUrl(["amazon.in", "amazon.com"]),
  marketplaceFlipkartUrl: marketplaceUrl(["flipkart.com"]),
  marketplaceMyntraUrl: marketplaceUrl(["myntra.com"]),
  marketplaceAjioUrl: marketplaceUrl(["ajio.com"]),
  marketplaceMeeshoUrl: marketplaceUrl(["meesho.com"]),
  history: text(6000).default(""),
  leadershipMessage: text(6000).default(""),
  founderMessage: text(6000).default(""),
  segmentMen: text(2000).default(""),
  segmentWomen: text(2000).default(""),
  segmentKids: text(2000).default(""),
  pageSeo: z
    .record(
      z.string().regex(/^\/[a-z-]*$/),
      z.object({ title: text(200), description: text(400) }),
    )
    .default({}),
  company: required(100),
  tagline: required(),
  heroTitle: required(300),
  heroDescription: required(1000),
  about: required(6000),
  mission: text(3000),
  vision: text(3000),
  quality: text(6000),
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
  socialLinks: text(2000),
  seoTitle: required(200),
  seoDescription: required(400),
  process: text(6000),
  privacy: required(10000),
  terms: required(10000),
});
export function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^[\s]*[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
