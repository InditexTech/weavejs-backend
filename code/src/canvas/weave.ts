// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// polyfills for Konva in Node
import path from "node:path";
import { createCanvas, Image, registerFont } from "canvas";
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
  WeaveStarNode,
  WeaveArrowNode,
  WeaveRegularPolygonNode,
  WeaveFrameNode,
  WeaveStrokeNode,
  WeaveImageToolAction,
} from "@inditextech/weave-sdk";
import { WEAVE_TRANSFORMER_ANCHORS } from "@inditextech/weave-types";
import { ColorTokenNode } from "./nodes/color-token/color-token.js";
import { getServiceConfig } from "../config/config.js";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.Image = Image;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).document = {
  createElement: () => {
    return createCanvas(1, 1);
  },
};

export type RenderWeaveRoom = {
  instance: Weave;
  destroy: () => void;
};

export const renderWeaveRoom = (roomData: string): Promise<RenderWeaveRoom> => {
  let weave: Weave | undefined = undefined;

  const destroyWeaveRoom = () => {
    if (weave) {
      weave.destroy();
    }
  };

  return new Promise((resolve) => {
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

    weave = new Weave(
      {
        store,
        nodes: getNodes(),
        actions: getActions(),
        plugins: [],
        fonts: [],
        logger: {
          level: "info",
        },
        serverSide: true,
      },
      {
        container: null,
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

// const inter = Inter({
//   preload: true,
//   variable: "--inter",
//   subsets: ["latin"],
// });

const getNodes = () => {
  const config = getServiceConfig();

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
          const transformedURL = url.replace("/weavebff", "");
          return `http://localhost:${config.service.port}${transformedURL}`;
        },
        transform: {
          enabledAnchors: [
            WEAVE_TRANSFORMER_ANCHORS.TOP_LEFT,
            WEAVE_TRANSFORMER_ANCHORS.TOP_RIGHT,
            WEAVE_TRANSFORMER_ANCHORS.BOTTOM_LEFT,
            WEAVE_TRANSFORMER_ANCHORS.BOTTOM_RIGHT,
          ],
          keepRatio: true,
        },
        onDblClick: (instance: WeaveImageNode, node: Konva.Group) => {
          instance.triggerCrop(node);
        },
      },
    }),
    new WeaveStarNode(),
    new WeaveArrowNode(),
    new WeaveRegularPolygonNode(),
    new WeaveFrameNode({
      config: {
        // fontFamily: inter.style.fontFamily,
        fontFamily: "Arial",
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
