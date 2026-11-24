// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import {
  getRooms,
  getTotalRooms,
  ROOM_SORT_FIELDS,
  RoomSortField,
  RoomSortOrder,
} from "@/database/controllers/room.js";
import { RoomKind } from "@/database/models/room.js";

export const getRoomsController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const limit: string = (req.query.limit as string) ?? "20";
    const offset: string = (req.query.offset as string) ?? "0";
    let name: string | undefined = undefined;
    if (req.query.name) {
      name = req.query.name as string;
    }
    let kind: RoomKind | undefined = "showcase";
    if (req.query.kind) {
      kind = req.query.kind as RoomKind;
    }
    let status: string | undefined = undefined;
    if (req.query.status) {
      status = req.query.status as string;
    }

    const sortParam = req.query.sort as string | undefined;
    const sort = ROOM_SORT_FIELDS.find((field) => field === sortParam) as
      RoomSortField | undefined;
    if (sortParam !== undefined && !sort) {
      res.status(400).json({
        error: `Invalid sort, expected one of: ${ROOM_SORT_FIELDS.join(", ")}`,
      });
      return;
    }
    const orderParam = (req.query.order as string | undefined)?.toLowerCase();
    if (
      orderParam !== undefined &&
      orderParam !== "asc" &&
      orderParam !== "desc"
    ) {
      res.status(400).json({ error: "Invalid order, expected asc or desc" });
      return;
    }
    const order = orderParam as RoomSortOrder | undefined;

    const total = await getTotalRooms({
      userId: req.session.user.id,
      name,
      kind,
      status,
    });

    const rooms = await getRooms(
      {
        userId: req.session.user.id,
        name,
        kind,
        status,
      },
      {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        sort,
        order,
      },
    );

    res.status(200).json({ items: rooms, total });
  };
};
