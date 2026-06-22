# Redis Setup Guide para MiPOS Rate Limiting

## Visión General

MiPOS utiliza Redis para rate limiting en deployments distribuidos (Vercel, multi-instancia). El sistema tiene fallback automático a in-memory si Redis no está disponible.

**Opciones:**
- ✅ **Upstash Redis** (Recomendado para Vercel/serverless)
- ✅ **Redis self-hosted** (Recomendado para instancias dedicadas)
- ✅ **In-memory** (Default - desarrollo local)

---

## Setup Rápido (3 pasos)

### 1. Crear Redis Database

**Opción A: Upstash (Vercel)**

1. Ir a https://console.upstash.com/
2. Sign up o login
3. Click "Create Database"
4. Seleccionar región más cercana
5. Click "Create"
6. Copiar "REST API" credentials

**Opción B: Self-hosted**

```bash
# Docker
docker run -d -p 6379:6379 redis:latest

# O instalar localmente
brew install redis
redis-server
```

### 2. Configurar Variables de Entorno

**Proyecto MiPOS:**

```bash
cd apps/frontend

# Opción 1: Usar script de setup
bash scripts/setup-redis.sh

# Opción 2: Manual
echo "UPSTASH_REDIS_REST_URL=..." >> .env.local
echo "UPSTASH_REDIS_REST_TOKEN=..." >> .env.local
```

**Ejemplo .env.local:**

```env
# Upstash
UPSTASH_REDIS_REST_URL=https://your-namespace.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# O self-hosted
# REDIS_URL=redis://localhost:6379
```

### 3. Testing

```bash
# Development
npm run dev

# Test signup endpoint
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User",
    "organizationName": "Test Org",
    "vertical": "RETAIL",
    "planSlug": "free"
  }'
```

---

## Configuración Detallada

### Upstash Redis

**Ventajas:**
- ✅ Serverless (sin manage)
- ✅ Free tier generous (10k requests/día)
- ✅ Edge optimizado para Vercel
- ✅ Auto-scaling
- ✅ Backup automático

**Desventajas:**
- ❌ REST API (no socket)
- ❌ Costo en alta carga

**Pricing Upstash:**
- Free: 10k req/día, $0
- Pro: $0.08/10k req, $12/mes mínimo

**Setup:**

1. Crear account en https://upstash.com/
2. Crear "Redis Database"
3. En console, ir a "REST API"
4. Copiar URL y Token:

```env
UPSTASH_REDIS_REST_URL=https://your-namespace-us1.upstash.io
UPSTASH_REDIS_REST_TOKEN=AAAJcXXXXX...
```

5. Testing:

```bash
curl -X GET https://your-namespace.upstash.io/ping \
  -H "Authorization: Bearer YOUR_TOKEN"
# Response: {"result":"PONG"}
```

---

### Self-Hosted Redis

**Ventajas:**
- ✅ Full control
- ✅ Cero costo (si tienes server)
- ✅ Socket nativo (muy rápido)
- ✅ Sin límites de throughput

**Desventajas:**
- ❌ Manage infra
- ❌ Backup manual
- ❌ Replication compleja

**Setup Docker:**

```bash
# Run Redis container
docker run -d \
  --name mipos-redis \
  -p 6379:6379 \
  redis:latest

# Verify
docker exec mipos-redis redis-cli ping
# Output: PONG
```

**Setup Local (Mac):**

```bash
brew install redis
redis-server

# En otra terminal:
redis-cli ping
# Output: PONG
```

**Configurar .env.local:**

```env
REDIS_URL=redis://localhost:6379
```

---

## Arquitectura del Rate Limiter

### Flujo con Redis

```
Request /api/auth/register
  ↓
Get IP address
  ↓
Check Redis: "signup_ratelimit:{ip}"
  ↓
  ├─ Redis available
  │  └─ INCR and check count
  │     ├─ count ≤ 5 → ALLOW
  │     └─ count > 5 → REJECT (429)
  │
  └─ Redis unavailable
     └─ Fallback to in-memory
        └─ Check memory store
```

### Fallback a In-Memory

Si Redis falla:
1. Sistema automáticamente usa Map en-memory
2. Mismo comportamiento que development
3. Cero degradación UX
4. Logs de fallback para monitoring

**Código:**

