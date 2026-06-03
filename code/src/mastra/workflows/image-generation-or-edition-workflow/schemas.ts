// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

export const imageOptionSchema = z.object({
  model: z.enum(["gemini-3.1-flash-image-preview"]),
  samples: z.number(),
  aspectRatio: z.enum([
    "1:1",
    "2:3",
    "3:2",
    "3:4",
    "4:3",
    "9:16",
    "16:9",
    "21:9",
  ]),
  quality: z.any().optional(),
  size: z.enum(["1K", "2K", "4K"]),
});

export const imageReferenceSchema = z.object({
  index: z.number(),
  name: z.string(),
  url: z.string(),
  dataBase64: z.string(),
  mimeType: z.string(),
});
