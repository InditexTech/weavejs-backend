import { WebPubSubServiceClient, AzureKeyCredential } from "@azure/web-pubsub";
import SyncHandler from "./sync-handler.js";
import { getConfig } from "./utils.js";

export const initWeaveAzureWebPubsubClient = () => {
  const { endpoint, key, hubName } = getConfig();

  const credentials = new AzureKeyCredential(key ?? "");
  
  const syncClient: WebPubSubServiceClient = new WebPubSubServiceClient(endpoint, credentials, hubName);
  const syncHandler = new SyncHandler(hubName, `/api/webpubsub/hubs/${hubName}`, syncClient);
  
  return syncHandler;
}