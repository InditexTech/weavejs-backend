import { Request, Response } from "express";

export const getHealthController = () => (req: Request, res: Response) => {
  return res.status(200).json({ status: "OK" });
};
