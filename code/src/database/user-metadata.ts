// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { QueryTypes } from "sequelize";
import { WeaveUser } from "@inditextech/weave-types";
import { getDatabaseInstance } from "./database.js";
import { getPiiCrypto } from "../lib/pii/index.js";

type HasUserMetadata = {
  userId: string;
  userMetadata: WeaveUser;
  setDataValue: (key: "userMetadata", value: WeaveUser) => void;
};

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

// User PII (name, email, image) is not persisted next to the content. Only
// the user id is stored and the rest is resolved from the (encrypted) auth
// user table on read.
export const toStoredUserMetadata = (userId: string): WeaveUser =>
  ({ id: userId }) as WeaveUser;

export const sanitizeUserMetadata = (instance: HasUserMetadata) => {
  instance.setDataValue("userMetadata", toStoredUserMetadata(instance.userId));
};

export const resolveUserMetadata = async (
  instances: HasUserMetadata | HasUserMetadata[] | null | undefined,
) => {
  const list = (Array.isArray(instances) ? instances : [instances]).filter(
    (item): item is HasUserMetadata => !!item,
  );
  if (list.length === 0) return;

  const ids = [...new Set(list.map((item) => item.userId))];
  const rows = await getDatabaseInstance().query<UserRow>(
    `SELECT id, name, email, image FROM auth."user" WHERE id IN (:ids)`,
    { replacements: { ids }, type: QueryTypes.SELECT },
  );

  const pii = getPiiCrypto();
  const users = new Map<string, WeaveUser>();
  for (const row of rows) {
    users.set(row.id, {
      id: row.id,
      name: row.name ? pii.decrypt(row.name, "user.name") : "",
      email: row.email ? pii.decrypt(row.email, "user.email") : "",
      ...(row.image && { image: pii.decrypt(row.image, "user.image") }),
    } as WeaveUser);
  }

  for (const item of list) {
    item.setDataValue(
      "userMetadata",
      users.get(item.userId) ??
        ({ id: item.userId, name: "Deleted user", email: "" } as WeaveUser),
    );
  }
};
