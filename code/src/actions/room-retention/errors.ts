// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// Thrown when a run must stop before deleting anything (safeguards).
export class AbortRun extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AbortRun";
  }
}
