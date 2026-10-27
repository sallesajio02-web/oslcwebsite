# OSLC House website

The visual HTML editor is available at `/editor`. See [HTML-STUDIO.md](HTML-STUDIO.md) for import, visual editing, source synchronization, export and testing instructions.

React + TypeScript + Vite + Tailwind CSS public website, Express REST API, PostgreSQL persistence, and protected administration at `/admin`. This is a B2B catalogue; it has no checkout or payment gateway.

## Run locally

## Standalone HTML preview

Open `oslc-whole-site.html` directly in a browser to view the public site with embedded styles, scripts and local images. Navigation uses hash URLs so pages work without a server. This export uses clearly labelled sample content; administration and live form submissions require the full application.

Regenerate after changes with `node scripts/export-html.mjs`. Check public page rendering with `node scripts/check-html.mjs`.

## Development server

Requires Node.js 22.12+ or 24 and PostgreSQL 16+. On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

```powershell
npm.cmd install
Copy-Item .env.example .env
# Edit .env with your PostgreSQL connection and a random SESSION_SECRET.
npm.cmd run migrate
npm.cmd run admin:create
npm.cmd run dev
```

Open http://localhost:5173 and http://localhost:5173/admin. Keep `SITE_URL` equal to the browser origin, including the port. Vite is configured to use port 5173 strictly, so it will report an occupied port rather than silently break same-origin validation. The API listens on 127.0.0.1:3001. Use `npm.cmd run seed:demo` to add an explicitly labelled, **unpublished** demonstration category and product; this never adds fabricated business facts to the public catalogue.

### Optional isolated Windows development database

If PostgreSQL 18 is installed in `C:/Program Files/PostgreSQL/18`, run `node scripts/local-db.mjs` **instead of copying `.env.example`**. This initializes a separate password-protected cluster in ignored `.local/postgres`, listening only on 127.0.0.1:55432, and writes random credentials and a session secret to ignored `.env`. It does not change your existing PostgreSQL service. Set `POSTGRES_BIN` to a different PostgreSQL binary directory if needed. Run the same command to restart the cluster, then run migrations. If interrupted during initialization, inspect `.local/postgres` and `.env` before retrying; do not delete an existing cluster containing data you need.

Stop this cluster with:

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D '.local/postgres' -m fast -w stop
```

### Existing PostgreSQL server

Have your database administrator create a dedicated login and database. For example, use `psql` interactively:

```sql
CREATE ROLE oslc LOGIN;
\password oslc
CREATE DATABASE oslc OWNER oslc;
```

Set `DATABASE_URL=postgresql://oslc:URL_ENCODED_PASSWORD@localhost:5432/oslc`. Never commit `.env`, database files, uploads or backups. Set `DATABASE_SSL=true` for a provider requiring verified TLS; install the provider CA as needed rather than disabling certificate verification. Migrations run in transactions and are recorded in `schema_migrations` with an advisory lock. Back up before applying new migrations.

## First administrator

Run `npm.cmd run admin:create` in an interactive terminal. Enter your email and a unique 12–128 character password at the hidden prompt. There is no default password and no public administrator registration. Only password hashes are stored. Additional administrators use the same command. Session cookies are HttpOnly, SameSite Strict, and Secure in production; sessions expire after eight hours. Login and admin writes use CSRF tokens and origin checks, and every protected request verifies the administrator role in PostgreSQL.

## Populate the company website

For a fully populated **local demonstration**, run `node scripts/seed-full-demo.mjs`. It only runs against the isolated local OSLC database on port 55432, adds clearly labelled published fictional collections and illustrations, and inserts sample enquiries across every status. It preserves your current website content under the `site:before-full-demo` content key before replacing the public copy. Re-running it does not duplicate seeded entries. The public preview displays a prominent demo banner. Reserved `.example` email addresses are not real contacts; no phone/WhatsApp number is invented. Do not deploy this database as live company data. Use a fresh production database and company-approved content when launching.

