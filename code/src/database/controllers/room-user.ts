// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  RoomUserAttributes,
  RoomUserIdentifier,
  RoomUserModel,
} from "../models/room-user.js";

export const getRoomUsers = async (
  {
    roomId,
  }: {
    roomId: string;
  },
  {
    limit = 20,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  },
): Promise<RoomUserModel[]> => {
  return RoomUserModel.findAll({
    where: {
      roomId,
    },
    order: [["createdAt", "ASC"]],
    attributes: ["roomId", "userId", "role", "createdAt", "updatedAt"],
    limit,
    offset,
  });
};

export const getTotalRoomUsers = async ({
  roomId,
}: {
  roomId: string;
}): Promise<number> => {
  return RoomUserModel.count({
    where: {
      roomId,
    },
  });
};

export const getRoomUser = async ({
  roomId,
  userId,
}: RoomUserIdentifier): Promise<RoomUserModel | null> => {
  const page = await RoomUserModel.findOne({
    where: {
      roomId,
      userId,
    },
    attributes: ["roomId", "userId", "role", "createdAt", "updatedAt"],
  });
  return page;
};

export const createRoomUser = async (
  roomUserData: RoomUserAttributes,
): Promise<RoomUserModel> => {
  const newRoomUser = await RoomUserModel.create(roomUserData);

  return newRoomUser;
};

export const updateRoomUser = async (
  { roomId, userId }: RoomUserIdentifier,
  roomUserData: Partial<RoomUserAttributes>,
): Promise<number> => {
  const affected = await RoomUserModel.update(roomUserData, {
    where: {
      roomId,
      userId,
    },
  });

  return affected[0];
};

export const deleteRoomUser = async ({
  roomId,
  userId,
}: RoomUserIdentifier): Promise<number> => {
  const affected = await RoomUserModel.destroy({
    where: {
      roomId,
      userId,
    },
  });

  return affected;
};
