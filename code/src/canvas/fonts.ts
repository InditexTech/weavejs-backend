// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import { registerFont } from "canvas";
import { FontLibrary } from "skia-canvas";
import { CanvasFont, SkiaFont } from "./types.js";

export const registerSkiaFonts = () => {
  const fonts: SkiaFont[] = [
    // Impact font family
    {
      family: "Impact",
      paths: [path.resolve(process.cwd(), "fonts/Impact.ttf")],
    },
    // Verdana font family
    {
      family: "Verdana",
      paths: [
        path.resolve(process.cwd(), "fonts/Verdana.ttf"),
        path.resolve(process.cwd(), "fonts/Verdana-Bold.ttf"),
        path.resolve(process.cwd(), "fonts/Verdana-Italic.ttf"),
        path.resolve(process.cwd(), "fonts/Verdana-BoldItalic.ttf"),
      ],
    },
    // Inter font family
    {
      family: "Inter",
      paths: [
        path.resolve(process.cwd(), "fonts/inter-regular.ttf"),
        path.resolve(process.cwd(), "fonts/inter-bold.ttf"),
        path.resolve(process.cwd(), "fonts/inter-italic.ttf"),
        path.resolve(process.cwd(), "fonts/inter-italic-bold.ttf"),
      ],
    },
    // Sansita font family
    {
      family: "Sansita",
      paths: [
        path.resolve(process.cwd(), "fonts/sansita-regular.ttf"),
        path.resolve(process.cwd(), "fonts/sansita-bold.ttf"),
      ],
    },
  ];

  for (const font of fonts) {
    FontLibrary.use(font.family, font.paths);
  }
};

export const registerCanvasFonts = () => {
  const fonts: CanvasFont[] = [
    // Impact font family
    {
      path: path.resolve(process.cwd(), "fonts/Impact.ttf"),
      fontFace: {
        family: "Impact",
        weight: "400",
        style: "normal",
      },
    },
    // Verdana font family
    {
      path: path.resolve(process.cwd(), "fonts/Verdana.ttf"),
      fontFace: {
        family: "Verdana",
        weight: "400",
        style: "normal",
      },
    },
    {
      path: path.resolve(process.cwd(), "fonts/Verdana-Bold.ttf"),
      fontFace: {
        family: "Verdana",
        weight: "700",
        style: "normal",
      },
    },
    {
      path: path.resolve(process.cwd(), "fonts/Verdana-Italic.ttf"),
      fontFace: {
        family: "Verdana",
        weight: "400",
        style: "italic",
      },
    },
    {
      path: path.resolve(process.cwd(), "fonts/Verdana-BoldItalic.ttf"),
      fontFace: {
        family: "Verdana",
        weight: "700",
        style: "italic",
      },
    },
    // Inter font family
    {
      path: path.resolve(process.cwd(), "fonts/inter-regular.ttf"),
      fontFace: {
        family: "Inter",
        weight: "400",
        style: "normal",
      },
    },
    {
      path: path.resolve(process.cwd(), "fonts/inter-bold.ttf"),
      fontFace: {
        family: "Inter",
        weight: "700",
        style: "normal",
      },
    },
    {
      path: path.resolve(process.cwd(), "fonts/inter-italic.ttf"),
      fontFace: {
        family: "Inter",
        weight: "400",
        style: "italic",
      },
    },
    {
      path: path.resolve(process.cwd(), "fonts/inter-italic-bold.ttf"),
      fontFace: {
        family: "Inter",
        weight: "700",
        style: "italic",
      },
    },
    // Sansita font family
    {
      path: path.resolve(process.cwd(), "fonts/sansita-regular.ttf"),
      fontFace: {
        family: "Sansita",
        weight: "400",
        style: "normal",
      },
    },
  ];

  for (const font of fonts) {
    registerFont(font.path, font.fontFace);
  }
};
