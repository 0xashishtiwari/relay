import express from "express";
import {connectToDatabase} from "../config/database";
import chatRoutes from "../routes/chat.routes";

const app = express();

app.use(express.json());
app.use("/", chatRoutes);


app.get("/health", (_, res) => {
    res.status(200).json({
        service: "chat",
        status: "ok"
    });
});


const PORT = Number(process.env.PORT);

app.listen(PORT, () => {
  console.log(`Chat service running on http://localhost:${PORT}`);
  connectToDatabase();
});