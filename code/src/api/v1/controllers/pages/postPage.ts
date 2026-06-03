// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { broadcastToGlobal, broadcastToRoom } from "@/comm-bus/comm-bus.js";
import {
  createPage,
  getLastPageRoom,
  getPage,
  getPageIndex,
  getPagePosition,
} from "@/database/controllers/page.js";
import { getTemplate } from "@/database/controllers/template.js";
import { TemplateModel } from "@/database/models/template.js";
import { addTemplateToRoom } from "@/templates/templates.js";
import { Request, Response } from "express";

export const postPageController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;

    const { pageId, name, templateId, target } = req.body;

    const pageObj = await getPage({
      roomId,
      pageId,
    });

    if (pageObj) {
      res.status(409).json({ status: "KO", message: "Page already exists" });
      return;
    }

    let template: TemplateModel | null = null;
    if (templateId) {
      template = await getTemplate({
        roomId: roomId,
        templateId: templateId,
      });

      if (!template) {
        res
          .status(404)
          .json({ status: "KO", message: "Template doesn't exists" });
        return;
      }

      if (template.kind !== "template") {
        res.status(400).json({
          status: "KO",
          message: "The provided template kind is not 'template'",
        });
        return;
      }
    }

    const lastPageRoom = await getLastPageRoom({
      roomId,
    });

    let position = 1;
    if (lastPageRoom) {
      const lastPagePosition = await getPagePosition({
        roomId,
        pageId: lastPageRoom.pageId,
      });
      position = Number(lastPagePosition) + 1;
    }

    let page = undefined;
    try {
      page = await createPage({
        roomId,
        pageId,
        name,
        position,
        status: "active",
      });

      if (template && target) {
        await addTemplateToRoom({
          page,
          template,
          target,
        });
      }
    } catch (error) {
      console.error("Error creating page:", error);
      page = await getPage({
        roomId,
        pageId,
      });
    }

    if (!page) {
      res.status(500).json({ status: "KO", message: "Error creating page" });
      return;
    }

    const pageIndex = await getPageIndex({
      roomId,
      pageId,
    });

    broadcastToGlobal({
      type: "pageCreated",
      payload: {
        roomId,
        pageId,
      },
    });

    broadcastToRoom(roomId, {
      roomId,
      type: "pageCreated",
      payload: {
        roomId,
        pageId,
      },
    });

    res.status(201).json({ ...page.dataValues, index: pageIndex });
  };
};
