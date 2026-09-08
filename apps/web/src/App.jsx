import React, { useEffect, useState } from "react";
import { AssistantWidget } from "./components/AssistantWidget.jsx";
import { ProductCard } from "./components/ProductCard.jsx";

const categoryTiles = [
  ["Herramientas", "Taladros, sierras y más", "🛠️"],
  ["Pinturas", "Color para cada espacio", "🎨"],
  ["Baño", "Renová tu baño", "🚿"],
  ["Cocina", "Ideas para tu cocina", "🍳"],
  ["Iluminación", "Iluminá tu proyecto", "💡"],
  ["Jardín", "Todo para exterior", "🌿"]
];

export function App() {
  const [sampleProducts, setSampleProducts] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/catalog/search?term=taladro&limit=4")
      .then((response) => response.json())
      .then((data) => setSampleProducts(data.products || []))
      .catch(() => {});
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    const term = search.trim();
    if (!term) return;
    fetch(`/api/catalog/search?term=${encodeURIComponent(term)}&limit=8`)
      .then((response) => response.json())
      .then((data) => setSampleProducts(data.products || []))
      .catch(() => {});
  };

  return (
    <div className="easy-shell">
      <div className="top-strip">Todo Easy.cl hasta en 6 cuotas sin interés</div>
      <header className="site-header">
        <div className="brand-logo">easy</div>
        <form className="site-search" onSubmit={submitSearch}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="¿Qué estás buscando?" />
          <button>⌕</button>
        </form>
        <nav className="header-actions">
          <button><span>⌖</span>Tu ubicación</button>
          <button><span>♙</span>Inicia sesión</button>
          <button className="cart-button">🛒</button>
        </nav>
      </header>
      <nav className="category-nav">
        <strong>Categorías</strong>
        <span>Cupones</span><span>Nuevo en Easy</span><span>Servicios</span><span>Easy Pro</span><span>Vende en Easy</span>
      </nav>

      <main className="site-main">
        <section className="hero-banner">
          <div>
            <div className="eyebrow">PROYECTOS DE HOGAR</div>
            <h1>Todo para hacerlo realidad</h1>
            <p>Encontrá herramientas, materiales y soluciones para transformar tus espacios.</p>
            <button>Ver oportunidades</button>
          </div>
          <div className="hero-shape"><span>POC</span><b>Easy Assistant</b></div>
        </section>

        <section>
          <div className="section-title"><h2>¿Qué proyecto tenés en mente?</h2><a>Ver todas</a></div>
          <div className="category-grid">
            {categoryTiles.map(([title, subtitle, icon]) => (
              <div className="category-tile" key={title}>
                <div className="category-tile__icon">{icon}</div>
                <strong>{title}</strong>
                <small>{subtitle}</small>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="section-title"><h2>Recomendados para vos</h2><a>Ver más</a></div>
          <div className="site-product-grid">
            {sampleProducts.length ? sampleProducts.map((product) => <ProductCard key={product.id} product={product} />) : (
              <div className="skeleton-copy">El catálogo se cargará desde el mock API.</div>
            )}
          </div>
        </section>
      </main>
      <footer className="site-footer"><strong>Easy</strong><span>Centro de ayuda</span><span>Nuestras tiendas</span><span>Cambios y devoluciones</span><span>Servicio técnico</span></footer>

      <AssistantWidget />
    </div>
  );
}
