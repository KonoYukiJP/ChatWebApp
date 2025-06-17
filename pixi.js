// pixi.js

// Hide sidebar and opponentVideo immediately so they are not visible on initial load
const sidebar = document.getElementById("sidebar");
const opponentVideo = document.getElementById("opponentVideo");
if (sidebar) sidebar.style.display = "none";
if (opponentVideo) opponentVideo.style.display = "none";

let webSocket;

// Button
const signalButton = document.getElementById("signalButton");
signalButton.addEventListener("click", async () => {
    if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
        webSocket = new WebSocket("ws://localhost:3000");

        webSocket.addEventListener("open", async () => {
            console.log("🛰 WebSocket connected");

            rtcPeerConnection = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
            });

            rtcPeerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    webSocket.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
                }
            };

            rtcPeerConnection.ontrack = (event) => {
                if (!event.streams || !event.streams[0]) {
                    console.warn("⚠️ No remote stream received");
                    return;
                }
                opponentVideo.srcObject = event.streams[0];
                sidebar.style.display = "flex";
                opponentVideo.style.display = "block";
                opponentVideo.play();
            };

            const offer = await rtcPeerConnection.createOffer();
            await rtcPeerConnection.setLocalDescription(offer);
            webSocket.send(JSON.stringify(rtcPeerConnection.localDescription));
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
                console.log("ready");
                console.log(data.role);
                isCaller = data.role === "caller";
                
                sidebar.style.display = "flex";
                opponentVideo.style.display = "none"; // wait for remote track before showing
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
});

// WebRTC Peer Connection
let rtcPeerConnection;
let isCaller = false;




const video = document.getElementById("myVideo");
// opponentVideo and sidebar already declared above
const chatContainer = document.getElementById("chatContainer");
const chatLog = document.getElementById("chatLog");
const chatInput = document.getElementById("chatInput");

// User Media
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        video.srcObject = stream;
        video.style.display = "block";
        
        video.play()
        video.onpause = () => console.warn("Video Paused");
        video.onended = () => console.warn("Video Ended");
        video.onerror = (e) => console.error("Video Error", e);
        
        video.onloadeddata = async () => {
            if (!rtcPeerConnection) return;

            // Add data channel for caller
            if (isCaller) {
                const dataChannel = rtcPeerConnection.createDataChannel("chat");
                dataChannel.onmessage = (event) => {
                    const message = event.data;
                    const msgElem = document.createElement("div");
                    msgElem.textContent = "Peer: " + message;
                    chatLog.appendChild(msgElem);
                };

                chatInput.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" && chatInput.value.trim()) {
                        const message = chatInput.value.trim();
                        dataChannel.send(message);
                        const msgElem = document.createElement("div");
                        msgElem.textContent = "You: " + message;
                        chatLog.appendChild(msgElem);
                        chatInput.value = "";
                    }
                });
            } else {
                rtcPeerConnection.ondatachannel = (event) => {
                    const dataChannel = event.channel;

                    dataChannel.onmessage = (event) => {
                        const message = event.data;
                        const msgElem = document.createElement("div");
                        msgElem.textContent = "Peer: " + message;
                        chatLog.appendChild(msgElem);
                    };

                    chatInput.addEventListener("keydown", (e) => {
                        if (e.key === "Enter" && chatInput.value.trim()) {
                            const message = chatInput.value.trim();
                            dataChannel.send(message);
                            const msgElem = document.createElement("div");
                            msgElem.textContent = "You: " + message;
                            chatLog.appendChild(msgElem);
                            chatInput.value = "";
                        }
                    });
                };
            }

            // ICE Candidate
            rtcPeerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    webSocket.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
                }
            };
            
            // Track
            rtcPeerConnection.ontrack = (event) => {
                if (!event.streams || !event.streams[0]) {
                    console.warn("⚠️ No remote stream received");
                    return;
                }
                opponentVideo.srcObject = event.streams[0];
                sidebar.style.display = "flex";
                opponentVideo.style.display = "block";
                opponentVideo.play();
            };

            // Add Track
            video.srcObject.getTracks().forEach((track) => {
                rtcPeerConnection.addTrack(track, video.srcObject);
            });

        
        };
    })
    .catch((err) => {
        console.error("Video Error:", err);
    });