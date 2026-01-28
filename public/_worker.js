// _worker.js - Advanced Mode for Cloudflare Pages
// Import worker logic
import worker from '../worker/index.js';

export default {
  async fetch(request, env, ctx) {
    // Create ASSETS binding for static files
    env.ASSETS = env.ASSETS || {
      fetch: (request) => {
        // Fallback to static file serving
        return env.__STATIC_CONTENT ? 
          env.__STATIC_CONTENT.fetch(request) : 
          fetch(request);
      }
    };
    
    // Call the main worker
    return worker.fetch(request, env, ctx);
  }
};
