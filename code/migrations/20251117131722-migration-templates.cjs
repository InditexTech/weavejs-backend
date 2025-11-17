'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    // Create weavejs_template table
    return queryInterface.createTable('weavejs_template', {
      roomId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
      },
      templateId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      linkedNodeType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      templateImage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      templateData: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      jobId: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'weavejs_task',
          key: "jobId",
        },
        onUpdate: 'CASCADE', // updates FK if user.id changes
        onDelete: 'CASCADE', // deletes posts if user is deleted
      },
      removalJobId: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'weavejs_task',
          key: "jobId",
        },
        onUpdate: 'CASCADE', // updates FK if user.id changes
        onDelete: 'CASCADE', // deletes posts if user is deleted
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    });
  },

  async down (queryInterface) {
    return queryInterface.dropTable('weavejs_template');
  }
};
