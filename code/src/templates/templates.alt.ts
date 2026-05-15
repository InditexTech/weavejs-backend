// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { getStore } from "@/store.js";
import * as Y from "yjs";
import {
  RenderNode,
  TemplateFormat,
  TemplateExecution,
  TemplateExecutionSuccess,
  TemplateExecutionSkipped,
  TemplateExecutionFailure,
  TextNode,
  FrameNode,
  ImageNode,
  TemplateFormatNodes,
  TemplateExecutionNodes,
  TemplateImageNodeExecution,
  TemplateTextNodeExecution,
  TemplateFrameNodeExecution,
} from "./types.js";
import { getRoom } from "@/database/controllers/room.js";
import { RoomModel } from "@/database/models/room.js";
import { PageModel } from "@/database/models/page.js";
import { getPage } from "@/database/controllers/page.js";
import Konva from "konva";
import { testTemplates } from "./test.templates.js";
import { mergeExceptArrays } from "@inditextech/weave-sdk";
import { imageNodeToYjsFormat } from "./nodes/image.js";
import { textNodeToYjsFormat } from "./nodes/text.js";
import { frameNodeToYjsFormat } from "./nodes/frame.js";
import { debugNodeToYjsFormat } from "./nodes/debug.js";

export const addJsonTemplateToRoomV1 = async (params: {
  roomId: string;
  pageId: string;
  template: TemplateExecution;
  debug: boolean;
}): Promise<{
  success: TemplateExecutionSuccess[];
  skipped: TemplateExecutionSkipped[];
  failure: TemplateExecutionFailure[];
}> => {
  let room: RoomModel | null = null;
  let page: PageModel | null = null;
  let roomDocument: Y.Doc | undefined = undefined;

  // Get room
  room = await getRoom({
    roomId: params.roomId,
  });

  if (!room) {
    throw new Error(`Room [${params.roomId}] doesn't exist`, {
      cause: "RoomNotFound",
    });
  }

  page = await getPage({
    roomId: params.roomId,
    pageId: params.pageId,
  });

  if (!page) {
    throw new Error(
      `Room [${params.roomId}] doesn't have page [${params.pageId}]`,
      {
        cause: "RoomPageNotFound",
      },
    );
  }

  // Get room document
  roomDocument = await getStore().getRoomDocument(page.pageId);

  if (!roomDocument) {
    throw new Error(`Page [${page.pageId}] document doesn't exist`, {
      cause: "PageDocumentNotFound",
    });
  }

  // Get template

  let template: TemplateFormat | null = null;
  if (testTemplates[params.template.id]) {
    template = testTemplates[params.template.id];
  }

  if (!template) {
    throw new Error(`Template [${params.template.id}] doesn't exist`, {
      cause: "TemplateNotFound",
    });
  }

  let success: TemplateExecutionSuccess[] = [];
  let skipped: TemplateExecutionSkipped[] = [];
  let failure: TemplateExecutionFailure[] = [];

  // Add template to room
  roomDocument.transact(() => {
    const layer = getLayerFromDocument(roomDocument, params.template.target.id);

    if (layer) {
      const {
        elements,
        success: successInfo,
        skipped: skippedInfo,
        failure: failureInfo,
      } = templateToYjsElements(template, params.template, params.debug);
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        layer.get("props").get("children").push([element]);
      }

      success = successInfo;
      skipped = skippedInfo;
      failure = failureInfo;
    }
  });

  return {
    success,
    skipped,
    failure,
  };
};

