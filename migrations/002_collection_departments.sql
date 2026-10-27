ALTER TABLE categories ADD COLUMN department text NOT NULL DEFAULT 'Men' CHECK (department IN ('Men','Women','Kids'));
CREATE INDEX categories_department_idx ON categories(department,published);
