// worker/index.js
// Main Worker Entry Point - Cloudflare Worker

import { handleGoogleLogin, handleGoogleCallback, handleLogout, handleGetCurrentUser, requireAuth } from './auth.js';
import { handleRedirect, syncToKV, deleteFromKV, getClickCount } from './redirect.js';
import { handleConversion, getConversionCount, setConversionSetting, getConversionSetting } from './conversion.js';
import { jsonResponse, errorResponse, getUserFromRequest } from './utils.js';

export default {
  async fetch(request, env, ctx) {
    // เก็บ context สำหรับ waitUntil
    env.ctx = ctx;
    
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }
    
    // ==================== AUTH ROUTES ====================
    
    if (path === '/api/auth/login') {
      const redirectUri = `${url.origin}/api/auth/callback`;
      return handleGoogleLogin(env, redirectUri);
    }
    
    if (path === '/api/auth/callback') {
      return handleGoogleCallback(request, env);
    }
    
    if (path === '/api/auth/logout') {
      return handleLogout(request);
    }
    
    if (path === '/api/auth/me') {
      return handleGetCurrentUser(request, env);
    }
    
    // ==================== CONVERSION ROUTES ====================
    
    if (path === '/api/conversion' && request.method === 'POST') {
      return handleConversion(request, env);
    }
    
    if (path === '/api/conversion/settings' && request.method === 'POST') {
      const user = await requireAuth(request, env);
      if (user instanceof Response) return user;
      return setConversionSetting(request, env, user);
    }
    
    // ==================== ADMIN API ROUTES (require auth) ====================
    
    if (path.startsWith('/api/')) {
      const user = await requireAuth(request, env);
      if (user instanceof Response) return user;
      
      // GET /api/main-links - ดึง main links ของ user
      if (path === '/api/main-links' && request.method === 'GET') {
        return getMainLinks(env, user);
      }
      
      // POST /api/main-links - สร้าง main link ใหม่
      if (path === '/api/main-links' && request.method === 'POST') {
        return createMainLink(request, env, user);
      }
      
      // PUT /api/main-links/:id - แก้ไข main link
      const mainLinkUpdateMatch = path.match(/^\/api\/main-links\/(\d+)$/);
      if (mainLinkUpdateMatch && request.method === 'PUT') {
        return updateMainLink(request, env, user, parseInt(mainLinkUpdateMatch[1]));
      }
      
      // DELETE /api/main-links/:id - ลบ main link (ต้องส่ง user_slug เพื่อยืนยัน)
      if (mainLinkUpdateMatch && request.method === 'DELETE') {
        return deleteMainLink(request, env, user, parseInt(mainLinkUpdateMatch[1]));
      }
      
      // PUT /api/user/slug - แก้ไข user_slug
      if (path === '/api/user/slug' && request.method === 'PUT') {
        return updateUserSlug(request, env, user);
      }
      
      // GET /api/branding - ดึง branding footer
      if (path === '/api/branding' && request.method === 'GET') {
        return getBranding(env);
      }
      
      // GET /api/main-links/:id/destinations - ดึง destinations
      const destListMatch = path.match(/^\/api\/main-links\/(\d+)\/destinations$/);
      if (destListMatch && request.method === 'GET') {
        return getDestinations(env, user, parseInt(destListMatch[1]));
      }
      
      // POST /api/main-links/:id/destinations - สร้าง destination ใหม่
      if (destListMatch && request.method === 'POST') {
        return createDestination(request, env, user, parseInt(destListMatch[1]));
      }
      
      // PUT /api/destinations/:id - แก้ไข destination
      const destUpdateMatch = path.match(/^\/api\/destinations\/(\d+)$/);
      if (destUpdateMatch && request.method === 'PUT') {
        return updateDestination(request, env, user, parseInt(destUpdateMatch[1]));
      }
      
      // DELETE /api/destinations/:id - ลบ destination
      if (destUpdateMatch && request.method === 'DELETE') {
        return deleteDestination(env, user, parseInt(destUpdateMatch[1]));
      }
      
      return errorResponse('API endpoint not found', 404);
    }
    
    // ==================== REDIRECT ROUTE ====================
    // Format: /{user_slug}?go={slug}
    
    if (path !== '/' && !path.startsWith('/assets/') && !path.endsWith('.html')) {
      const userSlug = path.substring(1); // ตัด / ออก
      const slug = url.searchParams.get('go');
      
      if (userSlug && slug) {
        return handleRedirect(request, env, userSlug, slug);
      }
    }
    
    // ==================== STATIC FILES ====================
    // Fallback to Cloudflare Pages
    return env.ASSETS.fetch(request);
  },
};

