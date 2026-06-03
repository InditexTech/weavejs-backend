// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from "konva";
import * as Y from "yjs";
import { TemplateExecutionNodes } from "../types.js";
import { WeaveStateElement } from "@inditextech/weave-types";

export abstract class BaseNodeMapper<TN, N> {
  abstract getNodeFromTemplateAndExecution(
    node: TN,
    parameters: Record<string, TemplateExecutionNodes>,
  ): N | undefined;

  abstract mapNodeToWeaveState(
    node: N,
    origin: Konva.Vector2d,
  ): {
    nodeId: string;
    nodeState: WeaveStateElement;
  };

  abstract mapNodeToYjsFormat(
    node: N,
    origin: Konva.Vector2d,
  ): {
    nodeId: string;
    nodeState: WeaveStateElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yjsElement: Y.Map<any>;
  };
}
