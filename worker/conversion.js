// worker/conversion.js
// Conversion Tracking Logic

import { jsonResponse, errorResponse } from './utils.js';

/**
 * จัดการ conversion event
 * POST /api/conversion
 * Body: { slug: "campaign-a", data: { status: "success" } }
 */
export async function handleConversion(request, env) {
  try {
    const body = await request.json();
    const { slug, data } = body;
    
    if (!slug || !data) {
      return errorResponse('Missing slug or data', 400);
    }
    
    // ค้นหา destination link จาก slug
    const destination = await env.DB.prepare(`
      SELECT id FROM destination_links WHERE slug = ?
    `).bind(slug).first();
    
    if (!destination) {
      // ถ้าไม่เจอ destination ให้ ignore (ยัง redirect ใช้งานได้)
      return jsonResponse({ success: true, message: 'No destination found, ignored' });
    }
    
    // ดึง conversion setting
    const setting = await env.DB.prepare(`
      SELECT key_name, success_value
      FROM conversion_settings
      WHERE destination_link_id = ?
    `).bind(destination.id).first();
    
    if (!setting) {
      // ถ้าไม่มี setting ให้ ignore
      return jsonResponse({ success: true, message: 'No conversion setting, ignored' });
    }
    
    // ตรวจสอบว่า value ตรงกับ success_value หรือไม่
    const actualValue = data[setting.key_name];
    
    if (actualValue === setting.success_value) {
      // เพิ่ม conversion counter
      const conversionKey = `conversion:${destination.id}`;
      await incrementCounter(env.REDIRECT_KV, conversionKey);
      
      return jsonResponse({
        success: true,
        message: 'Conversion tracked',
        destination_id: destination.id,
      });
    } else {
      return jsonResponse({
        success: true,
        message: 'Value does not match success_value, not tracked',
      });
    }
  } catch (error) {
    console.error('Conversion error:', error);
    return errorResponse('Failed to process conversion', 500);
  }
}

/**
 * เพิ่ม counter (atomic operation)
 */
async function incrementCounter(kv, key) {
  try {
    const current = await kv.get(key);
    const count = current ? parseInt(current) : 0;
    await kv.put(key, (count + 1).toString());
  } catch (error) {
    console.error('Counter increment error:', error);
  }
}

/**
 * ดึง conversion count จาก KV
 */
export async function getConversionCount(env, destinationId) {
  try {
    const conversionKey = `conversion:${destinationId}`;
    const count = await env.REDIRECT_KV.get(conversionKey);
    return count ? parseInt(count) : 0;
  } catch (error) {
    console.error('Get conversion count error:', error);
    return 0;
  }
}

/**
 * ตั้งค่า conversion setting
 * POST /api/conversion/settings
 */
export async function setConversionSetting(request, env, user) {
  try {
    const body = await request.json();
    const { destination_link_id, key_name, success_value } = body;
    
    if (!destination_link_id || !key_name || !success_value) {
      return errorResponse('Missing required fields', 400);
    }
    
    // ตรวจสอบว่า destination นี้เป็นของ user หรือไม่
    const destination = await env.DB.prepare(`
      SELECT dl.id
      FROM destination_links dl
      JOIN main_links ml ON dl.main_link_id = ml.id
      WHERE dl.id = ? AND ml.user_id = ?
    `).bind(destination_link_id, user.userId).first();
    
    if (!destination) {
      return errorResponse('Destination not found or unauthorized', 404);
    }
    
    // ลบ setting เก่า (ถ้ามี) และเพิ่มใหม่
    await env.DB.prepare(`
      DELETE FROM conversion_settings WHERE destination_link_id = ?
    `).bind(destination_link_id).run();
    
    await env.DB.prepare(`
      INSERT INTO conversion_settings (destination_link_id, key_name, success_value)
      VALUES (?, ?, ?)
    `).bind(destination_link_id, key_name, success_value).run();
    
    return jsonResponse({
      success: true,
      message: 'Conversion setting saved',
    });
  } catch (error) {
    console.error('Set conversion setting error:', error);
    return errorResponse('Failed to save conversion setting', 500);
  }
}

/**
 * ดึง conversion setting
 */
export async function getConversionSetting(env, destinationLinkId) {
  try {
    const setting = await env.DB.prepare(`
      SELECT key_name, success_value
      FROM conversion_settings
      WHERE destination_link_id = ?
    `).bind(destinationLinkId).first();
    
    return setting;
  } catch (error) {
    console.error('Get conversion setting error:', error);
    return null;
  }
}
