/**
 * Cloud Function (2nd gen) que devolve um access token OAuth 2.0 para o Vertex AI.
 * Uso: a Edge Function do Supabase chama esta URL com um header secreto e usa o token
 * em AI_CHAT_API_KEY para chamar o endpoint Vertex (OpenAI-compatible).
 *
 * Variáveis de ambiente:
 *   TOKEN_SECRET     - Valor que o cliente deve enviar no header X-Token-Secret (ou Authorization: Bearer TOKEN_SECRET).
 *
 * Autenticação (uma das duas):
 *   - Recomendado: não defina GOOGLE_APPLICATION_CREDENTIALS_JSON. O Cloud Run usará a conta de serviço
 *     do próprio serviço (Application Default Credentials). Atribua à conta de serviço do Cloud Run
 *     a role "Vertex AI User" (roles/aiplatform.user) no projeto.
 *   - Alternativa: GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON completo da chave de uma conta de serviço
 *     que tenha roles/aiplatform.user.
 */

const { JWT, GoogleAuth } = require('google-auth-library');

let cachedToken = null;
let cachedTokenExpiry = 0;
const CACHE_BUFFER_SECONDS = 300; // Renovar 5 min antes de expirar
const VERTEX_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

function getCredentialsFromEnv() {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!raw || typeof raw !== 'string' || !raw.trim()) return null;
  let jsonStr = raw.trim();
  if (!jsonStr.startsWith('{')) {
    try {
      const fs = require('fs');
      if (fs.existsSync(jsonStr)) jsonStr = fs.readFileSync(jsonStr, 'utf8');
    } catch (_) {
      return null;
    }
  }
  try {
    return JSON.parse(jsonStr);
  } catch (_) {
    return null;
  }
}

function isAuthorized(req) {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) return false;
  const headerSecret = req.headers['x-token-secret'];
  const authHeader = req.headers['authorization'];
  if (headerSecret === secret) return true;
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7) === secret) return true;
  return false;
}

async function getAccessTokenWithADC() {
  const auth = new GoogleAuth({ scopes: [VERTEX_SCOPE] });
  const client = await auth.getClient();
  const res = await client.getAccessToken();
  if (!res || !res.token) throw new Error('ADC: token vazio');
  return res.token;
}

async function getAccessTokenWithJWT(credentials) {
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Chave da conta de serviço deve ter client_email e private_key');
  }
  const privateKey = typeof credentials.private_key === 'string'
    ? credentials.private_key.replace(/\\n/g, '\n')
    : credentials.private_key;
  const jwt = new JWT({
    email: credentials.client_email,
    key: privateKey,
    scopes: [VERTEX_SCOPE],
  });
  const tokens = await jwt.authorize();
  const token = tokens.access_token;
  if (!token) throw new Error('JWT: token vazio');
  return token;
}

async function getAccessToken() {
  const now = Date.now() / 1000;
  if (cachedToken && cachedTokenExpiry > now + CACHE_BUFFER_SECONDS) {
    return cachedToken;
  }
  const credentials = getCredentialsFromEnv();
  const token = credentials
    ? await getAccessTokenWithJWT(credentials)
    : await getAccessTokenWithADC();
  cachedToken = token;
  cachedTokenExpiry = now + 55 * 60;
  return token;
}

exports.vertexToken = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Token-Secret');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ error: 'Não autorizado' });
    return;
  }

  try {
    const token = await getAccessToken();
    res.status(200).json({ token });
  } catch (e) {
    console.error('vertex-token error:', e.message);
    if (e.stack) console.error(e.stack);
    res.status(500).json({ error: 'Erro ao obter token', message: e.message });
  }
};
