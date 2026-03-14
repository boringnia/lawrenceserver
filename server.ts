import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Lobby state
  let lobbyPlayers: any[] = [];

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-lobby", (playerData) => {
      const player = { ...playerData, socketId: socket.id };
      // Remove existing if any
      lobbyPlayers = lobbyPlayers.filter(p => p.socketId !== socket.id);
      lobbyPlayers.push(player);
      io.emit("lobby-update", lobbyPlayers);
    });

    socket.on("start-online-game", (config) => {
      // config includes mapType, etc.
      // Broadcast to all in lobby to start
      const spawnPositions = lobbyPlayers.map(() => (Math.random() - 0.5) * 80);
      io.emit("game-started", {
        mapType: config.mapType,
        players: lobbyPlayers,
        spawnPositions,
        seed: Math.random()
      });
      // Clear lobby for next round
      lobbyPlayers = [];
    });

    socket.on("game-action", (action) => {
      // Broadcast actions like move, shoot, etc. to everyone else
      socket.broadcast.emit("remote-action", action);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      lobbyPlayers = lobbyPlayers.filter(p => p.socketId !== socket.id);
      io.emit("lobby-update", lobbyPlayers);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve from the current directory
    const publicPath = process.cwd();
    app.use(express.static(publicPath));
    app.get('*', (req, res) => {
      // Check if index.html exists in the current directory
      res.sendFile(path.join(publicPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
