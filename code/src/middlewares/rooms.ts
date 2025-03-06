import { Router } from "express";
import { WebPubSubServiceClient, AzureKeyCredential } from "@azure/web-pubsub";
import { getServiceConfig } from "../config/config.js";
import RoomsEventHandler from "../rooms/handler.js";
import { getLogger } from "../logger/logger.js";

let roomsEventHandler: RoomsEventHandler | null = null;

export function getRoomsEventHandler() {
  if (!roomsEventHandler) {
    throw new Error("RoomsEventHandler not initialized");
  }

  return roomsEventHandler;
}

export function setupRoomsMiddleware(router: Router) {
  const logger = getLogger().child({ module: "middlewares.rooms" });

  logger.info("Setting up Rooms middleware");

  const config = getServiceConfig();

  const {
    pubsub: { endpoint, key, hubName },
  } = config;

  const credentials = new AzureKeyCredential(key ?? "");

  const webPubSubClient: WebPubSubServiceClient = new WebPubSubServiceClient(
    endpoint,
    credentials,
    hubName,
  );
  roomsEventHandler = new RoomsEventHandler(
    hubName,
    `/api/webpubsub/hubs/${hubName}`,
    webPubSubClient,
    {
      persistFrequencySeg: config.pubsub.persistFrequencySeg,
    },
  );

  // Setup the Rooms event handler
  router.use(roomsEventHandler.getMiddleware());
}
