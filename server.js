const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let waitingUser = null;
let onlineUsers = 0;

io.on("connection", (socket) => {
  onlineUsers++;
  io.emit("onlineCount", onlineUsers);

  console.log("User connected:", socket.id);

  matchUser(socket);

  socket.on("message", (msg) => {
    if (socket.partner) {
      socket.partner.emit("message", msg);
    }
  });

  socket.on("next", () => {
    disconnectPartner(socket);
    matchUser(socket);
  });

  socket.on("disconnect", () => {
    onlineUsers--;
    io.emit("onlineCount", onlineUsers);

    if (waitingUser === socket) waitingUser = null;
    disconnectPartner(socket);
  });
});

function matchUser(socket) {
  if (waitingUser) {
    socket.partner = waitingUser;
    waitingUser.partner = socket;

    socket.emit("matched");
    waitingUser.emit("matched");

    waitingUser = null;
  } else {
    waitingUser = socket;
    socket.emit("waiting");
  }
}

function disconnectPartner(socket) {
  if (socket.partner) {
    socket.partner.partner = null;
    socket.partner.emit("partnerDisconnected");
    socket.partner = null;
  }
}

http.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
