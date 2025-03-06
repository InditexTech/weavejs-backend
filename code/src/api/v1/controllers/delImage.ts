import { Request, Response } from "express";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";

export const delImageController = () => {
  const persistenceHandler = new ImagesPersistenceHandler()

  return async (req: Request, res: Response) => {
    const fileName = req.params.imageId;

    const result = await persistenceHandler.delete(fileName);

    if (result) {
      res.status(200).json({ status: "KO", message: "Image deleted" });
      return;
    }

    res.status(404).json({ status: "KO", message: "Image not found" });
  };
}
