import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const protect = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    throw new ApiError(401, 'Unauthorized');
  }

  const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  const decoded = jwt.verify(token, accessSecret);
  const user = await User.findById(decoded.userId).select('-password');

  if (!user) {
    throw new ApiError(401, 'User not found');
  }

  req.user = user;
  next();
});

export { protect };
