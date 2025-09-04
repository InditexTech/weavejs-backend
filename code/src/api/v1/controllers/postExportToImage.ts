// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { Request, Response } from "express";
import sharp from "sharp";
import archiver from "archiver";
import { renderWeaveRoom } from "../../../canvas/weave.js";
import { WeaveExportFormats } from "@inditextech/weave-types";

const WeaveExportFormatsSchema: z.ZodType<WeaveExportFormats> = z.enum([
  "image/png",
  "image/jpeg",
]);

const payloadSchema = z.object({
  roomData: z.string().base64(),
  nodes: z.array(z.string()).optional().default([]),
  options: z.object({
    format: WeaveExportFormatsSchema.optional().default("image/png"),
    backgroundColor: z.string().optional().default("transparent"),
    padding: z.number().min(0).optional().default(20),
    pixelRatio: z.number().min(1).optional().default(1),
    quality: z.number().min(0).max(1).optional().default(1),
  }),
  responseType: z.enum(["blob", "zip"]).optional().default("blob"),
});

export const postExportToImageController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const parsedBody = payloadSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ errors: parsedBody.error.errors });
      return;
    }

    const { instance, destroy } = await renderWeaveRoom(
      parsedBody.data.roomData
    );

    // const dataURL = await instance.exportNodesAsDataURL(
    //   parsedBody.data.nodes,
    //   (nodes) => nodes,
    //   {
    //     format: parsedBody.data.options.format as WeaveExportFormats,
    //     padding: parsedBody.data.options.padding,
    //     pixelRatio: parsedBody.data.options.pixelRatio,
    //     backgroundColor: parsedBody.data.options.backgroundColor,
    //     quality: parsedBody.data.options.quality, // Only used for image/jpeg
    //   }
    // );

    const { composites, width, height } = await instance.exportNodesAsBuffer(
      parsedBody.data.nodes,
      (nodes) => nodes,
      {
        format: parsedBody.data.options.format as WeaveExportFormats,
        padding: parsedBody.data.options.padding,
        pixelRatio: parsedBody.data.options.pixelRatio,
        backgroundColor: parsedBody.data.options.backgroundColor,
        quality: parsedBody.data.options.quality, // Only used for image/jpeg
      }
    );

    destroy();

    try {
      const finalImage = sharp({
        create: {
          width,
          height,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      }).composite(composites);

      const finalBuffer = await finalImage.png().toBuffer();

      const fileExtension =
        parsedBody.data.options.format.split("/")[1] === "png"
          ? ".png"
          : ".jpg";

      if (parsedBody.data.responseType === "zip") {
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", "attachment; filename=export.zip");

        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.pipe(res);

        archive.append(finalBuffer, { name: `render${fileExtension}` });

        // Finalize ZIP
        archive.finalize();
        return;
      }

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="render${fileExtension}"`
      );

      res.status(200).send(finalBuffer);
    } catch (error) {
      console.error("Error processing image:", error);
      res.status(500).json({ error: "Error processing image" });
    }
  };
};
