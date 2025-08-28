import {
  ImageAttributes,
  ImageIdentifier,
  ImageModel,
} from "../models/image.js";

export const getRoomImages = async (
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
  }
): Promise<ImageModel[]> => {
  return ImageModel.findAll({
    where: {
      roomId,
    },
    order: [["createdAt", "DESC"]],
    attributes: [
      "roomId",
      "imageId",
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

export const getTotalRoomImages = async ({
  roomId,
}: {
  roomId: string;
}): Promise<number> => {
  return ImageModel.count({
    where: {
      roomId,
    },
  });
};

export const getImage = async ({
  roomId,
  imageId,
}: ImageIdentifier): Promise<ImageModel | null> => {
  const image = await ImageModel.findOne({
    where: {
      roomId,
      imageId,
    },
    attributes: [
      "roomId",
      "imageId",
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
  return image;
};

export const createImage = async (
  imageData: ImageAttributes
): Promise<ImageModel> => {
  const newImage = await ImageModel.create(imageData);

  return newImage;
};

export const updateImage = async (
  { roomId, imageId }: ImageIdentifier,
  imageData: Partial<ImageAttributes>
): Promise<number> => {
  const affected = await ImageModel.update(imageData, {
    where: {
      roomId,
      imageId,
    },
  });

  return affected[0];
};

export const deleteImage = async ({
  roomId,
  imageId,
}: ImageIdentifier): Promise<number> => {
  const affected = await ImageModel.destroy({
    where: {
      roomId,
      imageId,
    },
  });

  return affected;
};
