// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { getStore } from "@/store.js";
import * as Y from "yjs";
import { getTemplate } from "@/database/controllers/template.js";
import { ImageMetadata, TemplateDetails, TemplateMetadata } from "./types.js";
import { WeaveStateElement } from "@inditextech/weave-types";
import { isAbsoluteUrl, stripOrigin } from "@/utils.js";
import { getServiceConfig } from "@/config/config.js";

export const addTemplateToRoom = async (params: {
  roomId?: string;
  roomName?: string;
  frameName: string;
  templateInstanceId: string;
  templateId: string;
  imagesIds: string[];
}) => {
  let roomDocument: Y.Doc | undefined = undefined;

  let createdRoom = false;

  // Try to get room document by id or name
  if (params.roomId) {
    roomDocument = await getStore().getRoomDocument(params.roomId);
  }

  // If room name is provided is a new room, so create it and get the document
  if (params.roomName) {
    roomDocument = await getStore().getRoomDocument(params.roomName);
    createdRoom = true;
  }

  if (!roomDocument) {
    throw new Error(
      `Room [${createdRoom ? params.roomName : params.roomId}] document failed to ${createdRoom ? "create" : "retrieve"}`,
    );
  }

  // Get template data
  const template = await getTemplate({
    roomId: params.templateInstanceId,
    templateId: params.templateId,
  });

  if (!template) {
    throw new Error(
      `Template [${params.templateId}] not found in room [${params.templateInstanceId}]`,
    );
  }

  // Parse template data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let templateData: any = undefined;
  try {
    templateData = JSON.parse(template.templateData);
  } catch (err) {
    throw new Error(
      `Error parsing template [${params.templateId}] data: ${err}`,
    );
  }

  // Validate if template data exists
  if (!templateData) {
    throw new Error(
      `Template data is empty for template [${params.templateId}]`,
    );
  }

  // Get template elements
  const templateElements = Object.keys(templateData.weave);

  // Validate template has only one element
  if (templateElements.length === 0 || templateElements.length > 1) {
    throw new Error(
      `Template [${params.templateId}] has invalid number of elements [${templateElements.length}], expected 1`,
    );
  }

  // Get template element
  const templateElement = templateData.weave[templateElements[0]];

  // Extract template images metadata
  const extractedTemplates: Record<string, TemplateMetadata> = {};
  extractTemplateImagesMetadata(templateElement.element, extractedTemplates);

  // Map extracted template images metadata with provided images ids
  if (params.imagesIds.length > Object.keys(extractedTemplates).length) {
    throw new Error(
      `Number of images provided [${params.imagesIds.length}] is greater than number of images in template [${Object.keys(extractedTemplates).length}]`,
    );
  }

  const templatesDetails: Record<string, TemplateDetails> = {};
  const templateImageKeys = Object.keys(extractedTemplates);
  for (let i = 0; i < params.imagesIds.length; i++) {
    const imageId = params.imagesIds[i];
    const templateImageKey = templateImageKeys[i];
    const templateImage = extractedTemplates[templateImageKey];
    const imageMetadata = await getImageMetadata(
      imageId,
      `/weavebff/api/v1/weavejs/templates/${params.templateInstanceId}/images/${imageId}`,
    );
    templatesDetails[templateImage.key] = {
      template: templateImage,
      image: imageMetadata,
    };
  }

  // Add template to room
  roomDocument.transact(() => {
    const mainLayer = getMainLayerFromDocument(roomDocument);

    if (mainLayer) {
      const element = templateToElementYjs({
        frameName: params.frameName,
        template: templateElement.element,
        templateInstanceId: params.templateInstanceId,
        templatesDetails,
      });
      mainLayer.get("props").get("children").push([element]);
    }
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getMainLayerFromDocument = (doc: Y.Doc): Y.Map<any> | null => {
  const stage = doc.getMap("weave");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stageProps = stage.get("props") as Y.Map<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stageChildren = stageProps.get("children") as Y.Array<any>;
  for (let i = 0; i < stageChildren.length; i++) {
    const child = stageChildren.get(i);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const childProps = child.get("props") as Y.Map<any>;
    if (childProps.get("id") === "mainLayer") {
      return child;
    }
  }
  return null;
};

const templateToElementYjs = (
  {
    frameName,
    template,
    templateInstanceId,
    templatesDetails,
  }: {
    frameName: string;
    template: WeaveStateElement;
    templateInstanceId: string;
    templatesDetails: Record<string, TemplateDetails>;
  },
  deep: number = 0,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Y.Map<any> => {
  const id = uuidv4();
  const type = template.type as string;

  const element = new Y.Map();
  const elementProps = new Y.Map();
  const elementChildren = new Y.Array();

  element.set("key", id);
  element.set("type", type);

  const actualKey = template.key;
  const keys = Object.keys(template.props);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (["children"].includes(key)) continue;

    if (typeof template.props[key] !== "string") {
      elementProps.set(key, template.props[key]);
      continue;
    }

    const replacedValue = template.props[key].replace(actualKey, id);
    elementProps.set(key, replacedValue);
  }

  if (deep === 0) {
    elementProps.set("x", 0);
    elementProps.set("y", 0);
  }

  elementProps.set("children", elementChildren);
  element.set("props", elementProps);

  if (type === "frame") {
    elementProps.set("title", frameName);
  }

  if (type === "image-template") {
    // create image node
    const imageId = uuidv4();
    const imageElement = new Y.Map();
    const imageProps = new Y.Map();

    imageElement.set("key", imageId);
    imageElement.set("type", "image");
    imageElement.set("props", imageProps);

    imageProps.set("id", imageId);
    imageProps.set("nodeType", "image");
    imageProps.set("name", "node");
    imageProps.set("children", new Y.Array());

    const templateDetail = templatesDetails?.[template.key];

    if (templateDetail) {
      imageProps.set("imageId", templateDetail.image.imageId);
      imageProps.set("imageURL", templateDetail.image.imageURL);

      const tw = templateDetail.template.width;
      const th = templateDetail.template.height;
      const iw = templateDetail.image.width;
      const ih = templateDetail.image.height;

      const imageRatio = iw / ih;
      const groupRatio = tw / th;

      let scaleX, scaleY, x, y;
      if (imageRatio > groupRatio) {
        // image is wider -> fit height
        scaleX = th / ih;
        scaleY = scaleX;
        x = (tw - iw * scaleX) / 2;
        y = 0;
      } else {
        // image is taller -> fit width
        scaleX = tw / iw;
        scaleY = scaleX;
        x = 0;
        y = (th - ih * scaleX) / 2;
      }

      imageProps.set("x", x);
      imageProps.set("y", y);
      imageProps.set("width", iw);
      imageProps.set("height", ih);
      imageProps.set("scaleX", scaleX);
      imageProps.set("scaleY", scaleY);
      const imageInfo = new Y.Map();
      imageInfo.set("width", iw);
      imageInfo.set("height", ih);
      imageProps.set("imageInfo", imageInfo);
      imageProps.set("imageWidth", iw);
      imageProps.set("imageHeight", ih);
      const uncroppedImage = new Y.Map();
      uncroppedImage.set("width", iw);
      uncroppedImage.set("height", ih);
      imageProps.set("uncroppedImage", uncroppedImage);
      imageProps.set("draggable", false);
      imageProps.set("listening", false);

      elementProps.set("originalImageWidth", iw);
      elementProps.set("originalImageHeight", ih);
      elementProps.set("isUsed", true);
      elementProps.set("fit", "cover");

      elementChildren.push([imageElement]);
    }
  }

  if (
    !["image-template"].includes(type) &&
    template.props.children &&
    Array.isArray(template.props.children) &&
    template.props.children.length > 0
  ) {
    for (let j = 0; j < template.props.children.length; j++) {
      const childTemplate = template.props.children[j];
      const childElement = templateToElementYjs(
        {
          frameName,
          template: childTemplate,
          templateInstanceId,
          templatesDetails,
        },
        deep + 1,
      );
      elementChildren.push([childElement]);
    }
  }

  return element;
};

const extractTemplateImagesMetadata = (
  template: WeaveStateElement,
  metadata: Record<string, TemplateMetadata>,
) => {
  if (template.type === "image-template") {
    metadata[template.key] = {
      key: template.key,
      width: template.props.width,
      height: template.props.height,
    };
  } else {
    const children: WeaveStateElement[] = template.props?.children ?? [];
    if (children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        const childTemplate = children[i];
        extractTemplateImagesMetadata(childTemplate, metadata);
      }
    }
  }
};

const getImageMetadata = async (
  imageId: string,
  imageURL: string,
): Promise<ImageMetadata> => {
  const config = getServiceConfig();

  const isAbsolute = isAbsoluteUrl(imageURL);

  let relativeUrl = imageURL;
  if (isAbsolute) {
    relativeUrl = stripOrigin(imageURL);
  }

  const transformedUrl = relativeUrl.replace("/weavebff", "");
  const fetchUrl = `http://localhost:${config.service.port}${transformedUrl}`;

  const res = await fetch(fetchUrl);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  const metadata = await sharp(buffer).metadata();

  return {
    imageId,
    imageURL,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
  };
};
