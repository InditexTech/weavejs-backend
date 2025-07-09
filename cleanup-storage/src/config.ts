// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { ActionConfig } from "./types.js";

const actionConfigSchema = z.object({
  dryRun: z.boolean(),
  storage: z.object({
    accountName: z
        .string({
          required_error:
            "Define the Azure Storage account name on the environment variable AZURE_STORAGE_ACCOUNT_NAME",
        })
        .trim(),
    rooms: z.object({
      containerName: z
        .string({
          required_error:
            "Define the Azure Blob Storage container name for the rooms data on the environment variable AZURE_STORAGE_ROOMS_CONTAINER_NAME",
        })
        .trim(),
    }),
    images: z.object({
      containerName: z
        .string({
          required_error:
            "Define the Azure Blob Storage container name for the images data on the environment variable AZURE_STORAGE_IMAGES_CONTAINER_NAME",
        })
        .trim(),
    }),
  }),
});

export function getActionConfig(): ActionConfig {
  const dryRun = process.env.DRY_RUN === "true";
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const roomsContainerName = process.env.AZURE_STORAGE_ROOMS_CONTAINER_NAME;
  const imagesContainerName = process.env.AZURE_STORAGE_IMAGES_CONTAINER_NAME;

  const storage = {
    accountName,
    rooms: {
      containerName: roomsContainerName,
    },
    images: {
      containerName: imagesContainerName,
    },
  };

  const actionConfig = { dryRun, storage };

  return actionConfigSchema.parse(actionConfig);
}
