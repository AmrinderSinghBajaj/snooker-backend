import { fileURLToPath } from 'url';

/**
 * WHITE-LABEL BRANDING CONFIG
 * ============================
 * This is the ONE file to edit when deploying this platform for a new club
 * owner. Change the values below, redeploy, and the club name / owner name
 * flow through everywhere automatically: the login screen, the top bar, the
 * seeded admin account, and any exported/printed records.
 *
 * To onboard a new club:
 *   1. Edit CLUB_NAME, OWNER_FULL_NAME, OWNER_USERNAME, OWNER_PASSWORD below.
 *   2. Replace the logo file at static/logo.png with the new club's logo
 *      (same filename - nothing else needs to change).
 *   3. Redeploy the backend. Run `npm run seed` once to create that owner's
 *      login (it reads these same values).
 *
 * Current client: Beerbal Ji - The Billiards Arena
 */

export const CLUB_NAME = 'The Billiards Arena';
export const OWNER_FULL_NAME = 'Beerbal Ji';
export const OWNER_ROLE_LABEL = 'Club Owner';

// Used only by seedAdmin.js to create the first login for this club.
// Change these per client before running the seed script - this is the
// username/password the owner will actually use to sign in.
export const OWNER_USERNAME = 'beerbalji';
export const OWNER_PASSWORD = 'ChangeMe123!';


// Served at GET /branding/logo - swap the file, not this path.
export const LOGO_PATH = fileURLToPath(new URL('../static/logo.png', import.meta.url));
export const LOGO_URL_PATH = '/branding/logo';
