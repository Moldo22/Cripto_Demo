const http = require('http');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const crypto = require('crypto');
const messageEvents = new EventEmitter();
let messages_list=[];
let aesKey_global = null;

function base64urlToBuffer(base64url) {
    // Replace the characters specific to Base64URL
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    // add padding
    while (base64.length % 4) base64 += '=';
    return Buffer.from(base64, 'base64');
}


const server = http.createServer((req, res) => {
  
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5123"); 
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type"); 

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/messages.js") {
    const filePath = path.join(__dirname, "messages.js");
    const js = fs.readFileSync(filePath, "utf8");
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(js);
  }

  if (req.method === "GET" && req.url === "/chat-bubble.css") {
      const filePath = path.join(__dirname, "chat-bubble.css");
      const cs = fs.readFileSync(filePath, "utf8");
      res.writeHead(200, { "Content-Type": "text/css" });
      res.end(cs);
    }

  if (req.method === 'GET' && req.url === '/') {
    const filePath = path.join(__dirname, 'index.html');
    const html = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } 

  //Moldo
  if (req.url === '/aes_key' && req.method === 'POST') {
    let body = '';

    // Collect data from POST request
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const receivedKey = data.aesKey;

        if (receivedKey) {
          // save AES key in server's memory
          aesKey_global = receivedKey;
          console.log("AES shared secret (base64):",aesKey_global.k);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: `Key stored successfully in memory!`, aesKey:aesKey_global}));
        } else {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: 'No key provided' }));}
        }
        catch (error){}})}
  
  
  if (req.method === 'POST' && req.url === '/message'){
      let body = "";
  
      req.on("data", chunk => {
        body += chunk;
      });
  
      req.on("end", () => {
              console.log("Payload from server:", JSON.parse(body))
              const received = JSON.parse(body);

               // Expecting { message: <hex ciphertext>, iv: <hex iv>, authTag: <hex> }
              const encryptedMessage = Buffer.from(received.message, "base64");
              const iv = Buffer.from(received.iv, "base64");
              const authTag = Buffer.from(received.authTag, "base64");
          
              if (!aesKey_global) {
                  throw new Error("AES key not yet established on server!");
              }
  
              // Decrypt using AES-256-GCM
              const decipher = crypto.createDecipheriv("aes-256-gcm", base64urlToBuffer(aesKey_global.k), iv);
              decipher.setAuthTag(authTag);
  
              let decrypted = decipher.update(encryptedMessage);
              decrypted = Buffer.concat([decrypted, decipher.final()]);
  
              const decryptedText = decrypted.toString("utf8");
  
              // Store decrypted message
              messages_list.push(decryptedText); 
              
              messageEvents.emit('{Client}Data Modified');
  
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                  status: "OK",
                  message: "Message received from server."
              }));
      })
    }
  
  if (req.method === 'GET' && req.url === '/get_messages') {
    console.log(messages_list);
    const trimiteDate = () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(messages_list));
      };
    messageEvents.once('{Client}Data Modified', trimiteDate);
    req.on('close', () => {
            messageEvents.removeListener('{Client}Data Modified', trimiteDate);
        });
  };

  if (req.method === "GET" && req.url === "/handshake.js") {
    const filePath = path.join(__dirname, "handshake.js");
    const js = fs.readFileSync(filePath, "utf8");
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(js);
  }

});

server.listen(8080, '0.0.0.0', () => {
  console.log('Client HTTP rulează pe http://localhost:8080');
});