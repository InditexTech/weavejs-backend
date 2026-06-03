'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {

  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('weavejs_template', 'kind', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'template',
    });
    await queryInterface.addColumn('weavejs_template', 'imageSlots', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('weavejs_template', 'kind');
    await queryInterface.removeColumn('weavejs_template', 'imageSlots');
  },
};
