// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  WeaveAzureWebPubsubServer,
  WeaveStoreAzureWebPubsubOnConnectedEvent,
  WeaveStoreAzureWebPubsubOnConnectEvent,
  WeaveStoreAzureWebPubsubOnDisconnectedEvent,
  WeaveStoreAzureWebPubsubOnWebsocketCloseEvent,
  WeaveStoreAzureWebPubsubOnWebsocketErrorEvent,
  WeaveStoreAzureWebPubsubOnWebsocketJoinGroupEvent,
  WeaveStoreAzureWebPubsubOnWebsocketOpenEvent,
} from "@inditextech/weave-store-azure-web-pubsub/server";
import { getStateAsJson, streamToBuffer } from "./utils.js";
import { getServiceConfig } from "./config/config.js";
import { getLogger } from "./logger/logger.js";
import {
  getBlobServiceClient,
  getContainerClient,
  isStorageInitialized,
  setupStorage,
} from "./storage/storage.js";
import {
  createConnection,
  deleteConnection,
  getConnection,
  getRoomConnections,
  updateConnection,
} from "./database/controllers/connection.js";
import { listGroupConnections } from "./clients/azure-web-pubsub-api.js";

let logger = null as unknown as ReturnType<typeof getLogger>;
const endpoint = process.env.AZURE_WEB_PUBSUB_ENDPOINT;
const hubName = process.env.AZURE_WEB_PUBSUB_HUB_NAME;

if (!endpoint || !hubName) {
  throw new Error("Missing required environment variables");
}

let azureWebPubsubServer: WeaveAzureWebPubsubServer | null = null;
let cleanupRoomsInterval: NodeJS.Timeout | null = null;

export const getAzureWebPubsubServer = () => {
  if (!azureWebPubsubServer) {
    throw new Error("Azure Web Pubsub server not initialized");
  }

  return azureWebPubsubServer;
};

function extractImageIdFromNode(images: string[], node: any) {
  if (node.props && node.props.nodeType === "image" && node.props.imageId) {
    images.push(node.props.imageId);
  }
  if (node.props && node.props.children) {
    for (const child of node.props.children) {
      extractImageIdFromNode(images, child);
    }
  }
}

export const getStore = () => {
  if (!azureWebPubsubServer) {
    throw new Error("Store not initialized");
  }

  return azureWebPubsubServer;
};

