import dotenv from "dotenv";
import app from "./src/app.js"
import "./setup-database.js";
dotenv.config();

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
