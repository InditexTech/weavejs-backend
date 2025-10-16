// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

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

    weave.addEventListener("onRoomLoaded", async (status: boolean) => {
      if (!weave) {
        return;
      }

      if (status) {
        roomLoaded = true;
      }

      if (roomLoaded && weave.asyncElementsLoaded()) {
        await sleep(2000);

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

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
