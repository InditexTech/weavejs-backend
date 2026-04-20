// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Op, Sequelize } from "sequelize";
import { RoomUserModel } from "../models/room-user.js";
import {
  RoomAttributes,
  RoomModel,
  RoomIdentifier,
  RoomKind,
} from "../models/room.js";
import { PageModel } from "../models/page.js";

export const getRooms = async (
  {
    userId,
    name,
    kind,
    status,
  }: {
    userId: string;
    name?: string;
    kind?: RoomKind;
    status?: string;
  },
  {
    limit = 20,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  },
): Promise<RoomModel[]> => {
  return RoomModel.findAll({
    include: [
      {
        model: PageModel,
        attributes: [],
        required: false,
      },
      {
        model: RoomUserModel,
        required: true,
        subQuery: false,
        where: {
          userId,
        },
        attributes: ["userId", "role"],
      },
    ],
    where: {
      ...(name && { name: { [Op.iLike]: `%${name}%` } }),
      ...(status && { status }),
      ...(kind && { kind }),
    },
    order: [["updatedAt", "ASC"]],
    attributes: {
      include: [
        "roomId",
        "status",
        "kind",
        "name",
        [
          Sequelize.literal(`(
          SELECT COUNT(*)
          FROM weavejs_page pm
          WHERE pm."roomId" = "RoomModel"."roomId" AND pm.status = 'active'
        )`),
          "pages",
        ],
        "createdAt",
        "updatedAt",
      ],
    },
    limit,
    offset,
  });
};

export const getTotalRooms = async ({
  userId,
  name,
  kind,
  status,
}: {
  userId: string;
  name?: string;
  kind?: RoomKind;
  status?: string;
}): Promise<number> => {
  return RoomModel.count({
    include: [
      {
        model: RoomUserModel,
        where: {
          userId,
        },
        attributes: [],
      },
    ],
    where: {
      ...(name && { name: { [Op.iLike]: `%${name}%` } }),
      ...(status && { status }),
      ...(kind && { kind }),
    },
  });
};

export const getRoom = async ({
  roomId,
}: RoomIdentifier): Promise<RoomModel | null> => {
  const page = await RoomModel.findOne({
    include: [
      {
        model: PageModel,
        attributes: [],
        required: false,
      },
    ],
    where: {
      roomId,
    },
    attributes: [
      "roomId",
      "status",
      "kind",
      "name",
      [
        Sequelize.literal(`(
          SELECT COUNT(*)
          FROM weavejs_page pm
          WHERE pm."roomId" = "RoomModel"."roomId" AND pm.status = 'active'
        )`),
        "pages",
      ],
      "createdAt",
      "updatedAt",
    ],
  });
  return page;
};

export const createRoom = async (
  roomData: RoomAttributes,
): Promise<RoomModel> => {
  const newRoom = await RoomModel.create(roomData);

  return newRoom;
};

export const updateRoom = async (
  { roomId }: RoomIdentifier,
  roomData: Partial<RoomAttributes>,
): Promise<number> => {
  const affected = await RoomModel.update(roomData, {
    where: {
      roomId,
    },
  });

  return affected[0];
};

export const deleteRoom = async ({
  roomId,
}: RoomIdentifier): Promise<number> => {
  const affected = await RoomModel.destroy({
    where: {
      roomId,
    },
  });

  return affected;
};
