// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  WeaveFrameNode,
  WeaveImageNode,
  WeaveRectangleNode,
  WeaveRegularPolygonNode,
  WeaveStarNode,
  WeaveStrokeSingleNode,
  WeaveTextNode,
} from "@inditextech/weave-sdk/server";
import { NodeTypeInformation } from "./types.js";
import {
  WeaveElementAttributes,
  WeaveStateElement,
} from "@inditextech/weave-types";

export const getDefaultNodeTypesInformation = (): NodeTypeInformation[] => {
  return [
    {
      type: "regular-polygon",
      description:
        "Regular Polygon node, a regular polygon shape with fill and stroke properties.",
      schema: JSON.stringify(
        WeaveRegularPolygonNode.getSchema().toJSONSchema(),
        null,
        2,
      ),
    },
    {
      type: "star",
      description: "Star node, a star shape with fill and stroke properties.",
      schema: JSON.stringify(WeaveStarNode.getSchema().toJSONSchema(), null, 2),
    },
    {
      type: "stroke-single",
      description:
        "Stroke Single node, a single stoke shape with stroke properties.",
      schema: JSON.stringify(
        WeaveStrokeSingleNode.getSchema().toJSONSchema(),
        null,
        2,
      ),
    },
    {
      type: "rectangle",
      description:
        "Rectangle node, a rectangular shape with fill and stroke properties.",
      schema: JSON.stringify(
        WeaveRectangleNode.getSchema().toJSONSchema(),
        null,
        2,
      ),
    },
    {
      type: "frame",
      description:
        "Frame node, a rectangular container with background and title, accepts other nodes as children.",
      schema: JSON.stringify(
        WeaveFrameNode.getSchema().toJSONSchema(),
        null,
        2,
      ),
    },
    {
      type: "text",
      description: "Text node, a node that displays text.",
      schema: JSON.stringify(WeaveTextNode.getSchema().toJSONSchema(), null, 2),
    },
    {
      type: "image",
      description:
        "Image node, a node that displays an image from a source URL.",
      schema: JSON.stringify(
        WeaveImageNode.getSchema().toJSONSchema(),
        null,
        2,
      ),
    },
  ];
};

export const getDefaultCreateNodeTypeDefaultState = (
  nodeId: string,
  nodeType: string,
): WeaveStateElement | undefined => {
  switch (nodeType) {
    case "stroke-single": {
      return WeaveStrokeSingleNode.defaultState(nodeId);
    }
    case "regular-polygon": {
      return WeaveRegularPolygonNode.defaultState(nodeId);
    }
    case "star": {
      return WeaveStarNode.defaultState(nodeId);
    }
    case "text": {
      return WeaveTextNode.defaultState(nodeId);
    }
    case "frame": {
      return WeaveFrameNode.defaultState(nodeId);
    }
    case "image": {
      return WeaveImageNode.defaultState(nodeId);
    }
    case "rectangle": {
      return WeaveRectangleNode.defaultState(nodeId);
    }
    default:
      return undefined;
  }
};

export const getDefaultAddNodeState = (
  defaultNodeState: WeaveStateElement,
  props: WeaveElementAttributes,
): WeaveStateElement | undefined => {
  switch (defaultNodeState.type) {
    case "stroke-single": {
      return WeaveStrokeSingleNode.addNodeState(defaultNodeState, props);
    }
    case "regular-polygon": {
      return WeaveRegularPolygonNode.addNodeState(defaultNodeState, props);
    }
    case "star": {
      return WeaveStarNode.addNodeState(defaultNodeState, props);
    }
    case "text": {
      return WeaveTextNode.addNodeState(defaultNodeState, props);
    }
    case "frame": {
      return WeaveFrameNode.addNodeState(defaultNodeState, props);
    }
    case "image": {
      return WeaveImageNode.addNodeState(defaultNodeState, props);
    }
    case "rectangle": {
      return WeaveRectangleNode.addNodeState(defaultNodeState, props);
    }
    default:
      return undefined;
  }
};

export const getDefaultUpdateNodeState = (
  prevNodeState: WeaveStateElement,
  nextProps: WeaveElementAttributes,
): WeaveStateElement | undefined => {
  switch (prevNodeState.type) {
    case "text": {
      return WeaveTextNode.updateNodeState(prevNodeState, nextProps);
    }
    case "frame": {
      return WeaveFrameNode.updateNodeState(prevNodeState, nextProps);
    }
    case "image": {
      return WeaveImageNode.updateNodeState(prevNodeState, nextProps);
    }
    case "rectangle": {
      return WeaveRectangleNode.updateNodeState(prevNodeState, nextProps);
    }
    default:
      return undefined;
  }
};

export const getNodeTypes = () => {
  return [
    "stroke-single",
    "regular-polygon",
    "star",
    "text",
    "rectangle",
    "frame",
    "image",
  ];
};
