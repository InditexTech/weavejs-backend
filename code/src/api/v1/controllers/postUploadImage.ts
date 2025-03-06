import { Request, Response } from "express";

export const postUploadImageController =
  () => (req: Request, res: Response) => {
    res.status(200).json({ status: "OK" });
  };
