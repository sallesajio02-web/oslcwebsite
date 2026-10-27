CREATE TABLE job_departments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO job_departments(name) VALUES ('Production'),('Quality Control'),('Cutting and Stitching'),('Warehouse and Packing'),('Merchandising'),('Design and Product Development'),('Accounts and Administration'),('Sales and Business Development'),('Human Resources'),('Information Technology'),('Internship and Trainee Positions');
CREATE TABLE job_vacancies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, title text NOT NULL,
 department_id uuid NOT NULL REFERENCES job_departments(id) ON DELETE RESTRICT,
 location text NOT NULL, employment_type text NOT NULL CHECK(employment_type IN ('Full-time','Part-time','Contract','Internship')),
 experience_level text NOT NULL CHECK(experience_level IN ('Entry level','Experienced','Senior','Any level')),
 experience text NOT NULL, openings integer CHECK(openings>0), salary text NOT NULL DEFAULT '',
 description text NOT NULL, responsibilities text NOT NULL, qualifications text NOT NULL, skills text NOT NULL,
 preferred_skills text NOT NULL DEFAULT '', deadline date, status text NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','Closed')),
 published boolean NOT NULL DEFAULT false, featured boolean NOT NULL DEFAULT false, archived boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_vacancies_active_idx ON job_vacancies(published,status,archived,department_id);
CREATE TABLE job_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reference text NOT NULL UNIQUE,
 job_id uuid REFERENCES job_vacancies(id) ON DELETE RESTRICT,
 department_id uuid NOT NULL REFERENCES job_departments(id) ON DELETE RESTRICT,
 name text NOT NULL, email text NOT NULL, phone text NOT NULL, city text NOT NULL,
 experience text NOT NULL, education text NOT NULL, current_company text NOT NULL DEFAULT '',
 skills text NOT NULL DEFAULT '', expected_salary text NOT NULL DEFAULT '', notice_period text NOT NULL DEFAULT '',
 linkedin text NOT NULL DEFAULT '', cover_letter text NOT NULL DEFAULT '',
 consent_at timestamptz NOT NULL DEFAULT now(), privacy_notice text NOT NULL,
 dedupe_hash text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'New Application'
 CHECK(status IN ('New Application','Under Review','Shortlisted','Interview Scheduled','Selected','Rejected','Withdrawn')),
 notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_applications_search_idx ON job_applications(created_at DESC,status,department_id,job_id);
CREATE TABLE resume_files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL UNIQUE REFERENCES job_applications(id) ON DELETE CASCADE,
 filename text NOT NULL UNIQUE, mime_type text NOT NULL CHECK(mime_type='application/pdf'), size integer NOT NULL CHECK(size>0),
 sha256 text NOT NULL, data bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE application_status_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
 admin_id uuid REFERENCES admins(id) ON DELETE SET NULL, status text NOT NULL, note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX application_history_idx ON application_status_history(application_id,created_at);
