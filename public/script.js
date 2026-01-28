const socket = io();

const localVideo = document.getElementById("localVideo");
const messages = document.getElementById("messages");
const msgInput = document.getElementById("msg");
const onlineSpan = document.getElementById("online");
const countrySpan = document.getElementById("country");
const statusText = document.getElementById("status");

let localStream;
let cameraOn = true;

/* ---------------- CAMERA ---------------- */
navigator.mediaDevices.getUserMedia({ video: true, audio: false })
.then(stream => {
  localStream = stream;
  localVideo.srcObject = stream;
})
.catch(() => {
  alert("Camera permission denied");
});

/* Camera ON / OFF */
function toggleCamera() {
  if (!localStream) return;
  cameraOn = !cameraOn;
  localStream.getVideoTracks()[0].enabled = cameraOn;
  event.target.innerText = cameraOn ? "📷 Camera OFF" : "📷 Camera ON";
}

/* ---------------- COUNTRY ---------------- */
fetch("https://ipapi.co/json/")
.then(res => res.json())
.then(data => {
  countrySpan.innerText = data.country_name || "Unknown";
})
.catch(() => {
  countrySpan.innerText = "Unknown";
});

/* ---------------- SOCKET EVENTS ---------------- */

socket.on("onlineCount", count => {
  onlineSpan.innerText = count;
});

/* WAITING */
socket.on("waiting", () => {
  statusText.innerText = "🔍 Finding new stranger...";
  statusText.style.color = "#ff9800";
});

/* MATCHED */
socket.on("matched", () => {
  statusText.innerText = "✅ Connected with a stranger";
  statusText.style.color = "green";
  messages.innerHTML += "<div>🤝 You are now connected</div>";
});

/* DISCONNECTED */
socket.on("partnerDisconnected", () => {
  statusText.innerText = "❌ Stranger disconnected";
  statusText.style.color = "red";
  messages.innerHTML += "<div>❌ Stranger disconnected</div>";
});

/* MESSAGE RECEIVE */
socket.on("message", msg => {
  messages.innerHTML += `<div>👤 ${msg}</div>`;
  messages.scrollTop = messages.scrollHeight;
});

/* SEND MESSAGE */
function sendMsg() {
  const msg = msgInput.value.trim();
  if (!msg) return;

  socket.emit("message", msg);
  messages.innerHTML += `<div><b>Me:</b> ${msg}</div>`;
  msgInput.value = "";
  messages.scrollTop = messages.scrollHeight;
}

/* NEXT USER */
function nextUser() {
  messages.innerHTML = "";
  statusText.innerText = "🔍 Finding new stranger...";
  statusText.style.color = "#ff9800";
  socket.emit("next");
}
