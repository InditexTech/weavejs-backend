import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";

export const postUploadImageController = () => {
  const persistenceHandler = new ImagesPersistenceHandler()

  return async (req: Request, res: Response) => {
    const file = req.file;

    const roomId = req.params.roomId;
    const mimeType = file?.mimetype ?? "application/octet-stream";
    const data = file?.buffer ?? new Uint8Array();
    
    const fileName = `${roomId}/${uuidv4()}`;

    
    if (await persistenceHandler.exists(fileName)) {
      res.status(500).json({ status: "KO", message: "Image already exists" });
      return;
    }

    await persistenceHandler.persist(fileName, mimeType, data);

    res.status(201).json({ status: "Image created OK", fileName, mimeType });
  };
}
