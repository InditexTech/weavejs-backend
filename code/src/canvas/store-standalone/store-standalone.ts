// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from "yjs";
import { WeaveStore } from "@inditextech/weave-sdk";
import { type WeaveStoreOptions } from "@inditextech/weave-types";
import { WEAVE_STORE_STANDALONE } from "./constants.js";
import { DefineRoomInitialState, StoreStandaloneParams } from "./types.js";
import { defaultInitialState } from "./default-initial-state.js";

export class StoreStandalone extends WeaveStore {
  private roomData: string;
  private defineRoomInitialState: DefineRoomInitialState;
  protected name: string = WEAVE_STORE_STANDALONE;
  protected supportsUndoManager = true;

  constructor(
    { roomData, defineRoomInitialState }: StoreStandaloneParams,
    storeOptions: WeaveStoreOptions
  ) {
    super(storeOptions);

    this.roomData = roomData;
    this.defineRoomInitialState = defineRoomInitialState ?? defaultInitialState;
  }

  async connect(): Promise<void> {
    const roomDataSnapshot = Buffer.from(this.roomData, "base64");

    if (roomDataSnapshot) {
      Y.applyUpdate(this.getDocument(), roomDataSnapshot);
    } else {
      this.defineRoomInitialState(this.getDocument());
    }
  }

  disconnect(): void {}

  handleAwarenessChange(): void {}

  setAwarenessInfo(): void {}
}
