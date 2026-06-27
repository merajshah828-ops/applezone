/**
 * Protects admin API routes. Requires a valid logged-in session (set by POST /api/admin/login).
 * Public-facing routes (device listing for the website) never use this.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ error: 'Not authenticated. Please log in.' });
}

module.exports = { requireAuth };
