import { Sequelize, Model, DataTypes } from "sequelize";
import { WeaveUser } from "@inditextech/weave-types";

export type ThreadStatus = "pending" | "resolved";

export type ThreadAttributes = {
  threadId: string;
  userId: string;
  roomId: string;
  userMetadata: WeaveUser;
  x: number;
  y: number;
  status: ThreadStatus;
  content: string;
  replies: number;
};

export type ThreadIdentifier = Pick<ThreadAttributes, "threadId">;

export type ThreadCreationAttributes = Omit<ThreadAttributes, "threadId">;

export class ThreadModel
  extends Model<ThreadAttributes, ThreadCreationAttributes>
  implements ThreadAttributes
{
  declare threadId: string;
  declare roomId: string;
  declare userId: string;
  declare userMetadata: WeaveUser;
  declare x: number;
  declare y: number;
  declare status: ThreadStatus;
  declare content: string;
  declare replies: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const defineThreadModel = async (sequelize: Sequelize) => {
  ThreadModel.init(
    {
      threadId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      roomId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      userMetadata: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      x: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      y: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      replies: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: "weavejs_thread",
      timestamps: true,
      sequelize,
    }
  );
};
