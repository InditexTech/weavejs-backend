// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { imageNodeToYjsFormat } from "./image.js";
import { frameNodeToYjsFormat } from "./frame.js";
import { debugNodeToYjsFormat } from "./debug.js";
import { textNodeToYjsFormat } from "./text.js";

export const getNodeMapperByKind = (kind: string) => {
  switch (kind) {
    case "image":
      return imageNodeToYjsFormat;
    case "text":
      return textNodeToYjsFormat;
    case "frame":
      return frameNodeToYjsFormat;
    case "debug":
      return debugNodeToYjsFormat;
    default:
      throw new Error(`Unsupported node kind: ${kind}`);
  }
};
