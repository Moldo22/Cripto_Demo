
document.addEventListener("DOMContentLoaded", () => {
    
    chat=document.getElementById("chat");
    const buton = document.getElementById("SendToServer");
    buton.addEventListener("click", () => { sendData() });

    // Helper: convert ArrayBuffer/Uint8Array to Base64
    function arrayBufferToBase64(buf) {
        return btoa(String.fromCharCode(...new Uint8Array(buf)));
    }


    // Encrypt a message using AES-GCM
    function encryptMessage(plainText) {
        const aesKey = window.getAesKey();
        if (!aesKey) throw new Error("AES key not available");

        const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes IV for AES-GCM
        const encoded = new TextEncoder().encode(plainText);
        console.log("AES Key Client ");
        console.log(aesKey);
        return crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            aesKey,
            encoded
        ).then(encryptedBuffer => {
            const encryptedBytes = new Uint8Array(encryptedBuffer);
            // AES-GCM automatically appends 16-byte auth tag at the end
            const cipher = encryptedBytes.slice(0, -16); // actual ciphertext
            const authTag = encryptedBytes.slice(-16);   // last 16 bytes are auth tag
            return {
                cipher: arrayBufferToBase64(cipher),
                iv: arrayBufferToBase64(iv),
                authTag: arrayBufferToBase64(authTag)
            }
        });
    }


    function sendData() {
        const text=document.getElementById("mesaj_client").value;

        // Show the message bubble immediately
        const bubble = document.createElement("div");
        bubble.id = "client-messages";
        bubble.className = "message-bubble-right";
        bubble.textContent = text;
        chat.appendChild(bubble);

        // Encrypt the message
        encryptMessage(text)
            .then(encryptedData => {
                const dataToSend = {
                message: encryptedData.cipher,
                iv: encryptedData.iv,
                authTag: encryptedData.authTag
            };

            // Send encrypted data to the server
            return fetch("http://localhost:5123/message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dataToSend)
            });
    })
    .then(res => res.json())
    .then(resJson => {
        console.log("Encrypted message sent:", resJson);
    })
    .catch(err => {
        console.error("Error sending encrypted message:", err);
    });
    }

  function fetchMessages() {
    fetch(`http://localhost:8080/get_messages`)
        .then(res => res.json())
        .then(data => { 

            const bubble = document.createElement("div");
            bubble.id="server-messages"
            bubble.className = "message-bubble-left";
            bubble.textContent = data.at(-1);
            chat.appendChild(bubble);
            
            fetchMessages();
        });
    return;
}
    fetchMessages()
});
