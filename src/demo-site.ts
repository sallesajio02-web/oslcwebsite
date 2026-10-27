import type { Entry, Site } from "./api";
import { demoLeadership } from "./demo-leadership";
import { galleryCategories, type CompanyEvent } from "./corporate-config";

const photo = (name: string) => `/demo/photos/${name}.webp`;
const capabilityNames = [
  "Fabric preparation",
  "Pattern & cutting",
  "Stitching & assembly",
  "Finishing",
  "Quality inspection",
  "Packaging",
];
const capabilityPhotos = [
  "fabric",
  "cutting",
  "stitching",
  "finishing",
  "inspection",
  "packing",
];
const capabilitySlides = [
  ["fabric", "collection", "workspace"],
  ["cutting", "inspection"],
  ["stitching", "workspace"],
  ["finishing", "shirts", "mens-shirts"],
  ["inspection", "trousers", "chinos"],
  ["packing", "collection"],
];
const descriptions = [
  "Sample workflow: review fabric requirements, organize materials and prepare for production. Actual materials and processes require company confirmation.",
  "Sample workflow: translate an approved garment brief into patterns and cutting plans, with attention to fit and material use.",
  "Sample workflow: assemble garment panels and review seams and construction against the agreed design.",
  "Sample workflow: review garment appearance, remove loose threads and prepare pieces for final inspection.",
  "Sample workflow: review measurements, workmanship and finishing against an agreed checklist. This is not a verified OSLC procedure or certification.",
  "Sample workflow: fold, label and package garments according to an agreed presentation brief. Actual services require confirmation.",
];
const capabilities: Entry[] = capabilityNames.map((name, i) => ({
  id: `demo-capability-${i}`,
  name: `${name} - Sample`,
  description: descriptions[i],
  image: photo(capabilityPhotos[i]),
  images: capabilitySlides[i].map(photo),
  position: i,
  published: false,
  operation: "To be confirmed",
}));
const galleryPhotos = [
  "workspace",
  "stitching",
  "menswear",
  "womenswear",
  "kidswear",
  "workspace",
  "fabric",
  "collection",
];
const gallery: Entry[] = galleryCategories.map((category, i) => ({
  id: `demo-gallery-${i}`,
  name: `${category} - Demo inspiration`,
  category,
  description:
    "Stock visual for layout preview only. This image does not document OSLC premises, products, employees, celebrations or events.",
  image: photo(galleryPhotos[i]),
  position: i,
  published: false,
}));
const events: CompanyEvent[] = [
  {
    id: "demo-event-1",
    name: "Team appreciation day - Sample event",
    date: "2026-09-18",
    category: "Team activities",
    description:
      "Fictional event for preview only. A sample story about recognizing shared effort and celebrating collaboration across departments. Replace this text and visual with an approved account of a real company activity.",
    image: photo("workspace"),
    position: 0,
    published: false,
  },
  {
    id: "demo-event-2",
    name: "A celebration of colour - Sample event",
    date: "2026-09-05",
    category: "Festivals & celebrations",
    description:
      "Fictional event for preview only. This example shows how a festival celebration could be presented with a date, description and image. The textile photograph is visual inspiration, not evidence of a company celebration.",
    image: photo("fabric"),
    position: 1,
    published: false,
  },
  {
    id: "demo-event-3",
    name: "A closer look at craftsmanship - Sample update",
    date: "2026-08-21",
    category: "Manufacturing updates",
    description:
      "Fictional update for preview only. A sample editorial introduction to garment construction and attention to detail. No production milestone, capacity or machinery claim is implied. Image: stock photograph, not an OSLC facility.",
    image: photo("stitching"),
    position: 2,
    published: false,
  },
  {
    id: "demo-event-4",
    name: "New possibilities in apparel - Sample story",
    date: "2026-08-07",
    category: "Company news",
    description:
      "Fictional story for preview only. An example of a company news article exploring apparel ideas across Men, Women and Kids segments. Company-approved announcements can replace this sample.",
    image: photo("collection"),
    position: 3,
    published: false,
  },
];

