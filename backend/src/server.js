const http = require('http');
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
const server = http.createServer(app);

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
    // Permite requisições sem origin (como mobile apps, curl ou postman) ou se listado no allowedOrigins
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

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

// --- Configuração do Socket.IO ---
const io = new Server(server, {
  cors: {
    origin: '*', // Permite conexão do cliente frontend
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Inicializa a lógica de WebSocket
setupSocketIO(io);

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
