// pixi.js

// Elements
const sidebar = document.getElementById("sidebar");
const opponentVideo = document.getElementById("opponentVideo");

// WebRTC Peer Connection and Data Channel
let rtcPeerConnection = null;
let dataChannel = null;

const video = document.getElementById("myVideo");
const chatContainer = document.getElementById("chatContainer");
const chatLog = document.getElementById("chatLog");
const textField = document.getElementById("textField");

// TextField
textField.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const message = textField.value.trim();
        if (message && dataChannel && dataChannel.readyState === "open") {
            dataChannel.send(message);
            const msgElem = document.createElement("div");
            msgElem.textContent = "You: " + message;
            chatLog.appendChild(msgElem);
            textField.value = "";
        }
    }
});

// Initialize signaling and WebRTC connection
function initSignaling() {
    // RTC Peer Connection
    rtcPeerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    // Add Video Track 
    if (video.srcObject) {
        video.srcObject.getTracks().forEach((track) => {
            rtcPeerConnection.addTrack(track, video.srcObject);
        });
    }

    // On ICE Candidate
    rtcPeerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            webSocket.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
        }
    };

    // On Track
    rtcPeerConnection.ontrack = (event) => {
        if (!event.streams || !event.streams[0]) {
            console.warn("⚠️ No remote stream received");
            return;
        }
        sidebar.style.display = "flex";
        opponentVideo.srcObject = event.streams[0];
        sidebar.style.display = "flex";  // Moved here to ensure display before showing video
        opponentVideo.play();
    };

    const webSocket = new WebSocket("ws://localhost:3000");
    webSocket.addEventListener("open", async () => {
        console.log("🛰 WebSocket connected");
        
    });

    webSocket.addEventListener("message", async (event) => {
        let rawData;
        if (event.data instanceof Blob) {
            rawData = await event.data.text();
        } else {
            rawData = event.data;
        }

        const data = JSON.parse(rawData);

        if (data.type === "wait") {
            console.log("🕓 Waiting for another user...");
        }
        if (data.type === "ready") {
            console.log(data.role);
            console.log("ready");
            const offer = await rtcPeerConnection.createOffer();
            await rtcPeerConnection.setLocalDescription(offer);
            webSocket.send(JSON.stringify(rtcPeerConnection.localDescription));

            if (data.role === "caller") {
                dataChannel = rtcPeerConnection.createDataChannel("chat");
                setupDataChannel();
            } else {
                rtcPeerConnection.ondatachannel = (event) => {
                    dataChannel = event.channel;
                    setupDataChannel();
                };
            }

            sidebar.style.display = "flex";
        }
        if (data.type === "offer") {
            console.log("📥 offer received");
            await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await rtcPeerConnection.createAnswer();
            await rtcPeerConnection.setLocalDescription(answer);
            webSocket.send(JSON.stringify(rtcPeerConnection.localDescription));
        }
        if (data.type === "answer") {
            console.log("📥 answer received");
            await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(data));
        }
        if (data.type === "candidate") {
            console.log("📥 ICE candidate received");
            try {
                await rtcPeerConnection.addIceCandidate(data.candidate);
            } catch (e) {
                console.error("⚠️ Error adding received ICE candidate", e);
            }
        }
    });
}

// Setup data channel event handlers
function setupDataChannel() {
    if (!dataChannel) return;

    dataChannel.onmessage = (event) => {
        const message = event.data;
        const msgElem = document.createElement("div");
        msgElem.textContent = "Peer: " + message;
        chatLog.appendChild(msgElem);
    };
}

// Button
const matchmakeButton = document.getElementById("matchmakeButton");
matchmakeButton.addEventListener("click", () => {
    initSignaling();
});

// User Media
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        video.srcObject = stream;

        video.play();
        video.onpause = () => console.warn("Video Paused");
        video.onended = () => console.warn("Video Ended");
        video.onerror = (e) => console.error("Video Error", e);
    })
    .catch((err) => {
        console.error("Video Error:", err);
    });