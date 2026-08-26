import 'dotenv/config';

/** Trim and strip one pair of surrounding quotes (common when pasting into host env UIs). */
function cleanEnvString(value) {
  if (value == null || value === '') return '';
  let s = String(value).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpires: process.env.JWT_EXPIRES || '15m',
  refreshExpiresDays: Number(process.env.REFRESH_EXPIRES_DAYS || 7),
  /** Public site URL for password reset links (no trailing slash), e.g. http://localhost:5173 */
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  passwordResetExpiresHours: Number(process.env.PASSWORD_RESET_EXPIRES_HOURS || 1),
  emailVerificationExpiresHours: Number(process.env.EMAIL_VERIFICATION_EXPIRES_HOURS || 24),
  /**
   * Resend recommends "Name <email@domain>". Default uses their shared test domain.
   * For production, verify your domain in Resend and set EMAIL_FROM to e.g. "Ratai24 <noreply@yourdomain.com>".
   */
  emailFrom:
    cleanEnvString(process.env.EMAIL_FROM) || 'Ratai24 <onboarding@resend.dev>',
  resendApiKey: cleanEnvString(process.env.RESEND_API_KEY),
  /** Google OAuth client ID (same value as VITE_GOOGLE_CLIENT_ID on the frontend). */
  googleClientId: cleanEnvString(process.env.GOOGLE_CLIENT_ID),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  /** Car/part gallery uploads (admin-only; Cloudinary resizes after upload). */
  maxCarImageSizeBytes: 10 * 1024 * 1024,
  maxHeroImageSizeBytes: 8 * 1024 * 1024,
};
