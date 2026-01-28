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

  /* ---------------- CHAT MESSAGE ---------------- */
  socket.on("message", (msg) => {
    if (socket.partner) {
      socket.partner.emit("message", msg);
    }
  });

  /* ---------------- NEXT USER ---------------- */
  socket.on("next", () => {
    disconnectPartner(socket);
    matchUser(socket);
  });

  /* ---------------- DISCONNECT ---------------- */
  socket.on("disconnect", () => {
    onlineUsers--;
    io.emit("onlineCount", onlineUsers);

    if (waitingUser === socket) waitingUser = null;
    disconnectPartner(socket);
  });

  /* ---------------- WEBRTC SIGNALS ---------------- */
  socket.on("offer", (offer) => {
    if (socket.partner) socket.partner.emit("offer", offer);
  });

  socket.on("answer", (answer) => {
    if (socket.partner) socket.partner.emit("answer", answer);
  });

  socket.on("ice-candidate", (candidate) => {
    if (socket.partner) socket.partner.emit("ice-candidate", candidate);
  });
});

/* ---------------- USER MATCHING ---------------- */
function matchUser(socket) {
  if (waitingUser) {
    socket.partner = waitingUser;
    waitingUser.partner = socket;

    socket.partnerCreatedOffer = false;
    waitingUser.partnerCreatedOffer = false;

    socket.emit("matched");
    waitingUser.emit("matched");

    waitingUser = null;
  } else {
    waitingUser = socket;
    socket.emit("waiting");
  }
}

/* ---------------- DISCONNECT PARTNER ---------------- */
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
