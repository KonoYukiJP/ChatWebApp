// script.js

// My Video
const video = document.getElementById("myVideo");
video.onpause = () => console.warn("Video Paused");
video.onended = () => console.warn("Video Ended");
video.onerror = (e) => console.error("Video Error", e);
video.onloadedmetadata = () => {
    homeView.style.display = "flex";
};

// Home View
const homeView = document.getElementById("homeView");
// Connect Button
const connectButton = document.getElementById("connectButton");
connectButton.addEventListener("click", () => {
    connect();
});

// Connecting View
const connectingView = document.getElementById("connectingView");

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

// RTC Peer Connection
let rtcPeerConnection = null;
// WebSocket
let webSocket = null;
// Connect
function connect() {
    homeView.style.display = "none";
    connectingView.style.display = "flex";

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
        if (!event.streams || !event.streams[0]) {
            console.warn("No remote stream received");
            return;
        }
        opponentVideo.srcObject = event.streams[0];
        opponentVideo.play();
        connectingView.style.display = "none";
        channelView.style.display = "flex";
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
        }
        if (data.type === "caller") {
            createChatDataChannel(rtcPeerConnection.createDataChannel("chat"));
            const offer = await rtcPeerConnection.createOffer();
            await rtcPeerConnection.setLocalDescription(offer);
            webSocket.send(JSON.stringify(rtcPeerConnection.localDescription));
        } 
        if (data.type === "callee") {
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
    });
}

// Disconnect
function disconnect() {
    opponentVideo.srcObject = null;
    channelView.style.display = "none";
    homeView.style.display = "flex";
    // Remove Log Child
    while (log.firstChild) {
        log.removeChild(log.firstChild);
    }
    rtcPeerConnection.close();
    rtcPeerConnection = null;
    webSocket.close();
    webSocket = null;
}

// User Media
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        video.srcObject = stream;
        video.play();
    })
    .catch((err) => {
        console.error("Video Error:", err);
    });
