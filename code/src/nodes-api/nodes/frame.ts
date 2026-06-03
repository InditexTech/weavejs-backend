// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import * as Y from "yjs";
import Konva from "konva";
import {
  FrameNode,
  RenderNode,
  TemplateExecutionNodes,
  TemplateFrameNode,
  TemplateFrameNodeExecution,
} from "../types.js";
import { WeaveStateElement } from "@inditextech/weave-types";
import {
  WeaveStateManipulation,
  mergeExceptArrays,
  WeaveFrameNode,
} from "@inditextech/weave-sdk";
import { BaseNodeMapper } from "./base.js";
import { getNodeMapperByKind } from "../index.js";

export class FrameNodeMapper implements BaseNodeMapper<
  TemplateFrameNode,
  FrameNode
> {
  constructor() {}

  getNodeFromTemplateAndExecution(
    node: TemplateFrameNode,
    parameters: Record<string, TemplateExecutionNodes>,
  ) {
    const frameExecution = parameters[node.id] as TemplateFrameNodeExecution;

    if (!frameExecution) {
      return undefined;
    }

    return mergeExceptArrays(
      {
        ...node,
        ...node.defaultProperties,
      },
      {
        ...frameExecution.properties,
        children: node.children
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((child: any, index: number) => {
            const childExecution = node.children[index];
            if (!childExecution) {
              return undefined;
            }
            const mapHandler = getNodeMapperByKind(child.kind);
            return mapHandler.getNodeFromTemplateAndExecution(
              child,
              parameters,
            ) as RenderNode;
          })
          .filter((child) => child !== undefined),
        kind: "frame",
      } as FrameNode,
    );
  }

  mapNodeToWeaveState(
    node: FrameNode,
    origin: Konva.Vector2d,
  ): {
    nodeId: string;
    nodeState: WeaveStateElement;
  } {
    if (node.kind !== "frame") {
      throw new Error("Node is not an frame");
    }

    const nodeId = uuidv4();

    const tx = node.x;
    const ty = node.y;
    const tw = node.width;
    const th = node.height;

    const nodeState: WeaveStateElement = WeaveFrameNode.defaultState(nodeId);
    nodeState.props = {
      ...nodeState.props,
      x: origin.x + tx,
      y: origin.y + ty,
      frameWidth: tw,
      frameHeight: th,
      title: node.name,
    };

    const childrenMapped: WeaveStateElement[] = [];
    if (node.children.length > 0) {
      for (const actNode of node.children) {
        const mapHandler = getNodeMapperByKind(actNode.kind);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { nodeState } = mapHandler.mapNodeToWeaveState(actNode as any, {
          x: 0,
          y: 0,
        });
        childrenMapped.push(nodeState);
      }
    }

    nodeState.props.children = childrenMapped;

    const imageSchema = WeaveFrameNode.getSchema();
    const parsedState = imageSchema.safeParse(nodeState);

    if (!parsedState.success) {
      throw new Error(
        `Invalid node state for frame node ${node.id}: ${parsedState.error}`,
        {
          cause: "InvalidFrameNodeState",
        },
      );
    }

    return { nodeId, nodeState };
  }

  mapNodeToYjsFormat(
    node: FrameNode,
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
}