export const setupStore = () => {
  logger = getLogger().child({ module: "store" });

  logger.info("Setting up");

  const config = getServiceConfig();

  const {
    pubsub: { endpoint, hubName },
  } = config;

  azureWebPubsubServer = new WeaveAzureWebPubsubServer({
    pubSubConfig: {
      endpoint,
      hubName,
      connectionHandlers: {
        onConnect: async (
          connectionId: string,
          queries: Record<string, string[]> | undefined
        ) => {
          logger.info(`onConnect called with <${connectionId}>`);

          const actualConnection = await getConnection({ connectionId });

          if (!actualConnection) {
            const roomId = queries?.group?.[0] ?? null;

            await createConnection({
              connectionId,
              roomId,
              status: "connect",
            });
          }
        },
        onConnected: async (connectionId: string) => {
          logger.info(`onConnected called with <${connectionId}>`);

          await updateConnection({ connectionId }, { status: "connected" });
        },
        removeConnection: async (connectionId: string) => {
          logger.info(`removeConnection called with <${connectionId}>`);

          await deleteConnection({ connectionId });
        },
        getConnectionRoom: async (connectionId: string) => {
          logger.info(`getConnectionRoom called with <${connectionId}>`);

          try {
            const connection = await getConnection({ connectionId });

            if (connection) {
              logger.info(
                `Room of connectionId <${connection.connectionId}> is <${connection.roomId}>`
              );
            }

            return connection?.roomId ?? null;
          } catch (ex) {
            console.error(ex);
            logger.error(
              `Error getting connection room: <${(ex as Error)?.message}>`
            );
          }

          return null;
        },
        getRoomConnections: async (roomId: string) => {
          logger.info(`getRoomConnections called with <${roomId}>`);

          try {
            const connections = await getRoomConnections({ roomId });

            logger.info(
              `Room with roomId <${roomId}> has <${connections.length}> connections`
            );

            return connections.map((conn) => conn.connectionId);
          } catch (ex) {
            console.error("Error getting room connections:", ex);
          }

          return [];
        },
      },
    },
    eventsHandlerConfig: {
      path: `/api/v1/api/webpubsub/hubs/${hubName}`,
      allowedEndpoints: [endpoint],
    },
    fetchRoom: async (docName: string) => {
      if (!isStorageInitialized()) {
        await setupStorage();
      }

      const containerClient = getContainerClient();
      const blobServiceClient = getBlobServiceClient();

      if (!containerClient || !blobServiceClient) {
        return null;
      }

      const blockBlobClient = containerClient.getBlockBlobClient(docName);
      if (!(await blockBlobClient.exists())) {
        return null;
      }

      const downloadResponse = await blockBlobClient.download();
      if (!downloadResponse.readableStreamBody) {
        return null;
      }

      const data = await streamToBuffer(downloadResponse.readableStreamBody);

      return data;
    },
    persistRoom: async (
      docName: string,
      actualState: Uint8Array<ArrayBufferLike>
    ) => {
      if (!isStorageInitialized()) {
        await setupStorage();
      }

      const containerClient = getContainerClient();
      const blobServiceClient = getBlobServiceClient();

      if (!containerClient || !blobServiceClient) {
        return;
      }

      const actualStateJson = getStateAsJson(actualState);

      const mainLayer = actualStateJson.props.children?.find(
        (child: any) => child.key === "mainLayer"
      );

      let images: string[] = [];
      if (mainLayer) {
        extractImageIdFromNode(images, mainLayer);
        // Do something with the extracted images if needed
      }

      const blockBlobClient = containerClient.getBlockBlobClient(docName);
      await blockBlobClient.upload(actualState, actualState.length);
    },
  });

  logger.info("Setting up event listeners");

  azureWebPubsubServer.addEventListener<WeaveStoreAzureWebPubsubOnConnectEvent>(
    "onConnect",
    ({ context, queries }) => {
      logger.info(
        { queries },
        `Client with connection Id <${context.connectionId}> connect`
      );
    }
  );

  azureWebPubsubServer.addEventListener<WeaveStoreAzureWebPubsubOnConnectedEvent>(
    "onConnected",
    ({ context }) => {
      logger.info(
        `Client with connection Id <${context.connectionId}> connected`
      );
    }
  );

  azureWebPubsubServer.addEventListener<WeaveStoreAzureWebPubsubOnDisconnectedEvent>(
    "onDisconnected",
    ({ context }) => {
      logger.info(
        `Client with connection Id <${context.connectionId}> disconnected`
      );
    }
  );

  azureWebPubsubServer.addEventListener<WeaveStoreAzureWebPubsubOnWebsocketOpenEvent>(
    "onWsOpen",
    ({ group }) => {
      logger.info(`WebSocket server connection opened for group <${group}>`);
    }
  );

  azureWebPubsubServer.addEventListener<WeaveStoreAzureWebPubsubOnWebsocketJoinGroupEvent>(
    "onWsJoinGroup",
    ({ group }) => {
      logger.info(`WebSocket server connection joined group <${group}>`);
    }
  );

  azureWebPubsubServer.addEventListener<WeaveStoreAzureWebPubsubOnWebsocketCloseEvent>(
    "onWsClose",
    ({ event, group }) => {
      logger.info(
        `WebSocket server connection closed for group <${group}>, code <${event.code}>`
      );
    }
  );

  azureWebPubsubServer.addEventListener<WeaveStoreAzureWebPubsubOnWebsocketErrorEvent>(
    "onWsError",
    ({ group, error }) => {
      logger.info(`WebSocket server connection error for group <${group}>`);
      console.error(error);
    }
  );

  azureWebPubsubServer.addEventListener<WeaveStoreAzureWebPubsubOnWebsocketErrorEvent>(
    "onWsTokenRefresh",
    ({ group }) => {
      logger.info(`WebSocket server token refresh for group <${group}>`);
    }
  );

  logger.info("Module ready");
};

export const setupStoreRoomsCleanup = () => {
  const config = getServiceConfig();

  cleanupRoomsInterval = setInterval(async () => {
    const store = getStore();
    if (!store) {
      return;
    }

    const storeSyncHandler = store.getSyncHandler();
    const rooms = storeSyncHandler.getRoomsLoaded();

    logger.info(`Cleanup rooms without active connections started`);
    logger.info(`Rooms loaded in memory <${rooms.length}>`);

    for (const roomId of rooms) {
      const connections = await listGroupConnections(roomId);
      if (connections.length === 0) {
        logger.info(
          `Performing cleanup of room <${roomId}>, has no active connections`
        );
        await storeSyncHandler.destroyRoomInstance(roomId);
        logger.info(`Cleanup of room <${roomId}> successful`);
      } else {
        logger.info(
          `Room <${roomId}> has active connections <${connections.length}>, skipping cleanup`
        );
      }
    }

    logger.info(`Cleanup rooms ended`);
  }, config.pubsub.cleanupRoomsIntervalSeg * 1000);
};

export const stopStoreRoomsCleanup = () => {
  if (cleanupRoomsInterval) {
    clearInterval(cleanupRoomsInterval);
    cleanupRoomsInterval = null;
  }
};
