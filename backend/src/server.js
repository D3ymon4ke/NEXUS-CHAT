const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const routes = require('./routes');
const { setupSocketIO } = require('./socket');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');

const app = express();

// Configuração SSL para HTTPS e WSS quando disponível
let server;
let isHttps = false;
const sslKeyPath = process.env.SSL_KEY_PATH || '/etc/letsencrypt/live/187-127-40-228.sslip.io/privkey.pem';
const sslCertPath = process.env.SSL_CERT_PATH || '/etc/letsencrypt/live/187-127-40-228.sslip.io/fullchain.pem';

if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
  try {
    const privateKey = fs.readFileSync(sslKeyPath, 'utf8');
    const certificate = fs.readFileSync(sslCertPath, 'utf8');
    server = https.createServer({ key: privateKey, cert: certificate }, app);
    isHttps = true;
    console.log('🔒 Certificados SSL carregados. Servidor rodando em modo seguro (HTTPS/WSS).');
  } catch (e) {
    console.warn('⚠️ Falha ao ler certificados SSL, iniciando em modo HTTP padrão:', e.message);
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
}

const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map(url => url.trim());

// --- Middlewares Globais de Segurança e Utilitários ---
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: (origin, callback) => {
    // Permite qualquer origem (Vercel, localhost, apps mobile)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Check público direto
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'nexus-chat-backend', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// --- Configuração do Socket.IO ---
const io = new Server(server, {
  cors: {
    origin: '*', // Permite conexão do cliente frontend
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Inicializa a lógica de WebSocket
setupSocketIO(io);

// Injeta io em todas as requisições da API
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Rate Limiter Geral para API
app.use('/api', apiLimiter);

// --- Rotas da API ---
app.use('/api', routes);

// Rota raiz de boas-vindas
app.get('/', (req, res) => {
  res.json({
    name: 'Chat Realtime API & WebSocket Server',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// --- Middlewares de Erro e 404 ---
app.use(notFoundHandler);
app.use(errorHandler);

// Inicia o servidor HTTP e WebSocket
server.listen(PORT, () => {
  console.log(`
======================================================
  🚀 SERVIDOR DO CHAT EM TEMPO REAL INICIADO COM SUCESSO!
======================================================
  📡 Porta: ${PORT}
  🌐 Ambiente: ${process.env.NODE_ENV || 'development'}
  🔗 API Base: http://localhost:${PORT}/api
  ⚡ WebSocket: ws://localhost:${PORT}
======================================================
  `);
});

// Tratamento de encerramento seguro
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido. Fechando servidor de forma graciosa...');
  server.close(() => {
    console.log('Servidor encerrado.');
    process.exit(0);
  });
});
