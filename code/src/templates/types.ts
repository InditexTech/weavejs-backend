// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { DeepPartial } from "@inditextech/weave-types";

export type TemplateMetadata = {
  key: string;
  width: number;
  height: number;
};

export type ImageMetadata = {
  imageId: string;
  imageURL: string;
  width: number;
  height: number;
};

export type TemplateDetails = {
  template: TemplateMetadata;
  image: ImageMetadata;
};

// Proposal for the template format, it can be extended in the future if needed

export type ImageFit = "cover" | "contain";

export type NodeKind = "image" | "text" | "frame";

export interface BaseNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageNode extends BaseNode {
  kind: Extract<NodeKind, "image">;
  image: {
    source: string;
    width: number;
    height: number;
  };
  fit: ImageFit;
}

export interface TextNode extends BaseNode {
  kind: Extract<NodeKind, "text">;
  fontFamily: string;
  fontSize: number;
  align: "left" | "center" | "right";
  verticalAlign: "top" | "middle" | "bottom";
  fill: string;
  layout: "smart";
  text: string;
}

export interface FrameNode extends BaseNode {
  kind: Extract<NodeKind, "frame">;
  name: string;
  children: RenderNode[];
}

export type RenderNode = ImageNode | TextNode | FrameNode;

export interface TemplateNodeBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "image" | "text" | "frame";
  editable: boolean;
  optional: boolean;
}

export interface TemplateImageNode extends TemplateNodeBase {
  kind: "image";
}

export interface TemplateTextNode extends TemplateNodeBase {
  kind: "text";
  defaultProperties?: DeepPartial<{
    fontFamily: string;
    fontSize: number;
    align: "left" | "center" | "right";
    verticalAlign: "top" | "middle" | "bottom";
    fill: string;
    layout: "smart";
    text: string;
  }>;
}

export interface TemplateFrameNode extends TemplateNodeBase {
  kind: "frame";
  children: TemplateFormatNodes[];
  defaultProperties?: DeepPartial<{
    name: string;
    width: number;
    height: number;
  }>;
}

export interface TemplateFormatBase {
  version: string;
  id: string;
  name: string;
}

export type TemplateFormatNodes =
  | TemplateImageNode
  | TemplateTextNode
  | TemplateFrameNode;

export interface TemplateFormat extends TemplateFormatBase {
  version: "1.0";
  nodes: TemplateFormatNodes[];
}

export interface TemplateNodeExecutionBase {
  nodeId: string;
  kind: "image" | "text" | "frame";
}

export interface TemplateImageNodeExecution extends TemplateNodeExecutionBase {
  kind: "image";
  properties: {
    image: {
      source: string;
      width: number;
      height: number;
    };
    fit: ImageFit;
  };
}

export interface TemplateTextNodeExecution extends TemplateNodeExecutionBase {
  kind: "text";
  properties: {
    fontFamily?: string;
    fontSize?: number;
    align?: "left" | "center" | "right";
    verticalAlign?: "top" | "middle" | "bottom";
    fill?: string;
    layout?: "smart";
    text: string;
  };
}

export interface TemplateFrameNodeExecution extends TemplateNodeExecutionBase {
  kind: "frame";
  children: TemplateExecutionNodes[];
  properties: {
    name: string;
    width: number;
    height: number;
  };
}

export interface TemplateExecutionBase {
  id: string;
}

export type TemplateExecutionNodes =
  | TemplateImageNodeExecution
  | TemplateTextNodeExecution
  | TemplateFrameNodeExecution;

export interface TemplateExecution extends TemplateExecutionBase {
  target: {
    id: string;
    position: {
      x: number;
      y: number;
    };
  };
  nodes: Record<string, TemplateExecutionNodes>;
}

export type TemplateExecutionSuccess = {
  id: string;
  nodeId: string;
};

export type TemplateExecutionFailure = {
  id: string;
  cause: string;
  message: string;
};

export type TemplateExecutionSkipped = {
  id: string;
};
