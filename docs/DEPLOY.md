# Deploy público

La forma más simple para este POC es desplegar **API + frontend** en un solo servicio.

## Render

1. Subir el repo a GitHub.
2. En Render, crear un Blueprint desde `render.yaml` o un Web Service.
3. Configurar:

```text
Build: npm install && npm run build
Start: npm start
```

4. Agregar secretos:

```text
ELEVENLABS_API_KEY
ELEVENLABS_AGENT_ID
MOCK_API_KEY
POC_ACCESS_PASSWORD
CENCOSUD_SEARCH_API_KEY
```

`POC_ACCESS_PASSWORD` es la contraseña única de ingreso al sitio. El Blueprint genera además un `POC_SESSION_SECRET` para firmar las cookies de sesión. La URL, el application ID y el resto de la configuración no secreta de Cencosud ya están definidos en `render.yaml`.

5. Obtener una URL del estilo:

```text
https://easy-elevenlabs-poc.onrender.com
```

Entonces:

```text
https://easy-elevenlabs-poc.onrender.com/              -> web
https://easy-elevenlabs-poc.onrender.com/health        -> health
https://easy-elevenlabs-poc.onrender.com/v1/graphql    -> mock Cencosud
https://easy-elevenlabs-poc.onrender.com/tools/search-products -> tool ElevenLabs
```

Con la configuración incluida, `/tools/search-products` consulta la API GraphQL real. `/v1/graphql` se conserva como mock local para pruebas de contrato.

## Railway

Usar los mismos comandos. Railway detectará Node. Configurar las mismas variables.

## Importante

El archivo local `apps/api/data/products.json` queda dentro de la imagen/deploy. Para un POC alcanza. Si luego quieren refrescar el catálogo automáticamente, mover el dataset a un bucket/DB o crear un job de scraping en infraestructura controlada.
