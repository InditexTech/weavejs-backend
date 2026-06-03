// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { performPersistRoom } from "@/store.js";
import * as Y from "yjs";

export const persistRoomDocument = async (pageId: string, doc: Y.Doc) => {
  const actualState = Y.encodeStateAsUpdate(doc);
  await performPersistRoom(pageId, actualState);
};
