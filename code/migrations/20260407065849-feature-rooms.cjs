'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.renameColumn('weavejs_page', 'index', 'position');

    await queryInterface.changeColumn('weavejs_page', 'position', {
      type: Sequelize.DECIMAL,
      allowNull: false,
    });

    await queryInterface.addColumn('weavejs_page', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'active',
    });

    await queryInterface.createTable('weavejs_room', {
      roomId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      kind: {
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
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addConstraint('weavejs_room', {
      fields: ['roomId'],
      type: 'primary key',
      name: 'weavejs_room_pkey',
    });

    await queryInterface.addIndex("weavejs_room", ["updatedAt"], {
      name: "weavejs_room_updatedat_index",
    });

    await queryInterface.addIndex("weavejs_room", ["kind"], {
      name: "weavejs_room_kind_index",
    });

    await queryInterface.addIndex("weavejs_room", ["status"], {
      name: "weavejs_room_status_index",
    });

    await queryInterface.addConstraint('weavejs_page', {
      fields: ['roomId'],
      type: 'foreign key',
      name: 'weavejs_page_to_room_fkey',
      references: {
        table: 'weavejs_room',
        field: 'roomId',
      },
      onDelete: 'CASCADE',
    });

    await queryInterface.createTable('weavejs_room_user', {
      roomId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      userId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addConstraint('weavejs_room_user', {
      fields: ['roomId', 'userId'],
      type: 'primary key',
      name: 'weavejs_room_user_pkey',
    });

    await queryInterface.addIndex("weavejs_room_user", ["updatedAt"], {
      name: "weavejs_room_user_updatedat_index",
    });

    await queryInterface.addIndex("weavejs_room_user", ["role"], {
      name: "weavejs_room_user_role_index",
    });

    await queryInterface.addConstraint('weavejs_room_user', {
      fields: ['roomId'],
      type: 'foreign key',
      name: 'weavejs_room_user_to_room_fkey',
      references: {
        table: 'weavejs_room',
        field: 'roomId',
      },
      onDelete: 'CASCADE',
    });

    await queryInterface.createTable('weavejs_room_access', {
      id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      roomId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      userId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      validUntilUTC: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addConstraint('weavejs_room_access', {
      fields: ['id'],
      type: 'primary key',
      name: 'weavejs_room_access_pkey',
    });

    await queryInterface.addIndex("weavejs_room_access", ["updatedAt"], {
      name: "weavejs_room_access_updatedat_index",
    });

    await queryInterface.addConstraint('weavejs_room_access', {
      fields: ['roomId'],
      type: 'foreign key',
      name: 'weavejs_room_access_to_room_fkey',
      references: {
        table: 'weavejs_room',
        field: 'roomId',
      },
      onDelete: 'CASCADE',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('weavejs_page', 'position', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.renameColumn('weavejs_page', 'position', 'index');
    await queryInterface.removeColumn('weavejs_page', 'status');

    await queryInterface.removeIndex("weavejs_page", "weavejs_room_updatedat_index");
    await queryInterface.removeIndex("weavejs_page", "weavejs_room_kind_index");
    await queryInterface.removeIndex("weavejs_page", "weavejs_room_status_index");

    await queryInterface.removeIndex("weavejs_room_user", "weavejs_room_user_role_index");
    await queryInterface.removeIndex("weavejs_room_user", "weavejs_room_user_updatedat_index");

    await queryInterface.removeIndex("weavejs_room_access", "weavejs_room_access_updatedat_index");

    await queryInterface.removeConstraint('weavejs_page', 'weavejs_page_to_room_fkey');
    await queryInterface.removeConstraint('weavejs_room_access', 'weavejs_room_access_to_room_fkey');
    
    await queryInterface.dropTable('weavejs_room_access');
    await queryInterface.dropTable('weavejs_room_user');
    await queryInterface.dropTable('weavejs_room');
  }
};
