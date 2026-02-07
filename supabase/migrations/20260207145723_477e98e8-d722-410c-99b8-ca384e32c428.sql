-- Criar bucket para logótipos das equipas
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-logos', 'team-logos', true);

-- Política: qualquer pessoa pode ver logótipos (bucket público)
CREATE POLICY "Public read access for team logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-logos');

-- Política: qualquer pessoa pode fazer upload de logótipos
CREATE POLICY "Public upload access for team logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'team-logos');

-- Política: qualquer pessoa pode atualizar os seus uploads
CREATE POLICY "Public update access for team logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'team-logos');

-- Política: qualquer pessoa pode apagar logótipos
CREATE POLICY "Public delete access for team logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'team-logos');