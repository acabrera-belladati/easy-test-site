# Easy × ElevenLabs POC

POC para recrear visualmente la experiencia del asistente de Easy y conectarla a un agente de ElevenLabs, manteniendo el contrato de búsqueda entregado por Cencosud.

## Qué incluye

- **Scraper de productos Easy** con Playwright.
- **Normalización** a un catálogo local estable.
- **Mock API compatible con el OpenAPI de Cencosud**: `POST /v1/graphql`.
- **Adapter simple para ElevenLabs**: `POST /tools/search-products`.
- **Endpoint server-side para crear conversation tokens de ElevenLabs**: `GET /api/elevenlabs/token`.
- **Frontend React/Vite** con una página visual tipo Easy y un widget conversacional custom.
- **Client tools** para mostrar productos y comparaciones dentro del widget.
- **Scraper documental** para generar Markdown de páginas públicas y luego cargarlas como Knowledge Base.
- **Deploy en un único servicio** (Render/Railway/Docker): el backend sirve también el frontend compilado.

## Arquitectura

```text
Easy.cl
   │
   ├─ product scraper ──► apps/api/data/products.json
   │                          │
   │                          ▼
   │                  POST /v1/graphql
   │                          │
   │                  POST /tools/search-products
   │                          │
   │                          ▼
   │                   ElevenLabs Agent
   │                          │
   └─ KB scraper ─────► Markdown KB
                              │
                              ▼
                         ElevenLabs KB

Browser ──► Easy-like Web + custom widget ──WebRTC──► ElevenLabs
   │
   └──── GET /api/elevenlabs/token ──► server (API key stays secret)
```

## Requisitos

- Node.js 22+
- npm 10+
- Para scraping: Chromium instalado por Playwright

## 1. Instalar

```bash
npm install
npx playwright install chromium
cp .env.example .env
```

## 2. Ejecutar con el seed incluido

El repo incluye un **seed pequeño** para poder probar el mock inmediatamente. No debe considerarse catálogo actual ni productivo.

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

API:

```text
http://localhost:3000
```

Health check:

```bash
curl http://localhost:3000/health
```

Búsqueda mock:

```bash
curl -X POST http://localhost:3000/v1/graphql \
  -H "Content-Type: application/json" \
  -H "x-api-key: easy-poc-belladati" \
  -d @examples/search-taladro.json
```

## 3. Scrapear productos reales

Ejemplo acotado para el golden flow:

```bash
npm run scrape -- --search "taladro makita" --limit 30
```

También se puede entregar un archivo de URLs:

```bash
npm run scrape -- --seed-file apps/scraper/config/product-urls.txt --limit 100
```

El resultado se escribe, por defecto, en:

```text
apps/api/data/products.json
```

Así el mock API empieza a devolver automáticamente el catálogo recién scrapeado.

> El scraper no intenta evadir bloqueos ni restricciones del sitio. Respeta `robots.txt`, usa baja concurrencia y pausas entre páginas. Si Easy cambia el DOM, los extractores pueden necesitar ajuste.

## 4. Generar Knowledge Base documental

Editá:

```text
apps/scraper/config/kb-urls.txt
```

y ejecutá:

```bash
npm run scrape:kb
```

Se generan archivos Markdown en:

```text
apps/scraper/output/kb/
```

Esos `.md` pueden cargarse al Knowledge Base del agente de ElevenLabs.

## 5. Configurar ElevenLabs

Completá `.env`:

```env
ELEVENLABS_API_KEY=...
ELEVENLABS_AGENT_ID=agent_...
```

La API key queda únicamente en el backend. El navegador solicita un **conversation token temporal** a `/api/elevenlabs/token`.

Ver `docs/ELEVENLABS_SETUP.md` para crear las tools.

## 6. Deploy

El frontend se compila y el backend lo sirve como contenido estático. Por eso puede desplegarse todo como **un solo Web Service**.

### Render

El repo trae `render.yaml`. Crear un Blueprint o Web Service y configurar las variables secretas.

### Railway

Build command:

```text
npm install && npm run build
```

Start command:

```text
npm start
```

## Cambio a la API real de Cencosud

Cuando Cencosud entregue `BASE_URL` y `x-api-key`:

```env
USE_REAL_CENCOSUD_API=true
CENCOSUD_SEARCH_BASE_URL=https://.../v1
CENCOSUD_SEARCH_API_KEY=...
```

El endpoint `POST /tools/search-products` usará el adapter real sin que el agente ni el frontend tengan que cambiar de contrato.

## Contrato original

La especificación entregada por Cencosud está preservada en:

```text
contracts/cencosud-search-api.openapi.yaml
```
