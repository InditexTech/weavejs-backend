import app from "./index.js";
import { getConfig } from "./utils.js";

const HOSTNAME: string = process.env.HOSTNAME || "0.0.0.0";
const PORT: number = parseInt(process.env.PORT || "3000");

getConfig();

app.listen(PORT, HOSTNAME, () => {
  console.log(`Server started @ http://${HOSTNAME}:${PORT}\n`);
});