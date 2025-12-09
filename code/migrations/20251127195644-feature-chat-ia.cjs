"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("weavejs_ai_chat", {
      chatId: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true,
      },
      roomId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      resourceId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addConstraint("weavejs_ai_chat", {
      fields: ["chatId"],
      type: "unique",
      name: "weavejs_ai_chat_chatId_unique"
    });
    
    await queryInterface.createTable("weavejs_ai_chat_message", {
      id: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true,
      },chatId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: "weavejs_ai_chat",
          key: "chatId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      messageId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      parts: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("weavejs_ai_chat_message");
    await queryInterface.dropTable("weavejs_ai_chat");
  },
};
