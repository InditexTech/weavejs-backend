import { JWT } from "google-auth-library";
import keyJson from "./itx-moyaint-pre.json" with { type: "json" };

const getAccessToken = () => {
  const client = new JWT({
    email: keyJson.client_email,
    key: keyJson.private_key,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  return client.getAccessToken();
};

(async () => {
  const accessToken = await getAccessToken();
  console.log("accessToken", accessToken);
})();
