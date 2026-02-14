import express from "express";
import modelRoutes from "./routes/model.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/model", modelRoutes);
app.use("/api/user", userRoutes);

export default app;
