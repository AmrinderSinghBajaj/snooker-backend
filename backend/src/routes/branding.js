import { Router } from 'express';
import { createReadStream, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveTenant } from '../middleware/tenant.js';
import { requireAuth } from '../middleware/auth.js';
import Club from '../models/Club.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * GET /branding
 * Public (no auth) - dynamically returns the club branding based on domain/header.
 */
router.get('/', resolveTenant, (req, res) => {
  const club = req.club;
  const logoPath = path.join(__dirname, `../../static/logo_${club.subdomain}.png`);
  const hasLogo = existsSync(logoPath);
  const customLogoUrl = club.logoUrl || `/branding/logo?club=${club.subdomain}`;

  return res.json({
    subdomain:        club.subdomain,
    club_name:        club.name,
    name:             club.name,
    clubName:         club.name,
    owner_full_name:  club.ownerName,
    owner_role_label: 'Club Owner',
    logo_url:         customLogoUrl,
    logoUrl:          customLogoUrl,
    has_logo:         hasLogo || !!club.logoUrl,
    theme_primary:    club.themePrimary,
    theme_secondary:  club.themeSecondary,
    language:         club.language || 'en',
  });
});

/**
 * PUT /branding/settings
 * Authenticated - updates the theme primary/secondary color and language of the current admin's club.
 */
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const { themePrimary, themeSecondary, language } = req.body;
    const clubId = req.admin.clubId;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ detail: 'Club not found' });
    }

    if (themePrimary !== undefined) club.themePrimary = themePrimary;
    if (themeSecondary !== undefined) club.themeSecondary = themeSecondary;
    if (language !== undefined) {
      if (!['en', 'hi', 'pb'].includes(language)) {
        return res.status(422).json({ detail: 'Invalid language selection' });
      }
      club.language = language;
    }

    await club.save();

    return res.json({
      detail: 'Settings updated successfully',
      subdomain:        club.subdomain,
      club_name:        club.name,
      owner_full_name:  club.ownerName,
      owner_role_label: 'Club Owner',
      logo_url:         `/branding/logo?club=${club.subdomain}`,
      has_logo:         existsSync(path.join(__dirname, `../../static/logo_${club.subdomain}.png`)),
      theme_primary:    club.themePrimary,
      theme_secondary:  club.themeSecondary,
      language:         club.language,
    });
  } catch (err) {
    console.error('PUT /branding/settings error:', err);
    return res.status(500).json({ detail: 'Failed to update settings' });
  }
});

/**
 * GET /branding/logo
 * Serves the club-specific logo or falls back to default.
 */
router.get('/logo', resolveTenant, (req, res) => {
  const club = req.club;
  const specificLogoPath = path.join(__dirname, `../../static/logo_${club.subdomain}.png`);
  const defaultLogoPath = path.join(__dirname, `../../static/logo.png`);

  let targetPath = specificLogoPath;
  if (!existsSync(targetPath)) {
    targetPath = defaultLogoPath;
  }

  if (!existsSync(targetPath)) {
    return res.status(404).json({ detail: 'No logo configured' });
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  createReadStream(targetPath).pipe(res);
});

export default router;
