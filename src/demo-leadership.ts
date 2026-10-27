import type { Leader } from "./corporate-config";

// Development previews only. Never use these profiles as verified company content.
const profile = (position: number, fields: Partial<Leader>): Leader => ({
  id: `demo-leader-${position}`,
  name: "",
  title: "",
  image: `/demo/portraits/leader-${position}.webp`,
  biography: "",
  vision: "",
  journey: "",
  philosophy: "",
  responsibilities: "",
  qualifications: "",
  experience: "",
  quote: "",
  social: "",
  position,
  published: false,
  ...fields,
});
export const demoLeadership: Leader[] = [
  profile(0, {
    name: "Aarav Shah",
    title: "Founder - Demo profile",
    biography:
      "Fictional profile for layout preview. Aarav represents a founder whose focus is bringing people, craftsmanship and long-term business relationships together.",
    vision:
      "Sample founding vision: build an apparel organization guided by thoughtful workmanship and trusted partnerships.",
    journey:
      "Sample journey: from an early interest in textiles to shaping a collaborative company culture. Replace this text with the approved founding story.",
    philosophy:
      "Lead with integrity, listen carefully and give people room to grow.",
    responsibilities:
      "Illustrative areas: company direction, mentoring leadership and nurturing business relationships.",
    quote:
      "Sample message: Lasting progress begins with people who care about what they create.",
  }),
  profile(1, {
    name: "Meera Desai",
    title: "Chief Executive Officer - Demo profile",
    biography:
      "Fictional profile for layout preview. Meera represents an executive leader aligning company priorities, team development and business partnerships.",
    vision:
      "Sample company vision: bring clarity, consistency and a long-term perspective to every business decision.",
    philosophy:
      "Set a clear direction, support the team and keep improving together.",
    responsibilities:
      "Illustrative areas: strategic planning, collaboration across departments and organizational development.",
    quote:
      "Sample message: A shared purpose turns individual effort into collective progress.",
  }),
  profile(2, {
    name: "Rohan Patel",
    title: "Head Manager - Demo profile",
    biography:
      "Fictional profile for layout preview. Rohan represents a hands-on manager supporting coordination, communication and everyday teamwork.",
    philosophy:
      "Make expectations clear, encourage feedback and solve problems as a team.",
    responsibilities:
      "Illustrative areas: operational coordination, department communication and team support. Actual responsibilities require company confirmation.",
    quote:
      "Sample message: Care in everyday decisions builds a stronger organization.",
  }),
];