```typescript
// rate-limiter-redis.ts
const redis = getRedisClient(); // null si no configurado

async check(ip: string) {
  if (redis) {
    try {
      return await checkRedis(ip);
    } catch (error) {
      console.warn('Redis error, falling back...');
      // Fall through to in-memory
    }
  }
  return this.checkInMemory(ip);
}
```

---

## Monitoring & Debugging

### Verificar Conexión Redis

**Upstash:**

```bash
curl -X GET "https://your-namespace.upstash.io/info" \
  -H "Authorization: Bearer TOKEN"
```

**Self-hosted:**

```bash
redis-cli
> PING
PONG
> INFO stats
# Shows commands processed, connections, etc.
```

### Logs de MiPOS

```bash
# Dev mode - watch logs
npm run dev

# Look for:
# [rate-limiter] Redis not configured
# [rate-limiter] Redis error, falling back to in-memory
# [rate-limiter] Connection successful!
```

### Rate Limit Stats

```bash
# Get stats from endpoint (debug only)
curl http://localhost:3000/api/auth/register/stats

# Response:
{
  "backend": "redis" || "in-memory",
  "inMemoryEntries": 0
}
```

---

## Troubleshooting

### "Redis not configured"

**Solución:** Agregar variables a .env.local

```env
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### "Redis connection failed"

**Causa:** Credenciales incorrectas

**Verificar:**

```bash
# Test URL
curl -X GET "{URL}/ping" \
  -H "Authorization: Bearer {TOKEN}"

# Si 401 → token incorrecto
# Si 404 → URL incorrecto
```

**Solución:** Copiar credenciales correctas de Upstash console

### "Rate limit hitting too early"

**Causa:** Múltiples IPs detrás de proxy

**Verificar:** En Upstash, ver Redis keys

```bash
# List all keys
KEYS *

# Check specific IP
GET "signup_ratelimit:192.168.1.1"
```

**Solución:** Ajustar IP detection en `rate-limiter.ts`

```typescript
function getClientIp(headers: Headers): string {
  // Vercel: x-forwarded-for
  // AWS: x-real-ip
  // Custom: agregar tu header
}
```

### Redis commands útiles

```bash
redis-cli

# Connect to Upstash
redis-cli -u redis://default:TOKEN@host:port

# Check rate limit keys
KEYS signup_ratelimit:*

# Get specific IP limit
GET "signup_ratelimit:203.0.113.45"

# Delete entry (manual reset)
DEL "signup_ratelimit:203.0.113.45"

# Monitor traffic
MONITOR

# Stats
INFO stats
```

---

## Deployment Checklist

### Pre-deployment

- [ ] Redis database created
- [ ] .env.local with credentials
- [ ] Local test: `npm run dev` + signup test
- [ ] Logs show "Redis connection successful"

### Vercel Deployment

- [ ] Add env vars in Vercel dashboard:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- [ ] Redeploy
- [ ] Check production logs for Redis connection
- [ ] Test signup in production

### Self-hosted Deployment

- [ ] Redis running on server
- [ ] .env with `REDIS_URL`
- [ ] Network accessible from app server
- [ ] Firewall rules allow connection
- [ ] Backup strategy configured

---

## Performance Metrics

| Métrica | In-Memory | Upstash | Self-hosted |
|---------|-----------|---------|------------|
| Latency | <1ms | 10-50ms | <5ms |
| Throughput | Unlimited | 10k req/día | Unlimited |
| Persistence | ❌ | ✅ | ✅ |
| Cost | $0 | $0-12/mes | Server cost |

---

## Next Steps

1. **Setup Redis** (seguir guía arriba)
2. **Test localmente** (npm run dev + signup)
3. **Deploy a Vercel** (con env vars)
4. **Monitor en producción** (logs + metrics)
5. **Escalar** (si necesario Redis cluster)

---

## Recursos

- [Upstash Console](https://console.upstash.com/)
- [Upstash Docs](https://upstash.com/docs)
- [Redis Commands](https://redis.io/commands)
- [MiPOS Rate Limiter Code](../apps/frontend/src/app/api/auth/register/rate-limiter-redis.ts)
- [Signup Flow](../apps/frontend/src/app/api/auth/register/route.ts)

---

**¿Preguntas?** Ver commit messages en git para detalles técnicos.
