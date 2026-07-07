'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query('CREATE SCHEMA IF NOT EXISTS auth;', { transaction });

      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS auth."user" (
          "id" text NOT NULL PRIMARY KEY,
          "name" text NOT NULL,
          "email" text NOT NULL UNIQUE,
          "emailVerified" boolean NOT NULL DEFAULT false,
          "image" text,
          "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS auth."session" (
          "id" text NOT NULL PRIMARY KEY,
          "userId" text NOT NULL,
          "token" text NOT NULL UNIQUE,
          "expiresAt" timestamptz NOT NULL,
          "ipAddress" text,
          "userAgent" text,
          "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES auth."user" ("id") ON DELETE CASCADE
        );
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS auth."account" (
          "id" text NOT NULL PRIMARY KEY,
          "userId" text NOT NULL,
          "accountId" text NOT NULL,
          "providerId" text NOT NULL,
          "accessToken" text,
          "refreshToken" text,
          "accessTokenExpiresAt" timestamptz,
          "refreshTokenExpiresAt" timestamptz,
          "scope" text,
          "idToken" text,
          "password" text,
          "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES auth."user" ("id") ON DELETE CASCADE
        );
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS auth."verification" (
          "id" text NOT NULL PRIMARY KEY,
          "identifier" text NOT NULL,
          "value" text NOT NULL,
          "expiresAt" timestamptz NOT NULL,
          "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `, { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down (queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS auth."verification";', { transaction });
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS auth."account";', { transaction });
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS auth."session";', { transaction });
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS auth."user";', { transaction });
      await queryInterface.sequelize.query('DROP SCHEMA IF EXISTS auth;', { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
