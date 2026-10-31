// Use after requireAuth: router.get('/x', requireAuth, requireRole('admin', 'staff'), handler)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not logged in' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have access to this' });
    }
    next();
  };
}
