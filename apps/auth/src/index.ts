import express from "express";
import {connectToDatabase} from "../config/database";
import _default from './../../../node_modules/.bun/@mongodb-js+saslprep@1.5.4/node_modules/@mongodb-js/saslprep/dist/code-points-data.d';

const app = express();

app.use(express.json());

app.get("/health", (_, res) => {
    res.status(200).json({
        service: "auth",
        status: "ok"
    });
});

app.get("/" , (_, res) => {
    res.status(200).json({
        service: "auth",
        status: "ok"
    });
});

const PORT = Number(process.env.PORT);

app.listen(PORT, () => {
  console.log(`Auth service running on http://localhost:${PORT}`);
  connectToDatabase();
});