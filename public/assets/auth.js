// public/assets/auth.js
// Authentication utilities

/**
 * ดึงข้อมูล user ปัจจุบัน
 */
async function getCurrentUser() {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    });
    
    console.log('getCurrentUser response:', response.status, response.statusText);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('getCurrentUser error:', error);
      return null;
    }
    
    const data = await response.json();
    console.log('getCurrentUser data:', data);
    return data;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

/**
 * Logout
 */
async function logout() {
  try {
    await fetch('/api/auth/logout', {
      credentials: 'include',
    });
    
    // Redirect to login page
    window.location.href = '/login.html';
  } catch (error) {
    console.error('Logout error:', error);
    window.location.href = '/login.html';
  }
}

/**
 * ตรวจสอบ auth ก่อนเข้าหน้า
 * เรียก API เพื่อตรวจสอบ authentication แทนการอ่าน cookie โดยตรง
 * (เพราะ cookie ถูก set เป็น HttpOnly ทำให้ JavaScript อ่านไม่ได้)
 */
async function requireAuth() {
  console.log('requireAuth - Checking authentication...');
  
  const user = await getCurrentUser();
  
  if (!user) {
    console.log('requireAuth - Not authenticated, redirecting to login');
    window.location.href = '/login.html';
    return null;
  }
  
  console.log('requireAuth - User authenticated:', user);
  return user;
}
