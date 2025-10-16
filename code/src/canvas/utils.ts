// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import { CanvasFonts, registerCanvasFonts } from "@inditextech/weave-sdk";

export const registerFonts = () => {
  const fonts: CanvasFonts = [
    {
      // Impact font family
      path: path.resolve(process.cwd(), "fonts/Impact.ttf"),
      properties: {
        family: "Impact",
        weight: "400",
        style: "normal",
      },
    },
    {
      // Verdana font family
      path: path.resolve(process.cwd(), "fonts/Verdana.ttf"),
      properties: {
        family: "Verdana",
        weight: "400",
        style: "normal",
      },
    },
    {
      path: path.resolve(process.cwd(), "fonts/Verdana-Bold.ttf"),
      properties: {
        family: "Verdana",
        weight: "700",
        style: "normal",
      },
    },
    {
      path: path.resolve(process.cwd(), "fonts/Verdana-Italic.ttf"),
      properties: {
        family: "Verdana",
        weight: "400",
        style: "italic",
      },
    },
    {
      path: path.resolve(process.cwd(), "fonts/Verdana-BoldItalic.ttf"),
      properties: {
        family: "Verdana",
        weight: "700",
        style: "italic",
      },
    },
    // Inter font family
    {
      path: path.resolve(process.cwd(), "fonts/inter-regular.ttf"),
      properties: {
        family: "Inter",
        weight: "400",
        style: "normal",
      },
    },
    {
      path: path.resolve(process.cwd(), "fonts/inter-bold.ttf"),
      properties: {
        family: "Inter",
        weight: "700",
        style: "normal",
      },
    },
    {
      path: path.resolve(process.cwd(), "fonts/inter-italic.ttf"),
      properties: {
        family: "Inter",
        weight: "400",
        style: "italic",
      },
    },
    {
      path: path.resolve(process.cwd(), "fonts/inter-italic-bold.ttf"),
      properties: {
        family: "Inter",
        weight: "700",
        style: "italic",
      },
    },
    // Sansita font family
    {
      path: path.resolve(process.cwd(), "fonts/sansita-regular.ttf"),
      properties: {
        family: "Sansita",
        weight: "400",
        style: "normal",
      },
    },
    {
      path: path.resolve(process.cwd(), "fonts/sansita-bold.ttf"),
      properties: {
        family: "Sansita",
        weight: "700",
        style: "normal",
      },
    },
  ];

  registerCanvasFonts(fonts);
};
