// script.js

let isAudioMuted = false;
let isVideoMuted = false;
let selfAudioTrack = null;
let selfVideoTrack = null;
let isConnected = false;
let isChatHidden = true;

// RTC Peer Connection
let rtcPeerConnection = null;
let chatDataChannel = null;
// WebSocket
let webSocket = null;

// My Video
const myVideo = document.getElementById("myVideo");

// Toolbar
const codeTextField = document.getElementById("code")
const toolbar = document.getElementById("toolbar");
const micButton = document.getElementById("micButton");
const videocamButton = document.getElementById("videocamButton")
const callButton = document.getElementById("callButton");
const chatButton = document.getElementById("chatButton");

// Toolbar Icon
const micButtonIcon = micButton.querySelector(".material-symbols-rounded");
const videocamButtonIcon = videocamButton.querySelector(".material-symbols-rounded");
const callButtonIcon = callButton.querySelector(".material-symbols-rounded");
const chatButtonIcon = chatButton.querySelector(".material-symbols-rounded");

// Sidebar
const sidebar = document.getElementById("sidebar");

// Connecting
const connectionStatus = document.getElementById("connectionStatus");

// Opponent Video
const opponentVideo = document.getElementById("opponentVideo");
// Chat
const log = document.getElementById("log");
const textField = document.getElementById("textField");

// Toolbar Event Listener
micButton.addEventListener("click", () => {
    if (!selfAudioTrack) return;
    
    if (isAudioMuted) {
        isAudioMuted = false;
        selfAudioTrack.enabled = true;
        micButtonIcon.textContent = "mic";
    } else {
        isAudioMuted = true;
        selfAudioTrack.enabled = false;
        micButtonIcon.textContent = "mic_off";
    }
});
videocamButton.addEventListener("click", () => {
    if (!selfVideoTrack) return;

    if (isVideoMuted) {
        isVideoMuted = false;
        selfVideoTrack.enabled = true;
        videocamButtonIcon.textContent = "videocam";
    } else {
        isVideoMuted = true;
        selfVideoTrack.enabled = false;
        videocamButtonIcon.textContent = "videocam_off";
    }
})
callButton.addEventListener("click", () => {
    if (!isConnected) {
        connect();
    } else {
        if (chatDataChannel && chatDataChannel.readyState === "open") {
            chatDataChannel.send(JSON.stringify({ type: "disconnect" }));
        }
        disconnect();
    }
});
chatButton.addEventListener("click", () => {
    if (!isChatHidden) {
        sidebar.style.display = "none";
        document.querySelectorAll("video").forEach((video) => {
            video.style.maxWidth = "calc(50vw - 6px)";
        });
        chatButtonIcon.textContent = "chat_bubble";
        isChatHidden = true;
    } else {
        sidebar.style.display = "flex";
        document.querySelectorAll("video").forEach((video) => {
            video.style.maxWidth = "calc(40vw - 6px)";
        });
        chatButtonIcon.textContent = "chat";
        chatButton.style.backgroundColor = "#ccc";
        isChatHidden = false;
    }
});

// Chat Event Listener
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

// Get User Media
navigator.mediaDevices.getUserMedia({ video: {aspectRatio: 16 / 9}, audio: true })
    .then((stream) => {
        selfAudioTrack = stream.getAudioTracks()[0];
        micButtonIcon.textContent = "mic";
        selfVideoTrack = stream.getVideoTracks()[0];
        videocamButtonIcon.textContent = "videocam";
        myVideo.srcObject = stream;
        myVideo.onloadedmetadata = () => {
            toolbar.style.display = "flex";
        };
        myVideo.play();
    })
    .catch((err) => {
        console.error("Video Error:", err);
    });

// Connect
function connect() {
    codeTextField.readOnly = true;
    callButtonIcon.textContent = "call_end";
    callButton.style.backgroundColor = "#F44336";
    connectionStatus.style.display = "flex";

    if (window.statusText) {
        window.statusText.textContent = window.localized.connecting;
    }

    // RTC Peer Connection
    rtcPeerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    // Add Video Track 
    myVideo.srcObject.getTracks().forEach((track) => {
        rtcPeerConnection.addTrack(track, myVideo.srcObject);
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
            connectionStatus.style.display = "none";
            opponentVideo.style.display = "block";
        }
    };

    // Websocket
    // webSocket = new WebSocket("wss://winesystem.servehttp.com/ws/");
    webSocket = new WebSocket("ws://localhost:3000");
    webSocket.addEventListener("open", async () => {
        console.log("WebSocket Connected");

        const code = codeTextField.value.trim();
        webSocket.send(JSON.stringify({ type: "code", code: code }));
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

    isConnected = true
}

// Disconnect
function disconnect() {
    connectionStatus.style.display = "none";

    chatButton.style.display = "none";
    sidebar.style.display = "none";
    opponentVideo.srcObject = null;
    opponentVideo.style.display = "none";
    callButtonIcon.textContent = "call";
    callButton.style.backgroundColor = "#4CAF50";
    codeTextField.readOnly = false;

    // Remove Log Child
    while (log.firstChild) {
        log.removeChild(log.firstChild);
    }
    rtcPeerConnection.close();
    rtcPeerConnection = null;
    webSocket.close();
    webSocket = null;

    isConnected = false
}

// Chat Data Channel
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
            if (isChatHidden) {
                chatButtonIcon.textContent = "mark_chat_unread";
                chatButton.style.backgroundColor = "rgba(65, 147, 239)";
            }
        } else if (data.type === "disconnect") {
            disconnect()
        }
    };
    chatDataChannel.onopen = () => {
        chatButton.style.display = "inline-block";
    };
}