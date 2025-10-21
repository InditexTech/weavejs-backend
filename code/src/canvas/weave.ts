// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
// Setup skia backend
import "konva/skia-backend";
import { Image as SkiaImage } from "skia-canvas";
import { WeaveStoreStandalone } from "@inditextech/weave-store-standalone/server";
import {
  Weave,
  WeaveStageNode,
  WeaveLayerNode,
  WeaveGroupNode,
  WeaveRectangleNode,
  WeaveEllipseNode,
  WeaveLineNode,
  WeaveTextNode,
  WeaveImageNode,
  WeaveVideoNode,
  WeaveStarNode,
  WeaveArrowNode,
  WeaveRegularPolygonNode,
  WeaveFrameNode,
  WeaveStrokeNode,
  SkiaFonts,
  registerSkiaFonts,
} from "@inditextech/weave-sdk/server";
import { ColorTokenNode } from "./nodes/color-token/color-token.js";
import { isAbsoluteUrl, stripOrigin } from "../utils.js";
import { ServiceConfig } from "../types.js";

export type RenderWeaveRoom = {
  instance: Weave;
  destroy: () => void;
};

export const setupSkiaEnvironment = () => {
  // Setup global Image for Weave SDK
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.HTMLImageElement = SkiaImage as any;
  global.window = {
    Image: SkiaImage,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.window.Image = SkiaImage as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.Image = SkiaImage as any;

  // Register fonts
  registerFonts();
};

export const renderWeaveRoom = (
  config: ServiceConfig,
  roomData: string
): Promise<RenderWeaveRoom> => {
  let weave: Weave | undefined = undefined;

  return new Promise((resolve) => {
    setupSkiaEnvironment();

    const destroyWeaveRoom = () => {
      if (weave) {
        weave.destroy();
      }
    };

    const store = new WeaveStoreStandalone(
      {
        roomData,
      },
      {
        getUser: () => {
          return {
            id: "user-dummy",
            name: "User Dummy",
            email: "user@mail.com",
          };
        },
      }
    );

    weave = new Weave(
      {
        store,
        nodes: getNodes(config),
        actions: [],
        plugins: [],
        fonts: [],
        logger: {
          level: "info",
        },
        serverSide: true,
      },
      {
        container: undefined,
        width: 800,
        height: 600,
      }
    );

    let roomLoaded = false;

    const checkIfRoomLoaded = () => {
      if (!weave) {
        return false;
      }

      if (!weave.getStage()) {
        return false;
      }

      if (roomLoaded && weave.asyncElementsLoaded()) {
        return true;
      }

      return false;
    };

    weave.addEventListener("onRoomLoaded", async (status: boolean) => {
      if (!weave) {
        return;
      }

      if (!weave.getStage()) {
        return false;
      }

      if (status) {
        roomLoaded = true;
      }

      if (checkIfRoomLoaded()) {
        resolve({ instance: weave, destroy: destroyWeaveRoom });
      }
    });

    weave.addEventListener("onAsyncElementChange", () => {
      if (!weave) {
        return;
      }

      if (!weave.getStage()) {
        return false;
      }

      if (checkIfRoomLoaded()) {
        resolve({ instance: weave, destroy: destroyWeaveRoom });
      }
    });

    weave.start();
  });
};

const getNodes = (config: ServiceConfig) => {
  return [
    new WeaveStageNode(),
    new WeaveLayerNode(),
    new WeaveGroupNode(),
    new WeaveRectangleNode(),
    new WeaveEllipseNode(),
    new WeaveLineNode(),
    new WeaveStrokeNode(),
    new WeaveTextNode(),
    new WeaveImageNode({
      config: {
        urlTransformer: (url: string) => {
          const isAbsolute = isAbsoluteUrl(url);

          let relativeUrl = url;
          if (isAbsolute) {
            relativeUrl = stripOrigin(url);
          }

          const transformedUrl = relativeUrl.replace("/weavebff", "");
          return `http://localhost:${config.service.port}${transformedUrl}`;
        },
      },
    }),
    new WeaveVideoNode({
      config: {
        urlTransformer: (url: string) => {
          const isAbsolute = isAbsoluteUrl(url);

          let relativeUrl = url;
          if (isAbsolute) {
            relativeUrl = stripOrigin(url);
          }

          const transformedUrl = relativeUrl.replace("/weavebff", "");
          return `http://localhost:${config.service.port}${transformedUrl}`;
        },
      },
    }),
    new WeaveStarNode(),
    new WeaveArrowNode(),
    new WeaveRegularPolygonNode(),
    new WeaveFrameNode({
      config: {
        fontFamily: "'Inter', sans-serif",
        fontStyle: "normal",
        fontSize: 14,
        borderColor: "#9E9994",
        fontColor: "#757575",
        titleMargin: 5,
        transform: {
          rotateEnabled: false,
          resizeEnabled: false,
          enabledAnchors: [] as string[],
        },
      },
    }),
    new ColorTokenNode(),
  ];
};

const registerFonts = () => {
  const fonts: SkiaFonts = [
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

  registerSkiaFonts(fonts);
};
