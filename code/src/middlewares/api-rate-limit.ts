// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { RequestHandler } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

type ApiRateLimitOptions = {
  windowMs: number;
  max: number;
  message: string;
};

const createApiRateLimit = ({
  windowMs,
  max,
  message,
}: ApiRateLimitOptions): RequestHandler =>
  rateLimit({
    windowMs,
    max,
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
