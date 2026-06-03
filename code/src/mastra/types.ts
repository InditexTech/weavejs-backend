// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { SourceDocumentUIPart } from "ai";
import { ImageOptions } from "./workflows/image-generation-or-edition-workflow/types.js";

export type CallTool = {
  toolCallId: string;
  toolName: string;
  type: "tool-call" | "tool-result";
  args: Record<string, unknown>;
  status:
    | "input-streaming"
    | "input-available"
    | "approval-requested"
    | "approval-responded"
    | "output-available"
    | "output-error"
    | "output-denied";
  result?: unknown;
};

export type Task = {
  id: string;
  name: string;
  status: "idle" | "running" | "completed" | "failed";
  tools: CallTool[];
};

export type ReferenceImage = {
  index: number;
  name: string;
  url: string;
  dataBase64: string;
  mimeType: string;
};

export type WeaveRuntimeContext = {
  roomId: string;
  pageId: string;
  threadId: string;
  resourceId: string;
  referenceNodes: SourceDocumentUIPart[];
  referenceImages: ReferenceImage[];
  imageOption: ImageOptions;
};
