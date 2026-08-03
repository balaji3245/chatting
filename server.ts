import http from "http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { setupSocketAuth } from "./src/lib/socket-server";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const hostname = "localhost";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = http.createServer((req, res) => {
    handle(req, res);
  });

  // Socket.IO server instance attached to unified HTTP server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      credentials: true,
    },
    path: "/api/socket.io",
  });

  // Attach handshake authentication foundation
  setupSocketAuth(io);

  httpServer.listen(port, () => {
    console.log(`> Private Chat application server ready on http://${hostname}:${port}`);
    console.log(`> Environment: ${dev ? "development" : "production"}`);
  });
}).catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
