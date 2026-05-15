// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import * as Y from "yjs";
import Konva from "konva";
import { TextNode } from "../types.js";

export const textNodeToYjsFormat = (
  origin: Konva.Vector2d,
  node: TextNode,
): {
  nodeId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  element: Y.Map<any>;
} => {
  if (node.kind !== "text") {
    throw new Error("Node is not a text");
  }

  // create frame node
  const textId = uuidv4();
  const frameElement = new Y.Map();
  const frameProps = new Y.Map();

  frameElement.set("key", textId);
  frameElement.set("type", "text");
  frameElement.set("props", frameProps);

  frameProps.set("id", textId);
  frameProps.set("nodeType", "text");
  frameProps.set("name", "node");
  frameProps.set("children", new Y.Array());

  const tx = node.x;
  const ty = node.y;
  const tw = node.width;
  const th = node.height;

  frameProps.set("x", origin.x + tx);
  frameProps.set("y", origin.y + ty);
  frameProps.set("width", tw);
  frameProps.set("height", th);
  frameProps.set("fontFamily", node.fontFamily);
  frameProps.set("fontSize", node.fontSize);
  frameProps.set("fill", node.fill);
  frameProps.set("align", node.align);
  frameProps.set("verticalAlign", node.verticalAlign);
  frameProps.set("text", node.text);
  frameProps.set("layout", node.layout);
  frameProps.set("fillAfterStrokeEnabled", true);
  frameProps.set("stroke", "#D6D6D6");
  frameProps.set("strokeEnabled", true);
  frameProps.set("strokeScaleEnabled", true);
  frameProps.set("strokeWidth", 2);

  return {
    nodeId: textId,
    element: frameElement,
  };
};
