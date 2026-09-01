import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleEmployeeExcelTemplate } from "./routes/excel-template";
import {
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
  app.get("/api/hr/employee-template", handleEmployeeExcelTemplate);
  app.get("/hr/employee-template", handleEmployeeExcelTemplate);

  // ZATCA invoice relays. Secure onboarding runs only in the authenticated Edge Function.
  app.post("/api/zatca/compliance-check", handleComplianceCheck);
  app.post("/api/zatca/report", handleReport);
  app.post("/api/zatca/clear", handleClear);

  return app;
}