const getLayerFromDocument = (
  doc: Y.Doc,
  layerId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Y.Map<any> | null => {
  const stage = doc.getMap("weave");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stageProps = stage.get("props") as Y.Map<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stageChildren = stageProps.get("children") as Y.Array<any>;
  for (let i = 0; i < stageChildren.length; i++) {
    const child = stageChildren.get(i);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const childProps = child.get("props") as Y.Map<any>;
    if (childProps.get("id") === layerId) {
      return child;
    }

    if (childProps.get("children")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const childChildren = childProps.get("children") as Y.Array<any>;
      for (let j = 0; j < childChildren.length; j++) {
        const grandChild = childChildren.get(j);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const grandChildProps = grandChild.get("props") as Y.Map<any>;
        if (grandChildProps.get("id") === layerId) {
          return grandChild;
        }
      }
    }
  }
  return null;
};

const templateToYjsElements = (
  template: TemplateFormat,
  execution: TemplateExecution,
  debug: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: Y.Map<any>[];
  success: TemplateExecutionSuccess[];
  skipped: TemplateExecutionSkipped[];
  failure: TemplateExecutionFailure[];
} => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elements: Y.Map<any>[] = [];

  const origin: Konva.Vector2d = {
    x: execution.target.position.x,
    y: execution.target.position.y,
  };

  const success: TemplateExecutionSuccess[] = [];
  const skipped: TemplateExecutionSkipped[] = [];
  const failure: TemplateExecutionFailure[] = [];

  for (let i = 0; i < template.nodes.length; i++) {
    const node = template.nodes[i];
    const executionNode = execution.nodes[node.id];

    if (!executionNode && node.optional) {
      skipped.push({
        id: node.id,
      });
      continue;
    }

    if (!executionNode && !node.optional) {
      throw new Error(
        `Node [${node.id}] is not optional but no execution info provided`,
        {
          cause: "ExecutionNodeNotFound",
        },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let element: Y.Map<any> | undefined = undefined;
    switch (node.kind) {
      case "text": {
        try {
          const toAddNode: TextNode = nodeFromTemplateAndExecution(
            node,
            executionNode,
          ) as TextNode;

          const { nodeId, element: elementInfo } = textNodeToYjsFormat(
            origin,
            toAddNode,
          );
          success.push({
            id: node.id,
            nodeId,
          });
          element = elementInfo;
        } catch (error) {
          failure.push({
            id: node.id,
            cause:
              error instanceof Error && error.cause
                ? (error.cause as string)
                : "Unknown",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
        break;
      }
      case "image": {
        try {
          const toAddNode: ImageNode = nodeFromTemplateAndExecution(
            node,
            executionNode,
          ) as ImageNode;

          const { nodeId, element: elementInfo } = imageNodeToYjsFormat(
            origin,
            toAddNode,
          );
          success.push({
            id: node.id,
            nodeId,
          });
          element = elementInfo;
        } catch (error) {
          failure.push({
            id: node.id,
            cause:
              error instanceof Error && error.cause
                ? (error.cause as string)
                : "Unknown",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
        break;
      }
      case "frame": {
        try {
          const toAddNode: FrameNode = nodeFromTemplateAndExecution(
            node,
            executionNode,
          ) as FrameNode;

          const { nodeId, element: elementInfo } = frameNodeToYjsFormat(
            origin,
            toAddNode,
          );
          success.push({
            id: node.id,
            nodeId,
          });
          element = elementInfo;
        } catch (error) {
          failure.push({
            id: node.id,
            cause:
              error instanceof Error && error.cause
                ? (error.cause as string)
                : "Unknown",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
        break;
      }
      default:
        break;
    }

    if (!element) {
      continue;
    }

    elements.push(element);

    if (debug) {
      const { element: debugElement } = debugNodeToYjsFormat(origin, node);
      elements.push(debugElement);
    }
  }

  return { elements, success, skipped, failure };
};

const nodeFromTemplateAndExecution = (
  node: TemplateFormatNodes,
  execution: TemplateExecutionNodes,
): RenderNode | undefined => {
  switch (node.kind) {
    case "image": {
      const imageExecution = execution as TemplateImageNodeExecution;
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
    case "text": {
      const textExecution = execution as TemplateTextNodeExecution;
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
    case "frame": {
      const frameExecution = execution as TemplateFrameNodeExecution;
      return mergeExceptArrays(
        {
          ...node,
          ...node.defaultProperties,
        },
        {
          ...frameExecution.properties,
          children: node.children
            .map((child, index) => {
              const childExecution = frameExecution.children[index];
              if (!childExecution) {
                return undefined;
              }
              return nodeFromTemplateAndExecution(
                child,
                childExecution,
              ) as RenderNode;
            })
            .filter((child) => child !== undefined),
          kind: "frame",
        } as FrameNode,
      );
    }
    default: {
      return undefined;
    }
  }
};
