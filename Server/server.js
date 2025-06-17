import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3000 });
let waitingClient = null;

wss.on('connection', (ws) => {
	if (waitingClient === null) {
		waitingClient = ws;
		ws.send(JSON.stringify({ type: "wait" }));

		ws.on('close', () => {
			waitingClient = null;
			console.log('Waiting Client Disconnected');
		});
	} else {
		const caller = waitingClient;
		const callee = ws;
		waitingClient = null;

		caller.send(JSON.stringify({ type: "ready", role: "caller" }));
		callee.send(JSON.stringify({ type: "ready", role: "callee" }));

		const forward = (sender, receiver) => {
			sender.on('message', (message) => {
				console.log('someone message')
				if (receiver.readyState === receiver.OPEN) {
					receiver.send(message);
				}
			});
			sender.on('close', () => {
				console.log('someone close')
				if (receiver.readyState === receiver.OPEN) {
					receiver.close();
				}
			});
		};

		forward(caller, callee);
		forward(callee, caller);
	}
});

console.log('Signaling server running on ws://localhost:3000');