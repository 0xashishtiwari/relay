import express from "express";
import {connectToDatabase} from "../config/database";

const app = express();

app.use(express.json());



app.get("/health", (_, res) => {
    res.status(200).json({
        service: "agent",
        status: "ok"
    });
});

app.get("/" , (_, res) => {
    res.status(200).json({
        service: "agent",
        status: "ok"
    });
});

const PORT = Number(process.env.PORT);

app.listen(PORT, () => {
  console.log(`Agent service running on http://localhost:${PORT}`);
  connectToDatabase();
});