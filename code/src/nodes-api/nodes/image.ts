// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import * as Y from "yjs";
import type { BoundingBox, WeaveStateElement } from "@inditextech/weave-types";
import Konva from "konva";
import {
  ImageNode,
  TemplateExecutionNodes,
  TemplateImageNode,
  TemplateImageNodeExecution,
} from "../types.js";
import {
  WeaveStateManipulation,
  mergeExceptArrays,
  WeaveImageNode,
} from "@inditextech/weave-sdk";
import { BaseNodeMapper } from "./base.js";

export class ImageNodeMapper implements BaseNodeMapper<
  TemplateImageNode,
  ImageNode
> {
  constructor() {}

  getNodeFromTemplateAndExecution(
    node: TemplateImageNode,
    parameters: Record<string, TemplateExecutionNodes>,
  ): ImageNode | undefined {
    const imageExecution = parameters[node.id] as TemplateImageNodeExecution;

    if (!imageExecution) {
      return undefined;
    }

    return mergeExceptArrays(
      {
        ...node,
      },
      {
        ...imageExecution.properties,
        kind: "image",
      },
    ) as ImageNode;
  }

  mapNodeToWeaveState(
    node: ImageNode,
    origin: Konva.Vector2d,
  ): {
    nodeId: string;
    nodeState: WeaveStateElement;
  } {
    const nodeId = uuidv4();

    const nodeState: WeaveStateElement = WeaveImageNode.defaultState(nodeId);
    nodeState.props = {
      ...nodeState.props,
      imageId: `image-${nodeId}`,
      imageURL: node.image.source,
    };

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

      nodeState.props = {
        ...nodeState.props,
        x: origin.x + tx + (tw - newW) / 2,
        y: origin.y + ty + (th - newH) / 2,
        width: newW,
        height: newH,
        imageInfo: {
          width: iw,
          height: ih,
        },
        imageWidth: iw,
        imageHeight: ih,
        uncroppedImage: {
          width: newW,
          height: newH,
        },
      };
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

      const intersectionRect = this.intersectRect(templateRect, imageRect);

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

      nodeState.props = {
        ...nodeState.props,
        x: origin.x + intersectionRect.x,
        y: origin.y + intersectionRect.y,
        width: intersectionRect.width,
        height: intersectionRect.height,
        scaleX: 1,
        scaleY: 1,
        imageInfo: {
          width: iw,
          height: ih,
        },
        imageWidth: iw,
        imageHeight: ih,
        cropInfo: realClipRect,
        cropSize,
        uncroppedImage: {
          width: newW,
          height: newH,
        },
      };
    }

    const imageSchema = WeaveImageNode.getSchema();
    const parsedState = imageSchema.safeParse(nodeState);

    if (!parsedState.success) {
      throw new Error(
        `Invalid node state for image node ${node.id}: ${parsedState.error}`,
        {
          cause: "InvalidImageNodeState",
        },
      );
    }

    return { nodeId, nodeState };
  }

  mapNodeToYjsFormat(
    node: ImageNode,
    origin: Konva.Vector2d,
  ): {
    nodeId: string;
    nodeState: WeaveStateElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yjsElement: Y.Map<any>;
  } {
    const { nodeId, nodeState } = this.mapNodeToWeaveState(node, origin);
    const { element } = WeaveStateManipulation.mapNodeToYjs(nodeState);

    return {
      nodeId,
      nodeState,
      yjsElement: element,
    };
  }

  private intersectRect(rectA: BoundingBox, rectB: BoundingBox) {
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
  }
}
