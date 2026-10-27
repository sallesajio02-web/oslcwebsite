CREATE TABLE leadership (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, title text NOT NULL,
 image text NOT NULL DEFAULT '', biography text NOT NULL DEFAULT '', vision text NOT NULL DEFAULT '',
 journey text NOT NULL DEFAULT '', philosophy text NOT NULL DEFAULT '', responsibilities text NOT NULL DEFAULT '',
 qualifications text NOT NULL DEFAULT '', experience text NOT NULL DEFAULT '', quote text NOT NULL DEFAULT '',
 social text NOT NULL DEFAULT '', position integer NOT NULL DEFAULT 0, published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, date date NOT NULL,
 category text NOT NULL DEFAULT 'Company news', description text NOT NULL DEFAULT '', image text NOT NULL DEFAULT '',
 position integer NOT NULL DEFAULT 0, published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE enquiries ALTER COLUMN quantity DROP NOT NULL;
-- Retain existing records. Demo material is no longer public company evidence.
UPDATE capabilities SET published=false WHERE (SELECT (value->>'demoMode')::boolean FROM content WHERE key='site') IS TRUE;
UPDATE gallery SET published=false WHERE (SELECT (value->>'demoMode')::boolean FROM content WHERE key='site') IS TRUE;
UPDATE content SET value = value || '{"heroTitle":"Crafting Apparel. Building Trust.","heroDescription":"Discover OSLC’s commitment to apparel manufacturing, quality, and long-term business partnerships.","tagline":"Quality Apparel for Every Generation.","seoTitle":"OSLC — Om Sai Latest Creation | Apparel Manufacturing, Surat","seoDescription":"Discover OSLC — Om Sai Latest Creation, a textile and apparel manufacturing company in Kosad, Surat, Gujarat. Meet our people and explore business partnerships.","about":"OSLC — Om Sai Latest Creation is a textile and apparel manufacturing company based in Kosad, Surat, Gujarat, India, serving the Men, Women and Kids apparel segments.","history":"","leadershipMessage":"","segmentMen":"","segmentWomen":"","segmentKids":"","pageSeo":{}}'::jsonb WHERE key='site';
-- Earlier seeded contact details and operational claims were examples, not verified company facts.
UPDATE content SET value = value || '{"address":"Kosad, Surat, Gujarat, India","phone":"","email":"","whatsapp":"","hours":"","mission":"","vision":"","quality":"Our company-approved quality procedures and inspection approach will be shared here.","process":"","heroImage":"","aboutImage":""}'::jsonb WHERE key='site' AND (value->>'demoMode')::boolean IS TRUE;
