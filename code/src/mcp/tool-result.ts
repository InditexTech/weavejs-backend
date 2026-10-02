// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const toolErrorResult = (message: string) => ({
  content: [{ type: "text" as const, text: `Error: ${message}` }],
  structuredContent: { error: message },
});
