import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Em desenvolvimento, atende /api/tts e /api/concierge com o mesmo código das
// funções da Vercel. As chaves ficam só no servidor (não têm prefixo VITE_).
const SERVER_ENV_KEYS = [
  'TTS_PROVIDER',
  'GEMINI_API_KEY', 'GEMINI_TTS_MODEL', 'GEMINI_TTS_VOICE',
  'OPENAI_API_KEY', 'OPENAI_TTS_MODEL', 'OPENAI_TTS_VOICE',
  'OPENAI_CHAT_MODEL', 'OPENAI_CHAT_REASONING', 'OPENAI_CHAT_FALLBACK_MODELS',
  'CONCIERGE_ALERTS', 'CONCIERGE_FEEDBACK'
];

const DEV_ROUTES = {
  '/api/tts': async (req) => {
    const { handleTtsRequest } = await import('./server/geminiTts.js');
    return handleTtsRequest(req, { gemini: process.env.GEMINI_API_KEY, openai: process.env.OPENAI_API_KEY });
  },
  '/api/concierge': async (req) => {
    const { handleConciergeRequest } = await import('./server/conciergeBrain.js');
    return handleConciergeRequest(req, { openai: process.env.OPENAI_API_KEY });
  }
};

function devApi(env) {
  return {
    name: 'dev-api',
    configureServer(server) {
      for (const key of SERVER_ENV_KEYS) {
        // Valor vazio também conta (ex.: OPENAI_CHAT_REASONING= desliga o parâmetro)
        if (key in env && process.env[key] === undefined) process.env[key] = env[key];
      }
      for (const [route, handle] of Object.entries(DEV_ROUTES)) {
        server.middlewares.use(route, async (req, res) => {
          let raw = '';
          for await (const chunk of req) raw += chunk;
          let body = null;
          try {
            body = JSON.parse(raw || '{}');
          } catch {
            // corpo inválido vira 400 no handler
          }
          const result = await handle({ method: req.method, body, origin: req.headers.origin, host: req.headers.host });
          res.statusCode = result.status;
          Object.entries(result.headers).forEach(([k, v]) => res.setHeader(k, v));
          res.end(result.body);
        });
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), devApi(env)],
    server: {
      port: 5173,
      host: true
    }
  };
});
