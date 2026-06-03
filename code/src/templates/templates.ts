// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { getStore } from "@/store.js";
import * as Y from "yjs";
import { PageModel } from "@/database/models/page.js";
import { TemplateModel } from "@/database/models/template.js";
import Konva from "konva";
import { WeaveStateManipulation } from "@inditextech/weave-sdk";
import { WeaveStateElement } from "@inditextech/weave-types";
import { persistRoomDocument } from "./utils.js";
import { TemplateExecutionTarget } from "@/nodes-api/types.js";

export const addTemplateToRoom = async (params: {
  page: PageModel;
  template: TemplateModel;
  target: TemplateExecutionTarget;
}): Promise<void> => {
  const { page, template, target } = params;
  let roomDocument: Y.Doc | undefined = undefined;

  // Get room document
  roomDocument = await getStore().getRoomDocument(page.pageId);

  if (!roomDocument) {
    throw new Error(`Page [${page.pageId}] document doesn't exist`, {
      cause: "PageDocumentNotFound",
    });
  }

  // Get template
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let templateData: any | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    templateData = JSON.parse(params.template.templateData) as any;
  } catch {
    throw new Error(`Invalid template ${template.templateId}`, {
      cause: "InvalidTemplate",
    });
  }

  // Add template to room
  roomDocument.transact(() => {
    const layer = WeaveStateManipulation.getYjsElement(roomDocument, target.id);

    if (layer) {
      const { elements } = templateToYjsElements(templateData, target);
      WeaveStateManipulation.addElements(layer, elements);
    }
  });

  await persistRoomDocument(page.pageId, roomDocument);
};

const templateToYjsElements = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  template: any,
  target: TemplateExecutionTarget,
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

  for (let i = 0; i < template.length; i++) {
    const node = template[i];
    const positionedNode = {
      ...node,
      props: {
        ...node.props,
        x: node.props.x + origin.x,
        y: node.props.y + origin.y,
      },
    };
    const { element } = WeaveStateManipulation.mapNodeToYjs(
      positionedNode as unknown as WeaveStateElement,
    );

    if (!element) {
      continue;
    }

    elements.push(element);
  }

  return { elements };
};
