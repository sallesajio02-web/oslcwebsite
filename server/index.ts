import { app } from "./app.js";
import { pool } from "./db.js";
const server = app.listen(Number(process.env.PORT || 3001), "127.0.0.1", () =>
  console.log("OSLC API: http://127.0.0.1:" + (process.env.PORT || 3001)),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    }),
  );
