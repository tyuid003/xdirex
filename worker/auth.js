// worker/auth.js
// Google OAuth 2.0 Authentication

import { createJWT, verifyJWT, generateSlugFromEmail, isSlugAvailable, jsonResponse, errorResponse } from './utils.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

/**
 * เริ่มต้น OAuth flow - redirect ไป Google
 */
export async function handleGoogleLogin(env, redirectUri) {
  const state = crypto.randomUUID();
  
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: state,
  });
  
  return Response.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`, 302);
}

/**
 * จัดการ OAuth callback จาก Google
 */
export async function handleGoogleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirectUri = `${url.origin}/api/auth/callback`;
  
  if (!code) {
    return errorResponse('Authorization code not found', 400);
  }
  
  try {
    // แลก code กับ access_token
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return errorResponse('Failed to get access token', 400);
    }
    
    // ดึงข้อมูล user
    const userResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    
    const userData = await userResponse.json();
    
    if (!userData.email) {
      return errorResponse('Failed to get user email', 400);
    }
    
    // เช็คหรือสร้าง user ใน D1
    const user = await getOrCreateUser(userData.email, env);
    
    // สร้าง JWT token
    const token = await createJWT(
      {
        userId: user.id,
        email: user.email,
        userSlug: user.user_slug,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 วัน
      },
      env.JWT_SECRET
    );
    
    // ส่ง token กลับไปใน cookie และ redirect ไป index.html
    // ใช้ Domain=.xdirex.pages.dev เพื่อให้ทุก subdomain ใช้ cookie เดียวกัน
    const url = new URL(request.url);
    const domain = url.hostname.includes('xdirex.pages.dev') ? '.xdirex.pages.dev' : url.hostname;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': `auth_token=${token}; Path=/; Domain=${domain}; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
      },
    });
  } catch (error) {
    console.error('OAuth error:', error);
    return errorResponse('Authentication failed', 500);
  }
}

/**
 * ดึงหรือสร้าง user ใหม่
 */
async function getOrCreateUser(email, env) {
  // ตรวจสอบว่ามี user อยู่แล้วหรือไม่
  let user = await env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first();
  
  if (user) {
    return user;
  }
  
  // สร้าง user ใหม่
  let userSlug = generateSlugFromEmail(email);
  
  // ตรวจสอบว่า slug ซ้ำหรือไม่ ถ้าซ้ำให้เพิ่มตัวเลขท้าย
  let counter = 1;
  let originalSlug = userSlug;
  while (!(await isSlugAvailable(userSlug, env))) {
    userSlug = `${originalSlug}-${counter}`;
    counter++;
  }
  
  // Insert user ใหม่
  const result = await env.DB.prepare(
    'INSERT INTO users (email, user_slug) VALUES (?, ?) RETURNING *'
  )
    .bind(email, userSlug)
    .first();
  
  return result;
}

/**
 * ตรวจสอบ authentication จาก request
 */
export async function requireAuth(request, env) {
  const cookie = request.headers.get('Cookie');
  console.log('requireAuth - Cookie header:', cookie);
  
  if (!cookie) {
    console.log('requireAuth - No cookie header');
    return errorResponse('Unauthorized', 401);
  }
  
  const match = cookie.match(/auth_token=([^;]+)/);
  if (!match) {
    console.log('requireAuth - No auth_token found in cookie');
    return errorResponse('Unauthorized', 401);
  }
  
  const token = match[1];
  console.log('requireAuth - Token found:', token.substring(0, 20) + '...');
  
  const payload = await verifyJWT(token, env.JWT_SECRET);
  
  if (!payload) {
    console.log('requireAuth - JWT verification failed');
    return errorResponse('Invalid or expired token', 401);
  }
  
  console.log('requireAuth - Success, user:', payload.email);
  return payload;
}

/**
 * Logout - ลบ cookie และ redirect ไป Google logout
 */
export function handleLogout(request) {
  const url = new URL(request.url);
  const domain = url.hostname.includes('xdirex.pages.dev') ? '.xdirex.pages.dev' : url.hostname;
  const loginUrl = `${url.protocol}//${url.hostname}/login`;
  
  // ลบ cookie และ redirect ไป Google accounts logout แล้วกลับมา login
  return new Response(null, {
    status: 302,
    headers: {
      'Location': `https://accounts.google.com/Logout?continue=${encodeURIComponent(loginUrl)}`,
      'Set-Cookie': `auth_token=; Path=/; Domain=${domain}; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  });
}

/**
 * ดึงข้อมูล user ปัจจุบัน
 */
export async function handleGetCurrentUser(request, env) {
  const user = await requireAuth(request, env);
  
  if (user instanceof Response) {
    return user; // error response
  }
  
  // ดึงข้อมูล user จาก DB เพื่อให้ได้ max_links
  const userInfo = await env.DB.prepare(`
    SELECT id, email, user_slug, max_links FROM users WHERE id = ?
  `).bind(user.userId).first();
  
  if (!userInfo) {
    return errorResponse('User not found', 404);
  }
  
  return jsonResponse({
    id: userInfo.id,
    email: userInfo.email,
    userSlug: userInfo.user_slug,
    maxLinks: userInfo.max_links,
  });
}
