// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  ConnectionContext,
  WeaveAzureWebPubsubServer,
  WeaveStoreAzureWebPubsubOnConnectedEvent,
  WeaveStoreAzureWebPubsubOnConnectEvent,
  WeaveStoreAzureWebPubsubOnDisconnectedEvent,
} from "@inditextech/weave-store-azure-web-pubsub/server";
import { streamToBuffer } from "./utils.js";
import { getServiceConfig } from "./config/config.js";
import * as Y from "yjs";
import { getLogger } from "./logger/logger.js";
import {
  getBlobServiceClient,
  getContainerClient,
  isStorageInitialized,
  setupStorage,
} from "./storage/storage.js";
import { customInitialState } from "./store.initial-state.js";
import {
  createConnection,
  deleteConnection,
  getConnection,
  getRoomConnections,
  updateConnection,
} from "./database/controllers/connection.js";

let logger = null as unknown as ReturnType<typeof getLogger>;
const endpoint = process.env.AZURE_WEB_PUBSUB_ENDPOINT;
const hubName = process.env.AZURE_WEB_PUBSUB_HUB_NAME;

if (!endpoint || !hubName) {
  throw new Error("Missing required environment variables");
}

let azureWebPubsubServer: WeaveAzureWebPubsubServer | null = null;

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
        getConnectionRoom: async (connectionId: string) => {
          logger.info(`getConnectionRoom called with <${connectionId}>`);

          try {
            const connection = await getConnection({ connectionId });

            if (connection) {
              logger.info(
                `Room of connectionId <${connection.connectionId}> is <${connection.roomId}>`
              );
            }

            // this shouldn't be here
            await deleteConnection({ connectionId });

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
    initialState: customInitialState,
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
        `Client with connection Id <${context.connectionId}> trying to connect`
      );

      if (context.connectionId) {
        createConnection({
          connectionId: context.connectionId,
          roomId: null,
          status: "connect",
        });
      }
    }
  );

  azureWebPubsubServer.addEventListener<WeaveStoreAzureWebPubsubOnConnectedEvent>(
    "onConnected",
    ({ context }) => {
      logger.info(
        `Client with connection Id <${context.connectionId}> connected to room`
      );

      if (context.connectionId) {
        updateConnection(
          { connectionId: context.connectionId },
          { status: "connected" }
        );
      }
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

  logger.info("Module ready");
};

function getStateAsJson(actualState: Uint8Array<ArrayBufferLike>) {
  const document = new Y.Doc();
  Y.applyUpdate(document, actualState);
  const actualStateString = JSON.stringify(document.getMap("weave").toJSON());
  const actualStateJson = JSON.parse(actualStateString);
  return actualStateJson;
}
