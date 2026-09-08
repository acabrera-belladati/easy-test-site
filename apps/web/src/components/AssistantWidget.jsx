import React, { useEffect, useRef, useState } from "react";
import { useConversation, useConversationMode, useConversationStatus } from "@elevenlabs/react";
import { useAssistantRuntime } from "../state/AssistantRuntime.jsx";
import { ProductCard } from "./ProductCard.jsx";
import { Comparison } from "./Comparison.jsx";

function StatusDot({ status, isSpeaking, isListening }) {
  let label = "Desconectado";
  if (status === "connecting") label = "Conectando…";
  if (status === "connected") label = isSpeaking ? "Hablando…" : isListening ? "Escuchando…" : "Conectado";
  return <div className={`assistant-status assistant-status--${status}`}><span />{label}</div>;
}

export function AssistantWidget() {
  const runtime = useAssistantRuntime();
  const conversation = useConversation();
  const { status } = useConversationStatus();
  const { isSpeaking, isListening } = useConversationMode();
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [starting, setStarting] = useState(false);
  const [localError, setLocalError] = useState(null);
  const messagesEnd = useRef(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [runtime.messages, runtime.products]);

  const startVoice = async () => {
    if (status === "connected" || starting) return;
    setStarting(true);
    setLocalError(null);
    try {
      const permission = await navigator.mediaDevices.getUserMedia({ audio: true });
      permission.getTracks().forEach((track) => track.stop());

      const response = await fetch("/api/elevenlabs/token");
      const payload = await response.json();
      if (!response.ok || !payload.token) throw new Error(payload.message || "No se pudo iniciar ElevenLabs");
      await conversation.startSession({ conversationToken: payload.token });
    } catch (error) {
      console.error(error);
      setLocalError(error.message || String(error));
    } finally {
      setStarting(false);
    }
  };

  const stopVoice = async () => {
    try { await conversation.endSession(); } catch (error) { console.error(error); }
  };

  const sendText = () => {
    const value = input.trim();
    if (!value || status !== "connected") return;
    conversation.sendUserMessage(value);
    setInput("");
  };

  if (!open) {
    return <button className="assistant-launcher" onClick={() => setOpen(true)} aria-label="Abrir asistente"><span>✦</span></button>;
  }

  return (
    <aside className="assistant-widget">
      <header className="assistant-widget__header">
        <div className="assistant-brand-mark">e</div>
        <div>
          <strong>Asistente Easy</strong>
          <StatusDot status={status} isSpeaking={isSpeaking} isListening={isListening} />
        </div>
        <button className="icon-button" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
      </header>

      <div className="assistant-widget__messages">
        {runtime.messages.map((message) => (
          <div key={message.id} className={`bubble-row bubble-row--${message.role}`}>
            {message.role === "assistant" ? <div className="mini-avatar">e</div> : null}
            <div className={`bubble bubble--${message.role}`}>{message.text}</div>
          </div>
        ))}

        {runtime.products.length > 0 ? (
          <section className="widget-products">
            <div className="widget-products__label">Productos sugeridos</div>
            {runtime.presentation === "comparison" ? (
              <Comparison products={runtime.products} />
            ) : (
              <div className="widget-products__rail">
                {runtime.products.map((product) => <ProductCard key={product.id} product={product} compact />)}
              </div>
            )}
          </section>
        ) : null}
        <div ref={messagesEnd} />
      </div>

      {(localError || runtime.lastError) ? (
        <div className="widget-error">{localError || runtime.lastError}</div>
      ) : null}

      {status !== "connected" ? (
        <button className="voice-start" onClick={startVoice} disabled={starting || status === "connecting"}>
          <span className="voice-start__mic">●</span>
          {starting || status === "connecting" ? "Conectando…" : "Hablar con el asistente"}
        </button>
      ) : (
        <div className="voice-live">
          <button className={`voice-orb ${isSpeaking ? "voice-orb--speaking" : ""}`} onClick={stopVoice} title="Finalizar conversación">
            <span className="voice-wave"><i /><i /><i /><i /><i /></span>
          </button>
          <div>
            <strong>{isSpeaking ? "Te estoy respondiendo" : "Te estoy escuchando"}</strong>
            <small>Podés interrumpirme cuando quieras</small>
          </div>
        </div>
      )}

      <footer className="assistant-widget__input">
        <input
          value={input}
          disabled={status !== "connected"}
          placeholder={status === "connected" ? "Escribe tu consulta" : "Conectá el asistente para escribir"}
          onChange={(event) => {
            setInput(event.target.value);
            if (status === "connected") conversation.sendUserActivity?.();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendText();
            }
          }}
        />
        <button onClick={sendText} disabled={status !== "connected" || !input.trim()} aria-label="Enviar">➜</button>
      </footer>
      <div className="assistant-disclaimer">Asistente Easy IA · Los resultados pueden no ser exactos</div>
    </aside>
  );
}
