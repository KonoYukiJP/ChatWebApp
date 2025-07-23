// localizable.js

document.addEventListener("DOMContentLoaded", () => {
    const language = navigator.language.startsWith('ja') ? 'ja' : 'en';
    document.documentElement.lang = language;

    const localizable = {
        en: {
            code: "Enter a code",
            connecting: "Connecting...",
            waiting: "Waiting...",
            placeholder: "Chat..."
        },
        ja: {
            code: "コードを入力",
            connecting: "接続中...",
            waiting: "待機中...",
            placeholder: "チャット..."
        }
    };
    window.localized = localizable[language];

    const codeTextField = document.getElementById("code");
    if (codeTextField) codeTextField.placeholder = localized.code

    window.statusText = document.getElementById("status-text");
    if (window.statusText) window.statusText.textContent = localized.connecting;

    const textField = document.getElementById("text-field");
    if (textField) textField.placeholder = localized.placeholder;
});