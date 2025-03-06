import { Logger } from "pino";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { getServiceConfig } from "../config/config.js";
import { getLogger } from "../logger/logger.js";

export class RoomsPersistenceHandler {
  private _blobServiceClient!: BlobServiceClient;
  private _containerClient!: ContainerClient;
  private _initialized!: boolean;
  private _logger!: Logger;

  constructor() {
    this._initialized = false;
    this._logger = getLogger().child({ module: "rooms.persistence" });
  }

  isInitialized() {
    return this._initialized;
  }

  async setup() {
    const config = getServiceConfig();

    const {
      storage: {
        connectionString,
        rooms: { containerName },
      },
    } = config;

    this._blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);

    this._containerClient =
      this._blobServiceClient.getContainerClient(containerName);
    if (!(await this._containerClient.exists())) {
      this._containerClient = (
        await this._blobServiceClient.createContainer(containerName)
      ).containerClient;
    }

    this._initialized = true;
  }

  async persist(roomId: string, content: Uint8Array): Promise<boolean> {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      this._logger.info({ roomId }, "Persisting room data");

      const blockBlobClient = this._containerClient.getBlockBlobClient(roomId);
      const uploadBlobResponse = await blockBlobClient.upload(
        content,
        content.length,
      );

      this._logger.info(
        { roomId, requestId: uploadBlobResponse.requestId },
        "Persisted room data",
      );

      return !uploadBlobResponse.errorCode;
    } catch (ex) {
      this._logger.error({ roomId, error: ex }, "Error persisting room data");
      return false;
    }
  }

  async fetch(roomId: string): Promise<Uint8Array | null> {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      const blockBlobClient = this._containerClient.getBlockBlobClient(roomId);
      if (!(await blockBlobClient.exists())) {
        this._logger.info({ roomId }, "Room not found persisted");
        return null;
      }

      const downloadResponse = await blockBlobClient.download();
      if (!downloadResponse.readableStreamBody) {
        return null;
      }

      this._logger.info({ roomId }, "Reading room persisted data");

      const data = await this.streamToBuffer(
        downloadResponse.readableStreamBody,
      );

      this._logger.info(
        { roomId, length: data.length },
        "Room persisted data readed",
      );

      return data;
    } catch (ex) {
      this._logger.error(
        { roomId, error: ex },
        "Error fetching room persisted data",
      );
      return null;
    }
  }

  private async streamToBuffer(
    readableStream: NodeJS.ReadableStream,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      readableStream.on<Uint8Array>("data", (data: Buffer | string) => {
        chunks.push(data instanceof Buffer ? data : Buffer.from(data));
      });
      readableStream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      readableStream.on("error", reject);
    });
  }
}
