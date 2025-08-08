// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { JOB_HANDLERS } from "./constants.js";

export type JobHandlerKeys = keyof typeof JOB_HANDLERS;
export type JobHandler = (typeof JOB_HANDLERS)[JobHandlerKeys];
