// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const RETENTION_DAYS = 7;

export type ContainerNames = {
  rooms: string;
  images: string;
  videos: string;
  generatedImages: string;
  exportedImages: string;
  exportedPdf: string;
  pagesThumbnails: string;
  roomsThumbnails: string;
  templatesImages: string;
  standaloneImages: string;
  standaloneInstanceImageData: string;
  presentationImages: string;
};

export type RetentionConfig = {
  dryRun: boolean;
  protectedRooms: Set<string>;
  protectedUserIds: Set<string>;
  maxRoomsToDelete: number;
  maxBlobsToDelete: number;
  maxBlobsPercent: number;
  blobGraceHours: number;
  storage: {
    accountName: string | undefined;
    connectionString: string | undefined;
    containers: ContainerNames;
  };
};

type Env = Record<string, string | undefined>;

const parseList = (value: string | undefined): string[] =>
  (value ?? "")
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const parseNumber = (
  env: Env,
  name: string,
  fallback: number,
  { min, max }: { min: number; max?: number },
): number => {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const value = Number(raw);
  if (
    !Number.isFinite(value) ||
    value < min ||
    (max !== undefined && value > max)
  ) {
    throw new Error(
      `${name} must be a number >= ${min}${max !== undefined ? ` and <= ${max}` : ""}, got "${raw}"`,
    );
  }
  return value;
};

const required = (env: Env, name: string): string => {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be defined`);
  }
  return value;
};

// The three configured containers come from the deployment settings, the
// others are fixed names used by the application.
export const buildContainerNames = (
  configured: { rooms: string; images: string; videos: string },
  generatedImagesOverride?: string,
): ContainerNames => ({
  ...configured,
  generatedImages: generatedImagesOverride?.trim() || "generated-images",
  exportedImages: "exported-images",
  exportedPdf: "exported-pdf",
  pagesThumbnails: "pages-thumbnails",
  roomsThumbnails: "rooms-thumbnails",
  templatesImages: "templates-images",
  standaloneImages: "standalone-images",
  standaloneInstanceImageData: "standalone-instance-image-data",
  presentationImages: "presentation-images",
});

export const parseRetentionConfig = (env: Env): RetentionConfig => {
  const accountName = env.AZURE_STORAGE_ACCOUNT_NAME?.trim() || undefined;
  const connectionString =
    env.AZURE_STORAGE_CONNECTION_STRING?.trim() || undefined;

  if (!accountName && !connectionString) {
    throw new Error(
      "AZURE_STORAGE_ACCOUNT_NAME or AZURE_STORAGE_CONNECTION_STRING must be defined",
    );
  }

  return {
    // Anything other than an explicit "false" keeps the run non destructive.
    dryRun: env.RETENTION_DRY_RUN?.trim().toLowerCase() !== "false",
    protectedRooms: new Set(parseList(env.RETENTION_PROTECTED_ROOMS)),
    protectedUserIds: new Set(parseList(env.RETENTION_PROTECTED_USER_IDS)),
    maxRoomsToDelete: parseNumber(env, "RETENTION_MAX_ROOMS_TO_DELETE", 50, {
      min: 0,
    }),
    maxBlobsToDelete: parseNumber(env, "RETENTION_MAX_BLOBS_TO_DELETE", 5000, {
      min: 0,
    }),
    maxBlobsPercent: parseNumber(env, "RETENTION_MAX_BLOBS_PERCENT", 50, {
      min: 0,
      max: 100,
    }),
    blobGraceHours: parseNumber(env, "RETENTION_BLOB_GRACE_HOURS", 24, {
      min: 0,
    }),
    storage: {
      accountName,
      connectionString,
      containers: buildContainerNames(
        {
          rooms: required(env, "AZURE_STORAGE_ROOMS_CONTAINER_NAME"),
          images: required(env, "AZURE_STORAGE_IMAGES_CONTAINER_NAME"),
          videos: required(env, "AZURE_STORAGE_VIDEOS_CONTAINER_NAME"),
        },
        env.AZURE_STORAGE_GENERATED_IMAGES_CONTAINER_NAME,
      ),
    },
  };
};
