# OSLC brand assets

The six supplied brand names are listed in `brands.json`. Current SVG files are explicitly
labelled placeholders, not official logos. No official brand artwork was found in the project.

To replace a logo:
1. Upload the approved logo into this folder. Prefer optimized SVG or transparent WebP/PNG.
2. Replace the existing SVG at the same filename, or update that entry's `logo` path in `brands.json`.
3. Set `placeholder` to `false` once approved artwork is present.
4. Optionally set `href` to an existing internal brand page or an HTTPS brand website.
5. Rebuild for production after changing the JSON configuration. No component edits are needed.

Use the original logo proportions; the component uses object-fit: contain and does not crop.
Keep source artwork free of external resources or scripts. Do not publish unapproved artwork.

Each entry can also set `image` and `imageAlt` for the editorial fashion photograph. Current images are explicitly illustrative stock photos, not actual brand products. Replace them with approved brand campaign photos when supplied.
