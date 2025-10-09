// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Logger } from "pino";
import {
  BlobDownloadResponseParsed,
  BlobServiceClient,
  ContainerClient,
  ContainerListBlobsOptions,
} from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { getServiceConfig } from "../config/config.js";
import { getLogger } from "../logger/logger.js";

export class VideosPersistenceHandler {
  private _blobServiceClient!: BlobServiceClient;
  private _containerClient!: ContainerClient;
  private _initialized!: boolean;
  private _logger!: Logger;

  constructor() {
    this._initialized = false;
    this._logger = getLogger().child({ module: "videos.persistence" });
  }

  isInitialized() {
    return this._initialized;
  }

  async setup() {
    const config = getServiceConfig();

    const {
      storage: {
        accountName,
        videos: { containerName },
      },
    } = config;

    const credential = new DefaultAzureCredential();
    const storageAccountUrl = `https://${accountName}.blob.core.windows.net`;

    this._blobServiceClient = new BlobServiceClient(
      storageAccountUrl,
      credential
    );

    this._containerClient =
      this._blobServiceClient.getContainerClient(containerName);
    if (!(await this._containerClient.exists())) {
      this._containerClient = (
        await this._blobServiceClient.createContainer(containerName)
      ).containerClient;
    }

    this._initialized = true;
  }

  async list(
    prefix: string,
    pageSize: number = 20,
    continuationToken: string | undefined = undefined
  ) {
    try {
      if (!this._initialized) {
        await this.setup();
      }
      const listOptions: ContainerListBlobsOptions = {
        includeMetadata: true,
        prefix,
      };

      const videos: string[] = [];
      const iterator = await this._containerClient
        .listBlobsFlat(listOptions)
        .byPage({
          continuationToken,
          maxPageSize: pageSize,
        });

      const response = await iterator.next();

      if (response.done) {
        return { videos: [], continuationToken: undefined };
      }

      for (const item of response.value.segment.blobItems) {
        videos.push(item.name.split("/")[1]);
      }

      return { videos, continuationToken: response.value.continuationToken };
    } catch (ex) {
      this._logger.error({ error: ex }, "Error getting videos list");
      return { videos: [], continuationToken: undefined };
    }
  }

  async exists(videoName: string) {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      const blockBlobClient =
        this._containerClient.getBlockBlobClient(videoName);
      return await blockBlobClient.exists();
    } catch (ex) {
      this._logger.error(
        { videoName, error: ex },
        "Error checking if video exists"
      );
      return false;
    }
  }

  async persist(
    videoName: string,
    { mimeType, size }: { mimeType: string; size: number },
    content: Uint8Array
  ): Promise<boolean> {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      this._logger.debug({ videoName }, "Persisting video");

      const blockBlobClient =
        this._containerClient.getBlockBlobClient(videoName);
      const uploadBlobResponse = await blockBlobClient.uploadData(content, {
        blockSize: size,
        blobHTTPHeaders: {
          blobContentType: mimeType,
        },
      });

      this._logger.debug(
        { videoName, requestId: uploadBlobResponse.requestId },
        "Persisted video"
      );

      return !uploadBlobResponse.errorCode;
    } catch (ex) {
      this._logger.error({ videoName, error: ex }, "Error persisting video");
      return false;
    }
  }

  async delete(imageName: string): Promise<boolean> {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      this._logger.debug({ imageName }, "Deleting image");

      const blockBlobClient =
        this._containerClient.getBlockBlobClient(imageName);

      if (!(await blockBlobClient.exists())) {
        this._logger.debug({ imageName }, "Image not found");
        return false;
      }

      const deleteBlobResponse = await blockBlobClient.delete();

      this._logger.debug(
        { imageName, requestId: deleteBlobResponse.requestId },
        "Deleted image"
      );

      return !deleteBlobResponse.errorCode;
    } catch (ex) {
      this._logger.error({ imageName, error: ex }, "Error deleting the image");
      return false;
    }
  }

  async fetch(videoName: string): Promise<{
    response: BlobDownloadResponseParsed | null;
    mimeType: string | null;
  }> {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      const blockBlobClient =
        this._containerClient.getBlockBlobClient(videoName);
      if (!(await blockBlobClient.exists())) {
        this._logger.debug({ videoName }, "Video not found");
        return { response: null, mimeType: null };
      }

      const contentType =
        (await blockBlobClient.getProperties()).contentType ??
        "application/octet-stream";
      const response = await blockBlobClient.download(0);

      return { response, mimeType: contentType };
    } catch (ex) {
      this._logger.error({ videoName, error: ex }, "Error fetching video data");
      return { response: null, mimeType: null };
    }
  }

  async fetchToFile(videoName: string, filePath: string): Promise<void> {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      const blockBlobClient =
        this._containerClient.getBlockBlobClient(videoName);
      if (!(await blockBlobClient.exists())) {
        this._logger.debug({ videoName }, "Video not found");
        throw new Error("Video not found");
      }

      await blockBlobClient.downloadToFile(filePath);
    } catch (ex) {
      this._logger.error({ videoName, error: ex }, "Error fetching video data");
      throw new Error("Error fetching video data");
    }
  }
}
