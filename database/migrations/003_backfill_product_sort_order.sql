UPDATE products p
INNER JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) * 10 AS next_sort_order
  FROM products
) ranked ON ranked.id = p.id
SET p.sort_order = ranked.next_sort_order
WHERE p.sort_order = 0;