1. Sign in at `/admin` and update Website content: company copy, contact details, privacy and terms, SEO metadata, and approved hero/company images.
2. Add categories and products, upload images and meaningful alternative text, and confirm specifications with OSLC before publishing. Featured products appear on the homepage. Product image order can be changed in the editor.
3. Add verified manufacturing capabilities and the confirmed workflow (one step per line). Describe outsourced or managed processes accurately.
4. Add gallery images, captions, category and numeric display order.
5. Review enquiries, update statuses, record private internal notes, and export filtered records as CSV. CSV cells neutralize spreadsheet formula prefixes.

Lower display-order values appear first for categories, capabilities and gallery entries. Products use newest-first order. Deleting a category preserves its products as uncategorized; deleting a product preserves enquiry records and their original product name/code.

The supplied Justdial listing was used only for the name and address: [OSLC House listing](https://www.justdial.com/Surat/Oslc-House-Kosad/0261PX261-X261-240701222726-V6T4_BZDET). No phone number, hours, certifications, capacity or manufacturing processes were inferred from it. Phone, email and WhatsApp controls remain hidden until configured. The default hero is a labelled CSS textile illustration, not a photograph of OSLC products or facilities. Replace it with approved company photography. No stock factory scenes are presented as OSLC facilities.

## Enquiries and email

### Real stock photographs in the local demo

Run `node scripts/use-stock-photos.mjs` after the full demo seed to apply existing Pexels photographs instead of vector illustrations. This command is restricted to the isolated local demo database. Downloaded photographs are stored in `public/demo/photos/` as optimized WebP files, with original photographer/source links in `CREDITS.md` and `credits.json`. No AI-generated images are used. The public banner and captions explain that these photographs do not show OSLC products, staff or facilities. Running the full illustration seed again replaces database image references; re-run the stock-photo script afterward to restore the photographs.

Valid submissions are stored in PostgreSQL before success is returned. The response includes an `OSLC-` reference. SMTP is optional: configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, optional `SMTP_USER`/`SMTP_PASSWORD`, `SMTP_FROM` and `ENQUIRY_NOTIFY_TO`. SMTP failures do not discard enquiries. The public form does not claim email delivery. Verify a real notification in your mailbox before relying on it; SMTP has not been tested without company credentials. Review the admin inbox even when notifications are enabled. Use a monitored production process log for notification errors.

Public forms use server validation, a honeypot and IP rate limits. Configure `TRUST_PROXY` to the exact number of trusted reverse-proxy hops; do not expose the backend directly when trusting forwarded headers. Database-backed data is never replaced with fabricated API results or browser-local records.

## Tests and build

### Motion and collection navigation

Public animation styles are in `src/motion.css`, with the reusable Intersection Observer hook in `src/motion.ts`. Scroll content stays visible before initialization and if Intersection Observer is unavailable. Effects use finite transforms and opacity, with a capped 140 ms item stagger; the hero zoom stops at 1.035×. `prefers-reduced-motion` disables nonessential animation, and hidden tabs pause active effects. The 14 px minimum remains in place.

`src/header.tsx` provides the sticky navigation and keyboard-accessible collection disclosures. Escape closes a disclosure and returns focus to its button; closed mobile navigation is inert. `src/lightbox.tsx` uses a native modal dialog for focus containment, Escape/arrow keys and focus restoration. Page transitions animate the existing main element without adding a route key or resetting form state. There are no fabricated statistics or new company capability claims.

Migration `002_collection_departments.sql` adds Men/Women/Kids to categories, defaulting existing records to Men. Assign departments in Admin → Categories; catalogue links filter published records from PostgreSQL. Empty departments show enquiry/empty states rather than fictional stock. Upload the three collection images under Website content. The local demo uses existing stock photographs; `node scripts/use-stock-photos.mjs --collections-only` updates only these images and preserves other company content.

The interaction tests use jsdom for navigation disclosure, Escape focus restoration, lightbox arrow keys, scroll enhancement and reduced-motion behaviour. They complement the database/API integration tests. They do not replace real-browser checks of native focus trapping, visual transitions, responsive overflow or performance on slow devices.

```powershell
npm.cmd run build
npm.cmd test
npm.cmd audit --omit=dev
```

Integration tests require a reachable `DATABASE_URL` and permission to create a temporary schema. They isolate and clean up their own schema and temporary image files. They test login/logout, anonymous authorization, CSRF/origin checks, product/category CRUD, uploads, catalogue filters, enquiry validation and PostgreSQL persistence, status history, CSV export, content publication, public routes, SEO, sitemap and safe deletion. Without a database, integration tests explicitly skip; validation tests still run. Build before tests because production route checks read `dist/index.html`.

## Production deployment

Deploy on a Node.js host or Linux VM supporting a persistent process, PostgreSQL and a persistent upload disk. This Express/PostgreSQL architecture does not target the Sites plugin's Cloudflare Worker runtime.

1. Provision a managed PostgreSQL database with backups and a dedicated application login. Configure secrets using the host's environment/secret manager.
2. Set `NODE_ENV=production`, `DATABASE_URL`, a random `SESSION_SECRET` of at least 32 characters, `SITE_URL=https://your-domain.example`, `PORT=3001`, and an absolute persistent `UPLOAD_DIR`. Set `DATABASE_SSL` appropriately. Run behind an HTTPS reverse proxy.
3. Run `npm ci`, `npm run build`, `npm run migrate`, and interactively `npm run admin:create` for a first installation. Use the same secret on subsequent deployments to preserve sessions. Do not run demo seeding in production.
4. Start `npm start` under systemd or your host's process supervisor. The backend binds to loopback. A container host may require changing the bind interface intentionally and configuring network access restrictions.
5. Proxy the entire domain to 127.0.0.1:3001; the Express server serves frontend assets, routes, uploads and API under one origin. Persistent data must survive releases. Do not serve only `dist` as a static site because enquiries and administration require the API.
6. Point your domain's A/AAAA or CNAME records at the host according to the hosting provider. Use Caddy automatic TLS, your host's managed HTTPS, or Nginx with a renewed certificate. Set `TRUST_PROXY=1` for exactly one trusted proxy. Redirect HTTP to HTTPS at the proxy.

Example Caddy configuration:

```caddy
your-domain.example {
    reverse_proxy 127.0.0.1:3001
}
```

Server responses include page-specific titles/descriptions, canonical and Open Graph tags, and 404 status for unknown routes/products. The React app adds organization/product structured data. `/sitemap.xml` includes published products; `/robots.txt` discourages admin/API crawling. Search engines can render public React content; for stricter full-HTML indexing requirements, add server rendering before launch.

Before public launch, replace the illustration with approved photos, publish the confirmed catalogue/processes, confirm business contact details, review privacy/terms and data-retention practices, test SMTP if configured, and complete the host's HTTPS and backup configuration. No deployment or domain connection has been performed by this repository alone.

## Backup and recovery

Use your managed provider's scheduled backups with point-in-time recovery where available. For a self-hosted database, run `pg_dump --format=custom --file=backups/oslc.dump` with `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` and credentials supplied through a secret manager or protected `.pgpass`. Schedule encrypted off-host backups and monitor failures. Do not include secrets in shell arguments or logs. Back up the persistent `UPLOAD_DIR` alongside the database and retain a matching restore point. Store `.env`/deployment secrets in a separate access-controlled secret backup.

To recover, provision a fresh database and upload directory, restore the database with `pg_restore --no-owner --dbname=oslc backups/oslc.dump`, restore matching image files, deploy the corresponding source/build, configure secrets and verify `/api/health`, product images, admin login and test enquiry submission. Test restores periodically. Never restore over a live database without a reviewed maintenance plan. Enquiry records are private: limit backup access and agree deletion/retention requirements with OSLC.

## Corporate website update

The public site now uses company-focused navigation: Home, About OSLC, Leadership & Team,
Manufacturing, Our Capabilities, Quality & Values, Gallery, Company News & Events, and Contact Us.
There are no purchasing, cart, payment, customer-account, or checkout workflows.
The earlier catalogue data is retained for compatibility; it is no longer linked from the corporate site.

Run `npm.cmd run migrate`, `npm.cmd run build`, and `npm.cmd run dev` on Windows.
The local preview is http://localhost:5173 and administration is http://localhost:5173/admin.
Use the existing administrator account or the documented `admin:create` command; no default password is added.

In administration:
- **Leadership & Team** manages portraits, official titles, biographies, vision, journey,
  responsibilities, qualifications, experience, approved quotes, professional links,
  display ordering, and publication. Profiles remain private until published.
- **News & Events** manages dated, categorized company announcements, photographs and publication.
- **Manufacturing** identifies each operation as in-house, managed externally, or awaiting confirmation.
- **Gallery** supports company premises, manufacturing, Men, Women, Kids, team, festivals and events.
- **Website content** includes company history, segment descriptions, approved leadership messages,
  mission, vision, contact information, original logo, images, and per-page SEO overrides.
- **Enquiries** stores and reviews general business enquiries without requiring product quantities.

Migrations 003 and 004 preserve existing records and the supplied logo. Demo capabilities and
company-gallery images are unpublished; demo contact and operational claims are cleared.
Stock apparel/textile imagery remains explicitly labelled as visual inspiration.
The public site remains in preview/no-index mode while company details await approval.
Before launch, supply verified leadership profiles, facility/team photographs, company history,
quality procedures, full address, contact channels, and approved privacy/terms text.
Do not publish fictional staff, events, certifications, factory capacity, or unverified operations.
The existing administrator role, session authentication, CSRF protection, validation, upload processing,
rate limits, and PostgreSQL enquiry storage are reused for the new content endpoints.

## Careers and recruitment

Public routes: `/careers` and `/careers/:slug`. Staff manage vacancies, career areas,
applications, internal notes, status history and private resumes at `/admin/careers`.
Run `npm.cmd run migrate` before starting the updated server.
Suggested career areas are seeded without creating vacancies. No demo jobs or applicants are stored in the database. In local development with demonstration mode enabled and no genuine open vacancies, six clearly labelled sample jobs are shown. Their application forms simulate confirmation without sending or saving data. These sample jobs are excluded from production and job-posting metadata. The careers application form always saves real applications, even while
other company pages display demo content; an explicit notice identifies this on the form.

Vacancies must be approved for publication, Open, not archived and within their deadline
to appear publicly or accept applications. Deadlines use Asia/Kolkata dates. Staff can
archive expired vacancies in the Careers dashboard. CSV exports include the active filters,
exclude resume bytes and private notes, and are capped at 10,000 rows; split larger exports
by date. Resume downloads require an authorized admin session and use no-store responses.
JobPosting metadata is opt-in for approved active jobs with verified city, region and ISO
country code; it is suppressed while the site is in demonstration mode.

Only standard, non-interactive, unencrypted PDF resumes are accepted. Configure
`RESUME_MAX_MB` (default 5, maximum 10). PDF type/signature and content checks reject
executable files, scripts, embedded attachments, interactive forms and compressed object
streams. Applicants may need to export a flattened PDF. Resume files use random server
filenames and are held as private PostgreSQL bytea records, never in public uploads.
Protect database access and include resumes in encrypted infrastructure backups. These
checks are not an antivirus service; integrate an organization-approved scanner if required.

Application details and consent-time privacy text are recorded together. The default
recruitment notice describes the configured retention period and applicant access,
correction, withdrawal and deletion requests. Set `RECRUITMENT_PRIVACY_NOTICE` to the
company-approved notice and `RECRUITMENT_RETENTION_DAYS` (default 180) before launch.
Staff can permanently delete an application and its resume/history from the dashboard.
Schedule `npm.cmd run careers:purge` daily in the host scheduler to enforce the configured
retention period; this deletes applications older than that period with cascading resume
and history removal. Database backup retention must follow the same approved policy.
The purge command is intentionally not executed during setup.

Recruitment notifications use the common `SMTP_*` settings. Set `RECRUITMENT_NOTIFY_TO`
for HR notifications, `RECRUITMENT_ACKNOWLEDGEMENTS=true` for receipt acknowledgements,
and `RECRUITMENT_STATUS_EMAILS=true` for status updates. The defaults send no email.
Notification failures are logged by application reference without losing applications or
logging applicant details. The UI confirms database persistence and never claims email delivery.
Company HR staff must review the recruitment policy, vacancy details and employment claims
before publication. No benefits, salaries, interviews or jobs are promised by default.
