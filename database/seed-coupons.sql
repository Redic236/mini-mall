-- Test coupons — idempotent via ON DUPLICATE KEY (code is unique).
-- Covers three discount shapes so manual QA can exercise each branch:
--   SAVE10  — fixed discount, no threshold (happy path)
--   MINUS20 — fixed discount, 100 元 threshold (tests minOrderAmount)
--   PCT15   — 15 percent off, 50 元 threshold (tests percentage math)
--
-- Timestamps use UTC_TIMESTAMP() rather than NOW() because Sequelize speaks
-- UTC to MySQL: if the MySQL server runs on a non-UTC timezone (e.g. CST),
-- NOW() returns local wall-clock time and coupons end up "not yet active"
-- when the app's UTC-anchored queries compare startsAt against them.

INSERT INTO coupons
  (code,      name,            type,         value, minOrderAmount, startsAt, expiresAt,                        totalQuantity, perUserLimit, isActive, createdAt, updatedAt)
VALUES
  ('SAVE10',  '满0减10',       'fixed',      10,    0,              UTC_TIMESTAMP(),    DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY), 100,           5,            1,        UTC_TIMESTAMP(),     UTC_TIMESTAMP()),
  ('MINUS20', '满100减20',     'fixed',      20,    100,            UTC_TIMESTAMP(),    DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY), 100,           5,            1,        UTC_TIMESTAMP(),     UTC_TIMESTAMP()),
  ('PCT15',   '满50打85折',    'percentage', 15,    50,             UTC_TIMESTAMP(),    DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY), 100,           5,            1,        UTC_TIMESTAMP(),     UTC_TIMESTAMP())
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
  updatedAt      = UTC_TIMESTAMP();