// ==================== ADMIN API HANDLERS ====================

/**
 * ดึง main links ของ user
 */
async function getMainLinks(env, user) {
  try {
    const result = await env.DB.prepare(`
      SELECT id, slug, mode, icon, created_at
      FROM main_links
      WHERE user_id = ?
    `).bind(user.userId).all();
    
    return jsonResponse({ main_links: result.results || [] });
  } catch (error) {
    console.error('Get main links error:', error);
    return errorResponse('Failed to fetch main links', 500);
  }
}

/**
 * สร้าง main link ใหม่
 */
async function createMainLink(request, env, user) {
  try {
    // ตรวจสอบจำนวน main links และ limit
    const userInfo = await env.DB.prepare(`
      SELECT max_links FROM users WHERE id = ?
    `).bind(user.userId).first();
    
    const currentCount = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM main_links WHERE user_id = ?
    `).bind(user.userId).first();
    
    if (currentCount.count >= userInfo.max_links) {
      return errorResponse('Maximum main links limit reached', 403);
    }
    
    const body = await request.json();
    const { slug, icon = 'link' } = body;
    
    if (!slug) {
      return errorResponse('Slug is required', 400);
    }
    
    // ตรวจสอบว่า slug ซ้ำหรือไม่ (ภายใน user_id เดียวกัน)
    const duplicateCheck = await env.DB.prepare(`
      SELECT id FROM main_links WHERE user_id = ? AND slug = ?
    `).bind(user.userId, slug).first();
    
    if (duplicateCheck) {
      return errorResponse('Slug already exists for this user', 400);
    }
    
    // สร้าง main link
    const result = await env.DB.prepare(`
      INSERT INTO main_links (user_id, slug, mode, icon)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `).bind(user.userId, slug, 'round-robin', icon).first();
    
    // ซิงค์ไป KV (ถึงจะยังไม่มี destination)
    await syncToKV(env, result.id);
    
    return jsonResponse({ main_link: result }, 201);
  } catch (error) {
    console.error('Create main link error:', error);
    return errorResponse('Failed to create main link', 500);
  }
}

/**
 * แก้ไข main link (mode, icon)
 */
async function updateMainLink(request, env, user, mainLinkId) {
  try {
    const body = await request.json();
    const { mode, icon } = body;
    
    // ตรวจสอบว่าเป็นของ user หรือไม่
    const mainLink = await env.DB.prepare(`
      SELECT id FROM main_links WHERE id = ? AND user_id = ?
    `).bind(mainLinkId, user.userId).first();
    
    if (!mainLink) {
      return errorResponse('Main link not found or unauthorized', 404);
    }
    
    // Update
    let query = 'UPDATE main_links SET';
    let params = [];
    let updates = [];
    
    if (mode) {
      updates.push(' mode = ?');
      params.push(mode);
    }
    if (icon) {
      updates.push(' icon = ?');
      params.push(icon);
    }
    
    if (updates.length === 0) {
      return errorResponse('No fields to update', 400);
    }
    
    query += updates.join(',') + ' WHERE id = ?';
    params.push(mainLinkId);
    
    await env.DB.prepare(query).bind(...params).run();
    
    // ซิงค์ไป KV
    await syncToKV(env, mainLinkId);
    
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Update main link error:', error);
    return errorResponse('Failed to update main link', 500);
  }
}

/**
 * ลบ main link (ต้องยืนยันด้วย user_slug)
 */
async function deleteMainLink(request, env, user, mainLinkId) {
  try {
    // อ่าน body เพื่อดึง user_slug สำหรับยืนยัน
    const body = await request.json();
    const { confirm_slug } = body;
    
    if (!confirm_slug || confirm_slug !== user.userSlug) {
      return errorResponse('User slug confirmation required', 400);
    }
    
    // ดึงข้อมูล main link
    const mainLink = await env.DB.prepare(`
      SELECT ml.slug, u.user_slug
      FROM main_links ml
      JOIN users u ON ml.user_id = u.id
      WHERE ml.id = ? AND ml.user_id = ?
    `).bind(mainLinkId, user.userId).first();
    
    if (!mainLink) {
      return errorResponse('Main link not found or unauthorized', 404);
    }
    
    // ลบจาก D1 (cascade จะลบ destinations และ conversion settings ด้วย)
    await env.DB.prepare('DELETE FROM main_links WHERE id = ?').bind(mainLinkId).run();
    
    // ลบจาก KV
    await deleteFromKV(env, mainLink.user_slug, mainLink.slug);
    
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Delete main link error:', error);
    return errorResponse('Failed to delete main link', 500);
  }
}

/**
 * ดึง destinations พร้อม stats
 */
async function getDestinations(env, user, mainLinkId) {
  try {
    // ตรวจสอบว่าเป็นของ user หรือไม่
    const mainLink = await env.DB.prepare(`
      SELECT id FROM main_links WHERE id = ? AND user_id = ?
    `).bind(mainLinkId, user.userId).first();
    
    if (!mainLink) {
      return errorResponse('Main link not found or unauthorized', 404);
    }
    
    // ดึง destinations
    const destinations = await env.DB.prepare(`
      SELECT id, slug, url, is_active, created_at
      FROM destination_links
      WHERE main_link_id = ?
      ORDER BY id
    `).bind(mainLinkId).all();
    
    // ดึง stats จาก KV และ conversion settings
    const destinationsWithStats = await Promise.all(
      (destinations.results || []).map(async (dest) => {
        const clicks = await getClickCount(env, dest.id);
        const conversions = await getConversionCount(env, dest.id);
        const conversionSetting = await getConversionSetting(env, dest.id);
        
        return {
          ...dest,
          clicks,
          conversions,
          conversion_setting: conversionSetting,
        };
      })
    );
    
    return jsonResponse({ destinations: destinationsWithStats });
  } catch (error) {
    console.error('Get destinations error:', error);
    return errorResponse('Failed to fetch destinations', 500);
  }
}

/**
 * สร้าง destination ใหม่
 */
async function createDestination(request, env, user, mainLinkId) {
  try {
    // ตรวจสอบว่าเป็นของ user หรือไม่
    const mainLink = await env.DB.prepare(`
      SELECT id FROM main_links WHERE id = ? AND user_id = ?
    `).bind(mainLinkId, user.userId).first();
    
    if (!mainLink) {
      return errorResponse('Main link not found or unauthorized', 404);
    }
    
    const body = await request.json();
    const { slug, url } = body;
    
    if (!slug || !url) {
      return errorResponse('Slug and URL are required', 400);
    }
    
    // ไม่ตรวจสอบ slug ซ้ำเพราะ destination slug สามารถซ้ำได้
    
    // สร้าง destination
    const result = await env.DB.prepare(`
      INSERT INTO destination_links (main_link_id, slug, url, is_active)
      VALUES (?, ?, ?, 1)
      RETURNING *
    `).bind(mainLinkId, slug, url).first();
    
    // ซิงค์ไป KV
    await syncToKV(env, mainLinkId);
    
    return jsonResponse({ destination: result }, 201);
  } catch (error) {
    console.error('Create destination error:', error);
    return errorResponse('Failed to create destination', 500);
  }
}

/**
 * แก้ไข destination
 */
async function updateDestination(request, env, user, destinationId) {
  try {
    const body = await request.json();
    const { url, is_active } = body;
    
    // ตรวจสอบว่าเป็นของ user หรือไม่
    const destination = await env.DB.prepare(`
      SELECT dl.id, dl.main_link_id
      FROM destination_links dl
      JOIN main_links ml ON dl.main_link_id = ml.id
      WHERE dl.id = ? AND ml.user_id = ?
    `).bind(destinationId, user.userId).first();
    
    if (!destination) {
      return errorResponse('Destination not found or unauthorized', 404);
    }
    
    // Update
    let query = 'UPDATE destination_links SET';
    let params = [];
    let updates = [];
    
    if (url !== undefined) {
      updates.push(' url = ?');
      params.push(url);
    }
    if (is_active !== undefined) {
      updates.push(' is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return errorResponse('No fields to update', 400);
    }
    
    query += updates.join(',') + ' WHERE id = ?';
    params.push(destinationId);
    
    await env.DB.prepare(query).bind(...params).run();
    
    // ซิงค์ไป KV
    await syncToKV(env, destination.main_link_id);
    
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Update destination error:', error);
    return errorResponse('Failed to update destination', 500);
  }
}

/**
 * ลบ destination
 */
async function deleteDestination(env, user, destinationId) {
  try {
    // ดึงข้อมูล destination
    const destination = await env.DB.prepare(`
      SELECT dl.id, dl.main_link_id
      FROM destination_links dl
      JOIN main_links ml ON dl.main_link_id = ml.id
      WHERE dl.id = ? AND ml.user_id = ?
    `).bind(destinationId, user.userId).first();
    
    if (!destination) {
      return errorResponse('Destination not found or unauthorized', 404);
    }
    
    // ลบจาก D1 (cascade จะลบ conversion settings ด้วย)
    await env.DB.prepare('DELETE FROM destination_links WHERE id = ?').bind(destinationId).run();
    
    // ซิงค์ไป KV
    await syncToKV(env, destination.main_link_id);
    
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Delete destination error:', error);
    return errorResponse('Failed to delete destination', 500);
  }
}

/**
 * แก้ไข user_slug
 */
async function updateUserSlug(request, env, user) {
  try {
    const body = await request.json();
    const { new_slug } = body;
    
    if (!new_slug || new_slug.length < 3) {
      return errorResponse('New slug must be at least 3 characters', 400);
    }
    
    // ตรวจสอบว่า slug ซ้ำกับคนอื่นหรือไม่ (ไม่รวมตัวเอง)
    const duplicate = await env.DB.prepare(
      `SELECT id FROM users WHERE user_slug = ? AND id != ?`
    ).bind(new_slug, user.userId).first();
    
    if (duplicate) {
      return errorResponse('User slug already exists', 400);
    }
    
    const oldSlug = user.userSlug;
    
    // Update user_slug
    await env.DB.prepare(`
      UPDATE users SET user_slug = ? WHERE id = ?
    `).bind(new_slug, user.userId).run();
    
    // ดึง main links ของ user เพื่ออัพเดท KV
    const mainLinks = await env.DB.prepare(`
      SELECT id, slug FROM main_links WHERE user_id = ?
    `).bind(user.userId).all();
    
    // ลบ KV keys เก่า และสร้างใหม่
    for (const link of (mainLinks.results || [])) {
      await deleteFromKV(env, oldSlug, link.slug);
      await syncToKV(env, link.id);
    }
    
    return jsonResponse({ success: true, new_slug });
  } catch (error) {
    console.error('Update user slug error:', error);
    return errorResponse('Failed to update user slug', 500);
  }
}

/**
 * ดึงข้อมูล branding
 */
async function getBranding(env) {
  try {
    const branding = await env.DB.prepare(`
      SELECT label, url, contact_url FROM branding ORDER BY id LIMIT 1
    `).first();
    
    return jsonResponse(branding || { 
      label: 'Powered by Taekabu', 
      url: 'https://google.com',
      contact_url: 'https://facebook.com'
    });
  } catch (error) {
    console.error('Get branding error:', error);
    return jsonResponse({ 
      label: 'Powered by Taekabu', 
      url: 'https://google.com',
      contact_url: 'https://facebook.com'
    });
  }
}
