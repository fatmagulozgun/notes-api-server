import { Router } from 'express';
import {
  googleAuth,
  googleCallback,
  login,
  logout,
  me,
  refresh,
  register,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import { loginSchema, registerSchema } from '../validators/authValidators.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', protect, me);
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

export default router;
