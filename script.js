// script.js

// My Video
const video = document.getElementById("myVideo");
let isMuted = false;
let localAudioTrack = null;
// User Media
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        video.srcObject = stream;
        video.play();
        localAudioTrack = stream.getAudioTracks()[0];
    })
    .catch((err) => {
        console.error("Video Error:", err);
    });
video.onloadedmetadata = () => {
    connectButton.style.display = "block";
};

// Sidebar
const sidebar = document.getElementById("sidebar");
const loadingSpinner = document.getElementById("loadingSpinner");
const statusText = document.getElementById("statusText");

// Connect Button
const connectButton = document.getElementById("connectButton");
connectButton.addEventListener("click", () => {
    connect();
});


// Channel View
const channelView = document.getElementById("channelView");
// Opponent Video
const opponentVideo = document.getElementById("opponentVideo");
// Chat Log
const log = document.getElementById("log");
// Chat Text Field
const textField = document.getElementById("textField");
textField.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.isComposing) return;

    const message = textField.value.trim();
    if (!message || chatDataChannel.readyState !== "open") return;
    
    // My Message
    chatDataChannel.send(JSON.stringify({ type: "message", text: message }));
    const messageElement = document.createElement("div");
    messageElement.classList.add("myMessage")
    messageElement.textContent = message;
    log.appendChild(messageElement);
    messageElement.scrollIntoView({ behavior: "smooth", block: "end" });
    textField.value = "";
});
// Disconnect Button
const disconnectButton = document.getElementById("disconnectButton");
disconnectButton.addEventListener("click", () => {
    if (chatDataChannel && chatDataChannel.readyState === "open") {
        chatDataChannel.send(JSON.stringify({ type: "disconnect" }));
    }
    disconnect()
});
const micButton = document.getElementById("micButton");
micButton.addEventListener("click", () => {
    if (!localAudioTrack) return;
    isMuted = !isMuted;
    localAudioTrack.enabled = !isMuted;

    const icon = micButton.querySelector(".material-symbols-rounded");
    if (icon) {
        icon.textContent = isMuted ? "mic_off" : "mic";
    }
});

// RTC Peer Connection
let rtcPeerConnection = null;
// WebSocket
let webSocket = null;
// Connect
function connect() {
    connectButton.style.display = "none";
    loadingSpinner.style.display = "inline-block";
    statusText.style.display = "block";

    if (window.statusText) {
        window.statusText.textContent = window.localized.connecting;
    }

    // RTC Peer Connection
    rtcPeerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    // Add Video Track 
    video.srcObject.getTracks().forEach((track) => {
        rtcPeerConnection.addTrack(track, video.srcObject);
    });

    // On ICE Candidate
    rtcPeerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            webSocket.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
        }
    };

    // On Track
    rtcPeerConnection.ontrack = (event) => {
        if (!opponentVideo.srcObject) {
            opponentVideo.srcObject = event.streams[0];
            opponentVideo.play();
            loadingSpinner.style.display = "none";
            statusText.style.display = "none";

            opponentVideo.style.display = "block";
            log.style.display = "block";
            textField.style.display = "block";
        }
    };

    // Websocket
    webSocket = new WebSocket("ws://localhost:3000");
    webSocket.addEventListener("open", async () => {
        console.log("WebSocket Connected");
        
    });

    // On Message
    webSocket.addEventListener("message", async (event) => {
        let rawData;
        if (event.data instanceof Blob) {
            rawData = await event.data.text();
        } else {
            rawData = event.data;
        }
        const data = JSON.parse(rawData);

        if (data.type === "wait") {
            console.log("Waiting for another user.");
            if (window.statusText) window.statusText.textContent = window.localized.waiting;
        }
        if (data.type === "offerer") {
            createChatDataChannel(rtcPeerConnection.createDataChannel("chat"));
            const offer = await rtcPeerConnection.createOffer();
            await rtcPeerConnection.setLocalDescription(offer);
            webSocket.send(JSON.stringify(rtcPeerConnection.localDescription));
        } 
        if (data.type === "answerer") {
            rtcPeerConnection.ondatachannel = (event) => {
                createChatDataChannel(event.channel);
            };
        }
        if (data.type === "offer") {
            console.log("Offer received.");
            await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await rtcPeerConnection.createAnswer();
            await rtcPeerConnection.setLocalDescription(answer);
            webSocket.send(JSON.stringify(rtcPeerConnection.localDescription));
        }
        if (data.type === "answer") {
            console.log("Answer received.");
            await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(data));
        }
        if (data.type === "candidate") {
            console.log("ICE candidate received.");
            await rtcPeerConnection.addIceCandidate(data.candidate);
        }
        if (data.type === "disconnect") {
            disconnect()
        }
    });
}

// Chat Data Channel
let chatDataChannel = null;
function createChatDataChannel(dataChannel) {
    chatDataChannel = dataChannel

    // Opponent Message
    chatDataChannel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
            const messageElement = document.createElement("div");
            messageElement.classList.add("opponentMessage");
            messageElement.textContent = data.text;
            log.appendChild(messageElement);
            messageElement.scrollIntoView({ behavior: "smooth", block: "end" });
        } else if (data.type === "disconnect") {
            disconnect()
        }
    };
}

// Disconnect
function disconnect() {
    opponentVideo.srcObject = null;
    opponentVideo.style.display = "none";
    log.style.display = "none";
    textField.style.display = "none";
    connectButton.style.display = "block";
    // Remove Log Child
    while (log.firstChild) {
        log.removeChild(log.firstChild);
    }
    rtcPeerConnection.close();
    rtcPeerConnection = null;
    webSocket.close();
    webSocket = null;
}
