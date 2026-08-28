-- ==============================================================================
-- SISTEMA DE CHAT EM TEMPO REAL - ESQUEMA SUPABASE POSTGRESQL
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ID Fixo da Sala Principal Permanente
-- '00000000-0000-0000-0000-000000000001' -> BELMONT CONFERENCE

-- 2. Tabela de Perfis de Usuários (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT DEFAULT 'Disponível para conversar',
    status_message TEXT DEFAULT 'online',
    is_online BOOLEAN DEFAULT false,
    profile_song_url TEXT,
    profile_song_title TEXT,
    profile_song_artist TEXT,
    profile_song_cover TEXT,
    profile_banner_url TEXT,
    last_seen TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);

-- 3. Tabela de Conversas (Conversations)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
    name TEXT, -- Usado para grupos
    description TEXT,
    avatar_url TEXT, -- Avatar do grupo
    is_permanent BOOLEAN DEFAULT false, -- Proteção contra exclusão (ex: BELMONT CONFERENCE)
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Tabela de Participantes da Conversa (Conversation Participants)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    last_read_message_id UUID,
    unread_count INTEGER DEFAULT 0,
    is_muted BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conv ON public.conversation_participants(conversation_id);

-- 5. Tabela de Mensagens (Messages)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'audio', 'system')),
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- 6. Tabela de Anexos (Message Attachments)
CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_msg ON public.message_attachments(message_id);

-- 7. Tabela de Reações em Mensagens (Message Reactions)
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_msg ON public.message_reactions(message_id);

-- 8. Tabela de Status de Mensagem / Confirmação de Leitura (Message Status)
CREATE TABLE IF NOT EXISTS public.message_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'read')),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_msg_status ON public.message_status(message_id, user_id);

-- 9. Tabela de Configurações do Usuário (User Settings)
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
    sound_notifications BOOLEAN DEFAULT true,
    desktop_notifications BOOLEAN DEFAULT true,
    enter_is_send BOOLEAN DEFAULT true,
    privacy_last_seen TEXT DEFAULT 'everyone' CHECK (privacy_last_seen IN ('everyone', 'contacts', 'nobody')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- INICIALIZAÇÃO DA SALA PRINCIPAL: BELMONT CONFERENCE
-- ==============================================================================
INSERT INTO public.conversations (id, type, name, description, avatar_url, is_permanent)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'group',
    'BELMONT CONFERENCE',
    'Sala principal oficial de conferência e avisos gerais. Canal permanente para todos os membros.',
    '/belmont-logo.jpg',
    true
)
ON CONFLICT (id) DO UPDATE
SET name = 'BELMONT CONFERENCE',
    avatar_url = '/belmont-logo.jpg',
    is_permanent = true;

-- Bloquear exclusão da sala BELMONT CONFERENCE
CREATE OR REPLACE FUNCTION public.prevent_delete_permanent_rooms()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_permanent = true OR OLD.id = '00000000-0000-0000-0000-000000000001' THEN
        RAISE EXCEPTION 'A sala BELMONT CONFERENCE é permanente e não pode ser apagada.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_delete_permanent_rooms ON public.conversations;
CREATE TRIGGER trigger_prevent_delete_permanent_rooms
    BEFORE DELETE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_permanent_rooms();

-- ==============================================================================
-- TRIGGERS E FUNÇÕES AUTOMÁTICAS
-- ==============================================================================

-- Função para atualizar timestamp 'updated_at'
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_conversations_updated_at ON public.conversations;
CREATE TRIGGER set_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_messages_updated_at ON public.messages;
CREATE TRIGGER set_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Atualizar conversa quando houver nova mensagem
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_on_new_message ON public.messages;
CREATE TRIGGER trigger_on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- Função para criar automaticamente Perfil, Configurações e INCLUIR NA BELMONT CONFERENCE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_username TEXT;
    new_display_name TEXT;
    new_avatar TEXT;
    belmont_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    new_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        SPLIT_PART(NEW.email, '@', 1) || '_' || SUBSTRING(NEW.id::text, 1, 4)
    );
    new_display_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        SPLIT_PART(NEW.email, '@', 1)
    );
    new_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        'https://api.dicebear.com/7.x/bottts/svg?seed=' || NEW.id::text
    );

    -- 1. Criar ou atualizar perfil
    INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (NEW.id, new_username, new_display_name, new_avatar)
    ON CONFLICT (id) DO UPDATE
    SET username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url;

    -- 2. Criar configurações
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. Inserir AUTOMATICAMENTE o novo usuário na sala BELMONT CONFERENCE
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES (belmont_id, NEW.id, 'member')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para Profiles
CREATE POLICY "Perfis visíveis para todos os usuários autenticados"
    ON public.profiles FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários podem atualizar seus próprios perfis"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Políticas para Conversas
CREATE POLICY "Usuários podem ver conversas das quais participam"
    ON public.conversations FOR SELECT
    USING (
        is_permanent = true OR
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_participants.conversation_id = conversations.id
            AND conversation_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Usuários autenticados podem criar conversas"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins podem atualizar detalhes da conversa"
    ON public.conversations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_participants.conversation_id = conversations.id
            AND conversation_participants.user_id = auth.uid()
            AND conversation_participants.role = 'admin'
        )
    );

-- Políticas para Participantes
CREATE POLICY "Participantes visíveis para quem está na conversa"
    ON public.conversation_participants FOR SELECT
    USING (
        conversation_id = '00000000-0000-0000-0000-000000000001' OR
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = conversation_participants.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Inserir participantes"
    ON public.conversation_participants FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Políticas para Mensagens
CREATE POLICY "Mensagens visíveis para membros da conversa"
    ON public.messages FOR SELECT
    USING (
        conversation_id = '00000000-0000-0000-0000-000000000001' OR
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_participants.conversation_id = messages.conversation_id
            AND conversation_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Membros podem enviar mensagens na conversa"
    ON public.messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        (
            conversation_id = '00000000-0000-0000-0000-000000000001' OR
            EXISTS (
                SELECT 1 FROM public.conversation_participants
                WHERE conversation_participants.conversation_id = messages.conversation_id
                AND conversation_participants.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Usuários podem editar ou excluir suas próprias mensagens"
    ON public.messages FOR UPDATE
    USING (auth.uid() = sender_id);

-- Políticas para Reações
CREATE POLICY "Reações visíveis para membros da conversa"
    ON public.message_reactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.messages m
            WHERE m.id = message_reactions.message_id
        )
    );

CREATE POLICY "Membros podem adicionar reações"
    ON public.message_reactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem remover suas reações"
    ON public.message_reactions FOR DELETE
    USING (auth.uid() = user_id);

-- Políticas para Configurações
CREATE POLICY "Usuários podem ver e editar apenas suas próprias configurações"
    ON public.user_settings FOR ALL
    USING (auth.uid() = user_id);

-- 18. Tabela de Presentes do Usuário (User Gifts & Showcase)
CREATE TABLE IF NOT EXISTS public.user_gifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    gift_id TEXT NOT NULL,
    gift_name TEXT NOT NULL,
    gift_icon TEXT NOT NULL,
    rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
    price INTEGER NOT NULL DEFAULT 50,
    quantity INTEGER NOT NULL DEFAULT 1,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_gifts_recipient ON public.user_gifts(recipient_id);
CREATE INDEX IF NOT EXISTS idx_user_gifts_sender ON public.user_gifts(sender_id);

ALTER TABLE public.user_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Presentes visíveis para todos os usuários autenticados"
    ON public.user_gifts FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem enviar presentes"
    ON public.user_gifts FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

