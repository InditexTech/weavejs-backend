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

- `POST /rooms/:roomId/pages` now generates the `pageId` on the server and ignores any `pageId` in the request body. Clients must use the `pageId` returned in the response. **Release the frontend change (use the response `pageId`) before, or together with, this backend change.**
- Page-scoped routes (`connect`, room state, threads, thread answers) now use a `:pageId` path parameter with unchanged URLs, and deny archived pages.

### Removed

- **BREAKING**: `GET /{hub}/rooms` (unscoped storage container listing).
- **BREAKING**: the `?_token=` query credential is no longer accepted; use the `x-internal-token` header. The server-side renderer now authenticates with a short-lived `_t` token scoped to one media path.
- **BREAKING**: the renderer rejects media sources that are not a known `/weavebff` media route (unknown relative paths and absolute `localhost` URLs resolve to an empty source).

[Unreleased]: https://github.com/InditexTech/weavejs/compare/HEAD
