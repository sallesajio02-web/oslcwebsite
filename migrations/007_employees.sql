CREATE TABLE employees (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, role text NOT NULL,
 description text NOT NULL DEFAULT '', image text NOT NULL DEFAULT '', position integer NOT NULL DEFAULT 0,
 published boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
