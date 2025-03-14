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

    const { response: downloadResponse, mimeType } = await persistenceHandler.fetch(fileName);

    res.writeHead(200, { "Content-Type": mimeType ?? "application/octet-stream" });
    res.status(200).send(downloadResponse);
  };
}
