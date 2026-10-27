export const corporateNav = [
  ["/", "Home"],
  ["/about", "About OSLC"],
  ["/leadership", "Leadership & Team"],
  ["/teams", "Teams"],
  ["/manufacturing", "Manufacturing"],
  ["/capabilities", "Our Capabilities"],
  ["/quality", "Quality & Values"],
  ["/gallery", "Gallery"],
  ["/news", "Company News & Events"],
  ["/careers", "Careers"],
  ["/contact", "Contact Us"],
];
export const galleryCategories = [
  "Company & Premises",
  "Manufacturing",
  "Men",
  "Women",
  "Kids",
  "Leadership & Team",
  "Festivals & Celebrations",
  "Events & Activities",
] as const;
export interface Leader {
  id: string;
  name: string;
  title: string;
  image: string;
  biography: string;
  vision: string;
  journey: string;
  philosophy: string;
  responsibilities: string;
  qualifications: string;
  experience: string;
  quote: string;
  social: string;
  position: number;
  published: boolean;
}
export interface CompanyEvent {
  id: string;
  name: string;
  date: string;
  category: string;
  description: string;
  image: string;
  position: number;
  published: boolean;
}
