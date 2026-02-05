// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { Request, Response } from "express";
import archiver from "archiver";
import { getServiceConfig } from "../../../config/config.js";
import { runWorker } from "../../../workers/workers.js";
import { ExportToImageWorkerResult } from "./workers/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const payloadSchema = z.object({
  roomData: z.string().base64(),
  pages: z
    .array(z.object({ title: z.string(), nodes: z.array(z.string()) }))
    .optional()
    .default([]),
  options: z.object({
    backgroundColor: z.string().optional().default("transparent"),
    padding: z.number().min(0).optional().default(20),
    pixelRatio: z.number().min(1).optional().default(1),
  }),
  responseType: z.enum(["base64", "blob", "zip"]).optional().default("blob"),
});

export const postExportToPDFController = () => {
  const config = getServiceConfig();

  return async (req: Request, res: Response): Promise<void> => {
    const parsedBody = payloadSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ errors: parsedBody.error.errors });
      return;
    }

    try {
      const result = await runWorker<
        ExportToImageWorkerResult | { error: { name: string; message: string } }
      >(path.join(__dirname, "./workers/exportToPDF.js"), {
        ...parsedBody.data,
        config,
      });

      let hasError = false;
      try {
        const buf = Buffer.from(result as Buffer);
        const data = JSON.parse(buf.toString("utf8"));
        if (data.error) {
          hasError = true;
        }
      } catch {
        // not JSON, all good
      }

      if (hasError) {
        throw new Error("Export failed in worker");
      }

      const finalBuffer = result as Buffer;

      // success
      const fileExtension = ".pdf";

      if (parsedBody.data.responseType === "zip") {
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", "attachment; filename=export.zip");

        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.pipe(res);

        archive.append(Buffer.from(finalBuffer), {
          name: `render${fileExtension}`,
        });

        // Finalize ZIP
        archive.finalize();
        return;
      }

      if (parsedBody.data.responseType === "blob") {
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="render${fileExtension}"`,
        );

        res.status(200).send(Buffer.from(finalBuffer));
        return;
      }

      res.status(200).json({
        url: `data:application/pdf;base64,${Buffer.from(finalBuffer).toString("base64")}`,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Error processing image" });
    }
  };
};
