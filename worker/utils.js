// worker/utils.js
// Utility functions สำหรับ Cloudflare Worker

/**
 * สร้าง JWT token แบบง่าย (signed cookie)
 */
export async function createJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signature = await sign(`${encodedHeader}.${encodedPayload}`, secret);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * ตรวจสอบและ decode JWT token
 */
export async function verifyJWT(token, secret) {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    const expectedSignature = await sign(`${encodedHeader}.${encodedPayload}`, secret);
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    const payload = JSON.parse(base64urlDecode(encodedPayload));
    
    // ตรวจสอบ expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }
    
    return payload;
  } catch (e) {
    return null;
  }
}

/**
 * Sign ข้อมูลด้วย HMAC SHA-256
 */
async function sign(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64urlEncode(signature);
}

/**
 * Base64 URL encode
 */
function base64urlEncode(data) {
  let str;
  if (typeof data === 'string') {
    str = btoa(unescape(encodeURIComponent(data)));
  } else {
    str = btoa(String.fromCharCode(...new Uint8Array(data)));
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64 URL decode
 */
function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return decodeURIComponent(escape(atob(str)));
}

/**
 * ดึง user จาก cookie
 */
export async function getUserFromRequest(request, env) {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  
  const match = cookie.match(/auth_token=([^;]+)/);
  if (!match) return null;
  
  const token = match[1];
  const payload = await verifyJWT(token, env.JWT_SECRET);
  
  return payload;
}

/**
 * สร้าง JSON response พร้อม CORS headers
 */
export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      ...headers,
    },
  });
}

/**
 * สร้าง error response
 */
export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

/**
 * Generate random string
 */
export function generateRandomString(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * สร้าง slug จาก email
 */
export function generateSlugFromEmail(email) {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
}

/**
 * ตรวจสอบว่า slug ซ้ำหรือไม่
 */
export async function isSlugAvailable(slug, env) {
  const result = await env.DB.prepare('SELECT id FROM users WHERE user_slug = ?')
    .bind(slug)
    .first();
  return !result;
}
