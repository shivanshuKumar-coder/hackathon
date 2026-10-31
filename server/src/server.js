import { app } from "./app.js";
import { connectDb } from "./config/db.js";
import { config } from "./config/env.js";
import { startBillingJob } from "./jobs/billing.job.js";
import { startExpiryJob } from "./jobs/expiry.job.js";
import { ensureAdmin } from "./services/user.service.js";

await connectDb();
await ensureAdmin();
startBillingJob();
startExpiryJob();

// Express 5 also calls this callback when listening fails (e.g. port already in use).
app.listen(config.port, (err) => {
  if (err) {
    console.error(`Could not start on port ${config.port}: ${err.message}`);
    process.exit(1);
  }
  console.log(`API running on http://localhost:${config.port}`);
});
