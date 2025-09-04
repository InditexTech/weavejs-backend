// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from "yjs";

export type DefineRoomInitialState = (doc: Y.Doc) => void;

export type StoreStandaloneParams = {
  roomData: string;
  defineRoomInitialState?: DefineRoomInitialState;
};
