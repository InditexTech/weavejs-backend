// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { BlobServiceClient } from "@azure/storage-blob";

declare namespace Express {
  interface Request {
    storage: BlobServiceClient;
  }
}
