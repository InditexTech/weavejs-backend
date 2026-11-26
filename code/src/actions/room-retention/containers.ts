// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { ContainerNames } from "./config.js";
import type { LiveSet } from "./liveSet.js";

export type OwnerKind = "roomOrPage" | "room" | "presentation";

export type ContainerSpec = {
  name: string;
  kind: OwnerKind;
  // Identifier of the owner encoded in a blob name.
  ownerKey: (blobName: string) => string;
};

const IMAGE_FALLBACK_SUFFIX = "-image-fallback";

const firstSegment = (blobName: string): string => {
  const index = blobName.indexOf("/");
  return index === -1 ? blobName : blobName.slice(0, index);
};

const wholeName = (blobName: string): string => blobName;

const withoutFallbackSuffix = (blobName: string): string =>
  blobName.endsWith(IMAGE_FALLBACK_SUFFIX)
    ? blobName.slice(0, -IMAGE_FALLBACK_SUFFIX.length)
    : blobName;

export const buildContainerSpecs = (names: ContainerNames): ContainerSpec[] => [
  // <pageId>, <pageId>-image-fallback (legacy rooms: <roomId>)
  { name: names.rooms, kind: "roomOrPage", ownerKey: withoutFallbackSuffix },
  { name: names.roomsThumbnails, kind: "room", ownerKey: wholeName },
  { name: names.images, kind: "room", ownerKey: firstSegment },
  { name: names.videos, kind: "room", ownerKey: firstSegment },
  { name: names.generatedImages, kind: "room", ownerKey: firstSegment },
  { name: names.exportedImages, kind: "room", ownerKey: firstSegment },
  { name: names.exportedPdf, kind: "room", ownerKey: firstSegment },
  { name: names.pagesThumbnails, kind: "room", ownerKey: firstSegment },
  { name: names.templatesImages, kind: "room", ownerKey: firstSegment },
  { name: names.standaloneImages, kind: "room", ownerKey: firstSegment },
  {
    name: names.standaloneInstanceImageData,
    kind: "room",
    ownerKey: firstSegment,
  },
  // <presentationModeId>/<pageId>
  {
    name: names.presentationImages,
    kind: "presentation",
    ownerKey: firstSegment,
  },
];

export const ownerExists = (
  spec: ContainerSpec,
  blobName: string,
  live: LiveSet,
): boolean => {
  const key = spec.ownerKey(blobName);

  switch (spec.kind) {
    case "roomOrPage":
      return live.pageIds.has(key) || live.roomIds.has(key);
    case "room":
      return live.roomIds.has(key);
    case "presentation":
      return live.presentationModeIds.has(key);
  }
};
