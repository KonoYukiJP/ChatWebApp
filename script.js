// pixi.js

// Elements
const sidebar = document.getElementById("sidebar");
const opponentVideo = document.getElementById("opponentVideo");

// WebRTC Peer Connection and Data Channel
let dataChannel = null;

const video = document.getElementById("myVideo");

// Chat
const textField = document.getElementById("textField");
const chatLog = document.getElementById("chatLog");
const chatContainer = document.getElementById("chatContainer");
if (chatContainer) {
    chatContainer.style.display = "flex";
    chatContainer.style.flexDirection = "column";
}
if (chatLog) {
    chatLog.style.flex = "1";
    chatLog.style.maxHeight = "200px";
    chatLog.style.overflowY = "auto";
}

textField.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const message = textField.value.trim();
        if (message && dataChannel && dataChannel.readyState === "open") {
            dataChannel.send(message);
            const msgElem = document.createElement("div");
            msgElem.textContent = message;
            msgElem.classList.add("my-message");
            chatLog.appendChild(msgElem);
            msgElem.scrollIntoView({ behavior: "smooth", block: "end" });
            // 上限を超えたら最も古いログを削除
            while (chatLog.childNodes.length > 50) {
                chatLog.removeChild(chatLog.firstChild);
            }
            textField.value = "";
        }
    }
});

// --- グローバルで参照できるように let で宣言 ---
let rtcPeerConnection = null;
let webSocket = null;

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

        loadingSpinner.style.display = "none";
    };

    webSocket = new WebSocket("ws://localhost:3000");
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
            if (data.role === "caller") {
                dataChannel = rtcPeerConnection.createDataChannel("chat");
                setupDataChannel();
                const offer = await rtcPeerConnection.createOffer();
                await rtcPeerConnection.setLocalDescription(offer);
                webSocket.send(JSON.stringify(rtcPeerConnection.localDescription));
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
function addMessage(msgText) {
    const chatLog = document.getElementById('chatLog');
    const msgElem = document.createElement('div');
    msgElem.textContent = msgText;
    chatLog.appendChild(msgElem);
    msgElem.scrollIntoView({ behavior: "smooth", block: "end" });
    // 上限を超えたら最も古いログを削除
    while (chatLog.childNodes.length > 50) {
        chatLog.removeChild(chatLog.firstChild);
    }
}

function setupDataChannel() {
    if (!dataChannel) return;

    dataChannel.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === "leave") {
                opponentVideo.srcObject = null;

                if (rtcPeerConnection) {
                    rtcPeerConnection.close();
                    rtcPeerConnection = null;
                }
                if (webSocket) {
                    webSocket.close();
                    webSocket = null;
                }
                sidebar.style.display = "none";
                connectButton.style.display = "block";
                return;
            }
        } catch {
            const message = event.data;
            const msgElem = document.createElement("div");
            msgElem.textContent = message + " - Opponent";
            msgElem.classList.add("opponent-message");
            chatLog.appendChild(msgElem);
            msgElem.scrollIntoView({ behavior: "smooth", block: "end" });
            // 上限を超えたら最も古いログを削除
            while (chatLog.childNodes.length > 50) {
                chatLog.removeChild(chatLog.firstChild);
            }
        }
    };
}

// Button
const connectButton = document.getElementById("connectButton");
const loadingSpinner = document.getElementById("loadingSpinner");
connectButton.addEventListener("click", () => {
    connectButton.style.display = "none";
    loadingSpinner.style.display = "block";
    initSignaling();
});

// 退出ボタンの処理
const disconnectButton = document.getElementById("disconnectButton");
disconnectButton.addEventListener("click", () => {
    if (dataChannel && dataChannel.readyState === "open") {
        dataChannel.send(JSON.stringify({ type: "leave" }));
    }
    sidebar.style.display = "none";
    connectButton.style.display = "block";
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

// Assuming chatLog and message appending occurs somewhere in pixi.js or other scripts,
// here is an example snippet to limit chatLog messages to 50:

// Example function to add message:
function addMessage(msgText) {
    const chatLog = document.getElementById('chatLog');
    const msgElem = document.createElement('div');
    msgElem.textContent = msgText;
    chatLog.appendChild(msgElem);
    msgElem.scrollIntoView({ behavior: "smooth", block: "end" });

    // 上限を超えたら最も古いログを削除
    while (chatLog.childNodes.length > 50) {
        chatLog.removeChild(chatLog.firstChild);
    }
}