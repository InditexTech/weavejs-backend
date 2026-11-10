// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { PiiCrypto, PiiMode } from "./crypto.js";

type AnyRecord = Record<string, any>;
type WhereClause = {
  field: string;
  value: unknown;
  operator?: string;
  [key: string]: unknown;
};

export type PiiFieldMap = Record<string, Record<string, PiiMode>>;

// Logical better-auth model/field names (not column names).
export const AUTH_PII_FIELDS: PiiFieldMap = {
  user: {
    name: "random",
    email: "deterministic",
    image: "random",
  },
  account: {
    accessToken: "random",
    refreshToken: "random",
    idToken: "random",
    password: "random",
  },
};

type Options = {
  pii: PiiCrypto;
  fields: PiiFieldMap;
  // When false, writes keep plaintext (rollout stage before the backfill).
  // Reads always decrypt, so already encrypted rows keep working.
  encryptWrites: boolean;
};

const isPlainObject = (value: unknown): value is AnyRecord =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  !(value instanceof Date);

export const createPiiAdapterWrapper = ({
  pii,
  fields,
  encryptWrites,
}: Options) => {
  const ctx = (model: string, field: string) => `${model}.${field}`;

  const encryptData = (model: string, data: AnyRecord): AnyRecord => {
    const modelFields = fields[model];
    if (!modelFields || !encryptWrites || !isPlainObject(data)) return data;

    const out = { ...data };
    for (const [field, mode] of Object.entries(modelFields)) {
      if (typeof out[field] === "string") {
        out[field] = pii.encrypt(out[field], ctx(model, field), mode);
      }
    }
    return out;
  };

  const encryptWhere = (model: string, where?: WhereClause[]) => {
    const modelFields = fields[model];
    if (!modelFields || !encryptWrites || !where) return where;

    return where.map((clause) => {
      const mode = modelFields[clause.field];
      if (mode !== "deterministic") return clause;

      const encryptValue = (v: unknown) =>
        typeof v === "string"
          ? pii.encrypt(v, ctx(model, clause.field), mode)
          : v;

      return {
        ...clause,
        value: Array.isArray(clause.value)
          ? clause.value.map(encryptValue)
          : encryptValue(clause.value),
      };
    });
  };

  const decryptRow = <T>(model: string, row: T): T => {
    if (!isPlainObject(row)) return row;

    const out: AnyRecord = { ...row };
    const modelFields = fields[model];
    if (modelFields) {
      for (const field of Object.keys(modelFields)) {
        if (typeof out[field] === "string") {
          out[field] = pii.decrypt(out[field], ctx(model, field));
        }
      }
    }

    // Joined models come nested under their model name.
    for (const [key, value] of Object.entries(out)) {
      if (!fields[key]) continue;
      if (Array.isArray(value)) {
        out[key] = value.map((item) => decryptRow(key, item));
      } else if (isPlainObject(value)) {
        out[key] = decryptRow(key, value);
      }
    }

    return out as T;
  };

  const decryptResult = (model: string, result: any) =>
    Array.isArray(result)
      ? result.map((row) => decryptRow(model, row))
      : decryptRow(model, result);

  const wrap = <A extends AnyRecord>(adapter: A): A => {
    const wrapped: AnyRecord = { ...adapter };

    wrapped.create = async (args: AnyRecord) =>
      decryptResult(
        args.model,
        await adapter.create({
          ...args,
          data: encryptData(args.model, args.data),
        }),
      );

    wrapped.findOne = async (args: AnyRecord) =>
      decryptResult(
        args.model,
        await adapter.findOne({
          ...args,
          where: encryptWhere(args.model, args.where),
        }),
      );

    wrapped.findMany = async (args: AnyRecord) =>
      decryptResult(
        args.model,
        await adapter.findMany({
          ...args,
          where: encryptWhere(args.model, args.where),
        }),
      );

    wrapped.count = async (args: AnyRecord) =>
      adapter.count({ ...args, where: encryptWhere(args.model, args.where) });

    wrapped.update = async (args: AnyRecord) =>
      decryptResult(
        args.model,
        await adapter.update({
          ...args,
          where: encryptWhere(args.model, args.where),
          update: encryptData(args.model, args.update),
        }),
      );

    wrapped.updateMany = async (args: AnyRecord) =>
      adapter.updateMany({
        ...args,
        where: encryptWhere(args.model, args.where),
        update: encryptData(args.model, args.update),
      });

    wrapped.delete = async (args: AnyRecord) =>
      adapter.delete({ ...args, where: encryptWhere(args.model, args.where) });

    wrapped.deleteMany = async (args: AnyRecord) =>
      adapter.deleteMany({
        ...args,
        where: encryptWhere(args.model, args.where),
      });

    if (adapter.consumeOne) {
      wrapped.consumeOne = async (args: AnyRecord) =>
        decryptResult(
          args.model,
          await adapter.consumeOne({
            ...args,
            where: encryptWhere(args.model, args.where),
          }),
        );
    }

    if (adapter.incrementOne) {
      wrapped.incrementOne = async (args: AnyRecord) =>
        decryptResult(
          args.model,
          await adapter.incrementOne({
            ...args,
            where: encryptWhere(args.model, args.where),
            set: args.set ? encryptData(args.model, args.set) : args.set,
          }),
        );
    }

    if (adapter.transaction) {
      wrapped.transaction = (callback: (trx: AnyRecord) => Promise<unknown>) =>
        adapter.transaction((trx: AnyRecord) => callback(wrap(trx)));
    }

    return wrapped as A;
  };

  return wrap;
};
