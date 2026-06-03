// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import * as Y from "yjs";
import Konva from "konva";
import {
  TemplateExecutionNodes,
  TemplateTextNode,
  TemplateTextNodeExecution,
  TextNode,
} from "../types.js";
import { WeaveStateElement } from "@inditextech/weave-types";
import {
  WeaveStateManipulation,
  mergeExceptArrays,
  WeaveTextNode,
} from "@inditextech/weave-sdk";
import { BaseNodeMapper } from "./base.js";

export class TextNodeMapper implements BaseNodeMapper<
  TemplateTextNode,
  TextNode
> {
  constructor() {}

  getNodeFromTemplateAndExecution(
    node: TemplateTextNode,
    parameters: Record<string, TemplateExecutionNodes>,
  ): TextNode | undefined {
    const textExecution = parameters[node.id] as TemplateTextNodeExecution;

    if (!textExecution) {
      return undefined;
    }

    return mergeExceptArrays(
      {
        ...node,
        ...node.defaultProperties,
      },
      {
        ...textExecution.properties,
        kind: "text",
      },
    ) as TextNode;
  }

  mapNodeToWeaveState(
    node: TextNode,
    origin: Konva.Vector2d,
  ): {
    nodeId: string;
    nodeState: WeaveStateElement;
  } {
    if (node.kind !== "text") {
      throw new Error("Node is not a text");
    }

    const nodeId = uuidv4();

    const tx = node.x;
    const ty = node.y;
    const tw = node.width;
    const th = node.height;

    const nodeState: WeaveStateElement = WeaveTextNode.defaultState(nodeId);
    nodeState.props = {
      ...nodeState.props,
      x: origin.x + tx,
      y: origin.y + ty,
      width: tw,
      height: th,
      fontFamily: node.fontFamily,
      fontSize: node.fontSize,
      textDecoration: "",
      fill: node.fill,
      align: node.align,
      verticalAlign: node.verticalAlign,
      text: node.text,
      layout: node.layout,
      fillAfterStrokeEnabled: true,
      stroke: "#D6D6D6",
      strokeEnabled: true,
      strokeScaleEnabled: true,
      strokeWidth: 2,
    };

    const imageSchema = WeaveTextNode.getSchema();
    const parsedState = imageSchema.safeParse(nodeState);

    if (!parsedState.success) {
      throw new Error(
        `Invalid node state for text node ${node.id}: ${parsedState.error}`,
        {
          cause: "InvalidTextNodeState",
        },
      );
    }

    return {
      nodeId,
      nodeState,
    };
  }

  mapNodeToYjsFormat(
    node: TextNode,
    origin: Konva.Vector2d,
  ): {
    nodeId: string;
    nodeState: WeaveStateElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yjsElement: Y.Map<any>;
  } {
    if (node.kind !== "text") {
      throw new Error("Node is not a text");
    }

    const { nodeId, nodeState } = this.mapNodeToWeaveState(node, origin);
    const { element } = WeaveStateManipulation.mapNodeToYjs(nodeState);

    return {
      nodeId,
      nodeState,
      yjsElement: element,
    };
  }
}
