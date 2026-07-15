import { Request, Response, Router } from 'express';
import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { generateAccessToken } from '../../services/auth/jwt';
import { createRefreshToken } from '../../services/auth/tokenService';
import { logActivity } from '../../utils/auditLogger';
import { NotificationService } from "../../services/notification/NotificationService";
import { NotificationType } from "../../types/notification";
import { UAParser } from 'ua-parser-js';

const googleRouter = Router();

// GET /api/auth/google
googleRouter.get('/', async (req: Request, res: Response) => {
  const settings = await prisma.systemSetting.findFirst();
  if (settings && settings.allowGoogleLogin === false) {
    return res.status(403).send("Google login is currently disabled.");
  }

  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');

  // Set state cookie to prevent CSRF
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000, // 10 minutes
    sameSite: 'lax', // Must be lax for OAuth redirect flow
  });

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', process.env.GOOGLE_CLIENT_ID!);
  authUrl.searchParams.append('redirect_uri', process.env.GOOGLE_REDIRECT_URI!);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'openid email profile');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('nonce', nonce);

  res.redirect(authUrl.toString());
});

// GET /api/auth/google/callback
googleRouter.get('/callback', async (req: Request, res: Response) => {
  try {
    const frontendUrl = process.env.VITE_APP_URL || '';
    const { code, state } = req.query;
    const storedState = req.cookies?.oauth_state;

    if (!code || typeof code !== 'string') {
      return res.status(400).send('Missing authorization code');
    }

    if (!state || state !== storedState) {
      return res.status(400).send('Invalid state parameter (CSRF mismatch)');
    }

    // Clear state cookie
    res.clearCookie('oauth_state');

    // Exchange code for token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error('Token exchange error:', err);
      return res.status(400).send('Failed to exchange authorization code');
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    // Fetch user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userInfoResponse.ok) {
      return res.status(400).send('Failed to fetch user info from Google');
    }

    const userInfo = await userInfoResponse.json();
    const { sub: googleId, email, name, picture: avatar } = userInfo;

    if (!email) {
      return res.status(400).send('Google account has no email');
    }

    // User lookup and linking logic
    let user = await prisma.user.findUnique({ where: { googleId } });
    let isNewUser = false;

    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        // Link existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, isEmailVerified: true },
        });
        await logActivity({ req, actorId: user.id, actorEmail: user.email, actorName: user.name || '', action: 'Linked Google Account', module: 'Auth' });
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            name,
            googleId,
            isEmailVerified: true,
          },
        });
        isNewUser = true;
        
        await NotificationService.sendAuthentication(
          user.id,
          "Welcome to CareerForge AI",
          "Your account has been created via Google successfully.",
          NotificationType.SUCCESS
        );

        await logActivity({ req, actorId: user.id, actorEmail: user.email, actorName: user.name || '', action: 'User Created', module: 'Admin', description: 'Created via Google OAuth' });
      }
    }

    if (user.isSuspended) {
      await logActivity({ req, actorId: user.id, actorEmail: user.email, actorName: user.name || '', action: 'Failed Google OAuth Login', module: 'Auth', description: 'Account suspended', status: 'Failed' });
      return res.redirect(`${frontendUrl}/login?error=account_suspended`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    await logActivity({ req, actorId: user.id, actorEmail: user.email, actorName: user.name || '', action: 'Google OAuth Login', module: 'Auth' });


    const secSettings = await prisma.securitySetting.findUnique({ where: { userId: user.id } });

    if (secSettings?.twoFactorEnabled) {
      if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not defined");
      const jwt = (await import('jsonwebtoken')).default || await import('jsonwebtoken');
      const tempToken = jwt.sign({ userId: user.id, is2faAuth: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
      return res.redirect(`${frontendUrl}/login?tempToken=${tempToken}`);
    }

    const jwtAccessToken = generateAccessToken({ 

      userId: user.id, 
      email: user.email, 
      role: user.role,
      plan: user.plan || 'free'
    });
    
    
    const refreshToken = await createRefreshToken(user.id);
    
    // Create UserSession
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const ua = new UAParser(req.headers['user-agent'] || '');
    const browser = ua.getBrowser().name ? ua.getBrowser().name + " " + ua.getBrowser().version : 'Unknown';
    const os = ua.getOS().name ? ua.getOS().name + " " + ua.getOS().version : 'Unknown';
    const device = ua.getDevice().vendor ? ua.getDevice().vendor + " " + ua.getDevice().model : 'Desktop';
    const loginTime = new Date();
    
    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        ip,
        device,
        browser,
        os,
        createdAt: loginTime,
        lastActivity: loginTime,
        expiresAt: new Date(loginTime.getTime() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ip,
        browser,
        os,
        device,
        loginTime,
        success: true
      }
    });


    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    // Redirect to frontend with access token in the hash fragment for secure extraction
    res.redirect(`${frontendUrl}/oauth-callback#access_token=${jwtAccessToken}`);
  } catch (error) {
    console.error('Google OAuth Callback Error:', error);
    res.status(500).send('Internal Server Error during OAuth callback');
  }
});

export default googleRouter;

