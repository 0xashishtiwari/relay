import express from "express";
import { connectToDatabase } from "../config/database"
import billingRoutes from "../routes/billing.route";
import { errorHandler, notFoundHandler, setupProcessHandlers } from "../middleware/error.middleware";

setupProcessHandlers("billing");

const app = express();

app.use(express.json());

app.get("/health", (_, res) => {
    res.status(200).json({
        service: "billing",
        status: "ok"
    });
});
app.use("/", billingRoutes);
app.get("/", (_, res) => {
    res.status(200).json({
        service: "billing",
        status: "ok"
    });
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 4003);


async function startServer() {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Missing required environment variables: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET");
      process.exit(1);
    }
    if (!process.env.AUTH_SERVICE_URL) {
      console.error("Missing required environment variable: AUTH_SERVICE_URL");
      process.exit(1);
    }
    await connectToDatabase();
    const server = app.listen(PORT, () => {
      console.log(`Billing service running on http://localhost:${PORT}`);
    });
    server.on("error", (err) => {
      console.error("Billing service failed to start:", err);
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exit(1);
  }
}

startServer();
