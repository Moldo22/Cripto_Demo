const http = require('http');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const crypto = require('crypto');
const messageEvents = new EventEmitter();
const { RSA_PRIVATE_KEY } = require("./rsa_keys.js");

let messages_list= [];

let serverECDH;
let aesKey;

// Encrypt a message using AES-GCM
    function encryptMessage(plainText) {

        const iv = crypto.randomBytes(12); // Node crypto
        const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);

        const encrypted = Buffer.concat([
          cipher.update(plainText, "utf8"),
          cipher.final()
        ]);

        const authTag = cipher.getAuthTag();

        return {
          cipher: encrypted.toString("base64"),
          iv: iv.toString("base64"),
          authTag: authTag.toString("base64")
        };
      }

const server = http.createServer((req, res) => {

  res.setHeader("Access-Control-Allow-Origin", "http://localhost:8080"); 
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

  else if (req.method === 'GET' && req.url === '/api') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ mesaj: 'Salut - Test API' }));
  } 
  
  else if (req.method === 'POST' && req.url === '/message'){
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", () => {
            const received = JSON.parse(body);

            console.log("Payload from client ",received);
            // Expecting { message: <hex ciphertext>, iv: <hex iv>, authTag: <hex> }
            const encryptedMessage = Buffer.from(received.message, "base64");
            const iv = Buffer.from(received.iv, "base64");
            const authTag = Buffer.from(received.authTag, "base64");

            if (!aesKey) {
                throw new Error("AES key not yet established on server!");
            }

            // Decrypt using AES-256-GCM
            const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encryptedMessage);
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            const decryptedText = decrypted.toString("utf8");

            // Store decrypted message
            messages_list.push(decryptedText);
            messageEvents.emit('{Server}Data Modified');

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                status: "OK",
                message: "Message received from client."
          
            }));
    })
  }
  else if (req.method === 'GET' && req.url === '/get_messages') {
    const trimiteDate = () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(messages_list));
      };
    messageEvents.once('{Server}Data Modified', trimiteDate);
    req.on('close', () => {
            messageEvents.removeListener('{Server}Data Modified', trimiteDate);
        });
  };

  if (req.method === "GET" && req.url === "/handshake/init") {

    // Generate ECDH key pair (P-256)
    const ecdh = crypto.createECDH("prime256v1"); // same as P-256
    ecdh.generateKeys();

    const serverEcdhPublicKey = ecdh.getPublicKey("base64");
    serverECDH = ecdh;
    

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      serverEcdhPublicKey: serverEcdhPublicKey
    }));
  }


  if(req.method === "POST" && req.url === "/handshake/signature") {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", () => {
    try {
      const { clientECDHPub, clientNonce } = JSON.parse(body);

      // Convert Base64 to Buffer
      const clientECDHPubBuf = Buffer.from(clientECDHPub, "base64");
      const clientNonceBuf = Buffer.from(clientNonce, "base64");

      // Server ECDH public key (Buffer)
      const serverECDHPubBuf = serverECDH.getPublicKey();

      // Concatenate serverECDH || clientECDH || clientNonce
      const concatBuf = Buffer.concat([serverECDHPubBuf, clientECDHPubBuf, clientNonceBuf]);
      //console.log(concatBuf.toString('base64'));
      // Sign with server RSA private key
      const signature = crypto.sign("sha256", concatBuf, RSA_PRIVATE_KEY);

      aesKey = generateSharedSecret(clientECDHPubBuf);
    
            

      // Respond with Base64
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        serverECDHPub: serverECDHPubBuf.toString("base64"),
        signature: signature.toString("base64")
      }));

    } catch (err) {
      console.error(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Server error" }));
    }
  });
  }

      if (req.method === "POST" && req.url === "/plain_text") {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });


    req.on("end", () => {
      
        const { plainText } = JSON.parse(body);
        const encryptedData = encryptMessage(plainText);
        //console.log(encryptedData);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          message: encryptedData.cipher,
          iv: encryptedData.iv,
          authTag: encryptedData.authTag
        }));

        
        
    });
}



});

function generateSharedSecret(clientECDHPubBuf){
    try {
    // Derive shared secret
    const sharedSecret = serverECDH.computeSecret(clientECDHPubBuf); // returns a Buffer
    console.log("AES shared secret (base64):", sharedSecret.toString("base64"));

    // Convert to AES key
    // AES-256 expects 32 bytes (256 bits), which matches P-256 output length
    // Node crypto can use SecretKey for AES-GCM
    aesKey = crypto.createSecretKey(sharedSecret);

    return aesKey;
  } catch (err) {
    console.error("Error generating shared secret:", err);
  }
}


server.listen(5123, "0.0.0.0", () => {
  console.log('Serverul rulează pe http://localhost:5123');
});


