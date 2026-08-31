import type { RequestHandler } from "express";

const EMPLOYEE_TEMPLATE_URL =
  "https://cdn.builder.io/o/assets%2Fce04605038104603b965d31c7c18e8db%2F436f094c89454327970ffe9bb11fdd3f?alt=media&token=06421ef6-2a54-4a30-8920-d579eea7d4ce&apiKey=ce04605038104603b965d31c7c18e8db";

export const handleEmployeeExcelTemplate: RequestHandler = async (_req, res) => {
  try {
    const upstream = await fetch(EMPLOYEE_TEMPLATE_URL);
    if (!upstream.ok) {
      return res.status(502).json({
        error: `Template provider returned HTTP ${upstream.status}`,
      });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'inline; filename="Employee_List_Professional.xlsx"',
    );
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.status(200).send(buffer);
  } catch {
    return res.status(502).json({ error: "Unable to download the employee Excel template" });
  }
};
