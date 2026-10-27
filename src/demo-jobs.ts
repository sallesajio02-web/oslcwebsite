import type { Department, Job } from "./careers-shared";
const samples = [
  [
    "production-supervisor",
    "Production Supervisor",
    "Production",
    "Full-time",
    "Experienced",
    "Sample: 3-5 years in apparel production",
    "Sample range: INR 28,000-38,000 per month",
    "Coordinate daily production plans, support line teams and communicate progress.",
    "Sample: diploma or degree with relevant garment production knowledge.",
    "Production planning, team coordination and clear communication.",
  ],
  [
    "quality-inspector",
    "Quality Inspector",
    "Quality Control",
    "Full-time",
    "Experienced",
    "Sample: 1-3 years in garment inspection",
    "Sample range: INR 18,000-25,000 per month",
    "Review garment measurements, seams and finishing against a sample checklist.",
    "Sample: secondary education or relevant technical training.",
    "Attention to detail, garment construction awareness and record keeping.",
  ],
  [
    "stitching-trainee",
    "Stitching Trainee",
    "Cutting and Stitching",
    "Full-time",
    "Entry level",
    "Sample: freshers and trainees",
    "Sample range: INR 12,000-16,000 per month",
    "Learn garment assembly basics and support supervised stitching tasks.",
    "Sample: basic education; interest in garment construction.",
    "Willingness to learn, teamwork and careful handling of materials.",
  ],
  [
    "merchandising-assistant",
    "Merchandising Assistant",
    "Merchandising",
    "Contract",
    "Entry level",
    "Sample: 0-2 years",
    "Sample range: INR 20,000-28,000 per month",
    "Help organize apparel briefs, track sample information and coordinate updates.",
    "Sample: graduate qualification in fashion, textiles or a related area.",
    "Spreadsheet skills, organization and written communication.",
  ],
  [
    "design-intern",
    "Apparel Design Intern",
    "Design and Product Development",
    "Internship",
    "Entry level",
    "Sample: students and recent graduates",
    "Sample stipend: INR 8,000-12,000 per month",
    "Explore apparel ideas, prepare visual references and assist with design documentation.",
    "Sample: pursuing or recently completed fashion or textile design studies.",
    "Sketching, visual research and interest in fabrics.",
  ],
  [
    "accounts-assistant",
    "Accounts & Administration Assistant",
    "Accounts and Administration",
    "Part-time",
    "Any level",
    "Sample: 0-3 years",
    "Sample range: INR 10,000-15,000 per month",
    "Support routine records, document organization and administrative coordination.",
    "Sample: commerce qualification or related training.",
    "Basic accounting, spreadsheets and organized record keeping.",
  ],
];
export function getDemoJobs(departments: Department[]): Job[] {
  return samples.map(
    (
      [
        slug,
        title,
        department,
        employment_type,
        experience_level,
        experience,
        salary,
        responsibilities,
        qualifications,
        skills,
      ],
      i,
    ) => ({
      id: `demo-job-${i}`,
      slug: `demo-${slug}`,
      title: `${title} (Demo)`,
      department_id:
        departments.find((d) => d.name === department)?.id ||
        `demo-department-${i}`,
      department,
      location: "Surat, Gujarat - sample location",
      employment_type,
      experience_level,
      experience,
      openings: i === 2 ? 4 : 1,
      salary,
      description:
        "Fictional vacancy for local design preview only. This is not an actual OSLC job opening. All responsibilities, requirements, openings and pay figures shown are sample data.",
      responsibilities,
      qualifications,
      skills,
      preferred_skills:
        "Sample: curiosity, collaboration and an interest in apparel manufacturing.",
      deadline: "",
      status: "Open",
      published: false,
      featured: i < 2,
      archived: false,
      structured_data: false,
    }),
  );
}
export function filterDemoJobs(
  jobs: Job[],
  filters: {
    search: string;
    department: string;
    type: string;
    experience: string;
  },
) {
  return jobs.filter(
    (j) =>
      (!filters.search ||
        (j.title + " " + j.description)
          .toLowerCase()
          .includes(filters.search.toLowerCase())) &&
      (!filters.department || j.department_id === filters.department) &&
      (!filters.type || j.employment_type === filters.type) &&
      (!filters.experience || j.experience_level === filters.experience),
  );
}
