// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Agent } from "@mastra/core/agent";
import { getMemory } from "../connectors.js";
import { ANALYSIS_MODEL } from "../index.js";

export const getResultSummaryAgent = async () => {
  const memory = await getMemory();

  return new Agent({
    id: "result-summary-agent",
    name: "Result Summary Agent",
    instructions: `
      You're a specialized agent that summarizes the user's request plan execution result.
    `,
    model: ANALYSIS_MODEL,
    memory,
  });
};
