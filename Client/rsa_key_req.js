const SERVER_RSA_PUBLIC_KEY = 
`-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEAoxbKVxNtimesHnoLOh/QFQ9CbO8/03zWP6SlPCYwM92wIuJtHybY
McJGVa0tB1tLzvkrwEdF7ljGRsehsjcsAvb2MLmzAWDECZw1gBi4QxcLbIrYG/cB
BF7/moOlv9IwWlW4vx8iqoABIDcld2/DNqPBrvK6/VXZ2WFTSn6gwoAcv3aIv+5J
FdDZlA/7uWp+N2jkt2QWCJpx2omWaJfs9UH+h/759wygPx8QfRgFPmqz2Z3HoG5S
HEw7MO11qORoC9VqOZ9bPjg7BAd77viEBxoR3ECUSGCQDtbeXuTFAj5xB+KGee6W
dLq/qpFZC/zH9+kgQWAHAi86kHIMAAhA0QIDAQAB
-----END RSA PUBLIC KEY-----`;

const SERVER_RSA_PUBLIC_KEY_SPKI = 
`-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoxbKVxNtimesHnoLOh/Q
FQ9CbO8/03zWP6SlPCYwM92wIuJtHybYMcJGVa0tB1tLzvkrwEdF7ljGRsehsjcs
Avb2MLmzAWDECZw1gBi4QxcLbIrYG/cBBF7/moOlv9IwWlW4vx8iqoABIDcld2/D
NqPBrvK6/VXZ2WFTSn6gwoAcv3aIv+5JFdDZlA/7uWp+N2jkt2QWCJpx2omWaJfs
9UH+h/759wygPx8QfRgFPmqz2Z3HoG5SHEw7MO11qORoC9VqOZ9bPjg7BAd77viE
BxoR3ECUSGCQDtbeXuTFAj5xB+KGee6WdLq/qpFZC/zH9+kgQWAHAi86kHIMAAhA
0QIDAQAB
-----END PUBLIC KEY-----`;

let serverEcdhPublicKey;
let clientECDH;
window.aesKey = null;

let clientECDHPubRaw;
let clientNonce;

// Helper to get AES key
window.getAesKey = function() {
    return window.aesKey;
};

function fetchServerEcdhPublicKey() {
  fetch("http://localhost:5123/handshake/init", {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  })
  .then(res => res.json())
  .then(data => {
    serverEcdhPublicKey = data.serverEcdhPublicKey;
    
    
    //callback();
    fetchSignature()
  })
  /* .catch(err => {
    console.log('server not ready yet');
    console.log(err);
    //setTimeout(() => fetchServerRsaKey(), 10000);
  }) */

   
  }

function fetchSignature(){
  // Generate client ECDH key pair
  crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  ).then(keyPair => {
    clientECDH = keyPair;
    return crypto.subtle.exportKey("raw", keyPair.publicKey);
  }).then(clientECDHPubRaw_key => {
    const clientECDHPubBase64 = btoa(String.fromCharCode(...new Uint8Array(clientECDHPubRaw_key)));
    clientECDHPubRaw = clientECDHPubRaw_key;
    // Generate nonce
    clientNonce = crypto.getRandomValues(new Uint8Array(32));
    const clientNonceBase64 = btoa(String.fromCharCode(...clientNonce));

    // Send to server
    return fetch("http://localhost:5123/handshake/signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientECDHPub: clientECDHPubBase64,
        clientNonce: clientNonceBase64
      })
    });
  }).then(res => res.json())
    .then(data => {
      const signatureBase64 = data.signature;
      const serverECDHPubBase64 = data.serverECDHPub;

      //console.log("Server ECDH public key:", serverECDHPubBase64);
      //console.log("Server signature:", signatureBase64);
      verifyServerSignature(serverECDHPubBase64, clientECDHPubRaw, clientNonce, signatureBase64 );
    })
    .catch(err => console.error("Handshake failed:", err));

};


function verifyServerSignature(serverECDHPubBase64, clientECDHPubRaw, clientNonce, signatureBase64) 
{
  // Convert server ECDH pub and signature from Base64
  const serverECDHPubRaw = Uint8Array.from(atob(serverECDHPubBase64), c => c.charCodeAt(0));
  const signature = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));

  // Concatenate buffers: serverECDH || clientECDH || clientNonce
  const concatBuf = new Uint8Array(serverECDHPubRaw.length + clientECDHPubRaw.byteLength + clientNonce.length);
  concatBuf.set(serverECDHPubRaw, 0);
  concatBuf.set(new Uint8Array(clientECDHPubRaw), serverECDHPubRaw.length);
  concatBuf.set(clientNonce, serverECDHPubRaw.length + clientECDHPubRaw.byteLength);


  // Import server public key
  crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(SERVER_RSA_PUBLIC_KEY_SPKI),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    true,
    ["verify"]
  ).then(serverPublicKey => {
    return crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      serverPublicKey,
      signature,
      concatBuf
    );
  }).then(isValid => {
    console.log("the signature is ");
    console.log(isValid);
    generateSharedSecret();

  }).catch(err => {
    console.error("Signature verification error:", err);
    
  });
};

// Convert PEM string to ArrayBuffer for crypto.subtle.importKey
function pemToArrayBuffer(pem) {
  const b64 = pem.replace(/-----.*PUBLIC KEY-----/g, "").replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}


function generateSharedSecret() {
  // Convert server ECDH public key from Base64
  const serverECDHPubRaw = Uint8Array.from(atob(serverEcdhPublicKey), c => c.charCodeAt(0));

  // Import server ECDH public key
  crypto.subtle.importKey(
    "raw", 
    serverECDHPubRaw.buffer,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  )
  .then(serverECDHPubKey => {
    // Derive shared secret bits
    return crypto.subtle.deriveBits(
      { name: "ECDH", public: serverECDHPubKey },
      clientECDH.privateKey,
      256
    );
  })
  .then(sharedSecretBits => {
    // Convert shared secret into AES-GCM key
    return crypto.subtle.importKey(
      "raw",
      sharedSecretBits,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );
  })
  .then(derivedAesKey => {
    window.aesKey = derivedAesKey;
    console.log("Shared secret successfully derived and AES key created!");
    console.log(window.aesKey);

      //modified from here
      return crypto.subtle.exportKey("raw", derivedAesKey);
})
.then(rawKey => {
      // 🔽 Convert raw bytes (ArrayBuffer) to Base64
      var bytes = new Uint8Array(rawKey);
      var binary = "";
      for (var i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      var base64Key = btoa(binary);

      console.log("AES key as Base64:", base64Key);

      // 🔽 Example: send it to backend
      fetch("http://localhost:8080/save_key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: base64Key })
      })
      .then(res => res.json())
      .then(data => console.log("Server response:", data))
      .catch(err => console.error(err));
    

      })
      .catch(err => {
        console.error("Error generating shared secret:", err);
      });


  
}
  




fetchServerEcdhPublicKey();
