import express from "express";
import {connectToDatabase} from "../config/database";
import authRoutes from "../routes/auth.route";

const app = express();

app.use(express.json());
app.use("/", authRoutes);

app.get("/health", (_, res) => {
    res.status(200).json({
        service: "auth",
        status: "ok"
    });
});

app.get("/" , (_, res) => {
    res.status(200).json({
        service: "auth",
        status: "ok"
    });
});

const PORT = Number(process.env.PORT);

app.listen(PORT, () => {
  console.log(`Auth service running on http://localhost:${PORT}`);
  connectToDatabase();
});