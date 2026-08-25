// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { BlobServiceClient } from "@azure/storage-blob";

// This file has a top-level import, which makes it a module — ambient
// declarations must be wrapped in `declare global` to actually augment the
// global Express namespace, otherwise they stay module-local and are never
// picked up by files that use `req.isInternalRequest` / `req.storage`.
declare global {
  namespace Express {
    interface Request {
      storage: BlobServiceClient;
      isInternalRequest?: boolean;
    }
  }
}
