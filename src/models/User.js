import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    // Local giriş için password saklanır; Google girişinde opsiyonel bırakılır.
    password: {
      type: String,
      default: null,
      validate: {
        validator: function validatePassword(v) {
          return v == null || (typeof v === 'string' && v.length >= 6 && v.length <= 128);
        },
        message: 'Password must be between 6 and 128 characters',
      },
    },
    authProvider: { type: String, default: 'local' }, // 'local' | 'google'
    googleId: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    refreshToken: { type: String, default: null },
  },
  { timestamps: true },
);

const User = mongoose.model('User', userSchema);

export default User;
