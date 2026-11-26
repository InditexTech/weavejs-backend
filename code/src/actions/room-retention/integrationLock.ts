// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Client } from "pg";

// The integration test files share one database and some of them delete every
// old room they find. node:test runs files in parallel, so they take this lock
// to run one after the other.
const INTEGRATION_LOCK_KEY = 7770001;

export const acquireIntegrationLock = async (
  url: string,
): Promise<() => Promise<void>> => {
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query("SELECT pg_advisory_lock($1)", [INTEGRATION_LOCK_KEY]);

  return async () => {
    await client.query("SELECT pg_advisory_unlock($1)", [INTEGRATION_LOCK_KEY]);
    await client.end();
  };
};
