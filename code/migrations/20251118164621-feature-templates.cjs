'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const table = await queryInterface.describeTable('weavejs_task');
      
      if (table.TemplateModelRoomId) {
        await queryInterface.removeColumn('weavejs_task', 'TemplateModelRoomId');
      }

      await queryInterface.addColumn('weavejs_task', 'TemplateModelRoomId', {
        type: DataTypes.STRING,
        allowNull: true,
      })

      const tableExists = await queryInterface.tableExists('weavejs_template');

      if (tableExists) {
        await queryInterface.dropTable('weavejs_template');
      }

      await queryInterface.createTable('weavejs_template', {
        roomId: {
          type: DataTypes.STRING,
          allowNull: false,
          primaryKey: true,
        },
        templateId: {
          type: DataTypes.STRING,
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
        removalStatus: {
          type: DataTypes.STRING,
          allowNull: true,
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

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down (queryInterface) {
  }
};
