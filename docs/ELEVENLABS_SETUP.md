# Configuración de ElevenLabs

## 1. Agente

Crear un agente privado en ElevenLabs y guardar el `agent_id` en:

```env
ELEVENLABS_AGENT_ID=agent_...
ELEVENLABS_API_KEY=...
```

El frontend **no** recibe la API key. El backend pide un conversation token a ElevenLabs y devuelve sólo el token temporal.

## 2. Server tool: `search_easy_products`

Crear una webhook/server tool que apunte al servicio público del POC:

```text
POST https://<POC_HOST>/tools/search-products
```

Headers:

```text
Content-Type: application/json
x-api-key: <MOCK_API_KEY>
```

Body esperado:

```json
{
  "term": "taladro",
  "brand": "Makita",
  "minPrice": 50000,
  "maxPrice": 200000,
  "sortBy": "relevance desc",
  "page": 1,
  "pageSize": 5,
  "filters": [
    {
      "key": "Conexiones",
      "stringValues": ["Inalámbrico"]
    }
  ]
}
```

Respuesta:

```json
{
  "totalSize": 4,
  "correctedQuery": null,
  "products": [
    {
      "id": "...",
      "title": "...",
      "brand": "Makita",
      "sellingPrice": 159990,
      "listPrice": 159990,
      "imageUrl": "...",
      "url": "...",
      "stock": 1,
      "attributes": {
        "Voltaje": "18V",
        "Conexiones": "Inalámbrico"
      }
    }
  ],
  "facets": []
}
```

### Descripción sugerida para la tool

> Busca productos del catálogo de Easy Chile. Usar cuando el usuario solicita productos, precios, stock, marcas, características, comparaciones o recomendaciones. Refinar las búsquedas usando los filtros y facets devueltos. Nunca inventar precio, stock ni atributos que no estén presentes en la respuesta.

## 3. Client tool: `show_products`

Configurar como Client Tool en ElevenLabs.

Parámetros:

```json
{
  "product_ids": ["string"]
}
```

Descripción sugerida:

> Muestra en el widget los productos que estás recomendando o describiendo. Llamar después de una búsqueda cuando sea útil que el usuario vea visualmente los resultados.

El frontend ya registra esta función y resuelve los IDs contra `/api/catalog/products`.

## 4. Client tool: `show_comparison`

Parámetros:

```json
{
  "product_ids": ["string"]
}
```

Descripción sugerida:

> Muestra una comparación visual entre dos o tres productos que el usuario pidió comparar.

## 5. Reglas sugeridas para el prompt

- Hablar como asesor de compra, no como un motor de búsqueda.
- Hacer como máximo una pregunta de refinamiento por turno cuando falte información importante.
- Usar `search_easy_products` para todo dato dinámico de producto.
- No inventar precio, descuento, stock, modelo ni especificaciones.
- Si el usuario pide comparar, seleccionar 2 o 3 opciones pertinentes y explicar sólo las diferencias relevantes para su necesidad.
- Usar `show_products` para recomendaciones y `show_comparison` para comparaciones.
- Mantener las respuestas de voz breves; dejar los detalles extensos para la interfaz visual.

## 6. Privacidad de la API key

El endpoint implementado por este proyecto es:

```text
GET /api/elevenlabs/token
```

Internamente llama a:

```text
GET https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=...
```

con el header `xi-api-key` desde el servidor. El browser recibe sólo el `token` temporal.
