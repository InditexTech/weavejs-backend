<!--
SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Image operations (negate, grayscale, flip, remove background, upload) now validate the image before creating a job and return `400` for undecodable or empty images, instead of risking a process crash. `POST /api/v2/.../remove-background` now validates its request body.
- `POST`, `PUT`, `PATCH` and `DELETE` requests under `/api/v1`, `/api/v2` and `/api/v3` are rejected with `403` when their `Origin` (or `Referer`) is not in `CORS_ALLOWED_ORIGINS` (defaults to `BETTER_AUTH_URL`). Requests without `Origin`/`Referer` are unaffected. **Make sure `CORS_ALLOWED_ORIGINS` lists every browser origin that calls the API before deploying.**
- `unhandledRejection` is now logged and ignored; `uncaughtException` is logged and exits the process with code 1 (run under a supervisor that restarts it).
- `POST /rooms/:roomId/pages` now generates the `pageId` on the server and ignores any `pageId` in the request body. Clients must use the `pageId` returned in the response. **Release the frontend change (use the response `pageId`) before, or together with, this backend change.**
- Page-scoped routes (`connect`, room state, threads, thread answers) now use a `:pageId` path parameter with unchanged URLs, and deny archived pages.

### Removed

- **BREAKING**: `GET /{hub}/rooms/:roomId/simulate-ws-error` (state-changing debug route).
- **BREAKING**: `GET /{hub}/rooms` (unscoped storage container listing).

[Unreleased]: https://github.com/InditexTech/weavejs/compare/HEAD
