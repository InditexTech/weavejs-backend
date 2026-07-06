'use strict';

const timestampColumns = (Sequelize) => ({
  createdAt: {
    allowNull: false,
    type: Sequelize.DATE,
    defaultValue: Sequelize.fn('NOW'),
  },
  updatedAt: {
    allowNull: false,
    type: Sequelize.DATE,
    defaultValue: Sequelize.fn('NOW'),
  },
});

const mediaColumns = (Sequelize, idColumn) => ({
  [idColumn]: {
    type: Sequelize.STRING,
    allowNull: false,
    primaryKey: true,
  },
  operation: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  status: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  mimeType: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  width: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  height: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  aspectRatio: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  fileName: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  jobId: {
    type: Sequelize.STRING,
    allowNull: true,
    references: {
      model: 'weavejs_task',
      key: 'jobId',
    },
  },
  removalJobId: {
    type: Sequelize.STRING,
    allowNull: true,
    references: {
      model: 'weavejs_task',
      key: 'jobId',
    },
  },
  removalStatus: {
    type: Sequelize.STRING,
    allowNull: true,
  },
});

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (!(await queryInterface.tableExists('weavejs_connection'))) {
        await queryInterface.createTable('weavejs_connection', {
          connectionId: {
            type: Sequelize.STRING,
            allowNull: false,
            primaryKey: true,
          },
          roomId: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          status: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          ...timestampColumns(Sequelize),
        }, { transaction });
      }

      if (!(await queryInterface.tableExists('weavejs_thread'))) {
        await queryInterface.createTable('weavejs_thread', {
          threadId: {
            type: Sequelize.STRING,
            allowNull: false,
            primaryKey: true,
          },
          userId: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          roomId: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          userMetadata: {
            type: Sequelize.JSONB,
            allowNull: false,
          },
          x: {
            type: Sequelize.FLOAT,
            allowNull: false,
          },
          y: {
            type: Sequelize.FLOAT,
            allowNull: false,
          },
          status: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          content: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          replies: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          ...timestampColumns(Sequelize),
        }, { transaction });
      }

      if (!(await queryInterface.tableExists('weavejs_thread_answer'))) {
        await queryInterface.createTable('weavejs_thread_answer', {
          answerId: {
            type: Sequelize.STRING,
            allowNull: false,
            primaryKey: true,
          },
          threadId: {
            type: Sequelize.STRING,
            allowNull: false,
            references: {
              model: 'weavejs_thread',
              key: 'threadId',
            },
            onDelete: 'CASCADE',
          },
          userId: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          userMetadata: {
            type: Sequelize.JSONB,
            allowNull: false,
          },
          content: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          ...timestampColumns(Sequelize),
        }, { transaction });
      }

      if (!(await queryInterface.tableExists('weavejs_image'))) {
        await queryInterface.createTable('weavejs_image', {
          roomId: {
            type: Sequelize.STRING,
            allowNull: false,
            primaryKey: true,
          },
          ...mediaColumns(Sequelize, 'imageId'),
          ...timestampColumns(Sequelize),
        }, { transaction });
      }

      if (!(await queryInterface.tableExists('weavejs_video'))) {
        await queryInterface.createTable('weavejs_video', {
          roomId: {
            type: Sequelize.STRING,
            allowNull: false,
            primaryKey: true,
          },
          ...mediaColumns(Sequelize, 'videoId'),
          ...timestampColumns(Sequelize),
        }, { transaction });
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down (queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (await queryInterface.tableExists('weavejs_thread_answer')) {
        await queryInterface.dropTable('weavejs_thread_answer', { transaction });
      }
      if (await queryInterface.tableExists('weavejs_thread')) {
        await queryInterface.dropTable('weavejs_thread', { transaction });
      }
      if (await queryInterface.tableExists('weavejs_connection')) {
        await queryInterface.dropTable('weavejs_connection', { transaction });
      }
      if (await queryInterface.tableExists('weavejs_image')) {
        await queryInterface.dropTable('weavejs_image', { transaction });
      }
      if (await queryInterface.tableExists('weavejs_video')) {
        await queryInterface.dropTable('weavejs_video', { transaction });
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
