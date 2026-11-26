// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;

export const redact = (message: string): string =>
  message.replace(EMAIL_PATTERN, "[redacted-email]");

export type Logger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export const createLogger = (
  write: (line: string) => void = (line) => console.log(line),
): Logger => ({
  info: (message) => write(redact(message)),
  warn: (message) => write(redact(`WARN ${message}`)),
  error: (message) => write(redact(`ERROR ${message}`)),
});
