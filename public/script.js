const socket = io();

const localVideo = document.getElementById("localVideo");
const partnerVideo = document.getElementById("partnerVideo");
const messages = document.getElementById("messages");
const msgInput = document.getElementById("msg");
const onlineSpan = document.getElementById("online");
const countrySpan = document.getElementById("country");
const statusText = document.getElementById("status");

let localStream;
let peerConnection;
let cameraOn = true;
let isCaller = false;

/* ---------------- CAMERA ---------------- */
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
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

  startPeerConnection();
});

/* DISCONNECTED */
socket.on("partnerDisconnected", () => {
  statusText.innerText = "❌ Stranger disconnected";
  statusText.style.color = "red";
  messages.innerHTML += "<div>❌ Stranger disconnected</div>";
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
    partnerVideo.srcObject = null;
  }
});

/* MESSAGE RECEIVE */
socket.on("message", msg => {
  messages.innerHTML += `<div>👤 ${msg}</div>`;
  messages.scrollTop = messages.scrollHeight;
});

/* ---------------- WEBRTC ---------------- */
async function startPeerConnection() {
  peerConnection = new RTCPeerConnection();

  // Add local stream tracks
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  // Remote stream
  peerConnection.ontrack = (event) => {
    partnerVideo.srcObject = event.streams[0];
  };

  // ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", event.candidate);
    }
  };

  // If first caller, create offer
  if (!socket.partnerCreatedOffer) {
    isCaller = true;
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);
  }
}

/* Receive Offer */
socket.on("offer", async (offer) => {
  if (!peerConnection) startPeerConnection();

  socket.partnerCreatedOffer = true;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", answer);
});

/* Receive Answer */
socket.on("answer", async (answer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

/* Receive ICE Candidate */
socket.on("ice-candidate", async (candidate) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (e) {
    console.error("Error adding ice candidate:", e);
  }
});

/* ---------------- SEND MESSAGE ---------------- */
function sendMsg() {
  const msg = msgInput.value.trim();
  if (!msg) return;

  socket.emit("message", msg);
  messages.innerHTML += `<div><b>Me:</b> ${msg}</div>`;
  msgInput.value = "";
  messages.scrollTop = messages.scrollHeight;
}

/* ---------------- NEXT USER ---------------- */
function nextUser() {
  messages.innerHTML = "";
  statusText.innerText = "🔍 Finding new stranger...";
  statusText.style.color = "#ff9800";

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
    partnerVideo.srcObject = null;
  }

  socket.emit("next");
}
