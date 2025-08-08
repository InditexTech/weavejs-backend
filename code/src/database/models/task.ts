import { Sequelize, DataTypes } from "sequelize";

export const defineTaskModel = async (sequelize: Sequelize) => {
  sequelize.define(
    "Task",
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
        allowNull: false,
      },
      roomId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      jobId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "weavejs_task",
      timestamps: true,
    }
  );
};
