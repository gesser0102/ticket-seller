const net = require('net');

const url = new URL(process.env.DATABASE_URL);
const host = url.hostname;
const port = Number(url.port || 5432);

console.log(`[diag] conectando em ${host}:${port}...`);

const socket = net.connect(port, host);
socket.setTimeout(5000);

socket.on('connect', () => {
  console.log(`[diag] TCP OK para ${host}:${port}`);
  socket.end();
  process.exit(0);
});

socket.on('timeout', () => {
  console.log(`[diag] TCP TIMEOUT para ${host}:${port} (sem resposta em 5s — provável isolamento de rede)`);
  socket.destroy();
  process.exit(0);
});

socket.on('error', (err) => {
  console.log(`[diag] TCP ERRO para ${host}:${port}: ${err.code || err.message}`);
  process.exit(0);
});
