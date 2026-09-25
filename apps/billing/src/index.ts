import express from "express";
// import cookieParser from "cookie-parser";
import {connectToDatabase} from "../config/database"
import billingRoutes from "../routes/billing.route";

const app = express();

app.use(express.json());
// app.use(cookieParser());

app.get("/health", (_, res) => {
    res.status(200).json({
        service: "billing",
        status: "ok"
    });
});
app.use("/", billingRoutes);
app.get("/" , (_, res) => {
    res.status(200).json({
        service: "billing",
        status: "ok"
    });
});

const PORT = Number(process.env.PORT);


async function startServer() {
  try {
    await connectToDatabase();
    app.listen(PORT, () => {
      console.log(`Billing service running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exit(1);
  }
}

startServer();