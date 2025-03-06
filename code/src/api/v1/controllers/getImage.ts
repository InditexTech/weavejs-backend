import { Request, Response } from "express";

export const getImageController = () => (req: Request, res: Response) => {
  res.status(200).json({ status: "OK" });
};
