// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Op } from "sequelize";
import {
  TemplateAttributes,
  TemplateIdentifier,
  TemplateModel,
} from "../models/template.js";

export const getRoomTemplates = async (
  {
    roomId,
    since,
    kind,
    imageSlots,
  }: {
    roomId: string;
    since?: Date;
    kind?: string;
    imageSlots?: number;
  },
  {
    limit = 20,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  },
): Promise<TemplateModel[]> => {
  return TemplateModel.findAll({
    where: {
      roomId,
      ...(kind && { kind }),
      ...(imageSlots && { imageSlots: { [Op.gte]: imageSlots } }),
      ...(since && { updatedAt: { [Op.gte]: since } }),
    },
    order: [["updatedAt", "DESC"]],
    attributes: [
      "roomId",
      "templateId",
      "status",
      "name",
      "kind",
      "imageSlots",
      "linkedNodeType",
      "templateImage",
      "templateData",
      "jobId",
      "removalJobId",
      "removalStatus",
      "createdAt",
      "updatedAt",
    ],
    limit,
    offset,
  });
};

export const getTotalRoomTemplates = async ({
  roomId,
  since,
  kind,
  imageSlots,
}: {
  roomId: string;
  since?: Date;
  kind?: string;
  imageSlots?: number;
}): Promise<number> => {
  return TemplateModel.count({
    where: {
      roomId,
      ...(kind && { kind }),
      ...(imageSlots && { imageSlots: { [Op.gte]: imageSlots } }),
      ...(since && { updatedAt: { [Op.gte]: since } }),
    },
  });
};

export const getRoomFrameTemplates = async ({
  roomId,
  since,
}: {
  roomId: string;
  since?: Date;
}): Promise<TemplateModel[]> => {
  return TemplateModel.findAll({
    where: {
      roomId,
      linkedNodeType: "frame",
      ...(since && { updatedAt: { [Op.gte]: since } }),
    },
    order: [["updatedAt", "DESC"]],
    attributes: [
      "roomId",
      "templateId",
      "status",
      "name",
      "kind",
      "imageSlots",
      "linkedNodeType",
      "templateImage",
      "templateData",
      "jobId",
      "removalJobId",
      "removalStatus",
      "createdAt",
      "updatedAt",
    ],
  });
};

export const getTotalRoomFrameTemplates = async ({
  roomId,
  since,
}: {
  roomId: string;
  since?: Date;
  kind?: string | null;
}): Promise<number> => {
  return TemplateModel.count({
    where: {
      roomId,
      linkedNodeType: "frame",
      ...(since && { updatedAt: { [Op.gte]: since } }),
    },
  });
};

export const getTemplate = async ({
  roomId,
  templateId,
}: TemplateIdentifier): Promise<TemplateModel | null> => {
  const template = await TemplateModel.findOne({
    where: {
      roomId,
      templateId,
    },
    attributes: [
      "roomId",
      "templateId",
      "status",
      "name",
      "kind",
      "imageSlots",
      "linkedNodeType",
      "templateImage",
      "templateData",
      "jobId",
      "removalJobId",
      "removalStatus",
      "createdAt",
      "updatedAt",
    ],
  });
  return template;
};

export const createTemplate = async (
  templateData: TemplateAttributes,
): Promise<TemplateModel> => {
  const newTemplate = await TemplateModel.create(templateData);

  return newTemplate;
};

export const updateTemplate = async (
  { roomId, templateId }: TemplateIdentifier,
  templateData: Partial<TemplateAttributes>,
): Promise<number> => {
  const affected = await TemplateModel.update(templateData, {
    where: {
      roomId,
      templateId,
    },
  });

  return affected[0];
};

export const deleteTemplate = async ({
  roomId,
  templateId,
}: TemplateIdentifier): Promise<number> => {
  const affected = await TemplateModel.destroy({
    where: {
      roomId,
      templateId,
    },
  });

  return affected;
};
