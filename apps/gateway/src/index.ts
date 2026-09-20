import express from "express";
import proxy from "express-http-proxy";
import cors from "cors";
import cokkieParser from "cookie-parser";
const app = express();

app.use(express.json());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(cokkieParser());    

app.use('/auth' , proxy(process.env.AUTH_SERVICE_URL as string, {
   
}));

app.use("/health", (_, res) => {
    res.status(200).json({
        service: "gateway",
        status: "ok"
    })
})

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