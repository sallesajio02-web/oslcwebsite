export const employmentTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
] as const;
export const experienceLevels = [
  "Entry level",
  "Experienced",
  "Senior",
  "Any level",
] as const;
export const applicationStatuses = [
  "New Application",
  "Under Review",
  "Shortlisted",
  "Interview Scheduled",
  "Selected",
  "Rejected",
  "Withdrawn",
] as const;
export interface Department {
  id: string;
  name: string;
}
export interface Job {
  created_at?: string;
  job_city?: string;
  job_region?: string;
  job_country?: string;
  structured_data?: boolean;
  id: string;
  slug: string;
  title: string;
  department_id: string;
  department: string;
  location: string;
  employment_type: string;
  experience_level: string;
  experience: string;
  openings: number | null;
  salary: string;
  description: string;
  responsibilities: string;
  qualifications: string;
  skills: string;
  preferred_skills: string;
  deadline: string;
  status: string;
  published: boolean;
  featured: boolean;
  archived: boolean;
}
export interface RecruitmentConfig {
  departments: Department[];
  maxResumeBytes: number;
  retentionDays: number;
  privacyNotice: string;
}
