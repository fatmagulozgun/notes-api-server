import jwt from 'jsonwebtoken';

const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const refreshSecret =
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || accessSecret;

const assertSecrets = () => {
  if (!accessSecret || !refreshSecret) {
    throw new Error(
      'JWT secrets are missing. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in backend/.env',
    );
  }
};

const signAccessToken = (payload) => {
  assertSecrets();
  return jwt.sign(payload, accessSecret, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
};

const signRefreshToken = (payload) => {
  assertSecrets();
  return jwt.sign(payload, refreshSecret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

const verifyRefreshToken = (token) => {
  assertSecrets();
  return jwt.verify(token, refreshSecret);
};

const getRefreshCookieOptions = (rememberMe) => {
  const longMaxAge = 1000 * 60 * 60 * 24 * 30;
  const shortMaxAge = 1000 * 60 * 60 * 24 * 7;
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    maxAge: rememberMe ? longMaxAge : shortMaxAge,
  };
};

export {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshCookieOptions,
};
