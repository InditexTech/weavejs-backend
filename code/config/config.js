module.exports = {
  development: {
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    dialect: "postgres"
  },
  production: {
    username: process.env.AZURE_DATABASE_USERNAME,
    password: process.env.AZURE_DATABASE_PASSWORD,
    database: process.env.AZURE_DATABASE_NAME,
    host: process.env.AZURE_DATABASE_HOST,
    port: process.env.AZURE_DATABASE_PORT,
    dialect: "postgres"
  }
};
