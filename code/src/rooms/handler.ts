import * as Y from "yjs";
import WebSocket from "ws";
import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { WebPubSubEventHandler } from "@azure/web-pubsub-express";
import { Logger } from "pino";
import { WeaveStoreAzureWebPubSubSyncHost } from "@inditextech/weavejs-store-azure-web-pubsub";
import { setRoomInitialState } from "./initial-state.js";
import { getLogger } from "../logger/logger.js";
import { RoomsPersistenceHandler } from "./persistence.js";
import { RoomsEventHandlerOptions } from "../types.js";

export default class RoomsEventHandler extends WebPubSubEventHandler {
  private _client: WebPubSubServiceClient;
  private _logger: Logger;
  private _connections: Map<string, WeaveStoreAzureWebPubSubSyncHost> =
    new Map();
  private _persistFrequencySeg: number;
  private _docs: Map<string, Y.Doc> = new Map();
  private _persistence: Map<string, NodeJS.Timeout> = new Map();
  private _persistenceHandler: RoomsPersistenceHandler;

  constructor(
    hubName: string,
    path: string,
    client: WebPubSubServiceClient,
    { persistFrequencySeg }: RoomsEventHandlerOptions,
  ) {
    super(hubName, {
      path: path,
    });

    this._logger = getLogger().child({ module: "rooms.handler" });
    this._client = client;
    this._persistFrequencySeg = persistFrequencySeg;
    this._persistenceHandler = new RoomsPersistenceHandler();
  }

  private async getDoc(roomId: string) {
    let doc: Y.Doc = new Y.Doc();
    if (this._docs.has(roomId)) {
      doc = this._docs.get(roomId) as Y.Doc;
    } else {
      this._docs.set(roomId, doc);
    }

    const persistedDocData = await this._persistenceHandler.fetch(roomId);
    if (persistedDocData) {
      this._logger.debug({ roomId }, "Room has persisted data");
      Y.applyUpdate(doc, persistedDocData);
    } else {
      this._logger.debug({ roomId }, "Room is new, initializing it");
      setRoomInitialState(doc);
    }

    return doc;
  }

  private setupRoomPersistence(roomId: string, doc: Y.Doc) {
    if (!this._persistence.has(roomId)) {
      this._logger.debug({ roomId }, "Setup room persistence");

      const intervalId = setInterval(async () => {
        const actualState = Y.encodeStateAsUpdate(doc);
        await this._persistenceHandler.persist(roomId, actualState);
      }, this._persistFrequencySeg * 1000);

      this._persistence.set(roomId, intervalId);
    }
  }

  private async getHostConnection(roomId: string) {
    if (!this._connections.has(roomId)) {
      this._logger.debug({ roomId }, "Creating host client for room");

      const doc = await this.getDoc(roomId);

      const connection = new WeaveStoreAzureWebPubSubSyncHost(
        this._client,
        roomId,
        doc,
        {
          WebSocketPolyfill: WebSocket,
        },
      );
      connection.start();

      this.setupRoomPersistence(roomId, doc);

      this._connections.set(roomId, connection);
    }

    return this._connections.get(roomId);
  }

  async getClientConnectionUrl(roomId: string) {
    await this.getHostConnection(roomId);

    const token = await this._client.getClientAccessToken({
      roles: [
        `webpubsub.joinLeaveGroup.${roomId}`,
        `webpubsub.sendToGroup.${roomId}.host`,
      ],
    });

    return token.url;
  }
}
