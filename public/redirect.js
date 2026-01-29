// worker/redirect.js
// Smart Redirect Logic with KV (ความเร็วสูงสุด)

/**
 * จัดการ redirect request
 * URL format: /{user_slug}?go={slug}
 * 
 * Performance: ใช้ KV read 1 ครั้งเท่านั้น ไม่ query D1
 */
export async function handleRedirect(request, env, userSlug, slug) {
  try {
    // อ่านข้อมูลจาก KV (1 read operation เท่านั้น)
    const kvKey = `user:${userSlug}:main:${slug}`;
    const dataJson = await env.REDIRECT_KV.get(kvKey);
    
    if (!dataJson) {
      return new Response('Redirect not found', { status: 404 });
    }
    
    const data = JSON.parse(dataJson);
    
    // Filter เฉพาะ destination ที่ active
    const activeDestinations = data.destinations.filter(d => d.is_active);
    
    if (activeDestinations.length === 0) {
      return new Response('No active destinations', { status: 404 });
    }
    
    // เลือก destination ตาม mode
    let selectedDestination;
    
    if (data.mode === 'round-robin') {
      // Round-robin: ใช้ตามลำดับ
      const index = data.round_robin_index || 0;
      selectedDestination = activeDestinations[index % activeDestinations.length];
      
      // อัพเดท index สำหรับครั้งถัดไป (async, ไม่รอ)
      const nextIndex = (index + 1) % activeDestinations.length;
      env.ctx.waitUntil(
        env.REDIRECT_KV.put(
          kvKey,
          JSON.stringify({ ...data, round_robin_index: nextIndex })
        )
      );
    } else {
      // Random: สุ่มเลือก
      const randomIndex = Math.floor(Math.random() * activeDestinations.length);
      selectedDestination = activeDestinations[randomIndex];
    }
    
    // เพิ่ม click count (async, ไม่รอ)
    const clickKey = `click:${selectedDestination.id}`;
    env.ctx.waitUntil(incrementCounter(env.REDIRECT_KV, clickKey));
    
    // Redirect 302
    return Response.redirect(selectedDestination.url, 302);
  } catch (error) {
    console.error('Redirect error:', error);
    return new Response('Internal error', { status: 500 });
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
 * ซิงค์ข้อมูลจาก D1 ไป KV
 * เรียกใช้หลังจาก admin แก้ไขข้อมูล
 */
export async function syncToKV(env, mainLinkId) {
  try {
    // ดึงข้อมูล main link และ destinations จาก D1
    const mainLink = await env.DB.prepare(`
      SELECT ml.*, u.user_slug
      FROM main_links ml
      JOIN users u ON ml.user_id = u.id
      WHERE ml.id = ?
    `).bind(mainLinkId).first();
    
    if (!mainLink) {
      return;
    }
    
    const destinations = await env.DB.prepare(`
      SELECT id, slug, url, is_active
      FROM destination_links
      WHERE main_link_id = ?
      ORDER BY id
    `).bind(mainLinkId).all();
    
    // สร้างข้อมูลสำหรับเก็บใน KV
    const kvData = {
      mode: mainLink.mode,
      round_robin_index: 0,
      destinations: destinations.results || [],
    };
    
    // เก็บลง KV
    const kvKey = `user:${mainLink.user_slug}:main:${mainLink.slug}`;
    await env.REDIRECT_KV.put(kvKey, JSON.stringify(kvData));
    
    return true;
  } catch (error) {
    console.error('Sync to KV error:', error);
    return false;
  }
}

/**
 * ลบข้อมูลจาก KV
 */
export async function deleteFromKV(env, userSlug, slug) {
  try {
    const kvKey = `user:${userSlug}:main:${slug}`;
    await env.REDIRECT_KV.delete(kvKey);
    return true;
  } catch (error) {
    console.error('Delete from KV error:', error);
    return false;
  }
}

/**
 * ดึง click count จาก KV
 */
export async function getClickCount(env, destinationId) {
  try {
    const clickKey = `click:${destinationId}`;
    const count = await env.REDIRECT_KV.get(clickKey);
    return count ? parseInt(count) : 0;
  } catch (error) {
    console.error('Get click count error:', error);
    return 0;
  }
}
