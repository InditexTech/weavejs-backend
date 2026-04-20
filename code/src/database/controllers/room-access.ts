// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  RoomAccessAttributes,
  RoomAccessIdentifier,
  RoomAccessModel,
} from "../models/room-access.js";

export const getRoomAccess = async ({
  id,
}: RoomAccessIdentifier): Promise<RoomAccessModel | null> => {
  const page = await RoomAccessModel.findOne({
    where: {
      id,
    },
    attributes: [
      "id",
      "roomId",
      "userId",
      "code",
      "validUntilUTC",
      "createdAt",
      "updatedAt",
    ],
  });
  return page;
};

export const createRoomAccess = async (
  roomAccessData: RoomAccessAttributes,
): Promise<RoomAccessModel> => {
  const newRoomAccess = await RoomAccessModel.create(roomAccessData);

  return newRoomAccess;
};

export const deleteRoomAccess = async ({
  id,
}: RoomAccessIdentifier): Promise<number> => {
  const affected = await RoomAccessModel.destroy({
    where: {
      id,
    },
  });

  return affected;
};
