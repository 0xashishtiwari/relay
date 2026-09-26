import express from "express";
import cookieParser from "cookie-parser";
import { connectToDatabase } from "../config/database";
import authRoutes from "../routes/auth.route";
import { errorHandler, notFoundHandler, setupProcessHandlers } from "../middleware/error.middleware";

setupProcessHandlers("auth");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use("/", authRoutes);

app.get("/health", (_, res) => {
    res.status(200).json({
        service: "auth",
        status: "ok"
    });
});

app.get("/", (_, res) => {
    res.status(200).json({
        service: "auth",
        status: "ok"
    });
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 4001);

async function startServer() {
    try {
        await connectToDatabase();
        const server = app.listen(PORT, () => {
            console.log(`Auth service running on http://localhost:${PORT}`);
        });
        server.on("error", (err) => {
            console.error("Auth service failed to start:", err);
            process.exit(1);
        });
    } catch (error) {
        console.error("Failed to start auth service:", error);
        process.exit(1);
    }
}

startServer();
