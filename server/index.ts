import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  handleGenerateCSR,
  handleComplianceCSID,
  handleProductionCSID,
  handleComplianceCheck,
  handleReport,
  handleClear,
} from "./routes/zatca";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // ZATCA (الفاتورة الإلكترونية) — كل هذه المسارات تعمل بوضع Sandbox افتراضياً
  app.post("/api/zatca/csr", handleGenerateCSR);
  app.post("/api/zatca/onboarding/compliance", handleComplianceCSID);
  app.post("/api/zatca/onboarding/production", handleProductionCSID);
  app.post("/api/zatca/compliance-check", handleComplianceCheck);
  app.post("/api/zatca/report", handleReport);
  app.post("/api/zatca/clear", handleClear);

  return app;
}
