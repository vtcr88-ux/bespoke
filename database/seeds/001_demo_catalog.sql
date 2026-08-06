INSERT INTO categories (id, slug, name, description) VALUES
('11111111-1111-4111-8111-111111111111', 'chas-soluveis', 'Chás Solúveis', NULL),
('22222222-2222-4222-8222-222222222222', 'encapsulados', 'Encapsulados', NULL),
('33333333-3333-4333-8333-333333333333', 'injetaveis', 'Injetáveis', NULL),
('44444444-4444-4444-8444-444444444444', 'suplementacoes', 'Suplementações', NULL)
ON DUPLICATE KEY UPDATE
  slug = VALUES(slug),
  name = VALUES(name),
  description = VALUES(description),
  is_active = TRUE;

INSERT INTO products (
  id, category_id, slug, sku, name, subtitle, description, price_in_cents,
  compare_at_price_in_cents, stock, low_stock_threshold, low_stock_warning_enabled
) VALUES
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '11111111-1111-4111-8111-111111111111',
  'kit-ritual-equilibrio',
  'BSP-RIT-001',
  'Kit Ritual Equilibrio',
  'Curadoria premium para uma rotina leve.',
  'Uma composicao elegante de itens de autocuidado para apoiar momentos de pausa. A Bespoke evita promessas medicas e recomenda avaliacao profissional para necessidades especificas.',
  28900,
  NULL,
  18,
  5,
  FALSE
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  '11111111-1111-4111-8111-111111111111',
  'blend-bespoke-matutino',
  'BSP-BLD-002',
  'Blend Bespoke Matutino',
  'Sabor delicado para comecar o dia com calma.',
  'Blend de ingredientes selecionados para consumo dentro de uma rotina equilibrada. Nao substitui orientacao nutricional, tratamento ou acompanhamento profissional.',
  14900,
  16900,
  7,
  8,
  TRUE
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  '22222222-2222-4222-8222-222222222222',
  'garrafa-termica-verde',
  'BSP-ACC-003',
  'Garrafa Termica Verde',
  'Acessorio discreto para acompanhar a rotina.',
  'Garrafa termica com acabamento fosco, pensada para mobilidade e uso diario. Produto complementar a habitos de hidratacao e organizacao pessoal.',
  9900,
  NULL,
  31,
  6,
  FALSE
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
  '33333333-3333-4333-8333-333333333333',
  'sessao-curadoria-bespoke',
  'BSP-CNS-004',
  'Sessao Curadoria Bespoke',
  'Compra assistida com atencao individual.',
  'Atendimento para entender preferencias, restricoes declaradas pelo cliente e objetivos de estilo de vida, sem diagnostico ou prescricao medica.',
  19900,
  NULL,
  12,
  3,
  FALSE
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  subtitle = VALUES(subtitle),
  description = VALUES(description),
  price_in_cents = VALUES(price_in_cents),
  compare_at_price_in_cents = VALUES(compare_at_price_in_cents),
  stock = VALUES(stock),
  low_stock_threshold = VALUES(low_stock_threshold),
  low_stock_warning_enabled = VALUES(low_stock_warning_enabled);

INSERT INTO media_assets (id, storage_key, public_url, alt_text, width, height, content_type, size_bytes) VALUES
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11',
  'seed-products/kit-ritual-equilibrio',
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=82',
  'Kit de autocuidado Bespoke sobre uma bancada clara',
  1200,
  1500,
  'image/jpeg',
  0
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa22',
  'seed-products/blend-bespoke-matutino',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=82',
  'Blend premium servido em composicao minimalista',
  1200,
  1500,
  'image/jpeg',
  0
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa33',
  'seed-products/garrafa-termica-verde',
  'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1200&q=82',
  'Garrafa termica verde com acabamento fosco',
  1200,
  1500,
  'image/jpeg',
  0
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa44',
  'seed-products/sessao-curadoria-bespoke',
  'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=82',
  'Atendimento consultivo em mesa organizada',
  1200,
  1500,
  'image/jpeg',
  0
)
ON DUPLICATE KEY UPDATE
  public_url = VALUES(public_url),
  alt_text = VALUES(alt_text),
  width = VALUES(width),
  height = VALUES(height);

INSERT INTO product_images (id, product_id, media_asset_id, position) VALUES
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb11', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11', 0),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb22', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa22', 0),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb33', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa33', 0),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb44', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa44', 0)
ON DUPLICATE KEY UPDATE position = VALUES(position);
