# CallWebApp

A simple browser-based video calling web application with chat functionality, built using WebRTC and Pixi.js.

## Features

- ✅ Live camera preview using WebRTC
- ✅ Peer-to-peer video call signaling via WebSocket
- ✅ Text chat with a message log (up to 50 messages)
- ✅ Matchmaking triggered by a button click
- ✅ Dynamic UI that hides opponent's video and chat until a match is made

## Technologies

- HTML5 / CSS3
- JavaScript (Vanilla)
- WebRTC (for peer-to-peer media)
- WebSocket (for signaling server)
- Pixi.js (for optional rendering integration)
- STUN server: `stun:stun.l.google.com:19302`

## Project Structure

CallWebApp/
├── index.html       # Main HTML structure with video, sidebar, and chat
├── style.css        # UI styling (flex layout, video scaling, etc.)
├── pixi.js          # Core WebRTC and Pixi-related script
└── server.js        # Signaling server (assumed to be Node.js + ws)

## How to Use

1. Start the signaling server (`node server.js`)
2. Open `index.html` in two separate browsers or devices
3. Click **Start Signaling** on both clients
4. When matched, video and chat will appear

## Notes

- The opponent's video and chat UI are hidden until a peer is found.
- Message log is trimmed to the last 50 messages.
- Chat and media are sent over WebRTC's data and media channels respectively.

## License

MIT
