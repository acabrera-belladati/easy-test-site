function formatPrice(value) {
  return value == null ? "—" : new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
}

function valueFor(product, key) {
  const value = product.attributes?.[key];
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "—";
}

export function Comparison({ products }) {
  const keys = ["Tipo de producto", "Voltaje", "Potencia", "Conexiones", "Mandril", "Modelo"]
    .filter((key) => products.some((product) => product.attributes?.[key]));
  return (
    <div className="comparison-scroll">
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Característica</th>
            {products.map((product) => <th key={product.id}>{product.brand || "Producto"}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Producto</td>
            {products.map((product) => <td key={product.id}>{product.title}</td>)}
          </tr>
          <tr>
            <td>Precio</td>
            {products.map((product) => <td key={product.id}><strong>{formatPrice(product.sellingPrice)}</strong></td>)}
          </tr>
          {keys.map((key) => (
            <tr key={key}>
              <td>{key}</td>
              {products.map((product) => <td key={product.id}>{valueFor(product, key)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
