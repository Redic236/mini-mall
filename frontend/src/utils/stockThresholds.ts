// Low-stock thresholds used across the UI. They're deliberately separate
// because they answer different questions:
//
// - LOW_STOCK_BADGE is a shopper-facing "仅剩 N 件" nudge on the product grid.
//   It should fire only when stock is genuinely low so the badge keeps its
//   urgency signal and doesn't spam every listing.
//
// - LOW_STOCK_ADMIN is an operator-facing restock warning on admin pages.
//   Admins want a broader early-warning window so they can reorder before
//   things hit the shopper-facing threshold.
//
// The backend uses its own constant (adminService.LOW_STOCK_THRESHOLD) for
// the dashboard tile count; keep it in sync with LOW_STOCK_ADMIN when you
// change this.

export const LOW_STOCK_BADGE = 5;
export const LOW_STOCK_ADMIN = 10;
