import express from "express";
import {connectToDatabase} from "../config/database";
import agentRoutes from "../routes/agent.route";

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

app.listen(PORT, () => {
  console.log(`Agent service running on http://localhost:${PORT}`);
  connectToDatabase();
});