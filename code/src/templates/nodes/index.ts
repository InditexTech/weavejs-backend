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
