// localizable.js

document.addEventListener("DOMContentLoaded", () => {
    const language = navigator.language.startsWith('ja') ? 'ja' : 'en';
    document.documentElement.lang = language;

    const localizable = {
        en: {
            connect: "Connect",
            disconnect: "Disconnect",
            connecting: "Connecting...",
            placeholder: "Chat..."
        },
        ja: {
            connect: "接続",
            disconnect: "切断",
            connecting: "接続中...",
            placeholder: "チャット..."
        }
    };
    const localized = localizable[language];

    const connectButton = document.getElementById("connectButton");
    if (connectButton) connectButton.textContent = localized.connect;

    const disconnectButton = document.getElementById("disconnectButton");
    if (disconnectButton) disconnectButton.textContent = localized.disconnect;

    const spinnerText = document.getElementById("connectingText");
    if (spinnerText) spinnerText.textContent = localized.connecting;

    const textField = document.getElementById("textField");
    if (textField) textField.placeholder = localized.placeholder;
});