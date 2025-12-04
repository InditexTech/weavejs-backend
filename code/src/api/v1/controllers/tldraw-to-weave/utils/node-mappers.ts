import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";

type mappingContext = {
  contentKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contentValue: any;
  nodeIdsMapping: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assets: Record<string, any>;
};

const extractNodeId = (contentKey: string): string => {
  const tokens = contentKey.split(":");
  if (tokens.length === 2) {
    return tokens[1];
  }
  return tokens[2];
};

async function getImageInfoFromUrl(url: string) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Error fetching image: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const metadata = await sharp(buffer).metadata();
  return metadata;
}

export const tlDrawToWeaveNodeMappers: Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (context: mappingContext) => any
> = {
  draw: async (context: mappingContext) => {
    const { nodeIdsMapping, contentKey, contentValue } = context;
    const nodeId = extractNodeId(contentKey);
    nodeIdsMapping[nodeId] = uuidv4();

    const points = contentValue.props.segments[0].points.map(
      (pt: { x: number; y: number; z: number }) => {
        return { x: pt.x, y: pt.y, pressure: pt.z };
      }
    );

    const width =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Math.max(...points.map((pt: any) => pt.x)) -
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Math.min(...points.map((pt: any) => pt.x));
    const height =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Math.max(...points.map((pt: any) => pt.y)) -
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Math.min(...points.map((pt: any) => pt.y));

    const strokeNode = {
      key: nodeIdsMapping[nodeId],
      props: {
        id: nodeIdsMapping[nodeId],
        tldrawId: contentKey,
        tldrawIndex: contentValue.index,
        dashEnabled: false,
        isEraser: false,
        lineCap: "round",
        lineJoin: "bevel",
        stroke: contentValue.props.color,
        strokeScaleEnabled: true,
        strokeWidth: 8,
        nodeType: "stroke",
        adding: false,
        strokeElements: points,
        x: contentValue.x,
        y: contentValue.y,
        width: width,
        height: height,
        rotation: radToDeg(contentValue.rotation),
        skewX: 0,
        skewY: 0,
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        zIndex: 0,
        children: [],
      },
      type: "stroke",
    };

    return strokeNode;
  },
  frame: async (context: mappingContext) => {
    const { nodeIdsMapping, contentKey, contentValue } = context;
    const nodeId = extractNodeId(contentKey);
    nodeIdsMapping[nodeId] = uuidv4();

    const frameNode = {
      key: nodeIdsMapping[nodeId],
      props: {
        id: nodeIdsMapping[nodeId],
        tldrawId: contentKey,
        tldrawIndex: contentValue.index,
        borderColor: "#9E9994",
        borderWidth: 1,
        editing: false,
        fontColor: "#757575",
        fontFamily: "Helvetica",
        fontSize: 14,
        fontStyle: "normal",
        frameBackground: "#FFFFFFFF",
        frameHeight: contentValue.props.h,
        frameWidth: contentValue.props.w,
        title: contentValue.props.name || "Untitled frame",
        titleMargin: 5,
        nodeType: "frame",
        adding: false,
        x: contentValue.x,
        y: contentValue.y,
        width: contentValue.props.w,
        height: contentValue.props.h,
        rotation: radToDeg(contentValue.rotation),
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0,
        zIndex: 0,
        children: [],
      },
      type: "frame",
    };

    return frameNode;
  },
  image: async (context: mappingContext) => {
    const { nodeIdsMapping, contentKey, contentValue } = context;
    const nodeId = extractNodeId(contentKey);
    nodeIdsMapping[nodeId] = uuidv4();

    const asset = context.assets[contentValue.props.assetId];

    const imageMetadata = await getImageInfoFromUrl(asset.url);

    let cropInfo = undefined;
    let cropSize = undefined;
    let uncroppedImage = undefined;
    if (
      asset &&
      contentValue.props.crop !== null &&
      !(
        contentValue.props.crop.topLeft.x === 0 &&
        contentValue.props.crop.topLeft.y === 0 &&
        contentValue.props.crop.bottomRight.x === 1 &&
        contentValue.props.crop.bottomRight.y === 1
      )
    ) {
      const originalWidth =
        (1 /
          (contentValue.props.crop.bottomRight.x -
            contentValue.props.crop.topLeft.x)) *
        contentValue.props.w;
      const originalHeight =
        (1 /
          (contentValue.props.crop.bottomRight.y -
            contentValue.props.crop.topLeft.y)) *
        contentValue.props.h;

      const scaleXOriginal = originalWidth / imageMetadata.width;
      const actualScale = originalWidth / asset.props.w;

      uncroppedImage = {
        width: originalWidth,
        height: originalHeight,
      };
      cropSize = {
        x: asset.props.w * contentValue.props.crop.topLeft.x,
        y: asset.props.h * contentValue.props.crop.topLeft.y,
        width:
          (asset.props.w * contentValue.props.crop.bottomRight.x -
            asset.props.w * contentValue.props.crop.topLeft.x) *
          actualScale,
        height:
          (asset.props.h * contentValue.props.crop.bottomRight.y -
            asset.props.h * contentValue.props.crop.topLeft.y) *
          actualScale,
      };
      cropInfo = {
        scaleX: scaleXOriginal,
        scaleY: scaleXOriginal,
        ...cropSize,
      };
    }

    if (!uncroppedImage) {
      uncroppedImage = {
        width: contentValue.props.w,
        height: contentValue.props.h,
      };
    }

    const imageNode = {
      key: nodeIdsMapping[nodeId],
      props: {
        id: nodeIdsMapping[nodeId],
        tldrawId: contentKey,
        tldrawIndex: contentValue.index,
        nodeType: "image",
        adding: false,
        x: contentValue.x,
        y: contentValue.y,
        width: cropSize ? cropSize.width : contentValue.props.w,
        height: cropSize ? cropSize.height : contentValue.props.h,
        rotation: radToDeg(contentValue.rotation),
        imageInfo: {
          width: imageMetadata.width,
          height: imageMetadata.height,
        },
        imageWidth: asset.props.w,
        imageHeight: asset.props.h,
        imageURL: asset.url,
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        stroke: "#000000ff",
        strokeScaleEnabled: true,
        strokeWidth: 0,
        zIndex: 0,
        children: [],
        cropInfo,
        cropSize,
        uncroppedImage,
      },
      type: "image",
    };

    return imageNode;
  },
  ["pantone-shape"]: async (context: mappingContext) => {
    const { nodeIdsMapping, contentKey, contentValue } = context;
    const nodeId = extractNodeId(contentKey);
    nodeIdsMapping[nodeId] = uuidv4();

    const aspectRatioPantone = 160 / 240;

    const pantoneNode = {
      key: nodeIdsMapping[nodeId],
      props: {
        id: nodeIdsMapping[nodeId],
        nodeType: "pantone",
        tldrawId: contentKey,
        tldrawIndex: contentValue.index,
        pantone: contentValue.props.pantone.hex,
        x: contentValue.x,
        y: contentValue.y,
        width: contentValue.props.w,
        height: contentValue.props.h / aspectRatioPantone,
        rotation: radToDeg(contentValue.rotation),
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0,
        zIndex: 0,
        children: [],
      },
      type: "pantone",
    };

    return pantoneNode;
  },
  text: async (context: mappingContext) => {
    const { nodeIdsMapping, contentKey, contentValue } = context;
    const nodeId = extractNodeId(contentKey);
    nodeIdsMapping[nodeId] = uuidv4();

    const textNode = {
      key: nodeIdsMapping[nodeId],
      props: {
        id: nodeIdsMapping[nodeId],
        tldrawId: contentKey,
        tldrawIndex: contentValue.index,
        nodeType: "text",
        text: contentValue.props.text,
        align: contentValue.props.align,
        verticalAlign: "top",
        fontFamily: "NotoSansMono, monospace",
        fontSize: 24,
        fill: contentValue.props.color,
        x: contentValue.x,
        y: contentValue.y,
        layout: "auto-all",
        // width: contentValue.props.w * (1 / contentValue.props.scale),
        // height: 20,
        rotation: radToDeg(contentValue.rotation),
        skewX: 0,
        skewY: 0,
        opacity: 1,
        scaleX: contentValue.props.scale,
        scaleY: contentValue.props.scale,
        stroke: "#000000ff",
        strokeScaleEnabled: true,
        strokeWidth: 0,
        zIndex: 0,
        children: [],
      },
      type: "text",
    };

    return textNode;
  },
};

function radToDeg(rad: number): number {
  return rad * (180 / Math.PI);
}
