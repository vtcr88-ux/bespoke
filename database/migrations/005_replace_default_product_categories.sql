UPDATE categories
SET slug = 'chas-soluveis', name = 'Chás Solúveis', description = NULL, is_active = TRUE
WHERE id = '11111111-1111-4111-8111-111111111111';

UPDATE categories
SET slug = 'encapsulados', name = 'Encapsulados', description = NULL, is_active = TRUE
WHERE id = '22222222-2222-4222-8222-222222222222';

UPDATE categories
SET slug = 'injetaveis', name = 'Injetáveis', description = NULL, is_active = TRUE
WHERE id = '33333333-3333-4333-8333-333333333333';

INSERT INTO categories (id, slug, name, description, is_active)
VALUES (
  '44444444-4444-4444-8444-444444444444',
  'suplementacoes',
  'Suplementações',
  NULL,
  TRUE
)
ON DUPLICATE KEY UPDATE
  slug = VALUES(slug),
  name = VALUES(name),
  description = VALUES(description),
  is_active = TRUE;
