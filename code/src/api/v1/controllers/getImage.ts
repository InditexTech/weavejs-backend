import { Request, Response } from "express";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";

export const getImageController = () => {
  const persistenceHandler = new ImagesPersistenceHandler()
  
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const imageId = req.params.imageId;

    const fileName = `${roomId}/${imageId}`;

    if (!await persistenceHandler.exists(fileName)) {
      res.status(404).json({ status: "KO", message: "Image doesn't exists" });
      return 
    }

    const { buffer, mimeType } = await persistenceHandler.fetch(fileName);

    if (buffer) {
      // Setting headers for the response
      res.setHeader("Content-Type", mimeType ?? "application/octet-stream");
      
      res.send(buffer);
    } else {
      res.status(500).json({ status: "KO", message: "Error downloading image" });
    }
  };
}
