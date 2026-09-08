# Scraping

El proyecto separa dos procesos:

1. **Productos** → catálogo estructurado para el Mock Search API.
2. **Documentación** → archivos Markdown para Knowledge Base.

## Principios

- Sólo páginas públicas.
- No evadir autenticación, CAPTCHA ni bloqueos anti-bot.
- Verificar `robots.txt` antes de visitar URLs.
- Concurrencia baja.
- Pausa configurable entre requests.
- No usar rutas explícitamente bloqueadas por `robots.txt`.
- El scraping es una solución de POC; una API oficial debe reemplazarlo en cuanto esté disponible.

## Producto

```bash
npm run scrape -- --search "taladro makita" --limit 30
```

Opciones:

```text
--search <texto>        Descubre productos desde /search/<texto>
--seed-file <archivo>   Lista explícita de URLs de producto
--limit <n>             Máximo de productos
--delay <ms>            Pausa entre productos (default 1200)
--headed                 Abre Chromium en modo visible
--output <archivo>       Ruta de salida
```

El scraper intenta extraer:

```text
id / SKU
name
title
brand
sellingPrice
listPrice
discountPercentage
imageUrl
images
url
categoryPath
groupId (mock, estable por categoría)
description
attributes
stock (proxy 1/0 si el sitio sólo expone disponibilidad)
scrapedAt
```

### Stock

Si la página pública no informa cantidad exacta, `stock` se usa como proxy de disponibilidad:

```text
1 = aparentemente disponible
0 = agotado/no disponible
```

No representa una cantidad real de inventario.

## Knowledge Base

Editar `apps/scraper/config/kb-urls.txt` y luego:

```bash
npm run scrape:kb
```

El scraper conserva título, URL, timestamp y el texto principal visible. Genera un `.md` por URL.
