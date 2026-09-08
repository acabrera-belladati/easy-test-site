# Catálogo local

`products.json` es el dataset que consume el mock API.

El archivo incluido es solamente un **seed de desarrollo** para que el proyecto arranque sin scraping ni credenciales. Combina productos del flujo de ejemplo provisto por el cliente con un ejemplo público de Easy. Precios y disponibilidad no deben tratarse como actuales.

Para reemplazarlo por datos públicos recién extraídos:

```bash
npm run scrape -- --search "taladro makita" --limit 30
```

El scraper sobrescribe `products.json` únicamente si logró extraer al menos un producto válido.
