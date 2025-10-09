// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { setCanvasPolyfill } from "./../polyfills/canvas.js";
import path from "node:path";
import { registerFont } from "canvas";
import { StoreStandalone } from "./store-standalone/store-standalone.js";
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
  WeaveImageToolAction,
} from "@inditextech/weave-sdk";
import { ColorTokenNode } from "./nodes/color-token/color-token.js";
import { isAbsoluteUrl, stripOrigin } from "../utils.js";

export type RenderWeaveRoom = {
  instance: Weave;
  destroy: () => void;
};

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

export const renderWeaveRoom = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any,
  roomData: string
): Promise<RenderWeaveRoom> => {
  let weave: Weave | undefined = undefined;

  const destroyWeaveRoom = () => {
    if (weave) {
      weave.destroy();
    }
  };

  return new Promise((resolve) => {
    registerCanvasCustomFonts();

    setCanvasPolyfill();

    const store = new StoreStandalone(
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
        actions: getActions(),
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

    weave.addEventListener("onRoomLoaded", (status: boolean) => {
      if (!weave) {
        return;
      }

      if (status) {
        roomLoaded = true;
      }

      if (roomLoaded && weave.asyncElementsLoaded()) {
        resolve({ instance: weave, destroy: destroyWeaveRoom });
      }
    });

    weave.addEventListener("onAsyncElementChange", () => {
      if (!weave) {
        return;
      }

      if (roomLoaded && weave.asyncElementsLoaded()) {
        resolve({ instance: weave, destroy: destroyWeaveRoom });
      }
    });

    weave.start();
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getNodes = (config: any) => {
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

const getActions = () => [new WeaveImageToolAction()];
