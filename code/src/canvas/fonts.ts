// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import { registerFont } from "canvas";
import { FontLibrary } from "skia-canvas";
import { CanvasFont, SkiaFont } from "./types.js";

let registered = false;

export const registerSkiaFonts = () => {
  if (registered) {
    return;
  }

  FontLibrary.reset();

  const fonts: SkiaFont[] = [];

  // Arial font family

  fonts.push({
    family: "Arial",
    paths: [
      path.resolve(process.cwd(), "fonts/ARIAL.TTF"),
      path.resolve(process.cwd(), "fonts/ARIALBD.TTF"),
      path.resolve(process.cwd(), "fonts/ARIALI 1.TTF"),
      path.resolve(process.cwd(), "fonts/ARIALBI.TTF"),
    ],
  });

  // Fuzzy Bubbles font family

  fonts.push({
    family: "Fuzzy Bubbles",
    paths: [
      path.resolve(process.cwd(), "fonts/FuzzyBubbles-Regular.ttf"),
      path.resolve(process.cwd(), "fonts/FuzzyBubbles-Bold.ttf"),
    ],
  });

  // Inter font family

  fonts.push({
    family: "Inter",
    paths: [
      path.resolve(process.cwd(), "fonts/inter-bold.ttf"),
      path.resolve(process.cwd(), "fonts/inter-italic.ttf"),
      path.resolve(process.cwd(), "fonts/inter-italic-bold.ttf"),
      path.resolve(process.cwd(), "fonts/inter-regular.ttf"),
    ],
  });

  // Noto Sans font family

  fonts.push({
    family: "Noto Sans Mono",
    paths: [
      path.resolve(process.cwd(), "fonts/NotoSansMono-Regular.ttf"),
      path.resolve(process.cwd(), "fonts/NotoSansMono-Bold.ttf"),
    ],
  });

  // Roboto Mono font family

  fonts.push({
    family: "Roboto Mono",
    paths: [
      path.resolve(process.cwd(), "fonts/RobotoMono-Regular.ttf"),
      path.resolve(process.cwd(), "fonts/RobotoMono-Bold.ttf"),
      path.resolve(process.cwd(), "fonts/RobotoMono-Italic.ttf"),
      path.resolve(process.cwd(), "fonts/RobotoMono-BoldItalic.ttf"),
    ],
  });

  // Sansita font family

  fonts.push({
    family: "Sansita",
    paths: [
      path.resolve(process.cwd(), "fonts/sansita-bold.ttf"),
      path.resolve(process.cwd(), "fonts/sansita-regular.ttf"),
    ],
  });

  // Special Gothic Condensed One font family

  fonts.push({
    family: "Special Gothic Condensed One",
    paths: [
      path.resolve(
        process.cwd(),
        "fonts/SpecialGothicCondensedOne-Regular.ttf",
      ),
    ],
  });

  for (const font of fonts) {
    FontLibrary.use(font.family, font.paths);
  }

  console.log(FontLibrary.family("Arial")); // Log registered font families

  registered = true;
};

export const registerCanvasFonts = () => {
  const fonts: CanvasFont[] = [];

  // Arial font family

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/ARIAL.TTF"),
    fontFace: {
      family: "Arial",
      weight: "400",
      style: "normal",
    },
  });

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/ARIALBD.TTF"),
    fontFace: {
      family: "Arial",
      weight: "700",
      style: "normal",
    },
  });

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/ARIALI.TTF"),
    fontFace: {
      family: "Arial",
      weight: "400",
      style: "italic",
    },
  });

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/ARIALBI.TTF"),
    fontFace: {
      family: "Arial",
      weight: "700",
      style: "italic",
    },
  });

  // Fuzzy Bubbles font family

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/FuzzyBubbles-Regular.ttf"),
    fontFace: {
      family: "Fuzzy Bubbles",
      weight: "400",
      style: "normal",
    },
  });

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/FuzzyBubbles-Bold.ttf"),
    fontFace: {
      family: "Fuzzy Bubbles",
      weight: "700",
      style: "normal",
    },
  });

  // Inter font family

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/inter-regular.ttf"),
    fontFace: {
      family: "Inter",
      weight: "400",
      style: "normal",
    },
  });

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/inter-bold.ttf"),
    fontFace: {
      family: "Inter",
      weight: "700",
      style: "normal",
    },
  });

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/inter-italic.ttf"),
    fontFace: {
      family: "Inter",
      weight: "400",
      style: "italic",
    },
  });

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/inter-italic-bold.ttf"),
    fontFace: {
      family: "Inter",
      weight: "700",
      style: "italic",
    },
  });

  // Noto Sans Mono font family

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/NotoSansMono-Regular.ttf"),
    fontFace: {
      family: "Noto Sans Mono",
      weight: "400",
      style: "normal",
    },
  });

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/NotoSansMono-Bold.ttf"),
    fontFace: {
      family: "Noto Sans Mono",
      weight: "700",
      style: "normal",
    },
  });

  // Roboto Mono font family

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/RobotoMono-Regular.ttf"),
    fontFace: {
      family: "Roboto Mono",
      weight: "400",
      style: "normal",
    },
  });

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/RobotoMono-Bold.ttf"),
    fontFace: {
      family: "Roboto Mono",
      weight: "700",
      style: "normal",
    },
  });

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/RobotoMono-Italic.ttf"),
    fontFace: {
      family: "Roboto Mono",
      weight: "400",
      style: "italic",
    },
  });

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/RobotoMono-BoldItalic.ttf"),
    fontFace: {
      family: "Roboto Mono",
      weight: "700",
      style: "italic",
    },
  });

  // Sansita font family

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/sansita-regular.ttf"),
    fontFace: {
      family: "Sansita",
      weight: "400",
      style: "normal",
    },
  });

  fonts.push({
    path: path.resolve(process.cwd(), "fonts/sansita-bold.ttf"),
    fontFace: {
      family: "Sansita",
      weight: "700",
      style: "normal",
    },
  });

  // Special Gothic Condensed One font family

  fonts.push({
    path: path.resolve(
      process.cwd(),
      "fonts/SpecialGothicCondensedOne-Regular.ttf",
    ),
    fontFace: {
      family: "Special Gothic Condensed One",
      weight: "400",
      style: "normal",
    },
  });

  for (const font of fonts) {
    registerFont(font.path, font.fontFace);
  }
};
