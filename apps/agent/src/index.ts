import express from "express";
import { connectToDatabase } from "../config/database";
import agentRoutes from "../routes/agent.route";
import { initializeStorage } from "../config/storage/storage";
import { errorHandler, notFoundHandler, setupProcessHandlers } from "../middleware/error.middleware";

setupProcessHandlers("agent");

const app = express();

app.use(express.json({ limit: "15mb" }));


app.use(agentRoutes);


app.get("/health", (_, res) => {
    res.status(200).json({
        service: "agent",
        status: "ok"
    });
});


app.get("/", (_, res) => {
    res.status(200).json({
        message: "Welcome to the Agent Service!"
    });
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 4004);


async function startServer() {
    try {
        if (!process.env.CHAT_SERVICE_URL) {
            throw new Error("Missing required environment variable: CHAT_SERVICE_URL");
        }
        await initializeStorage();
        await connectToDatabase();
        const server = app.listen(PORT, () => {
            console.log(`Agent service is running on port ${PORT}`);
        });
        server.on("error", (err) => {
            console.error("Agent service failed to start:", err);
            process.exit(1);
        });
    } catch (error) {
        console.error("Failed to start the server:", error);
        process.exit(1);
    }
}


startServer();
