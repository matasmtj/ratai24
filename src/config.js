import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpires: process.env.JWT_EXPIRES || '15m',
  refreshExpiresDays: Number(process.env.REFRESH_EXPIRES_DAYS || 7)
};
