// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { isAbsoluteUrl, assertSafeUrl } from "../utils.ts";
import { signMediaToken } from "../utils/media-token.ts";
import { type ServiceConfig } from "../types.ts";

const PREFIX = "/weavebff";
const ID = "[A-Za-z0-9_-]+";

// Media routes the renderer may fetch from the internal service (path after
// the public `/weavebff` prefix). Keep in sync with the routes that use the
// `internalToken` middleware.
const MEDIA_ROUTES: RegExp[] = [
  new RegExp(`^/api/v[12]/weavejs/rooms/${ID}/images/${ID}$`),
  new RegExp(`^/api/v1/weavejs/rooms/${ID}/videos/${ID}(?:/placeholder)?$`),
  new RegExp(`^/api/v1/weavejs/rooms/${ID}/chats/${ID}/images/${ID}$`),
];

const SAFE_PATH = /^(?:\/[A-Za-z0-9_-]+)+$/;

// Path exactly as written in the source: URL parsing would resolve dot
// segments and encodings before they can be rejected.
const getRawPath = (url: string): string => {
  const withoutOrigin = url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, "");
  return withoutOrigin.split(/[?#]/, 1)[0];
};

const getQuery = (url: string): URLSearchParams => {
  const [beforeHash] = url.split("#", 1);
  const queryStart = beforeHash.indexOf("?");
  return new URLSearchParams(
    queryStart === -1 ? "" : beforeHash.slice(queryStart + 1),
  );
};

type MediaUrlConfig = Pick<ServiceConfig, "internalToken"> & {
  service: Pick<ServiceConfig["service"], "port">;
};

const rewriteMediaUrl = (
  url: string,
  rawPath: string,
  config: MediaUrlConfig,
): string => {
  if (!rawPath.startsWith(PREFIX)) {
    return "";
  }

  const servicePath = rawPath.slice(PREFIX.length);
  if (
    !SAFE_PATH.test(servicePath) ||
    !MEDIA_ROUTES.some((route) => route.test(servicePath))
  ) {
    return "";
  }

  const origin = new URL(`http://localhost:${config.service.port}/`);
  const target = new URL(origin);
  target.pathname = servicePath;

  getQuery(url).forEach((value, key) => {
    if (key !== "_t" && key !== "_token") {
      target.searchParams.append(key, value);
    }
  });
  target.searchParams.set(
    "_t",
    signMediaToken(config.internalToken, target.pathname),
  );

  if (
    target.protocol !== origin.protocol ||
    target.hostname !== "localhost" ||
    target.port !== origin.port ||
    target.username !== "" ||
    target.password !== "" ||
    target.pathname !== servicePath
  ) {
    return "";
  }

  return target.toString();
};

/**
 * Maps a persisted media URL to a URL the server-side renderer may fetch.
 *
 * 1. A path starting with `/weavebff` (relative, or absolute on any origin)
 *    must match a known media route; it is rewritten to the internal service
 *    with a scoped short-lived `_t` token. Anything else becomes "".
 * 2. Relative paths that are not `/weavebff` media paths become "" so they
 *    can never be read as filesystem paths.
 * 3. Other absolute URLs pass the SSRF guard (`assertSafeUrl`), else "".
 */
export function transformMediaUrl(
  url: string,
  config: MediaUrlConfig,
): string {
  if (typeof url !== "string" || url === "") {
    return "";
  }

  if (!isAbsoluteUrl(url)) {
    return rewriteMediaUrl(url, url.split(/[?#]/, 1)[0], config);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "";
  }

  const rawPath = getRawPath(url);
  if (rawPath.startsWith(PREFIX) || parsed.pathname.startsWith(PREFIX)) {
    return rewriteMediaUrl(url, rawPath, config);
  }

  try {
    assertSafeUrl(url);
  } catch {
    return "";
  }

  return url;
}
