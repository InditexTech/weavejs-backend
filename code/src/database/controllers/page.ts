// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Op } from "sequelize";
import { PageAttributes, PageIdentifier, PageModel } from "../models/page.js";

export const getRoomAllPages = async ({
  roomId,
  status,
}: {
  roomId: string;
  status?: string;
}): Promise<PageModel[]> => {
  return PageModel.findAll({
    where: {
      roomId,
      ...(status && { status }),
    },
    order: [["position", "ASC"]],
    attributes: [
      "roomId",
      "pageId",
      "name",
      "status",
      "position",
      "createdAt",
      "updatedAt",
    ],
  });
};

export const getRoomPages = async (
  {
    roomId,
    status,
  }: {
    roomId: string;
    status?: string;
  },
  {
    limit = 20,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  },
): Promise<PageModel[]> => {
  return PageModel.findAll({
    where: {
      roomId,
      ...(status && { status }),
    },
    order: [["position", "ASC"]],
    attributes: [
      "roomId",
      "pageId",
      "name",
      "status",
      "position",
      "createdAt",
      "updatedAt",
    ],
    limit,
    offset,
  });
};

export const getTotalRoomPages = async ({
  roomId,
  status,
}: {
  roomId: string;
  status?: string;
}): Promise<number> => {
  return PageModel.count({
    where: {
      roomId,
      ...(status && { status }),
    },
  });
};

export const getPage = async ({
  roomId,
  pageId,
}: PageIdentifier): Promise<PageModel | null> => {
  const page = await PageModel.findOne({
    where: {
      roomId,
      pageId,
      status: "active",
    },
    attributes: [
      "roomId",
      "pageId",
      "name",
      "status",
      "position",
      "createdAt",
      "updatedAt",
    ],
  });

  return page;
};

export const getPageIndex = async ({
  roomId,
  pageId,
}: PageIdentifier): Promise<number> => {
  const page = await getPage({
    roomId,
    pageId,
  });

  if (!page) {
    return -1;
  }

  const count = await PageModel.count({
    where: {
      roomId,
      status: "active",
      position: {
        [Op.lt]: page.position,
      },
    },
  });

  return count + 1;
};

export const getPageByIndex = async ({
  roomId,
  index,
}: {
  roomId: string;
  index: number;
}): Promise<PageModel | null> => {
  const page = await PageModel.findOne({
    where: {
      roomId,
      status: "active",
    },
    order: [["position", "ASC"]],
    offset: index - 1,
    limit: 1,
    attributes: [
      "roomId",
      "pageId",
      "name",
      "status",
      "position",
      "createdAt",
      "updatedAt",
    ],
  });
  return page;
};

export const getLastPageRoom = async ({
  roomId,
}: {
  roomId: string;
}): Promise<PageModel | null> => {
  const page = await PageModel.findOne({
    where: {
      roomId,
      status: "active",
    },
    order: [["position", "DESC"]],
    attributes: [
      "roomId",
      "pageId",
      "name",
      "status",
      "position",
      "createdAt",
      "updatedAt",
    ],
  });
  return page;
};

export const createPage = async (
  pageData: PageAttributes,
): Promise<PageModel> => {
  const newPage = await PageModel.create(pageData);

  return newPage;
};

export const updatePage = async (
  { roomId, pageId }: PageIdentifier,
  pageData: Partial<PageAttributes>,
): Promise<number> => {
  const affected = await PageModel.update(pageData, {
    where: {
      roomId,
      pageId,
    },
  });

  return affected[0];
};

export const deletePage = async ({
  roomId,
  pageId,
}: PageIdentifier): Promise<number> => {
  const affected = await PageModel.destroy({
    where: {
      roomId,
      pageId,
    },
  });

  return affected;
};
