'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const table = await queryInterface.describeTable('weavejs_task');
      
      if (table.TemplateModelRoomId) {
        await queryInterface.removeColumn('weavejs_task', 'TemplateModelRoomId');
      }

      await queryInterface.addColumn('weavejs_task', 'TemplateModelRoomId', {
        type: Sequelize.STRING,
        allowNull: true,
      })

      const tableExists = await queryInterface.tableExists('weavejs_template');

      if (tableExists) {
        await queryInterface.dropTable('weavejs_template');
      }

      await queryInterface.createTable('weavejs_template', {
        roomId: {
          type: Sequelize.STRING,
          allowNull: false,
          primaryKey: true,
        },
        templateId: {
          type: Sequelize.STRING,
          allowNull: false,
          primaryKey: true,
        },
        status: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        linkedNodeType: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        templateImage: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        templateData: {
          type: Sequelize.JSON,
          allowNull: false,
        },
        jobId: {
          type: Sequelize.STRING,
          allowNull: true,
          references: {
            model: 'weavejs_task',
            key: "jobId",
          },
          onUpdate: 'CASCADE', // updates FK if user.id changes
          onDelete: 'CASCADE', // deletes posts if user is deleted
        },
        removalJobId: {
          type: Sequelize.STRING,
          allowNull: true,
          references: {
            model: 'weavejs_task',
            key: "jobId",
          },
          onUpdate: 'CASCADE', // updates FK if user.id changes
          onDelete: 'CASCADE', // deletes posts if user is deleted
        },
        removalStatus: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
