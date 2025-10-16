// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
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
  WeaveImageToolAction,
  CanvasFonts,
  registerCanvasFonts,
} from "@inditextech/weave-sdk";
import { ColorTokenNode } from "./nodes/color-token/color-token.js";
import { isAbsoluteUrl, stripOrigin } from "../utils.js";
import { ServiceConfig } from "../types.js";

export type RenderWeaveRoom = {
  instance: Weave;
  destroy: () => void;
};

export const renderWeaveRoom = (
  config: ServiceConfig,
  roomData: string
): Promise<RenderWeaveRoom> => {
  let weave: Weave | undefined = undefined;

  registerFonts();

  const destroyWeaveRoom = () => {
    if (weave) {
      weave.destroy();
    }
  };

  return new Promise((resolve) => {
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

    weave.addEventListener("onRoomLoaded", async (status: boolean) => {
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

const getActions = () => [new WeaveImageToolAction()];

const registerFonts = () => {
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
