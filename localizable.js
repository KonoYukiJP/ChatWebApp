// localizable.js

document.addEventListener("DOMContentLoaded", () => {
    const language = navigator.language.startsWith('ja') ? 'ja' : 'en';
    document.documentElement.lang = language;

    const localizable = {
        en: {
            connecting: "Connecting...",
            waiting: "Waiting...",
            placeholder: "Chat..."
        },
        ja: {
            connecting: "接続中...",
            waiting: "待機中...",
            placeholder: "チャット..."
        }
    };
    window.localized = localizable[language];

    window.statusText = document.getElementById("statusText");
    if (window.statusText) window.statusText.textContent = localized.connecting;

    const textField = document.getElementById("textField");
    if (textField) textField.placeholder = localized.placeholder;
});