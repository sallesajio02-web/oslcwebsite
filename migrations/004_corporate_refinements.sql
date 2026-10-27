ALTER TABLE capabilities ADD COLUMN operation text NOT NULL DEFAULT 'To be confirmed' CHECK(operation IN ('In-house','Managed externally','To be confirmed'));
-- Repair shell encoding in migrated company copy without changing approved content.
UPDATE content SET value = replace(replace(value::text, 'OSLC?s', 'OSLC\u2019s'), 'OSLC ? Om', 'OSLC \u2014 Om')::jsonb WHERE key='site';
-- Clearly labelled textile inspiration while actual company photography is awaited.
UPDATE content SET value = jsonb_set(value, '{heroImage}', '"/demo/photos/fabric.webp"') WHERE key='site' AND (value->>'demoMode')::boolean IS TRUE AND coalesce(value->>'heroImage','')='';
