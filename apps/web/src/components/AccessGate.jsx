import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AccessContext = createContext({ logout: async () => {} });

export function useAccess() {
  return useContext(AccessContext);
}

export function AccessGate({ children }) {
  const [status, setStatus] = useState("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session")
      .then(async (response) => ({ response, body: await response.json().catch(() => ({})) }))
      .then(({ response, body }) => {
        if (!active) return;
        if (response.ok && body.authenticated) setStatus("authenticated");
        else if (body.configured === false) {
          setStatus("configuration-error");
          setError("Falta configurar POC_ACCESS_PASSWORD en el servidor.");
        } else setStatus("anonymous");
      })
      .catch(() => {
        if (!active) return;
        setStatus("anonymous");
        setError("No se pudo conectar con el servidor. Intentá nuevamente.");
      });
    return () => { active = false; };
  }, []);

  const login = async (event) => {
    event.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "No se pudo ingresar");
      setPassword("");
      setStatus("authenticated");
    } catch (loginError) {
      setError(loginError.message === "Contraseña incorrecta" ? loginError.message : "No se pudo ingresar. Intentá nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const context = useMemo(() => ({
    logout: async () => {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      setStatus("anonymous");
      setPassword("");
      setError("");
    }
  }), []);

  if (status === "authenticated") {
    return <AccessContext.Provider value={context}>{children}</AccessContext.Provider>;
  }

  return (
    <main className="access-page">
      <section className="access-card" aria-labelledby="access-title">
        <div className="access-logo">easy</div>
        {status === "checking" ? (
          <p className="access-checking">Verificando acceso…</p>
        ) : (
          <>
            <div className="access-badge">POC PRIVADO</div>
            <h1 id="access-title">Ingresá para continuar</h1>
            <p>Este demo está protegido con una contraseña.</p>
            {status === "configuration-error" ? (
              <div className="access-error" role="alert">{error}</div>
            ) : (
              <form onSubmit={login}>
                <label htmlFor="access-password">Contraseña</label>
                <input
                  id="access-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  required
                />
                {error && <div className="access-error" role="alert">{error}</div>}
                <button type="submit" disabled={submitting || !password}>
                  {submitting ? "Ingresando…" : "Ingresar"}
                </button>
              </form>
            )}
          </>
        )}
      </section>
    </main>
  );
}
