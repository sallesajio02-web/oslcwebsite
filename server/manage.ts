import { pool, query } from "./db.js";
import { readdir, readFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
async function run() {
  const command = process.argv[2];
  if (command === "careers-purge") {
    const days = Math.max(
      1,
      Math.min(3650, Number(process.env.RECRUITMENT_RETENTION_DAYS) || 180),
    );
    const r = await query(
      "DELETE FROM job_applications WHERE created_at < now() - ($1::int * interval '1 day') RETURNING id",
      [days],
    );
    console.log(
      `Deleted ${r.rowCount} expired applications and their resumes/history under the ${days}-day retention policy.`,
    );
  } else if (command === "migrate") {
    const c = await pool.connect();
    try {
      await c.query("SELECT pg_advisory_lock(727634)");
      await c.query(
        "CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
      );
      for (const file of (await readdir("migrations"))
        .filter((f) => f.endsWith(".sql"))
        .sort()) {
        if (
          (
            await c.query("SELECT 1 FROM schema_migrations WHERE name=$1", [
              file,
            ])
          ).rowCount
        )
          continue;
        await c.query("BEGIN");
        try {
          await c.query(await readFile("migrations/" + file, "utf8"));
          await c.query("INSERT INTO schema_migrations(name) VALUES($1)", [
            file,
          ]);
          await c.query("COMMIT");
          console.log("Applied " + file);
        } catch (e) {
          await c.query("ROLLBACK");
          throw e;
        }
      }
    } finally {
      await c.query("SELECT pg_advisory_unlock(727634)");
      c.release();
    }
  } else if (command === "admin") {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const email = (await rl.question("Administrator email: "))
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error("Valid email required");
    rl.close();
    if (!process.stdin.isTTY)
      throw new Error("Use an interactive terminal for secure password entry");
    process.stdout.write("Password (12+ characters; hidden): ");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    let password = "";
    await new Promise<void>((resolve, reject) => {
      const listener = (data: Buffer) => {
        for (const ch of data.toString()) {
          if (ch === "\u0003") {
            process.stdin.off("data", listener);
            reject(new Error("Cancelled"));
            return;
          }
          if (ch === "\r" || ch === "\n") {
            process.stdin.off("data", listener);
            resolve();
            return;
          }
          if (ch === "\u007f" || ch === "\b") password = password.slice(0, -1);
          else password += ch;
        }
      };
      process.stdin.on("data", listener);
    }).finally(() => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    });
    if (password.length < 12 || password.length > 128)
      throw new Error("Password must be 12–128 characters");
    await query("INSERT INTO admins(email,password_hash) VALUES($1,$2)", [
      email,
      await bcrypt.hash(password, 12),
    ]);
    console.log("Administrator created.");
  } else if (command === "seed") {
    await query(
      "INSERT INTO categories(name,slug,description,published) VALUES('Men’s trousers','mens-trousers','Demonstration category. Confirm OSLC product range before publishing.',false) ON CONFLICT DO NOTHING",
    );
    const c = await query(
      "SELECT id FROM categories WHERE slug='mens-trousers'",
    );
    await query(
      "INSERT INTO products(category_id,name,slug,sku,description,demo,published) VALUES($1,'Demonstration trouser — replace before publishing','demo-trouser','DEMO-001','Demonstration record only. Add real product images and confirmed specifications.',true,false) ON CONFLICT DO NOTHING",
      [c.rows[0].id],
    );
    console.log("Demonstration data created as unpublished drafts.");
  } else throw new Error("Use migrate, admin or seed");
}
run()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
