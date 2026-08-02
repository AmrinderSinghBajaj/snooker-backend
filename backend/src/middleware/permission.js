export function requirePermission(module, action) {
  return (req, res, next) => {
    const user = req.admin; // Populated by requireAuth middleware
    if (!user) {
      return res.status(401).json({ detail: 'Not authenticated' });
    }

    // Bypass check for Club Owners and Superadmins
    if (user.role === 'Club Owner' || user.role === 'superadmin') {
      return next();
    }

    // Check if employee has the specific granular permission
    if (user.permissions && user.permissions[module] && user.permissions[module][action]) {
      return next();
    }

    return res.status(403).json({ detail: `Access denied: Insufficient permissions for ${module} ${action}.` });
  };
}
