// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

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
  WeaveMeasureNode,
  WeaveConnectorNode,
  WeaveStrokeSingleNode,
  setupSkiaBackend,
  WeavePolygonNode,
  // setupCanvasBackend,
} from "@inditextech/weave-sdk/server";
import { WeaveKonvaBaseRenderer } from "@inditextech/weave-renderer-konva-base/server";
// import { WeaveKonvaReactReconcilerRenderer } from "@inditextech/weave-renderer-konva-react-reconciler/server";
import { ColorTokenNode } from "./nodes/color-token/color-token.ts";
import { isAbsoluteUrl, assertSafeUrl } from "../utils.ts";
import { type ServiceConfig } from "../types.ts";
import {
  registerSkiaFonts,
  // registerCanvasFonts,
} from "./fonts.ts";
import { ImageTemplateNode } from "./nodes/image-template/image-template.ts";
import { MeasureNode } from "./nodes/measure/measure.ts";
import { PantoneNode } from "./nodes/pantone/pantone.ts";

export type RenderWeaveRoom = {
  instance: Weave;
  destroy: () => void;
};

export const renderWeaveRoom = (
  config: ServiceConfig,
  roomData: string,
): Promise<RenderWeaveRoom> => {
  let weave: Weave | undefined = undefined;

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    const destroyWeaveRoom = async () => {
      if (weave) {
        await weave.destroy();
      }
    };

    // Setup Skia backend
    registerSkiaFonts();
    await setupSkiaBackend();

    // Setup Canvas backend
    // registerCanvasFonts();
    // await setupCanvasBackend();

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
      },
    );

    const renderer = new WeaveKonvaBaseRenderer();
    // const renderer = new WeaveKonvaReactReconcilerRenderer();

    weave = new Weave(
      {
        store,
        renderer,
        nodes: getNodes(config),
        actions: [],
        plugins: [],
        fonts: [],
        logger: {
          level: "info",
        },
      },
      {
        container: undefined,
        width: 800,
        height: 600,
      },
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

    weave.addEventListener(
      "onAsyncElementsLoading",
      ({ loaded, total }: { loaded: number; total: number }) => {
        console.log(`loading async elements [${loaded} / ${total}]`);
      },
    );

    weave.addEventListener("onAsyncElementsLoaded", () => {
      console.log("async elements loaded");
      if (!weave) {
        return;
      }

      if (!weave.getStage()) {
        return false;
      }

      resolve({ instance: weave, destroy: destroyWeaveRoom });
    });

    await weave.start();
  });
};

/**
 * Rewrites a media asset URL so the server-side renderer can fetch it via
 * the internal service endpoint.
 *
 * Rules (evaluated in order):
 * 1. Any URL whose path starts with `/weavebff` — relative or absolute,
 *    any origin — is rewritten to `http://localhost:PORT<strippedPath>?_token=…`.
 *    This handles the common case where the client stored the full public URL
 *    (e.g. `https://prod.domain.com/weavebff/api/v1/images/foo`).
 * 2. An absolute URL that targets localhost/127.0.0.1 at the service port is
 *    treated as a trusted internal request and gets the internal token appended.
 * 3. All other absolute URLs pass through the SSRF guard (`assertSafeUrl`).
 */
function transformMediaUrl(url: string, config: ServiceConfig): string {
  const isAbsolute = isAbsoluteUrl(url);

  let urlPath: string;
  let parsed: URL | null = null;

  if (isAbsolute) {
    try {
      parsed = new URL(url);
      urlPath = parsed.pathname;
    } catch {
      return "";
    }
  } else {
    urlPath = url;
  }

  // Rule 1: any /weavebff path → rewrite to internal service URL.
  if (urlPath.startsWith("/weavebff")) {
    const strippedPath = urlPath.replace("/weavebff", "");
    const target = new URL(
      `http://localhost:${config.service.port}${strippedPath}`,
    );
    // Preserve original query params (if absolute URL had any).
    if (parsed) {
      parsed.searchParams.forEach((v, k) => target.searchParams.set(k, v));
    }
    target.searchParams.set("_token", config.internalToken);
    return target.toString();
  }

  // Rule 2: absolute URL targeting the service's own localhost.
  if (isAbsolute && parsed) {
    const isOwnService =
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
      parsed.port === String(config.service.port);

    if (isOwnService) {
      if (!parsed.searchParams.has("_token")) {
        parsed.searchParams.set("_token", config.internalToken);
      }
      return parsed.toString();
    }

    // Rule 3: external absolute URL — apply SSRF guard.
    try {
      assertSafeUrl(url);
    } catch {
      return "";
    }
  }

  return url;
}

const getNodes = (config: ServiceConfig) => {
  return [
    new WeaveStageNode(),
    new WeaveLayerNode(),
    new WeaveGroupNode(),
    new WeaveRectangleNode(),
    new WeaveEllipseNode(),
    new WeaveLineNode(),
    new WeaveStrokeNode(),
    new WeaveStrokeSingleNode(),
    new WeaveTextNode(),
    new WeaveImageNode({
      config: {
        useFallbackImage: false,
        urlTransformer: (url: string) => {
          return transformMediaUrl(url, config);
        },
      },
    }),
    new WeaveVideoNode({
      config: {
        urlTransformer: (url: string) => {
          return transformMediaUrl(url, config);
        },
      },
    }),
    new WeaveStarNode(),
    new WeaveArrowNode(),
    new WeaveRegularPolygonNode(),
    new WeavePolygonNode(),
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
    new WeaveMeasureNode(),
    new WeaveConnectorNode(),
    new ColorTokenNode(),
    new ImageTemplateNode(),
    new MeasureNode(),
    new PantoneNode(),
  ];
};
