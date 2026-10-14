import express from "express";
import cors from "cors";
import { runtimeConfig } from "./config/index.js";
import apiRouter from "./routes/index.js";
import { notFound, handleError } from "./middleware/error.middleware.js";

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: runtimeConfig.clientOrigin }));
app.use("/api", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
// Allow a 10 MB original upload encoded as a data URL plus its cropped preview.
app.use(express.json({ limit: "16mb" }));
app.use("/api", apiRouter, notFound);
app.use(handleError);

export { app };
