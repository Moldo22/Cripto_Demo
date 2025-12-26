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
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", () => {
      const received = JSON.parse(body); 
      messages_list.push(received.message);
      messageEvents.emit('{Client}Data Modified');
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        message: `Am primit mesajul de la: "${received.message}"`}));
    })
  }
  
  if (req.method === 'GET' && req.url === '/get_messages') {
    const trimiteDate = () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(messages_list));
      };
    messageEvents.once('{Client}Data Modified', trimiteDate);
    req.on('close', () => {
            messageEvents.removeListener('{Client}Data Modified', trimiteDate);
        });
  };
});

server.listen(8080, '0.0.0.0', () => {
  console.log('Client HTTP rulează pe http://localhost:8080');
});
