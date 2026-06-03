// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import * as Y from "yjs";
import Konva from "konva";
import { BaseNode, TemplateNodeBase } from "../types.js";
import { WeaveStateElement } from "@inditextech/weave-types";
import { WeaveStateManipulation } from "@inditextech/weave-sdk";
import { BaseNodeMapper } from "./base.js";

export class DebugNodeMapper implements BaseNodeMapper<
  TemplateNodeBase,
  BaseNode
> {
  constructor() {}

  getNodeFromTemplateAndExecution(): BaseNode | undefined {
    return undefined;
  }

  mapNodeToWeaveState(
    node: BaseNode,
    origin: Konva.Vector2d,
  ): {
    nodeId: string;
    nodeState: WeaveStateElement;
  } {
    const nodeId = uuidv4();

    const nodeState: WeaveStateElement = {
      key: nodeId,
      type: "rectangle",
      props: {
        id: nodeId,
        nodeType: "rectangle",
        name: "node",
        children: [],
        x: origin.x + node.x,
        y: origin.y + node.y,
        width: node.width,
        height: node.width,
        fill: "transparent",
        stroke: "#FF0000",
        strokeWidth: 1,
        listening: false,
        draggable: false,
      },
    };

    return { nodeId, nodeState };
  }

  mapNodeToYjsFormat = (
    node: BaseNode,
    origin: Konva.Vector2d,
  ): {
    nodeId: string;
    nodeState: WeaveStateElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yjsElement: Y.Map<any>;
  } => {
    const { nodeId, nodeState } = this.mapNodeToWeaveState(node, origin);
    const { element } = WeaveStateManipulation.mapNodeToYjs(nodeState);

    return {
      nodeId,
      nodeState,
      yjsElement: element,
    };
  };
}
