# Deploy OSLC to Vercel

The repository includes `vercel.json`, a Vite frontend build, and an Express function exported from `server/vercel.ts`. Keep the framework preset set to **Other** so the repository configuration is used. Do not override the build command or output directory in the dashboard.

## 1. Provision PostgreSQL

Create a cloud PostgreSQL database (for example through the Vercel Marketplace). A `localhost` connection cannot reach your computer from Vercel. Use the provider's connection string and TLS requirements; a pooled connection is suitable for runtime traffic. Never commit passwords or `.env`.

## 2. Initialize the cloud database

In a separate terminal, set `DATABASE_URL` to the cloud connection string and `DATABASE_SSL=true` if the provider requires verified TLS. Set these as terminal environment variables so your local `.env` can remain unchanged. Then run:

```powershell
npm.cmd run migrate
npm.cmd run admin:create
```

The administrator command prompts for your email and password. There is no default login. Migrations create the schema; they do not copy your local database content. Existing content needs a deliberate PostgreSQL export/import. Existing disk images can be imported into their current database with `npm.cmd run uploads:import` before transferring that database. Do not run demo seed scripts against the live database.

## 3. Import GitHub into Vercel

Push the repository to GitHub, then choose **Add New → Project → Import** in Vercel. Use Node.js **24.x**. Configure these variables for Production before deploying:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Cloud PostgreSQL connection string |
| `DATABASE_SSL` | `true` when required by your provider |
| `SESSION_SECRET` | Random secret of at least 32 characters |
| `SITE_URL` | Exact HTTPS production origin, without a trailing slash |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` for Vercel's proxy; verify forwarded client IPs after deployment |
| `DB_POOL_MAX` | Start with `2`; stay within the database provider's connection limit |
| `RESUME_MAX_MB` | `3`, to leave room under Vercel's request body limit |

Configure SMTP variables only if email delivery is needed. Generate a session secret locally with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"` and enter it directly in Vercel settings.

If the final domain changes, update `SITE_URL` and redeploy. Preview deployments need a separate test database and an exact matching `SITE_URL`; production origin checks intentionally reject writes from other domains.

## 4. Validate the deployment

Check the homepage, `/admin`, `/api/site`, an enquiry submission, administrator login, image upload and a recruitment application. Images uploaded through the application and private PDF resumes are stored in PostgreSQL, so they survive deployment. Local `uploads/` files are excluded from deployment.

Vercel Functions have a 4.5 MB request/response payload limit. Keep the entire multipart upload below that limit; upload one small image at a time. Larger uploads require a direct object-storage upload flow. Existing application rate limits use instance memory and are not a shared limit across Vercel instances; configure platform firewall rules for stronger cross-instance protection.

Migration and admin setup commands run manually against the intended database, not on every preview build. Schedule `npm run careers:purge` through a trusted external runner if automatic recruitment retention cleanup is required.

Reference: https://vercel.com/docs/frameworks/backend/express
Reference: https://vercel.com/docs/functions/limitations
