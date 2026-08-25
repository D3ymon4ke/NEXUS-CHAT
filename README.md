# 💬 Nexus Chat - Sistema de Chat em Tempo Real

Sistema de chat moderno, escalável e de alta performance com arquitetura desacoplada: **Frontend (Vercel)** + **Backend WebSocket (VPS)** + **Banco de Dados (Supabase)**.

---

## 🌟 Recursos Principais

- ⚡ **Comunicação Instantânea**: Troca de mensagens via WebSockets (Socket.IO) com fallback e reconexão automática.
- 🔐 **Autenticação Completa**: Cadastro, login, recuperação de senha e proteção de rotas via Supabase Auth & JWT.
- 👥 **Conversas Privadas & Grupos**: Crie conversas 1-para-1 ou grupos com múltiplos participantes.
- 🟢 **Presença & Digitação**: Indicadores de online/offline e animação "Fulano está digitando..." em tempo real.
- 📬 **Recibos de Leitura**: Confirmação de envio (✓), entrega (✓✓) e leitura (✓✓ azul).
- 📎 **Mídias & Anexos**: Suporte a envio de imagens com lightbox fullscreen, áudios e arquivos.
- 💬 **Interações Ricas**: Respostas a mensagens (replies), reações com emojis (👍 ❤️ 🔥), edição, exclusão e mensagens fixadas.
- 🎵 **Efeitos Sonoros**: Sons de notificação nativos gerados via Web Audio API.
- 📱 **100% Responsivo**: Layout otimizado para desktop, tablets e smartphones (com navegação fluida estilo app nativo no mobile).

---

## 📁 Estrutura do Projeto

```
chat/
├── backend/              # Servidor Node.js + Express + Socket.IO (Deploy na VPS)
│   ├── src/
│   │   ├── config/       # Conexão Supabase Admin
│   │   ├── controllers/  # Auth, Conversas, Mensagens, Usuários, Upload
│   │   ├── middlewares/  # Autenticação JWT, Rate Limiting, Upload, Erros
│   │   ├── routes/       # Rotas REST
│   │   ├── socket/       # Handlers de WebSocket (mensagens, presença, digitação)
│   │   └── server.js     # Ponto de entrada do servidor
│   ├── .env.example
│   └── package.json
│
├── frontend/             # Interface Next.js / React + Tailwind CSS (Deploy na Vercel)
│   ├── src/
│   │   ├── components/   # Chat, Sidebar, Modais, Auth, Configurações
│   │   ├── context/      # AuthContext, SocketContext, ChatContext
│   │   ├── lib/          # Clientes Supabase, API REST, Efeitos Sonoros
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
│
└── supabase/             # Banco de Dados & Armazenamento
    ├── schema.sql        # Esquema completo de tabelas, índices, triggers e RLS
    ├── seed.sql          # Configuração do bucket de storage
    └── README.md         # Guia passo a passo de configuração no painel do Supabase
```

---

## 🚀 Como Executar Localmente

### 1. Configurar o Supabase
Siga as instruções detalhadas em [`supabase/README.md`](file:///c:/Users/deymo/Documents/chat/supabase/README.md) para rodar o script SQL no seu projeto Supabase.

### 2. Iniciar o Backend
```bash
cd backend
npm install
npm run dev
```
O servidor iniciará em `http://localhost:5000` com suporte a API REST e WebSocket.

### 3. Iniciar o Frontend
```bash
cd frontend
npm install
npm run dev
```
Acesse `http://localhost:3000` no seu navegador.

---

## 🌐 Guia de Deploy

### Backend na VPS (Ubuntu / Linux)
1. Clone o repositório na sua VPS:
   ```bash
   git clone <repo_url>
   cd chat/backend
   npm install --production
   ```
2. Crie o arquivo `.env` com suas variáveis de produção.
3. Utilize o **PM2** para manter o processo ativo com reinicialização automática:
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name "chat-backend"
   pm2 save
   pm2 startup
   ```
4. Configure o **Nginx** como reverse proxy com suporte a WebSocket Upgrade e certificado SSL (Let's Encrypt / Certbot).

### Frontend na Vercel
1. Importe o diretório `frontend` no painel da [Vercel](https://vercel.com).
2. Configure as variáveis de ambiente:
   - `VITE_API_URL`: URL da sua API na VPS (ex: `https://api.seudominio.com/api`)
   - `VITE_SOCKET_URL`: URL do WebSocket na VPS (ex: `https://api.seudominio.com`)
   - `VITE_SUPABASE_URL`: URL do seu projeto Supabase
   - `VITE_SUPABASE_ANON_KEY`: Chave anônima pública do Supabase
3. Clique em **Deploy**.
