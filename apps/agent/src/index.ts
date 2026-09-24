import express from "express";
import { connectToDatabase } from "../config/database";
import agentRoutes from "../routes/agent.route";
import { initializeStorage } from "../config/storage/storage";

const app = express();

app.use(express.json());


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


const PORT = Number(process.env.PORT);


async function startServer() {
    await initializeStorage();
    await connectToDatabase();
    app.listen(PORT, () => {
        console.log(`Agent service is running on port ${PORT}`);
    });
}


startServer().catch((error) => {
    console.error("Failed to start the server:", error);
    process.exit(1);
});