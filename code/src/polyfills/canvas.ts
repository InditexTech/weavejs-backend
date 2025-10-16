// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import { registerFont, Canvas, Image } from "canvas";

const registerCanvasCustomFonts = () => {
  // Impact font
  registerFont(path.resolve(process.cwd(), "fonts/Impact.ttf"), {
    family: "Impact",
    weight: "400",
    style: "normal",
  });
  // Verdana font
  registerFont(path.resolve(process.cwd(), "fonts/Verdana.ttf"), {
    family: "Verdana",
    weight: "400",
    style: "normal",
  });
  registerFont(path.resolve(process.cwd(), "fonts/Verdana-Bold.ttf"), {
    family: "Verdana",
    weight: "700",
    style: "normal",
  });
  registerFont(path.resolve(process.cwd(), "fonts/Verdana-Italic.ttf"), {
    family: "Verdana",
    weight: "400",
    style: "italic",
  });
  registerFont(path.resolve(process.cwd(), "fonts/Verdana-BoldItalic.ttf"), {
    family: "Verdana",
    weight: "700",
    style: "italic",
  });
  // Inter font family
  registerFont(path.resolve(process.cwd(), "fonts/inter-regular.ttf"), {
    family: "Inter",
    weight: "400",
    style: "normal",
  });
  registerFont(path.resolve(process.cwd(), "fonts/inter-bold.ttf"), {
    family: "Inter",
    weight: "700",
    style: "normal",
  });
  registerFont(path.resolve(process.cwd(), "fonts/inter-italic.ttf"), {
    family: "Inter",
    weight: "400",
    style: "italic",
  });
  registerFont(path.resolve(process.cwd(), "fonts/inter-italic-bold.ttf"), {
    family: "Inter",
    weight: "700",
    style: "italic",
  });
  // Sansita font family
  registerFont(path.resolve(process.cwd(), "fonts/sansita-regular.ttf"), {
    family: "Sansita",
    weight: "400",
    style: "normal",
  });
  registerFont(path.resolve(process.cwd(), "fonts/sansita-bold.ttf"), {
    family: "Sansita",
    weight: "700",
    style: "normal",
  });
};

// polyfills for Canvas in Node
export const setCanvasPolyfill = () => {
  registerCanvasCustomFonts();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.Image = Image;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.HTMLImageElement = Image;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.HTMLCanvasElement = new Canvas(1, 1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).document = {
    createElement: (tag: string) => {
      if (tag === "canvas") return new Canvas(1, 1);
      if (tag === "img") return new Image();
      return {};
    },
  };
};
