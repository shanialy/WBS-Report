import { createServer, Server } from "http";
import app from "./app";
import { PORT } from "./config/environment";

const SERVER_PORT = PORT || 6000;
const httpServer: Server = createServer(app);

httpServer.listen(SERVER_PORT, () => {
  console.log(`Server running on port ${SERVER_PORT}`);
});
