import { Request, Response } from "express";
import { getRoomsEventHandler } from "../../../middlewares/rooms.js";

export const getRoomConnectController =
  () => async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;

    const url = await getRoomsEventHandler().getClientConnectionUrl(roomId);

    res.status(200).json({ url });
  };
