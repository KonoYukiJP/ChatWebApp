// script.js

// Home View
const homeView = document.getElementById("homeView");
homeView.style.display = "flex";
// Connecting View
const connectingView = document.getElementById("connectingView");
// Channel View
const channelView = document.getElementById("channelView");

// My Video
const video = document.getElementById("myVideo");
// Opponent Video
const opponentVideo = document.getElementById("opponentVideo");

// Chat
const log = document.getElementById("log");
const textField = document.getElementById("textField");
// WebRTC Peer Connection and Data Channel
let chatDataChannel = null;

// TextField Keydown
textField.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const message = textField.value.trim();
        if (message && chatDataChannel && chatDataChannel.readyState === "open") {
            chatDataChannel.send(JSON.stringify({ type: "message", text: message }));
            const msgElem = document.createElement("div");
            msgElem.textContent = message;
            msgElem.classList.add("myMessage");
            log.appendChild(msgElem);
            msgElem.scrollIntoView({ behavior: "smooth", block: "end" });
            // 上限を超えたら最も古いログを削除
            while (log.childNodes.length > 50) {
                log.removeChild(log.firstChild);
            }
            textField.value = "";
        }
    }
});

// --- グローバルで参照できるように let で宣言 ---
let rtcPeerConnection = null;
let webSocket = null;

// Connect
function connect() {
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
        connectingView.style.display = "none";
        opponentVideo.srcObject = event.streams[0];
        opponentVideo.play();
        channelView.style.display = "flex";  // Moved here to ensure display before showing video
    };

    // Websocket
    webSocket = new WebSocket("ws://localhost:3000");
    webSocket.addEventListener("open", async () => {
        console.log("WebSocket connected");
        
    });

    // Message
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
        if (data.type === "caller") {
            chatDataChannel = rtcPeerConnection.createDataChannel("chat");
            setupDataChannel();
            const offer = await rtcPeerConnection.createOffer();
            await rtcPeerConnection.setLocalDescription(offer);
            webSocket.send(JSON.stringify(rtcPeerConnection.localDescription));
        } 
        if (data.type === "callee") {
            rtcPeerConnection.ondatachannel = (event) => {
                chatDataChannel = event.channel;
                setupDataChannel();
            };
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

function setupDataChannel() {
    if (!chatDataChannel) return;

    chatDataChannel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
            const messageElement = document.createElement("div");
            messageElement.textContent = data.text;
            messageElement.classList.add("opponentMessage");
            log.appendChild(messageElement);
            messageElement.scrollIntoView({ behavior: "smooth", block: "end" });
            while (log.childNodes.length > 64) {
                log.removeChild(log.firstChild);
            }
        } else if (data.type === "leave") {
            opponentVideo.srcObject = null;

            if (rtcPeerConnection) {
                rtcPeerConnection.close();
                rtcPeerConnection = null;
            }
            if (webSocket) {
                webSocket.close();
                webSocket = null;
            }
            channelView.style.display = "none";
            homeView.style.display = "block";
            return;
        }
    };
}

// Connect Button
const connectButton = document.getElementById("connectButton");

connectButton.addEventListener("click", () => {
    homeView.style.display = "none";
    connectingView.style.display = "flex";
    connect();
});

// Disconnect Button
const disconnectButton = document.getElementById("disconnectButton");
disconnectButton.addEventListener("click", () => {
    if (chatDataChannel && chatDataChannel.readyState === "open") {
        chatDataChannel.send(JSON.stringify({ type: "leave" }));
    }
    channelView.style.display = "none";
    homeView.style.display = "block";
    if (rtcPeerConnection) {
        rtcPeerConnection.close();
        rtcPeerConnection = null;
    }
    if (webSocket) {
        webSocket.close();
        webSocket = null;
    }
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
