// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import * as Y from "yjs";
import type { BoundingBox } from "@inditextech/weave-types";
import Konva from "konva";
import { ImageNode } from "../types.js";

export const imageNodeToYjsFormat = (
  origin: Konva.Vector2d,
  node: ImageNode,
): {
  nodeId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  element: Y.Map<any>;
} => {
  if (node.kind !== "image") {
    throw new Error("Node is not an image");
  }

  // create image node
  const imageId = uuidv4();
  const imageElement = new Y.Map();
  const imageProps = new Y.Map();

  imageElement.set("key", imageId);
  imageElement.set("type", "image");
  imageElement.set("props", imageProps);

  imageProps.set("id", imageId);
  imageProps.set("nodeType", "image");
  imageProps.set("name", "node");
  imageProps.set("children", new Y.Array());

  imageProps.set("imageId", imageId);
  imageProps.set("imageURL", node.image.source);

  const tx = node.x;
  const ty = node.y;
  const tw = node.width;
  const th = node.height;
  const iw = node.image.width;
  const ih = node.image.height;

  if (node.fit === "contain") {
    const scale = Math.min(tw / iw, th / ih);
    const newW = iw * scale;
    const newH = ih * scale;

    imageProps.set("x", origin.x + tx + (tw - newW) / 2);
    imageProps.set("y", origin.y + ty + (th - newH) / 2);
    imageProps.set("width", newW);
    imageProps.set("height", newH);
    imageProps.set("scaleX", 1);
    imageProps.set("scaleY", 1);
    const imageInfo = new Y.Map();
    imageInfo.set("width", iw);
    imageInfo.set("height", ih);
    imageProps.set("imageInfo", imageInfo);
    imageProps.set("imageWidth", iw);
    imageProps.set("imageHeight", ih);
    const uncroppedImage = new Y.Map();
    uncroppedImage.set("width", newW);
    uncroppedImage.set("height", newH);
    imageProps.set("uncroppedImage", uncroppedImage);
  }
  if (node.fit === "cover") {
    const scale = Math.max(tw / iw, th / ih);
    const newW = iw * scale;
    const newH = ih * scale;

    const templateRect = {
      x: tx,
      y: ty,
      width: tw,
      height: th,
    };

    const imageRect = {
      x: tx + (tw - newW) / 2,
      y: ty + (th - newH) / 2,
      width: newW,
      height: newH,
    };

    const intersectionRect = intersectRect(templateRect, imageRect);

    if (!intersectionRect) {
      throw new Error("Image does not intersect with template area", {
        cause: "ImageIntersectionError",
      });
    }

    const diffX = intersectionRect.x - imageRect.x;
    const diffY = intersectionRect.y - imageRect.y;

    const scaleX = newW / iw;
    const scaleY = newH / ih;

    const realClipRect = {
      scaleX,
      scaleY,
      x: diffX,
      y: diffY,
      width: intersectionRect.width,
      height: intersectionRect.height,
    };

    const cropSize = {
      x: diffX,
      y: diffY,
      width: intersectionRect.width,
      height: intersectionRect.height,
    };

    imageProps.set("x", origin.x + intersectionRect.x);
    imageProps.set("y", origin.y + intersectionRect.y);
    imageProps.set("width", intersectionRect.width);
    imageProps.set("height", intersectionRect.height);
    imageProps.set("scaleX", 1);
    imageProps.set("scaleY", 1);
    const imageInfo = new Y.Map();
    imageInfo.set("width", iw);
    imageInfo.set("height", ih);
    imageProps.set("imageInfo", imageInfo);
    imageProps.set("imageWidth", iw);
    imageProps.set("imageHeight", ih);
    imageProps.set("cropInfo", realClipRect);
    imageProps.set("cropSize", cropSize);
    const uncroppedImage = new Y.Map();
    uncroppedImage.set("width", newW);
    uncroppedImage.set("height", newH);
    imageProps.set("uncroppedImage", uncroppedImage);
  }

  return { nodeId: imageId, element: imageElement };
};

const intersectRect = (rectA: BoundingBox, rectB: BoundingBox) => {
  const x1 = Math.max(rectA.x, rectB.x);
  const y1 = Math.max(rectA.y, rectB.y);
  const x2 = Math.min(rectA.x + rectA.width, rectB.x + rectB.width);
  const y2 = Math.min(rectA.y + rectA.height, rectB.y + rectB.height);

  const width = x2 - x1;
  const height = y2 - y1;

  if (width <= 0 || height <= 0) {
    return null; // No intersection
  }

  return { x: x1, y: y1, width, height };
};
