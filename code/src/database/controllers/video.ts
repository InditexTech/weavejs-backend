// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Op } from "sequelize";
import {
  VideoAttributes,
  VideoIdentifier,
  VideoModel,
} from "../models/video.js";

export const getRoomVideos = async (
  {
    roomId,
    since,
  }: {
    roomId: string;
    since?: Date;
  },
  {
    limit = 20,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  }
): Promise<VideoModel[]> => {
  return VideoModel.findAll({
    where: {
      roomId,
      ...(since && { updatedAt: { [Op.gte]: since } }),
    },
    order: [["updatedAt", "DESC"]],
    attributes: [
      "roomId",
      "videoId",
      "status",
      "operation",
      "mimeType",
      "fileName",
      "width",
      "height",
      "aspectRatio",
      "fileName",
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

export const getTotalRoomVideos = async ({
  roomId,
  since,
}: {
  roomId: string;
  since?: Date;
}): Promise<number> => {
  return VideoModel.count({
    where: {
      roomId,
      ...(since && { updatedAt: { [Op.gte]: since } }),
    },
  });
};

export const getVideo = async ({
  roomId,
  videoId,
}: VideoIdentifier): Promise<VideoModel | null> => {
  const video = await VideoModel.findOne({
    where: {
      roomId,
      videoId,
    },
    attributes: [
      "roomId",
      "videoId",
      "status",
      "operation",
      "mimeType",
      "fileName",
      "width",
      "height",
      "aspectRatio",
      "jobId",
      "removalJobId",
      "removalStatus",
      "createdAt",
      "updatedAt",
    ],
  });
  return video;
};

export const createVideo = async (
  videoData: VideoAttributes
): Promise<VideoModel> => {
  const newVideo = await VideoModel.create(videoData);

  return newVideo;
};

export const updateVideo = async (
  { roomId, videoId }: VideoIdentifier,
  videoData: Partial<VideoAttributes>
): Promise<number> => {
  const affected = await VideoModel.update(videoData, {
    where: {
      roomId,
      videoId,
    },
  });

  return affected[0];
};

export const deleteVideo = async ({
  roomId,
  videoId,
}: VideoIdentifier): Promise<number> => {
  const affected = await VideoModel.destroy({
    where: {
      roomId,
      videoId,
    },
  });

  return affected;
};
