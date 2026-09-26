import express from "express";
import { connectToDatabase } from "../config/database";
import chatRoutes from "../routes/chat.routes";
import { errorHandler, notFoundHandler, setupProcessHandlers } from "../middleware/error.middleware";

setupProcessHandlers("chat");

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use("/", chatRoutes);


app.get("/health", (_, res) => {
    res.status(200).json({
        service: "chat",
        status: "ok"
    });
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 4002);

async function startServer() {
    try {
        await connectToDatabase();
        const server = app.listen(PORT, () => {
            console.log(`Chat service running on http://localhost:${PORT}`);
        });
        server.on("error", (err) => {
            console.error("Chat service failed to start:", err);
            process.exit(1);
        });
    } catch (error) {
        console.error("Failed to start chat service:", error);
        process.exit(1);
    }
}

startServer();
