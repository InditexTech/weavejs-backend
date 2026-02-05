// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type TemplateMetadata = {
  key: string;
  width: number;
  height: number;
};

export type ImageMetadata = {
  imageId: string;
  imageURL: string;
  width: number;
  height: number;
};

export type TemplateDetails = {
  template: TemplateMetadata;
  image: ImageMetadata;
};