/** Fill the local demonstration only; never write sample records into the database. */
export function withDemoContent(site: Site, development: boolean): Site {
  if (!development || !site.demoMode) return site;
  return {
    ...site,
    demoPreview: true,
    heroTitle: "Crafting Apparel. Building Trust.",
    heroDescription:
      "Discover a sample presentation of OSLC's commitment to apparel manufacturing, quality and long-term business partnerships.",
    heroImage: site.heroImage || photo("fabric"),
    aboutImage: site.aboutImage || photo("workspace"),
    tagline: "Quality Apparel for Every Generation.",
    about:
      site.about +
      "\n\nSample company narrative: our approach brings apparel ideas, thoughtful workmanship and open communication together. From early discussions to reviewing the finer details, this demonstration presents a company built around people and partnerships. This paragraph is draft content for review.",
    history:
      site.history ||
      "Sample founding story: a shared interest in textiles grows into a vision for a people-focused apparel company in Surat. An early team develops its understanding of garment construction, strengthens business relationships and looks ahead to new possibilities. This is fictional narrative for design review; founding dates, milestones and the actual company journey must be supplied by OSLC.",
    mission:
      site.mission ||
      "Sample mission: bring care, clarity and collaboration to apparel manufacturing while building enduring business relationships.",
    vision:
      site.vision ||
      "Sample vision: grow as a trusted apparel organization where people, workmanship and thoughtful progress shape the future.",
    quality:
      "Sample quality approach: begin with an agreed brief, define measurement and workmanship expectations, and review fabric, seams, finishing and presentation at appropriate stages. Document observations and discuss improvements as a team. These are illustrative practices, not verified OSLC procedures or certifications.",
    segmentMen:
      site.segmentMen ||
      "Sample segment: shirts, trousers and everyday essentials, with discussions around fabric, fit and finish. These example categories illustrate the page layout; actual OSLC offerings require confirmation.",
    segmentWomen:
      site.segmentWomen ||
      "Sample segment: versatile tops, coordinated separates and everyday apparel. Explore material choices, garment construction and presentation through this illustrative business segment.",
    segmentKids:
      site.segmentKids ||
      "Sample segment: comfortable everyday pieces and coordinated apparel for younger age groups. The sample content emphasizes ease of movement and thoughtful construction; actual categories require confirmation.",
    collectionMenImage: site.collectionMenImage || photo("menswear"),
    collectionWomenImage: site.collectionWomenImage || photo("womenswear"),
    collectionKidsImage: site.collectionKidsImage || photo("kidswear"),
    process:
      site.process ||
      "Sample: discuss the apparel brief\nSample: review materials and construction\nSample: prepare patterns and cutting plans\nSample: assemble and finish garments\nSample: inspect against an agreed checklist\nSample: prepare packaging",
    leadership: site.leadership?.length ? site.leadership : demoLeadership,
    leadershipMessage:
      site.leadershipMessage ||
      "Sample leadership message: We believe that progress begins with people who care about their work and one another. Through open communication, thoughtful decisions and a shared commitment to improvement, we can build meaningful partnerships. This is fictional preview copy, not a statement from OSLC leadership.",
    capabilities: site.capabilities.length ? site.capabilities : capabilities,
    gallery: site.gallery.length ? site.gallery : gallery,
    events: site.events?.length ? site.events : events,
    address: site.address,
    email: site.email || "hello@oslc.example.invalid",
    demoPhoneLabel: "+91 XXXXX XXXXX (sample phone placeholder)",
    hours:
      site.hours ||
      "Sample schedule: Monday to Saturday, 9:30 AM - 6:30 PM IST; actual hours to be confirmed",
    privacy:
      "DEMO PRIVACY NOTICE - Draft for review. The demo business enquiry form simulates submissions. The Careers recruitment form is live and stores applications and private resumes; review its recruitment privacy notice before submitting. The final website's business enquiry form collects contact and message details so authorized staff can respond. Essential session cookies support administrator access. OSLC must confirm the privacy contact, retention period and approved policy before launch.",
    terms:
      "DEMO WEBSITE TERMS - Draft for review. Company stories, profiles, activities and operational descriptions marked as samples are fictional preview content. Stock visuals do not show OSLC staff or facilities. The website is informational; a business enquiry does not create a purchase or supply agreement. OSLC must approve final terms before launch.",
  };
}
