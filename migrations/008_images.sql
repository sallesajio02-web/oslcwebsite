CREATE TABLE images (
  id uuid PRIMARY KEY,
  content_type text NOT NULL DEFAULT 'image/webp',
  data bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
