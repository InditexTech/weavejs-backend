// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createCanvas, Image } from "canvas";

// polyfills for Canvas in Node
export const setCanvasPolyfill = () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.Image = Image;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.HTMLImageElement = Image;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.HTMLCanvasElement = createCanvas(1, 1).constructor;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).document = {
    createElement: (tag: string) => {
      if (tag === "canvas") return createCanvas(1, 1);
      if (tag === "img") return new Image();
      return {};
    },
  };
};
