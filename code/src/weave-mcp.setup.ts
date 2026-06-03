// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  WeaveElementAttributes,
  WeaveStateElement,
} from "@inditextech/weave-types";
import {
  getDefaultAddNodeState,
  getDefaultCreateNodeTypeDefaultState,
  getDefaultNodeTypesInformation,
  getDefaultUpdateNodeState,
} from "./mcp/defaults.js";

export const getAvailableNodes = () => {
  return getDefaultNodeTypesInformation();
};

export const createNodeTypeDefaultState = (
  nodeId: string,
  nodeType: string,
) => {
  return getDefaultCreateNodeTypeDefaultState(nodeId, nodeType);
};

export const addNodeState = (
  defaultNodeState: WeaveStateElement,
  props: WeaveElementAttributes,
) => {
  return getDefaultAddNodeState(defaultNodeState, props);
};

export const updateNodeState = (
  prevNodeState: WeaveStateElement,
  nextProps: WeaveElementAttributes,
) => {
  return getDefaultUpdateNodeState(prevNodeState, nextProps);
};
