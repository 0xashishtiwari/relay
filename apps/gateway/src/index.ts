import express from "express";
import proxy from "express-http-proxy";
import cors from "cors";
import cokkieParser from "cookie-parser";
import protect from "../middleware/auth.middleware";
import { getCurrentUser } from "../controllers/user.controller";
import { proxyWithHeader } from "../utils/proxyWithHeader";
import morgan from "morgan";



const app = express();
app.use(express.json());
app.use(morgan("dev"));
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(cokkieParser());

app.use('/auth', proxy(process.env.AUTH_SERVICE_URL as string));

app.use('/chat', protect, proxyWithHeader(process.env.CHAT_SERVICE_URL as string));

app.use('/agent', protect, proxy(process.env.AGENT_SERVICE_URL as string));

app.use('/billing', protect, proxyWithHeader(process.env.BILLING_SERVICE_URL as string));

app.use("/health", (_, res) => {
    res.status(200).json({
        service: "gateway",
        status: "ok"
    })
})

app.get("/me", protect, getCurrentUser);
app.get("/", (_, res) => {
    res.status(200).json({
        service: "gateway",
        status: "ok"
    })
});


const PORT = Number(process.env.PORT);

app.listen(PORT, () => {
    console.log(`Gateway running on http://localhost:${PORT}`);
});