# 🚀 Guia de Configuração do Supabase

Siga estes passos simples para conectar seu banco de dados Supabase ao sistema de chat:

### 1. Criar um projeto no Supabase
1. Acesse [https://supabase.com](https://supabase.com) e crie um novo projeto.
2. Anote as credenciais na aba **Project Settings > API**:
   - `Project URL`
   - `anon public` API Key
   - `service_role` secret API Key (necessária para o backend na VPS).

### 2. Executar o Esquema SQL
1. No painel do seu projeto Supabase, acesse **SQL Editor** no menu lateral.
2. Clique em **+ New Query**.
3. Copie todo o conteúdo do arquivo `supabase/schema.sql` e cole no editor.
4. Clique em **Run** (Executar).

### 3. Configurar o Storage (Para Imagens e Anexos)
1. No menu lateral do Supabase, acesse **Storage**.
2. Crie um novo Bucket chamado `chat-media` e marque a opção **Public Bucket**.
3. No SQL Editor, execute o script `supabase/seed.sql` para aplicar as políticas de acesso do bucket.

### 4. Configurar Autenticação
1. Acesse **Authentication > URL Configuration**.
2. Adicione sua URL da Vercel (ou `http://localhost:3000` para desenvolvimento local) em **Site URL** e **Redirect URLs**.
