import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import ru from "@/i18n/locales/ru.json";
import en from "@/i18n/locales/en.json";

function pdfCopy(locale) {
  return (locale === "en" ? en : ru).pdfPreview;
}

/**
 * Превью PDF в «листе» с 3D-flip при появлении.
 *
 * @param {object} props
 * @param {string | null} props.src — blob: URL, object URL или публичный URL PDF
 * @param {boolean} [props.loading]
 * @param {string} [props.title]
 * @param {Blob | null} [props.blob] — если передан, внутри создаётся object URL (с revoke на unmount)
 * @param {string} [props.locale] — "ru" | "en"
 */
export default function PDFPreview({ src = null, loading = false, title, blob = null, locale = "ru" }) {
  const copy = useMemo(() => pdfCopy(locale), [locale]);
  const displayTitle = title ?? copy.defaultTitle;
  const reduceMotion = useReducedMotion();
  const [internalUrl, setInternalUrl] = useState(null);

  useEffect(() => {
    if (!blob) {
      setInternalUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setInternalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const effectiveSrc = useMemo(() => src || internalUrl, [src, internalUrl]);

  const shellTransition = reduceMotion
    ? { duration: 0.2 }
    : { type: "spring", stiffness: 120, damping: 18, mass: 0.85 };

  const shellInitial = reduceMotion
    ? { opacity: 0, y: 12 }
    : { opacity: 0, rotateY: -78, rotateX: 8, y: 28, scale: 0.94 };

  const shellAnimate = reduceMotion
    ? { opacity: 1, y: 0 }
    : { opacity: 1, rotateY: 0, rotateX: 0, y: 0, scale: 1 };

  return (
    <div style={styles.wrap}>
      <div style={styles.perspective}>
        <motion.div
          style={styles.shell}
          initial={shellInitial}
          animate={shellAnimate}
          transition={shellTransition}
        >
          <div style={styles.rim}>
            <div style={styles.glow} aria-hidden />
            <div style={styles.header}>
              <span style={styles.dot} />
              <span style={styles.dot} />
              <span style={styles.dot} />
              <span style={styles.headerTitle}>{title}</span>
            </div>
            <div style={styles.body}>
              {loading && (
                <div style={styles.state}>
                  <div style={styles.spinner} aria-hidden />
                  <p style={styles.stateText}>{copy.loading}</p>
                </div>
              )}
              {!loading && effectiveSrc && (
                <iframe title={displayTitle} src={effectiveSrc} style={styles.iframe} />
              )}
              {!loading && !effectiveSrc && (
                <div style={styles.state}>
                  <div style={styles.illustration} aria-hidden>
                    <svg width="120" height="140" viewBox="0 0 120 140" fill="none">
                      <path
                        d="M12 16h72l24 24v88a8 8 0 0 1-8 8H12a8 8 0 0 1-8-8V24a8 8 0 0 1 8-8Z"
                        stroke="url(#g)"
                        strokeWidth="2.5"
                      />
                      <path d="M84 16v24h24" stroke="url(#g)" strokeWidth="2.5" />
                      <path d="M24 56h48M24 72h64M24 88h52" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
                      <defs>
                        <linearGradient id="g" x1="10" y1="10" x2="110" y2="120" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#6366f1" />
                          <stop offset="1" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <p style={styles.stateText}>{copy.empty}</p>
                  <p style={styles.stateHint}>{copy.hint}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    width: "100%",
    maxWidth: 920,
    margin: "0 auto",
  },
  perspective: {
    perspective: 1400,
    perspectiveOrigin: "50% 40%",
  },
  shell: {
    transformStyle: "preserve-3d",
    willChange: "transform",
  },
  rim: {
    position: "relative",
    borderRadius: 20,
    padding: 1,
    background: "linear-gradient(135deg, rgba(99,102,241,0.55), rgba(139,92,246,0.35), rgba(255,255,255,0.08))",
    boxShadow:
      "0 0 0 1px rgba(99,102,241,0.25), 0 30px 80px rgba(0,0,0,0.55), 0 0 60px rgba(99,102,241,0.12)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
  },
  glow: {
    position: "absolute",
    inset: -40,
    background: "radial-gradient(circle at 30% 20%, rgba(99,102,241,0.35), transparent 55%)",
    filter: "blur(24px)",
    opacity: 0.9,
    pointerEvents: "none",
    zIndex: 0,
  },
  header: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "linear-gradient(180deg, rgba(18,18,26,0.95), rgba(12,12,18,0.75))",
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.18)",
  },
  headerTitle: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#cbd5e1",
  },
  body: {
    position: "relative",
    zIndex: 1,
    height: minHeight(),
    borderBottomLeftRadius: 19,
    borderBottomRightRadius: 19,
    overflow: "hidden",
    background: "rgba(10,10,15,0.92)",
  },
  iframe: {
    border: "none",
    width: "100%",
    height: "100%",
    background: "#111",
  },
  state: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    textAlign: "center",
  },
  stateText: {
    margin: 0,
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: 700,
  },
  stateHint: {
    margin: 0,
    color: "#94a3b8",
    fontSize: 13,
  },
  spinner: {
    width: 42,
    height: 42,
    borderRadius: 999,
    border: "3px solid rgba(255,255,255,0.12)",
    borderTopColor: "#6366f1",
    animation: "pdf-spin 0.9s linear infinite",
  },
  illustration: {
    opacity: 0.95,
  },
};

function minHeight() {
  return "min(72vh, 640px)";
}

// keyframes for spinner — inject once
if (typeof document !== "undefined" && !document.getElementById("pdf-preview-keyframes")) {
  const style = document.createElement("style");
  style.id = "pdf-preview-keyframes";
  style.textContent = `@keyframes pdf-spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}
