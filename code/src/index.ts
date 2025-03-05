import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import helmet from "helmet";

// Initialize dotenv to load environment variables from .env file
dotenv.config();

const app = express();

// Use Helmet for setting security-related HTTP headers
app.use(helmet());

// Use Morgan for logging HTTP requests
app.use(morgan("dev"));

// Middleware to parse JSON bodies
app.use(express.json());

// Define a simple route
app.get("/", (req, res) => {
  res.send("Hello, TypeScript with Express!");
});

export default app;