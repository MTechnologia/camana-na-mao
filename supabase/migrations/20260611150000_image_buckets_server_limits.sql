-- Limites SERVER-SIDE nos buckets de imagem. Antes, formato e tamanho eram validados só no
-- cliente (JavaScript) — uma chamada direta à API de storage burlava tudo (qualquer tipo,
-- qualquer tamanho), e os buckets não tinham file_size_limit nem allowed_mime_types.
--
-- Agora: 15 MB por arquivo + apenas imagens (jpeg/png/webp). O cliente foi alinhado ao mesmo
-- teto de 15 MB. (HEIC/iPhone fica para um passo futuro, junto da conversão no cliente.)

UPDATE storage.buckets
SET file_size_limit = 15728640,  -- 15 MiB (15 * 1024 * 1024)
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id IN ('avatars', 'urban-reports', 'service-corrections');
