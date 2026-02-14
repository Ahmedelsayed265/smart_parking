import dotenv from "dotenv";
import app from "./src/app.js";

dotenv.config();

if (process.env.RUN_DB_SETUP === "true") {
  import("./setup-database.js").then((mod) => {
    if (mod && typeof mod.setupDatabase === "function") {
      mod.setupDatabase().catch((err) => {
        console.error("Database setup failed during startup:", err && err.message ? err.message : err);
      });
    }
  }).catch((err) => console.error("Failed to import setup-database:", err));
}

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
