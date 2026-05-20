// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ImageNodeMapper } from "./image.js";
import { TextNodeMapper } from "./text.js";
import { FrameNodeMapper } from "./frame.js";
import { DebugNodeMapper } from "./debug.js";

let imageNodeMapper: ImageNodeMapper | undefined = undefined;
let textNodeMapper: TextNodeMapper | undefined = undefined;
let frameNodeMapper: FrameNodeMapper | undefined = undefined;
let debugNodeMapper: DebugNodeMapper | undefined = undefined;

type NodeMapperByKind = {
  image: ImageNodeMapper;
  text: TextNodeMapper;
  frame: FrameNodeMapper;
  debug: DebugNodeMapper;
};

export const getNodeMapperByKind = <T extends keyof NodeMapperByKind>(
  kind: T,
): NodeMapperByKind[T] => {
  switch (kind) {
    case "image":
      if (!imageNodeMapper) {
        imageNodeMapper = new ImageNodeMapper();
      }
      return imageNodeMapper as NodeMapperByKind[T];
    case "text":
      if (!textNodeMapper) {
        textNodeMapper = new TextNodeMapper();
      }
      return textNodeMapper as NodeMapperByKind[T];
    case "frame":
      if (!frameNodeMapper) {
        frameNodeMapper = new FrameNodeMapper();
      }
      return frameNodeMapper as NodeMapperByKind[T];
    case "debug":
      if (!debugNodeMapper) {
        debugNodeMapper = new DebugNodeMapper();
      }
      return debugNodeMapper as NodeMapperByKind[T];
    default:
      throw new Error(`Unsupported node kind: ${kind}`);
  }
};
