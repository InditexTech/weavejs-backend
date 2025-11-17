'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create weavejs_template table
    return queryInterface.createTable('weavejs_template', {
      roomId: {
        type: Sequelize.DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
      },
      templateId: {
        type: Sequelize.DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
      },
      status: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      linkedNodeType: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      templateImage: {
        type: Sequelize.DataTypes.TEXT("long"),
        allowNull: true,
      },
      templateData: {
        type: Sequelize.DataTypes.JSON,
        allowNull: false,
      },
      jobId: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'weavejs_task',
          key: "jobId",
        },
        onUpdate: 'CASCADE', // updates FK if user.id changes
        onDelete: 'CASCADE', // deletes posts if user is deleted
      },
      removalJobId: {
        type: Sequelize.DataTypes.STRING,
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
