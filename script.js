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

// Main
const main = document.querySelector("main");
// Self
const selfVideo = document.getElementById("self-video");
const selfAudioVisualizer = document.getElementById("self-audio-visualizer");
// Peer
const peerVideoWrapper = document.getElementById("peer-video-wrapper")
const peerVideo = document.getElementById("peer-video");
const peerAudioVisualizer = document.getElementById("peer-audio-visualizer");
const connectionStatus = document.getElementById("connection-status");

// Sidebar
const sidebar = document.getElementById("sidebar");
const log = document.getElementById("log");
const textField = document.getElementById("text-field");

// Toolbar
const codeTextField = document.getElementById("code")
const toolbar = document.getElementById("toolbar");
const micButton = document.getElementById("mic-button");
const videocamButton = document.getElementById("videocam-button")
const callButton = document.getElementById("call-button");
const chatButton = document.getElementById("chat-button");
// Toolbar Icon
const micButtonIcon = micButton.querySelector(".material-symbols-rounded");
const videocamButtonIcon = videocamButton.querySelector(".material-symbols-rounded");
const callButtonIcon = callButton.querySelector(".material-symbols-rounded");
const chatButtonIcon = chatButton.querySelector(".material-symbols-rounded");

// Safe Area
const safeArea = parseInt(getComputedStyle(document.documentElement)
    .getPropertyValue("env(safe-area-inset-bottom)"));
// Safe Area
if (safeArea > 0) {
    main.style.paddingBottom = "env(safe-area-inset-bottom)";
    sidebar.style.paddingBottom = "4 + env(safe-area-inset-bottom)";
} else {
    main.style.paddingBottom = "4px";
    sidebar.style.paddingBottom = "8px";
}

// Window Event Listener
window.addEventListener('resize', () => {
    setWindowInnerHeight()
    resizeVideos()
});

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
});
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
        isChatHidden = true;
        sidebar.style.display = "none";
        resizeVideos()
        chatButtonIcon.textContent = "chat_bubble";
    } else {
        isChatHidden = false;
        sidebar.style.display = "flex";
        resizeVideos()
        chatButtonIcon.textContent = "chat";
        chatButton.style.backgroundColor = "#ccc";
    }
});

// Chat Event Listener
textField.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.isComposing) return;

    const message = textField.value.trim();
    if (!message || chatDataChannel.readyState !== "open") return;
    
    // Self Message
    chatDataChannel.send(JSON.stringify({ type: "message", text: message }));
    const messageElement = document.createElement("div");
    messageElement.classList.add("self-message")
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
        selfVideo.srcObject = stream;
        selfVideo.onloadedmetadata = () => {
            toolbar.style.display = "flex";
        };
        selfVideo.play();

        analyzeAudioWith(stream, selfAudioVisualizer)
    })
    .catch((err) => {
        console.error("Video Error:", err);
    });

// Set Window Inner Height
function setWindowInnerHeight() {
    const vh = window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}
setWindowInnerHeight()

// Resize Videos
function resizeVideos() {
    const mainStyle = window.getComputedStyle(main);
    const mainPadding = parseInt(mainStyle.padding);
    const mainPaddingBottom = parseInt(mainStyle.paddingBottom);
    const mainGap = parseInt(mainStyle.gap);
    const toolbarHeight = toolbar.offsetHeight;
    // Grid
    const grid = document.getElementById("grid");
    const gridGap = parseInt(window.getComputedStyle(grid).gap);
    const gridWidth = isChatHidden
        ? window.innerWidth / 2 - mainPadding - gridGap / 2
        : window.innerWidth * 2 / 5 - 2 * mainPadding - gridGap / 2;
    const gridHeight = window.innerHeight - mainPadding - mainPaddingBottom - mainGap - toolbarHeight;
    if (gridWidth / gridHeight > 16 / 9) {
        document.querySelectorAll(".video-wrapper") .forEach((videWrapper) => {
            videWrapper.style.height = gridHeight + "px";
            videWrapper.style.width = (gridHeight * 16 / 9) + "px";
        });
    } else {
        document.querySelectorAll(".video-wrapper") .forEach((videoWrapper) => {
            videoWrapper.style.width = (gridWidth) + "px";
            videoWrapper.style.height = (gridWidth / 16 * 9) + "px";
        });
    }
}
resizeVideos()

// Audio Analysis
function analyzeAudioWith(stream, audioVisualizer) {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const spectrumData = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);

    function updateBorder() {
        analyser.getByteFrequencyData(spectrumData);
        const volume = spectrumData.reduce((a, b) => a + b) / spectrumData.length;
        if (volume > 20) {
            
        }
        audioVisualizer.style.display = (volume > 20) ? "block" : "none";
        
        requestAnimationFrame(updateBorder);
    }
    updateBorder();
}

// Connect
function connect() {
    codeTextField.readOnly = true;
    callButtonIcon.textContent = "call_end";
    callButton.style.backgroundColor = "#F44336";
    peerVideoWrapper.style.display = "block";
    connectionStatus.style.display = "flex";

    if (window.statusText) {
        window.statusText.textContent = window.localized.connecting;
    }

    // RTC Peer Connection
    rtcPeerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    // Add Video Track 
    selfVideo.srcObject.getTracks().forEach((track) => {
        rtcPeerConnection.addTrack(track, selfVideo.srcObject);
    });

    // On ICE Candidate
    rtcPeerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            webSocket.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
        }
    };

    // On Track
    rtcPeerConnection.ontrack = (event) => {
        if (!peerVideo.srcObject) {
            peerVideo.srcObject = event.streams[0];
            peerVideo.play();
            connectionStatus.style.display = "none";
            analyzeAudioWith(event.streams[0], peerAudioVisualizer);
        }
    };

    // Websocket
    webSocket = new WebSocket("wss://winesystem.servehttp.com/ws/");
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
    isChatHidden = true;
    chatButtonIcon.textContent = "chat_bubble";
    chatButton.style.backgroundColor = "#ccc";
    sidebar.style.display = "none";
    peerVideo.srcObject = null;
    peerVideoWrapper.style.display = "none";
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

    // Peer Message
    chatDataChannel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
            const messageElement = document.createElement("div");
            messageElement.classList.add("peer-message");
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