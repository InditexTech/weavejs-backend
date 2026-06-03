// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import Konva from "konva";
import {
  setupSkiaBackend,
  // setupCanvasBackend,
} from "@inditextech/weave-sdk/server";
import { registerSkiaFonts } from "@/canvas/fonts.js";

export const registerTool = (server: McpServer) => {
  server.registerTool(
    "measure-styed-text",
    {
      title:
        "Provides measurement information from a text with specific styles.",
      description:
        "Returns the width and height of a text with specific styles.",
      inputSchema: z.object({
        text: z.string().describe("The text to measure."),
        style: z.object({
          fontFamily: z
            .string()
            .default("Arial")
            .describe("Font family of the text, e.g. Arial, Helvetica, etc."),
          fontSize: z
            .number()
            .default(16)
            .describe("Font size of the text in pixels."),
          fontStyle: z
            .string()
            .regex(/^(?:normal|bold|\d+)(?: italic)?$/)
            .default("normal")
            .describe(
              'Font style of the text, can be "normal", "bold", "400", "italic" or a combination like "bold italic" or "700 italic".',
            ),
          fontVariant: z
            .enum(["normal", "small-caps"])
            .describe(
              'Font variant of the text, can be "normal" or "small-caps".',
            ),
          textDecoration: z
            .enum(["line-through", "underline"])
            .describe(
              'Text decoration can be "line-through", "underline" or not defined to avoid decoration at all.',
            ),
          letterSpacing: z
            .number()
            .default(0)
            .describe("Spacing between letters in pixels."),
          lineHeight: z
            .number()
            .default(1)
            .describe("Line height of the text, as a multiplier of font size."),
          align: z
            .enum(["left", "center", "right", "justify"])
            .default("left")
            .describe(
              'Text alignment, can be "left", "center", "right" or "justify".',
            ),
          verticalAlign: z
            .enum(["top", "middle", "bottom"])
            .default("top")
            .describe(
              "Vertical alignment of the text, can be 'top', 'middle' or 'bottom'.",
            ),
        }),
      }),
      outputSchema: z.object({
        width: z.number().describe("Width of the text in pixels"),
        height: z.number().describe("Height of the text in pixels"),
      }),
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async ({ text, style }) => {
      let width = 0;
      let height = 0;

      registerSkiaFonts();
      await setupSkiaBackend();

      const textNode = new Konva.Text({
        text: text,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontStyle: style.fontStyle,
        fontVariant: style.fontVariant,
        textDecoration: style.textDecoration,
        letterSpacing: style.letterSpacing,
        lineHeight: style.lineHeight,
        align: style.align,
        verticalAlign: style.verticalAlign,
      });

      const lines = text.split("\n");
      for (const line of lines) {
        const textSize = textNode.measureSize(line);
        if (textSize.width > width) {
          width = textSize.width;
        }
        height = height + textSize.height * (textNode.lineHeight() ?? 1);
      }

      const measurement = {
        width: width * 1.01,
        height: height * 1.01,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(measurement),
          },
        ],
        structuredContent: {
          ...measurement,
        },
      };
    },
  );
};
