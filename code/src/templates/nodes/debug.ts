// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import * as Y from "yjs";
import Konva from "konva";
import { BaseNode } from "../types.js";

export const debugNodeToYjsFormat = (
  origin: Konva.Vector2d,
  node: BaseNode,
): {
  nodeId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  element: Y.Map<any>;
} => {
  // create rect debug node for template area
  const rectId = uuidv4();
  const rectElement = new Y.Map();
  const rectProps = new Y.Map();

  rectElement.set("key", rectId);
  rectElement.set("type", "rectangle");
  rectElement.set("props", rectProps);

  rectProps.set("id", rectId);
  rectProps.set("nodeType", "rectangle");
  rectProps.set("name", "node");
  rectProps.set("children", new Y.Array());

  rectProps.set("x", origin.x + node.x);
  rectProps.set("y", origin.y + node.y);
  rectProps.set("width", node.width);
  rectProps.set("height", node.height);
  rectProps.set("fill", "transparent");
  rectProps.set("stroke", "#FF0000");
  rectProps.set("strokeWidth", 1);
  rectProps.set("listening", false);
  rectProps.set("draggable", false);

  return { nodeId: rectId, element: rectElement };
};
