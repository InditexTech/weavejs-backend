// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

export const imageReferenceSchema = z.object({
  index: z.number(),
  name: z.string(),
  url: z.string(),
  dataBase64: z.string(),
  mimeType: z.string(),
});
