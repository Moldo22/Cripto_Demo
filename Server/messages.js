
document.addEventListener("DOMContentLoaded", () => {
    
    chat=document.getElementById("chat");
    const buton = document.getElementById("SendToClient");
    buton.addEventListener("click", () => { sendData() });
    
    function sendData() {
        const text=document.getElementById("mesaj_server").value;
        const data = {
            message: text
        };

        const bubble = document.createElement("div");
            bubble.id="server-messages"
            bubble.className = "message-bubble-right";
            bubble.textContent = text;
            chat.appendChild(bubble);

        fetch("http://localhost:8080/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        return;
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
    }
    fetchMessages()
});
