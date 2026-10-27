ALTER TABLE job_vacancies ADD COLUMN job_city text NOT NULL DEFAULT '';
ALTER TABLE job_vacancies ADD COLUMN job_region text NOT NULL DEFAULT '';
ALTER TABLE job_vacancies ADD COLUMN job_country text NOT NULL DEFAULT '';
ALTER TABLE job_vacancies ADD COLUMN structured_data boolean NOT NULL DEFAULT false;
