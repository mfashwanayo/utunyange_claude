const crypto = require('crypto');
const userModel = require('../models/user.model');

let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  bcrypt = require('bcryptjs'); // fallback if native bcrypt is not installed
}

const MAX_ATTEMPTS = 5;     // wrong passwords before the account is locked
const LOCK_MINUTES = 15;    // how long the lock lasts
const RESET_TTL_MIN = 60;   // password reset link lifetime
const ROUNDS = 12;          // bcrypt cost

const INVALID = 'Invalid email or password.';

// Used when the email does not exist, so the response time looks the same as a real check.
const DUMMY_HASH = bcrypt.hashSync('timing-protection-only', ROUNDS);

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const hashPassword = (plain) => bcrypt.hash(plain, ROUNDS);

// Returns an error message, or null when the password is acceptable.
function validatePassword(p) {
  if (typeof p !== 'string' || p.length < 8) return 'Password must be at least 8 characters long.';
  if (p.length > 100) return 'Password is too long (maximum 100 characters).';
  if (!/[a-z]/.test(p)) return 'Password must contain a lowercase letter.';
  if (!/[A-Z]/.test(p)) return 'Password must contain an uppercase letter.';
  if (!/[0-9]/.test(p)) return 'Password must contain a number.';
  return null;
}

// Checks email + password. Returns { ok, user?, status?, message? }.
async function authenticate(email, password) {
  const user = await userModel.findByEmail(email);

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    return { ok: false, status: 401, message: INVALID };
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const mins = Math.max(1, Math.ceil((new Date(user.locked_until) - new Date()) / 60000));
    return { ok: false, status: 423, user, message: `Too many failed attempts. Please try again in ${mins} minute(s).` };
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    await userModel.registerFailedLogin(user.id, MAX_ATTEMPTS, LOCK_MINUTES);
    return { ok: false, status: 401, user, message: INVALID };
  }

  // Only reveal account status after the password was correct.
  if (user.status !== 'active') {
    return { ok: false, status: 403, user, message: 'Your account is not active. Please contact the school office.' };
  }

  await userModel.registerSuccessfulLogin(user.id);
  return { ok: true, user };
}

// Creates a reset token for an active user; returns the raw token (to put in the email link).
async function createResetToken(user) {
  const raw = crypto.randomBytes(32).toString('hex');
  await userModel.invalidateResets(user.id);
  await userModel.createReset(user.id, sha256(raw), new Date(Date.now() + RESET_TTL_MIN * 60 * 1000));
  return raw;
}

async function findValidReset(rawToken) {
  if (typeof rawToken !== 'string' || !/^[a-f0-9]{64}$/.test(rawToken)) return null;
  const row = await userModel.findValidReset(sha256(rawToken));
  return row && row.status === 'active' ? row : null;
}

async function completeReset(resetRow, newPassword) {
  const hash = await hashPassword(newPassword);
  await userModel.setPassword(resetRow.user_id, hash);
  await userModel.markResetUsed(resetRow.id);
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await userModel.findById(userId);
  if (!user) return { ok: false, message: 'Account not found.' };
  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) return { ok: false, message: 'Your current password is incorrect.' };
  if (currentPassword === newPassword) return { ok: false, message: 'The new password must be different from the current one.' };
  await userModel.setPassword(userId, await hashPassword(newPassword));
  return { ok: true };
}

module.exports = {
  RESET_TTL_MIN,
  hashPassword,
  validatePassword,
  authenticate,
  createResetToken,
  findValidReset,
  completeReset,
  changePassword,
};
