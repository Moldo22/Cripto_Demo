//const crypto = require('crypto');
//const {getAesKey}  = require('./rsa_key_req.js')
const http = require('http');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const messageEvents = new EventEmitter();
let messages_list=[];


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

  
  
  
  if (req.method === 'POST' && req.url === '/message'){
      console.log("am intrat in /message");
      let body = "";
  
      req.on("data", chunk => {
        body += chunk;
      });
  
      req.on("end", () => {
              console.log("payload de la server:", JSON.parse(body))
              const received = JSON.parse(body);
              console.log("Mesaj primit: ",received.message);
  
              /* // Expecting { message: <hex ciphertext>, iv: <hex iv>, authTag: <hex> }
              const encryptedMessage = Buffer.from(received.message, "base64");
              const iv = Buffer.from(received.iv, "base64");
              const authTag = Buffer.from(received.authTag, "base64");
              //let aesKey = getAesKey();
              let aesKey = null;
              console.log(aesKey);
              if (!aesKey) {
                  throw new Error("AES key not yet established on server!");
              }
  
              // Decrypt using AES-256-GCM
              const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey.export(), iv);
              decipher.setAuthTag(authTag);
  
              let decrypted = decipher.update(encryptedMessage);
              decrypted = Buffer.concat([decrypted, decipher.final()]);
  
              const decryptedText = decrypted.toString("utf8");
  
              // Store decrypted message
              //messages_list.push(decryptedText); */

              messages_list.push(received.message);
              
              messageEvents.emit('{Server}Data Modified');
  
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                  status: "ok",
                  //message: `Am primit mesajul de la client: "${decryptedText}"`
                  message: `Am primit mesajul de la client: "${received.message}"`
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

  if (req.method === "GET" && req.url === "/rsa_key_req.js") {
    const filePath = path.join(__dirname, "rsa_key_req.js");
    const js = fs.readFileSync(filePath, "utf8");
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(js);
  }

  if (req.method === "POST" && req.url === "/save_key") {
    let body = "";

    // Collect incoming data
    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const received = JSON.parse(body);

        if (!received.key) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            status: "error",
            message: "No key provided"
          }));
        }

        const base64Key = received.key.trim();
        const keyFilePath = path.join(__dirname, "aesKey.txt");
        // Append the key to aesKey.txt with newline
        fs.writeFileSync(keyFilePath, base64Key + "\n", { encoding: "utf8", mode: 0o600 });

        // Respond to client
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "ok",
          message: "AES key saved successfully"
        }));

      } catch (err) {
        console.error("Error saving AES key:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "error",
          message: "Internal server error"
        }));
      }
    });

    // Handle errors during data reception
    req.on("error", err => {
      console.error("Request error:", err);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "error",
        message: "Bad request"
      }));
    });

  }



});

server.listen(8080, '0.0.0.0', () => {
  console.log('Client HTTP rulează pe http://localhost:8080');
});






