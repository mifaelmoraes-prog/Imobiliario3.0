import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Em desenvolvimento, atende POST /api/tts com o mesmo código da função da Vercel.
// As variáveis GEMINI_* ficam só no servidor (não têm prefixo VITE_).
function ttsDevApi(env) {
  return {
    name: 'tts-dev-api',
    configureServer(server) {
      for (const key of [
        'TTS_PROVIDER',
        'GEMINI_API_KEY', 'GEMINI_TTS_MODEL', 'GEMINI_TTS_VOICE',
        'OPENAI_API_KEY', 'OPENAI_TTS_MODEL', 'OPENAI_TTS_VOICE'
      ]) {
        if (env[key] && !process.env[key]) process.env[key] = env[key];
      }
      server.middlewares.use('/api/tts', async (req, res) => {
        const { handleTtsRequest } = await import('./server/geminiTts.js');
        let raw = '';
        for await (const chunk of req) raw += chunk;
        let body = null;
        try {
          body = JSON.parse(raw || '{}');
        } catch {
          // corpo inválido vira 400 no handler
        }
        const result = await handleTtsRequest(
          { method: req.method, body, origin: req.headers.origin, host: req.headers.host },
          { gemini: process.env.GEMINI_API_KEY, openai: process.env.OPENAI_API_KEY }
        );
        res.statusCode = result.status;
        Object.entries(result.headers).forEach(([k, v]) => res.setHeader(k, v));
        res.end(result.body);
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), ttsDevApi(env)],
    server: {
      port: 5173,
      host: true
    }
  };
});
