import express, { Router } from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import { initWeaveAzureWebPubsubClient } from "./pub-sub-client.js";
import { getConfig } from "./utils.js";

const app = express();

const corsOptions = {
  origin: true,
};

// Setup CORS
app.use(cors(corsOptions));

// Use Helmet for setting security-related HTTP headers
app.use(helmet());

// Use Morgan for logging HTTP requests
app.use(morgan("dev"));

// Middleware to parse JSON bodies
app.use(express.json());

const router: Router = Router();

const { hubName } = getConfig();
const syncHandler = initWeaveAzureWebPubsubClient();

router.use(syncHandler.getMiddleware());
router.get(`/:roomId/connect`, (req, res) => syncHandler.clientConnect(req, res));

app.use(`/${hubName}`, router);

export default app;