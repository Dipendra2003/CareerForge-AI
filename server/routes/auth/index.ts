import { Router } from 'express';
import { registerHandler } from './register';
import { loginHandler } from './login';
import { logoutHandler } from './logout';
import { refreshHandler } from './refresh';
import { verifyEmailHandler } from './verifyEmail';
import { resendVerificationHandler } from './resendVerification';
import { forgotPasswordHandler } from './forgotPassword';
import { resetPasswordHandler } from './resetPassword';
import { meHandler } from './me';
import googleRouter from './google';
import { resendVerificationRateLimiter } from '../../middleware/security';
import { verify2FAHandler } from './verify2fa';

const router = Router();

router.use('/google', googleRouter);

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/verify-2fa', verify2FAHandler);
router.post('/logout', logoutHandler);
router.post('/refresh', refreshHandler);
router.post('/verify-email', verifyEmailHandler);
router.post('/resend-verification', resendVerificationRateLimiter, resendVerificationHandler);
router.post('/forgot-password', forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);
router.get('/jwt-me', meHandler); // Using /jwt-me to not conflict with Supabase's /me right now

export default router;
