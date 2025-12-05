// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type SkiaFont = {
  family: string;
  paths: string[];
};

export type CanvasFont = {
  path: string;
  fontFace: {
    family: string;
    weight?: string | undefined;
    style?: string | undefined;
  };
};
