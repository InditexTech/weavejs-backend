// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { Request, RequestHandler } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { hasInternalCredential } from "@/middlewares/internal-token.js";

type ApiRateLimitOptions = {
  windowMs: number;
  max: number;
  message: string;
  skip?: (req: Request) => boolean;
};

const createApiRateLimit = ({
  windowMs,
  max,
  message,
  skip,
}: ApiRateLimitOptions): RequestHandler =>
  rateLimit({
    windowMs,
    max,
    skip,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) =>
      req.session?.user.id ?? ipKeyGenerator(req.ip ?? "unknown"),
    handler: (_req, res, _next, options) => {
      res.status(options.statusCode).json({
        status: "KO",
        message,
      });
    },
  });

export const aiImageOperationRateLimit = createApiRateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many image processing requests. Please try again later.",
});

export const roomImageUploadRateLimit = createApiRateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many image upload requests. Please try again later.",
});

export const roomVideoUploadRateLimit = createApiRateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many video upload requests. Please try again later.",
});

// Guards against online brute-force guessing of the shared AI password:
// at most 10 attempts per 15-minute window.
export const aiPasswordRateLimit = createApiRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many attempts. Please try again later.",
});

// Media reads. Boards load many assets at once, so the limit is generous.
// Runs before internalToken and session, so it is keyed by IP. Requests with a
// valid internal credential (the server-side renderer) are not limited.
export const mediaReadRateLimit = createApiRateLimit({
  windowMs: 60 * 1000,
  max: 1200,
  message: "Too many media requests. Please try again later.",
  skip: hasInternalCredential,
});

// The retention workflow starts one run and polls it every few seconds, so
// the limit only needs to stop unauthenticated floods.
export const retentionRateLimit = createApiRateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: "Too many retention requests. Please try again later.",
});
