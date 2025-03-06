import { Request, Response } from "express";

export const delImageController = () => (req: Request, res: Response) => {
  res.status(200).json({ status: "OK" });
};
