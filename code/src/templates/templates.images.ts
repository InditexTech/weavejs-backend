// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { getStore } from "@/store.js";
import * as Y from "yjs";
import { PageModel } from "@/database/models/page.js";
import { TemplateModel } from "@/database/models/template.js";
import Konva from "konva";
import { WeaveStateManipulation } from "@inditextech/weave-sdk";
import { persistRoomDocument } from "./utils.js";
import { getNodeMapperByKind } from "@/nodes-api/index.js";
import {
  TemplateExecutionNodes,
  TemplateExecutionTarget,
  TemplateFormat,
} from "@/nodes-api/types.js";

export const addImageTemplateToRoom = async (params: {
  page: PageModel;
  template: TemplateModel;
  target: TemplateExecutionTarget;
  parameters: Record<string, TemplateExecutionNodes>;
  debug: boolean;
}): Promise<void> => {
  const { page, template, target, parameters } = params;
  let roomDocument: Y.Doc | undefined = undefined;

  // Get room document
  roomDocument = await getStore().getRoomDocument(page.pageId);

  if (!roomDocument) {
    throw new Error(`Page [${page.pageId}] document doesn't exist`, {
      cause: "PageDocumentNotFound",
    });
  }

  // Get template
  let templateData: TemplateFormat | null = null;
  try {
    templateData = JSON.parse(params.template.templateData) as TemplateFormat;
  } catch {
    throw new Error(`Invalid template ${template.templateId}`, {
      cause: "InvalidTemplate",
    });
  }

  // Add template to room
  let error: unknown | undefined = undefined;
  roomDocument.transact(() => {
    try {
      const layer = WeaveStateManipulation.getYjsElement(
        roomDocument,
        target.id,
      );

      if (layer) {
        const { elements } = templateToYjsElements(
          templateData,
          target,
          parameters,
          params.debug,
        );
        WeaveStateManipulation.addElements(layer, elements);
      }
    } catch (ex) {
      error = ex;
    }
  });

  if (error) {
    throw error;
  }

  await persistRoomDocument(page.pageId, roomDocument);
};

const templateToYjsElements = (
  template: TemplateFormat,
  target: TemplateExecutionTarget,
  parameters: Record<string, TemplateExecutionNodes>,
  debug: boolean,
): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: Y.Map<any>[];
} => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elements: Y.Map<any>[] = [];

  const origin: Konva.Vector2d = {
    x: target.position.x,
    y: target.position.y,
  };

  for (let i = 0; i < template.nodes.length; i++) {
    const node = template.nodes[i];
    const executionNode = parameters[node.id];

    if (!executionNode && node.optional) {
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

    const mapHandler = getNodeMapperByKind(node.kind);
    const toAddNode = mapHandler.getNodeFromTemplateAndExecution(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      node as any,
      parameters,
    );
    const { yjsElement } = mapHandler.mapNodeToYjsFormat(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toAddNode as any,
      origin,
    );
    element = yjsElement;

    if (!element) {
      continue;
    }

    elements.push(element);

    if (debug) {
      const debugMapper = getNodeMapperByKind("debug");
      const { yjsElement: debugElement } = debugMapper.mapNodeToYjsFormat(
        node,
        origin,
      );
      elements.push(debugElement);
    }
  }

  return { elements };
};
