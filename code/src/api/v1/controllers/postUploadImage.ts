import { Request, Response } from "express";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";

export const postUploadImageController = () => {
  const persistenceHandler = new ImagesPersistenceHandler()

  return async (req: Request, res: Response) => {
    const file = req.file;

    const fileName = file?.originalname ?? "undefined";
    const mimeType = file?.mimetype ?? "application/octet-stream";
    const data = file?.buffer ?? new Uint8Array();

    if (await persistenceHandler.exists(fileName)) {
      res.status(500).json({ status: "KO", message: "Image already exists" });
      return;
    }

    await persistenceHandler.persist(fileName, mimeType, data);

    res.status(201).json({ status: "Image created OK", fileName, mimeType });
  };
}
