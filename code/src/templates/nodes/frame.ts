// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import * as Y from "yjs";
import Konva from "konva";
import { FrameNode } from "../types.js";
import { getNodeMapperByKind } from "./index.js";

export const frameNodeToYjsFormat = (
  origin: Konva.Vector2d,
  node: FrameNode,
): {
  nodeId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  element: Y.Map<any>;
} => {
  if (node.kind !== "frame") {
    throw new Error("Node is not an frame");
  }

  // create frame node
  const frameId = uuidv4();
  const frameElement = new Y.Map();
  const frameProps = new Y.Map();

  frameElement.set("key", frameId);
  frameElement.set("type", "frame");
  frameElement.set("props", frameProps);

  const children = new Y.Array();

  for (const child of node.children) {
    const nodeMapper = getNodeMapperByKind(child.kind);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { element } = nodeMapper({ x: 0, y: 0 }, child as any);
    children.push([element]);
  }

  frameProps.set("id", frameId);
  frameProps.set("nodeType", "frame");
  frameProps.set("name", "node");
  frameProps.set("children", children);

  const tx = node.x;
  const ty = node.y;
  const tw = node.width;
  const th = node.height;

  frameProps.set("x", origin.x + tx);
  frameProps.set("y", origin.y + ty);
  frameProps.set("frameWidth", tw);
  frameProps.set("frameHeight", th);
  frameProps.set("title", node.name);

  return {
    nodeId: frameId,
    element: frameElement,
  };
};
