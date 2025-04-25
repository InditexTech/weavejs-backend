import { WeaveAzureWebPubsubServer } from '@inditextech/weave-store-azure-web-pubsub/server';
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { streamToBuffer } from "./utils.js";
import { getServiceConfig } from "./config/config.js";

const endpoint = process.env.AZURE_WEB_PUBSUB_ENDPOINT;
const key = process.env.AZURE_WEB_PUBSUB_KEY;
const hubName = process.env.AZURE_WEB_PUBSUB_HUB_NAME;

if (!endpoint || !key || !hubName) {
  throw new Error('Missing required environment variables');
}

let azureWebPubsubServer: WeaveAzureWebPubsubServer | null = null;
let storageInitialized: boolean = false;
let blobServiceClient: BlobServiceClient| null = null;
let containerClient: ContainerClient| null = null;

export const getAzureWebPubsubServer = () => {
  if (!azureWebPubsubServer) {
    throw new Error('Azure Web Pubsub server not initialized');
  }

  return azureWebPubsubServer;
};

async function setupStorage() {
  const config = getServiceConfig();

  const {
    storage: {
      connectionString,
      rooms: { containerName },
    },
  } = config;

  blobServiceClient =
        BlobServiceClient.fromConnectionString(connectionString);
  containerClient = blobServiceClient.getContainerClient(containerName);
  if (!(await containerClient.exists())) {
    containerClient = (
      await blobServiceClient.createContainer(containerName)
    ).containerClient;
  }
}

export const setupStore = () => {
  azureWebPubsubServer = new WeaveAzureWebPubsubServer({
    pubsubConfig: {
      endpoint,
      key,
      hubName,
    },
    fetchRoom: async (docName: string) => {
      try {
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
  
        const data = await streamToBuffer(
          downloadResponse.readableStreamBody,
        );
  
        return data;
      } catch (ex) {
        console.error(ex);
        return null;
      }
    },
    persistRoom: async (
      docName: string,
      actualState: Uint8Array<ArrayBufferLike>
    ) => {
      try {
        if (!storageInitialized) {
          await setupStorage();
        }
  
        if (!containerClient || !blobServiceClient) {
          return;
        }
  
        const blockBlobClient = containerClient.getBlockBlobClient(docName);
        const uploadBlobResponse = await blockBlobClient.upload(
          actualState,
          actualState.length,
        );
  
        return;
      } catch (ex) {
        console.error(ex);
        return;
      }
    },
  });
};
