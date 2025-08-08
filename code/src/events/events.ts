// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Emittery from "emittery";
import { getLogger } from "../logger/logger.js";

let logger = null as unknown as ReturnType<typeof getLogger>;
let eventEmitter: Emittery | null = null;

export const setupEvents = async () => {
  logger = getLogger().child({ module: "events" });

  logger.info("Setting up events module");

  eventEmitter = new Emittery();

  logger.info("Events module ready");
};

export const getEventEmitter = () => {
  if (!eventEmitter) {
    throw new Error("Events not initialized");
  }

  return eventEmitter;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendEvent = async (event: symbol, data: any) => {
  if (!eventEmitter) {
    throw new Error("Events not initialized");
  }

  await eventEmitter.emit(event, data);
};

export const listenToEvent = <P>(
  event: symbol,
  listener: (data: P) => void
) => {
  if (!eventEmitter) {
    throw new Error("Events not initialized");
  }

  eventEmitter.on(event, listener);
};
