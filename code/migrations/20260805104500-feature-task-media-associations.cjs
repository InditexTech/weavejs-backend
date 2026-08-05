'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const task = await queryInterface.describeTable('weavejs_task');

      if (!task.ImageModelRoomId) {
        await queryInterface.addColumn(
          'weavejs_task',
          'ImageModelRoomId',
          {
            type: Sequelize.STRING,
            allowNull: true,
          },
          { transaction },
        );
      }

      if (!task.VideoModelRoomId) {
        await queryInterface.addColumn(
          'weavejs_task',
          'VideoModelRoomId',
          {
            type: Sequelize.STRING,
            allowNull: true,
          },
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const task = await queryInterface.describeTable('weavejs_task');

      if (task.ImageModelRoomId) {
        await queryInterface.removeColumn(
          'weavejs_task',
          'ImageModelRoomId',
          { transaction },
        );
      }

      if (task.VideoModelRoomId) {
        await queryInterface.removeColumn(
          'weavejs_task',
          'VideoModelRoomId',
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
