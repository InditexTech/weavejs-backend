// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { AbortRun } from "./errors.js";

export const assertRoomSafeguards = ({
  totalRooms,
  toDelete,
  maxRooms,
}: {
  totalRooms: number;
  toDelete: number;
  maxRooms: number;
}): void => {
  if (totalRooms === 0) {
    throw new AbortRun("the database contains no rooms, aborting");
  }

  if (toDelete > maxRooms) {
    throw new AbortRun(
      `${toDelete} rooms to delete exceed the limit of ${maxRooms}, aborting`,
    );
  }
};

export const assertBlobSafeguards = ({
  totalBlobs,
  toDelete,
  maxBlobs,
  maxPercent,
}: {
  totalBlobs: number;
  toDelete: number;
  maxBlobs: number;
  maxPercent: number;
}): void => {
  if (toDelete > maxBlobs) {
    throw new AbortRun(
      `${toDelete} blobs to delete exceed the limit of ${maxBlobs}, aborting`,
    );
  }

  if (totalBlobs > 0 && (toDelete / totalBlobs) * 100 > maxPercent) {
    throw new AbortRun(
      `${toDelete} of ${totalBlobs} blobs to delete exceed ${maxPercent}%, aborting`,
    );
  }
};
