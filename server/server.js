const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

function join(socket) {
  return function (room_name) {
    const room = io.sockets.adapter.rooms.get(room_name);
    const clientsNumber = room ? room.size : 0;

    socket.on("message", (message) => {
      socket.broadcast.emit("message", message);
    });
    console.log("someone join!!");
    if (clientsNumber === 0) {
      socket.join(room_name);
      socket.emit("master");
    } else if (clientsNumber === 1) {
      socket.join(room_name);
      io.in(room_name).emit("joined");
    }
  };
}

io.on("connection", (socket) => {
  console.log(`user connection`);
  socket.on("join", join(socket));
});

app.use(express.static("public"));

server.listen(8080, () => {
  console.log("server on");
});
