// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  ConnectionAttributes,
  ConnectionIdentifier,
  ConnectionModel,
} from "../models/connection.js";

export const getRoomConnections = async ({
  roomId,
}: {
  roomId: string;
}): Promise<ConnectionModel[]> => {
  const connections = await ConnectionModel.findAll({
    where: {
      roomId,
    },
  });
  return connections;
};

export const getConnection = async ({
  connectionId,
}: ConnectionIdentifier): Promise<ConnectionModel | null> => {
  const connection = await ConnectionModel.findOne({
    where: {
      connectionId,
    },
    attributes: ["connectionId", "roomId", "status", "createdAt", "updatedAt"],
  });
  return connection;
};

export const createConnection = async (
  connectionData: ConnectionAttributes
): Promise<ConnectionModel> => {
  const newConnection = await ConnectionModel.create(connectionData);

  return newConnection;
};

export const updateConnection = async (
  { connectionId }: ConnectionIdentifier,
  connectionData: Partial<ConnectionAttributes>
): Promise<number> => {
  const affected = await ConnectionModel.update(connectionData, {
    where: {
      connectionId,
    },
  });

  return affected[0];
};

export const deleteConnection = async ({
  connectionId,
}: ConnectionIdentifier): Promise<number> => {
  const affected = await ConnectionModel.destroy({
    where: {
      connectionId,
    },
  });

  return affected;
};
