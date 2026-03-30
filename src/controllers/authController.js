import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'crypto';
import User from '../models/User.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  getRefreshCookieOptions,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl || null,
  authProvider: user.authProvider || 'local',
});

const issueTokens = async (user, rememberMe, res) => {
  const payload = { userId: user._id.toString() };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  user.refreshToken = refreshToken;
  await user.save();

  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions(rememberMe));
  return accessToken;
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password, rememberMe } = req.body;
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email already exists');

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed });
  const accessToken = await issueTokens(user, rememberMe, res);

  res.status(201).json({ success: true, user: sanitizeUser(user), accessToken });
});

const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(401, 'Invalid credentials');
  if (!user.password) throw new ApiError(401, 'Invalid credentials');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError(401, 'Invalid credentials');

  const accessToken = await issueTokens(user, rememberMe, res);
  res.status(200).json({ success: true, user: sanitizeUser(user), accessToken });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) throw new ApiError(401, 'Refresh token missing');

  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.userId);
  if (!user || user.refreshToken !== token) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const accessToken = signAccessToken({ userId: user._id.toString() });
  res.status(200).json({ success: true, accessToken, user: sanitizeUser(user) });
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) {
    const user = await User.findOne({ refreshToken: token });
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
  }

  res.clearCookie('refreshToken', getRefreshCookieOptions(false));
  res.status(200).json({ success: true, message: 'Logged out' });
});

const me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: sanitizeUser(req.user) });
});

const getGoogleOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new ApiError(500, 'Google OAuth client secrets are not configured');
  }

  const rawRedirectUri =
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';

  // Google çok katı eşleştirdiği için olası '/' farklarını engelle.
  const redirectUri = rawRedirectUri.replace(/\/$/, '');

  return new OAuth2Client(clientId, clientSecret, redirectUri);
};

const googleAuth = asyncHandler(async (req, res) => {
  const oauth2Client = getGoogleOAuthClient();
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback').replace(/\/$/, '');

  const state = randomBytes(16).toString('hex');
  res.cookie('googleOAuthState', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000, // 10 dakika
  });

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'profile', 'email'],
    prompt: 'select_account',
    state,
    redirect_uri: redirectUri,
    // Bu parametre sadece bazı akışlarda kullanılabilir:
    // include_granted_scopes: true,
  });

  // Basit sanity check: clientId audience doğrulaması için kullanılacak.
  if (!clientId) throw new ApiError(500, 'GOOGLE_CLIENT_ID missing');

  console.log('Google OAuth redirect_uri:', redirectUri);
  res.redirect(url);
});

const googleCallback = asyncHandler(async (req, res) => {
  const oauth2Client = getGoogleOAuthClient();
  const clientId = process.env.GOOGLE_CLIENT_ID;

  const { code, state } = req.query;
  if (!code) throw new ApiError(400, 'Missing Google authorization code');

  const expectedState = req.cookies.googleOAuthState;
  if (!expectedState || expectedState !== state) {
    throw new ApiError(401, 'Invalid OAuth state');
  }
  res.clearCookie('googleOAuthState');

  const { tokens } = await oauth2Client.getToken(code);
  const idToken = tokens?.id_token;
  if (!idToken) throw new ApiError(400, 'Google did not return id_token');

  if (!clientId) throw new ApiError(500, 'GOOGLE_CLIENT_ID missing');

  const ticket = await oauth2Client.verifyIdToken({
    idToken,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) throw new ApiError(400, 'Google account email not found');

  const email = payload.email.toLowerCase();
  const name = payload.name || 'Google Kullanıcısı';
  const avatarUrl = payload.picture || null;
  const googleId = payload.sub || null;

  // Email unique olduğu için, aynı e-posta ile gelen kullanıcıyı upsert ediyoruz.
  let user = await User.findOne({ email });
  if (user) {
    // Hesap daha önce local oluşturulduysa şifreyi silmiyoruz; sadece sağlayıcıyı güncelliyoruz.
    user.name = name;
    user.avatarUrl = avatarUrl;
    user.authProvider = 'google';
    if (googleId) user.googleId = googleId;
    await user.save();
  } else {
    user = await User.create({
      name,
      email,
      password: null,
      avatarUrl,
      authProvider: 'google',
      googleId,
    });
  }

  await issueTokens(user, false, res);

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  res.redirect(`${clientUrl}/`);
});

export { register, login, refresh, logout, me, googleAuth, googleCallback };
