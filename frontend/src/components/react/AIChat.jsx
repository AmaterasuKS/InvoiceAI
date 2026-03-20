import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { api, getApiErrorMessage } from "@/api";

/**
 * Плавающий AI-чат: Groq через `/api/ai/chat`, ответ ассистента с эффектом печати.
 */
export default function AIChat(props = {}) {
  const { title = "InvoiceAI Assistant" } = props;
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);
  const typingTimers = useRef(new Set());

  const clearTypingTimers = useCallback(() => {
    typingTimers.current.forEach((id) => clearInterval(id));
    typingTimers.current.clear();
  }, []);

  useEffect(() => () => clearTypingTimers(), [clearTypingTimers]);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, open, scrollToBottom]);

  const startTyping = useCallback(
    (msgId, fullText) => {
      clearTypingTimers();
      const text = String(fullText ?? "");
      if (!text.length) return;

      if (reduceMotion) {
        setMessages((m) =>
          m.map((msg) => (msg.id === msgId ? { ...msg, text, full: text, typing: false } : msg))
        );
        return;
      }

      let index = 0;
      const tickMs = 16;
      const chunk = text.length > 1200 ? 3 : text.length > 600 ? 2 : 1;

      const timer = setInterval(() => {
        index = Math.min(text.length, index + chunk);
        setMessages((m) =>
          m.map((msg) =>
            msg.id === msgId
              ? { ...msg, text: text.slice(0, index), full: text, typing: index < text.length }
              : msg
          )
        );
        if (index >= text.length) {
          clearInterval(timer);
          typingTimers.current.delete(timer);
          setMessages((m) =>
            m.map((msg) => (msg.id === msgId ? { ...msg, typing: false } : msg))
          );
        }
      }, tickMs);

      typingTimers.current.add(timer);
    },
    [clearTypingTimers, reduceMotion]
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    clearTypingTimers();
    setInput("");

    const userMsg = { id: crypto.randomUUID(), role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);

    try {
      const { data } = await api.post("ai/chat", { message: text });
      const reply = data?.reply ?? "";
      const assistantId = crypto.randomUUID();
      setMessages((m) => [
        ...m,
        {
          id: assistantId,
          role: "assistant",
          text: "",
          full: reply,
          typing: true,
          meta: data?.model ? `model: ${data.model}` : "",
        },
      ]);
      startTyping(assistantId, reply);
    } catch (e) {
      const assistantId = crypto.randomUUID();
      const fallback = getApiErrorMessage(e, "Не удалось получить ответ AI");
      setMessages((m) => [
        ...m,
        {
          id: assistantId,
          role: "assistant",
          text: "",
          full: fallback,
          typing: true,
          meta: "",
          isError: true,
        },
      ]);
      startTyping(assistantId, fallback);
    } finally {
      setBusy(false);
    }
  }, [busy, clearTypingTimers, input, startTyping]);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const bubblePulse = useMemo(
    () =>
      reduceMotion
        ? {}
        : {
            scale: [1, 1.06, 1],
            boxShadow: [
              "0 18px 50px rgba(99,102,241,0.45)",
              "0 22px 60px rgba(139,92,246,0.55)",
              "0 18px 50px rgba(99,102,241,0.45)",
            ],
          },
    [reduceMotion]
  );

  return (
    <div style={styles.root}>
      <motion.button
        type="button"
        aria-label={open ? "Закрыть чат" : "Открыть AI чат"}
        style={styles.fab}
        onClick={() => setOpen((v) => !v)}
        whileHover={reduceMotion ? {} : { scale: 1.05, y: -2 }}
        whileTap={reduceMotion ? {} : { scale: 0.96 }}
        animate={open ? { rotate: 0 } : bubblePulse}
        transition={
          open
            ? { duration: 0.25 }
            : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <span style={styles.fabGlow} aria-hidden />
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3c5 0 9 3.6 9 8 0 2.2-1 4.2-2.6 5.7L21 21l-4.7-1.4C14.8 20.5 13.4 21 12 21 7 21 3 17.4 3 13s4-8 9-8Z"
            stroke="white"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M8.5 12.5h7M8.5 9.5h4" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            style={styles.panelWrap}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.94, rotateX: 8 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <div>
                  <p style={styles.panelTitle}>{title}</p>
                  <p style={styles.panelSub}>Контекст из ваших инвойсов и клиентов</p>
                </div>
                <button type="button" style={styles.iconBtn} aria-label="Закрыть" onClick={() => setOpen(false)}>
                  ×
                </button>
              </div>

              <div ref={listRef} style={styles.messages}>
                {messages.length === 0 && (
                  <p style={styles.hint}>
                    Спросите о задолженностях, напоминаниях клиентам или cash flow — ответ опирается на ваши данные.
                  </p>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      ...styles.msgRow,
                      justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        ...styles.bubble,
                        ...(m.role === "user" ? styles.bubbleUser : styles.bubbleAi),
                        ...(m.isError ? styles.bubbleError : {}),
                      }}
                    >
                      <p style={styles.bubbleText}>
                        {m.text}
                        {m.typing && <span style={styles.caret} aria-hidden />}
                      </p>
                      {m.meta ? <p style={styles.meta}>{m.meta}</p> : null}
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.composer}>
                <textarea
                  style={styles.textarea}
                  rows={2}
                  placeholder="Сообщение… (Enter — отправить, Shift+Enter — новая строка)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={busy}
                />
                <button type="button" style={styles.sendBtn} disabled={busy || !input.trim()} onClick={send}>
                  {busy ? "…" : "Отправить"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

const styles = {
  root: {
    position: "fixed",
    right: 20,
    bottom: 20,
    zIndex: 90,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 12,
    pointerEvents: "none",
  },
  fab: {
    pointerEvents: "auto",
    width: 58,
    height: 58,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    boxShadow: "0 18px 50px rgba(99,102,241,0.45)",
    position: "relative",
    overflow: "hidden",
  },
  fabGlow: {
    position: "absolute",
    inset: -30,
    background: "radial-gradient(circle, rgba(255,255,255,0.35), transparent 55%)",
    opacity: 0.35,
    filter: "blur(18px)",
    pointerEvents: "none",
  },
  panelWrap: {
    pointerEvents: "auto",
    width: "min(420px, calc(100vw - 40px))",
    perspective: 1200,
  },
  panel: {
    borderRadius: 20,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "linear-gradient(160deg, rgba(18,18,26,0.98), rgba(10,10,15,0.95))",
    boxShadow: "0 30px 90px rgba(0,0,0,0.65), 0 0 0 1px rgba(99,102,241,0.12)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    display: "flex",
    flexDirection: "column",
    maxHeight: "min(640px, 80vh)",
  },
  panelHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    padding: "14px 14px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  panelTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 800,
    color: "#f8fafc",
  },
  panelSub: {
    margin: "4px 0 0",
    fontSize: 12,
    color: "#94a3b8",
  },
  iconBtn: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#e2e8f0",
    width: 34,
    height: 34,
    borderRadius: 12,
    cursor: "pointer",
    fontSize: 20,
    lineHeight: 1,
  },
  messages: {
    padding: 12,
    overflowY: "auto",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  hint: {
    margin: 0,
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 1.5,
  },
  msgRow: {
    display: "flex",
    width: "100%",
  },
  bubble: {
    maxWidth: "88%",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
  },
  bubbleUser: {
    background: "linear-gradient(135deg, rgba(99,102,241,0.35), rgba(139,92,246,0.25))",
    borderColor: "rgba(99,102,241,0.35)",
  },
  bubbleAi: {
    background: "rgba(255,255,255,0.04)",
  },
  bubbleError: {
    borderColor: "rgba(248,113,113,0.45)",
    background: "rgba(248,113,113,0.08)",
  },
  bubbleText: {
    margin: 0,
    color: "#e2e8f0",
    fontSize: 14,
    lineHeight: 1.55,
    whiteSpace: "pre-wrap",
  },
  meta: {
    margin: "8px 0 0",
    fontSize: 11,
    color: "#64748b",
  },
  caret: {
    display: "inline-block",
    width: 8,
    height: 1,
    marginLeft: 2,
    borderBottom: "2px solid #a5b4fc",
    animation: "ai-caret 1s steps(1) infinite",
  },
  composer: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 8,
    padding: 12,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    alignItems: "end",
  },
  textarea: {
    width: "100%",
    resize: "none",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(10,10,15,0.75)",
    color: "#e2e8f0",
    font: "inherit",
    padding: "10px 12px",
    outline: "none",
  },
  sendBtn: {
    border: "none",
    borderRadius: 14,
    padding: "12px 14px",
    fontWeight: 800,
    color: "#fff",
    cursor: "pointer",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    boxShadow: "0 12px 30px rgba(99,102,241,0.35)",
    minWidth: 110,
  },
};

if (typeof document !== "undefined" && !document.getElementById("ai-chat-keyframes")) {
  const s = document.createElement("style");
  s.id = "ai-chat-keyframes";
  s.textContent = `@keyframes ai-caret { 50% { opacity: 0; } }`;
  document.head.appendChild(s);
}
