-- ==============================================================================
-- DADOS DE TESTE / SEED (Opcional - para demonstração)
-- ==============================================================================

-- Storage Bucket para Uploads de Chat (execute no SQL Editor ou crie no painel de Storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Política de acesso ao Storage para upload de arquivos
CREATE POLICY "Qualquer usuário autenticado pode enviar arquivos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Mídias de chat são publicamente acessíveis"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-media');
