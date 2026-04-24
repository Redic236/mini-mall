-- Test coupons — idempotent via ON DUPLICATE KEY (code is unique).
-- Covers three discount shapes so manual QA can exercise each branch:
--   SAVE10  — fixed discount, no threshold (happy path)
--   MINUS20 — fixed discount, 100 元 threshold (tests minOrderAmount)
--   PCT15   — 15 percent off, 50 元 threshold (tests percentage math)

INSERT INTO coupons
  (code,      name,            type,         value, minOrderAmount, startsAt, expiresAt,                        totalQuantity, perUserLimit, isActive, createdAt, updatedAt)
VALUES
  ('SAVE10',  '满0减10',       'fixed',      10,    0,              NOW(),    DATE_ADD(NOW(), INTERVAL 30 DAY), 100,           5,            1,        NOW(),     NOW()),
  ('MINUS20', '满100减20',     'fixed',      20,    100,            NOW(),    DATE_ADD(NOW(), INTERVAL 30 DAY), 100,           5,            1,        NOW(),     NOW()),
  ('PCT15',   '满50打85折',    'percentage', 15,    50,             NOW(),    DATE_ADD(NOW(), INTERVAL 30 DAY), 100,           5,            1,        NOW(),     NOW())
ON DUPLICATE KEY UPDATE
  name           = VALUES(name),
  type           = VALUES(type),
  value          = VALUES(value),
  minOrderAmount = VALUES(minOrderAmount),
  startsAt       = VALUES(startsAt),
  expiresAt      = VALUES(expiresAt),
  totalQuantity  = VALUES(totalQuantity),
  perUserLimit   = VALUES(perUserLimit),
  isActive       = VALUES(isActive),
  updatedAt      = NOW();
