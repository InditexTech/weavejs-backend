// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveAzureWebPubsubServer } from "@inditextech/weave-store-azure-web-pubsub/server";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { streamToBuffer } from "./utils.js";
import { getServiceConfig } from "./config/config.js";
import * as Y from "yjs";
import { observeDeep, syncedStore, getYjsDoc } from "@syncedstore/core";

const endpoint = process.env.AZURE_WEB_PUBSUB_ENDPOINT;
const hubName = process.env.AZURE_WEB_PUBSUB_HUB_NAME;

if (!endpoint || !hubName) {
  throw new Error("Missing required environment variables");
}

let azureWebPubsubServer: WeaveAzureWebPubsubServer | null = null;
let storageInitialized: boolean = false;
let blobServiceClient: BlobServiceClient | null = null;
let containerClient: ContainerClient | null = null;

export const getAzureWebPubsubServer = () => {
  if (!azureWebPubsubServer) {
    throw new Error("Azure Web Pubsub server not initialized");
  }

  return azureWebPubsubServer;
};

function extractImageIdFromNode(images: string[], node: any) {
  if (node.props.nodeType === "image" && node.props.imageId) {
    images.push(node.props.imageId);
  }
  if (node.props.children) {
    for (const child of node.props.children) {
      extractImageIdFromNode(images, child);
    }
  }
}

async function setupStorage() {
  const config = getServiceConfig();

  const {
    storage: {
      accountName,
      rooms: { containerName },
    },
  } = config;

  const credentials = new DefaultAzureCredential();
  const storageAccountUrl = `https://${accountName}.blob.core.windows.net`;
  blobServiceClient = new BlobServiceClient(storageAccountUrl, credentials);

  containerClient = blobServiceClient.getContainerClient(containerName);
  if (!(await containerClient.exists())) {
    containerClient = (await blobServiceClient.createContainer(containerName))
      .containerClient;
  }

  storageInitialized = true;
}

export const setupStore = () => {
  const config = getServiceConfig();

  const {
    pubsub: { endpoint, hubName },
  } = config;

  azureWebPubsubServer = new WeaveAzureWebPubsubServer({
    pubSubConfig: {
      endpoint,
      hubName,
    },
    eventsHandlerConfig: {
      path: `/api/v1/api/webpubsub/hubs/${hubName}`,
      allowedEndpoints: [endpoint],
    },
    fetchRoom: async (docName: string) => {
      if (!storageInitialized) {
        await setupStorage();
      }

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
      if (!storageInitialized) {
        await setupStorage();
      }

      let state: any = syncedStore({
        weave: {},
      });

      observeDeep(state, async () => {
        if (!containerClient || !blobServiceClient) {
          return;
        }

        const jsonState = JSON.parse(JSON.stringify(state, undefined, 2));

        const mainLayer = jsonState.weave?.props.children?.find(
          (child: any) => child.key === "mainLayer"
        );
        let images: string[] = [];
        if (mainLayer) {
          extractImageIdFromNode(images, mainLayer);
          // Do something with the images
        }

        const blockBlobClient = containerClient.getBlockBlobClient(docName);
        await blockBlobClient.upload(actualState, actualState.length);
        state = null;
      });

      const document = getYjsDoc(state);
      Y.applyUpdate(document, actualState);

      return;
    },
  });
};
