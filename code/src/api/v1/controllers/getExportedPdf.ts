// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Readable } from "stream";
import { Request, Response } from "express";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import archiver from "archiver";

export const getExportedPdfController = () => {
  const persistenceHandler = new ImagesPersistenceHandler("exported-pdf");

  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const pdfId = req.params.pdfId as string;

    const responseType: string = (req.query.responseType as string) ?? "blob";

    const fileName = `${roomId}/${pdfId}`;

    if (!(await persistenceHandler.exists(fileName))) {
      res
        .status(404)
        .json({ status: "KO", message: "Exported pdf doesn't exist" });
      return;
    }

    const { response, mimeType } = await persistenceHandler.fetch(fileName);

    if (response && response.readableStreamBody) {
      const fileExtension = ".pdf";

      if (responseType === "blob") {
        // Setting headers for the response
        res.set("Cache-Control", "public, max-age=86400"); // 1 day
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="render${fileExtension}"`,
        );
        response.readableStreamBody.pipe(res);

        return;
      }

      if (responseType === "zip") {
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", "attachment; filename=export.zip");

        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.pipe(res);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        archive.append(response.readableStreamBody as any, {
          name: `render${fileExtension}`,
        });

        // Finalize ZIP
        archive.finalize();
        return;
      }

      const chunks: Uint8Array[] = [];

      for await (const chunk of response.readableStreamBody as Readable) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      res.status(200).json({
        url: `data:${mimeType};base64,${buffer.toString("base64")}`,
      });
    } else {
      res.status(500).json({ status: "KO", message: "Error downloading pdf" });
    }
  };
};
