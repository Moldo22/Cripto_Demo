
document.addEventListener("DOMContentLoaded", () => {
    
    chat=document.getElementById("chat");
    const buton = document.getElementById("SendToClient");
    buton.addEventListener("click", () => { sendData() });
    
    // Helper: convert ArrayBuffer/Uint8Array to Base64
    function arrayBufferToBase64(buf) {
        return btoa(String.fromCharCode(...new Uint8Array(buf)));
    }


    

    function sendData() {
        const text=document.getElementById("mesaj_server").value;
        
        // Show the message bubble immediately
        const bubble = document.createElement("div");
        bubble.id = "server-messages";
        bubble.className = "message-bubble-right";
        bubble.textContent = text;
        chat.appendChild(bubble);

        fetch("http://localhost:5123/plain_text", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                plainText: text 
            })
            })
        .then(res => res.json())
        .then(encryptedData => {
            console.log("Mesaj  criptat din server backend:", encryptedData);
             fetch("http://localhost:8080/message", {
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({
                message: encryptedData.message,
                iv: encryptedData.iv,
                authTag: encryptedData.authTag
          })
        }).then(res => res.json())
            .then(data => {
            console.log("Response de la client /message: ",data);
            });  
        })
        .catch(err => console.error(err));
        
    }

    function fetchMessages() {
    fetch(`http://localhost:5123/get_messages`)
        .then(res => res.json())
        .then(data => {
    
            const bubble = document.createElement("div");
            bubble.id="client-messages"
            bubble.className = "message-bubble-left";
            bubble.textContent = data.at(-1);
            chat.appendChild(bubble);
            
            fetchMessages();
        });
        return;
    }
    fetchMessages()
});
