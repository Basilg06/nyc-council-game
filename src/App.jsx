import { useState, useEffect, useRef } from "react";
import { SCENES } from "./data/scenes";
import { initialState } from "./gameState";
import { CHARACTERS } from "./data/characters";
import TopBar from "./components/TopBar";
import DistrictMap from "./components/DistrictMap";
import SeatArc from "./components/SeatArc";
import Legend from "./components/Legend";
import CaseFile from "./components/CaseFile";
import SceneView from "./components/SceneView";
import styles from "./styles";

function useDrag() {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  function onMouseDown(e) {
    e.preventDefault();
    const rect = ref.current.getBoundingClientRect();
    const parentRect = ref.current.offsetParent.getBoundingClientRect();
    const origin = { mx: e.clientX, my: e.clientY, px: rect.left - parentRect.left, py: rect.top - parentRect.top };
    function onMove(e) { setPos({ x: origin.px + e.clientX - origin.mx, y: origin.py + e.clientY - origin.my }); }
    function onUp() { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }
  return { pos, ref, onMouseDown };
}

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

const SAVE_KEY = "cg_save";

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function App() {
  const saved = loadSave();
  const [state, setState] = useState(saved ? { ...initialState, ...saved.state } : initialState);
  const [sceneId, setSceneId] = useState(saved?.sceneId ?? "intro");
  const isMobile = useIsMobile();

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ state, sceneId })); } catch {}
  }, [state, sceneId]);

  function goTo(id, effect) {
    if (effect) setState((prev) => { const next = structuredClone(prev); effect(next); return next; });
    setSceneId(id);
  }

  function updateState(effect) {
    setState((prev) => { const next = structuredClone(prev); effect(next); return next; });
  }

  function newGame() {
    localStorage.removeItem(SAVE_KEY);
    setState(initialState);
    setSceneId("intro");
  }

  const scene = SCENES[sceneId];
  const isChamber = scene?.type === "chamber_action";
  const isTimePass = scene?.type === "time_pass";
  const isHub = scene?.type === "hub";
  const isPhoneCall = scene?.type === "phone_call";

  const majorityCount = state.council.filter(
    (m) => !["republican", "farRight"].includes(m.faction)
  ).length;
  const minorityCount = state.council.length - majorityCount;

  return (
    <div style={styles.appShell}>
      <TopBar month={state.monthLabel} monthNum={state.month} onNewGame={newGame} />

      <div style={styles.mapStage}>
        <DistrictMap council={state.council} />

        {!isMobile && (
          <div style={styles.seatArcWidget}>
            <div style={styles.seatArcWidgetHeader}>NYC COUNCIL — 51 SEATS</div>
            <SeatArc council={state.council} highlightKey={null} />
          </div>
        )}

        {!isMobile && (
          <div style={styles.legendOverlay}>
            <Legend majority={majorityCount} minority={minorityCount} />
          </div>
        )}

        <div style={{ ...styles.caseFileOverlay, width: isMobile ? "min(220px, calc(100vw - 32px))" : 260 }}>
          <CaseFile state={state} />
        </div>

        {isChamber && (
          <ChamberActionBar scene={scene} goTo={goTo} isMobile={isMobile} />
        )}

        {isTimePass && (
          <TimePassOverlay scene={scene} goTo={goTo} updateState={updateState} />
        )}

        {isHub && (
          <HubMapOverlay scene={scene} goTo={goTo} updateState={updateState} isMobile={isMobile} />
        )}

        {isPhoneCall && (
          <PhoneCallPanel key={sceneId} scene={scene} state={state} goTo={goTo} updateState={updateState} isMobile={isMobile} />
        )}
      </div>

      {!isChamber && !isTimePass && !isHub && !isPhoneCall && (
        <div style={styles.sceneOverlay}>
          <div style={styles.sceneOverlayInner}>
            <SceneView state={state} sceneId={sceneId} goTo={goTo} updateState={updateState} />
          </div>
        </div>
      )}

    </div>
  );
}

function TimePassOverlay({ scene, goTo, updateState }) {
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const months = scene.months;
  const done = idx >= months.length;

  const MONTH_NUMS = { January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12 };

  useEffect(() => {
    if (!started || done) return;
    const m = months[idx];
    if (MONTH_NUMS[m]) updateState((s) => { s.month = MONTH_NUMS[m]; s.monthLabel = m; });
  }, [idx, started]);

  useEffect(() => {
    if (!started) return;
    if (done) {
      const t = setTimeout(() => {
        if (scene.nextEffect) updateState(scene.nextEffect);
        goTo(scene.next);
      }, 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIdx((i) => i + 1), 700);
    return () => clearTimeout(t);
  }, [idx, done, started]);

  function advance() {
    setStarted(true);
  }

  function skip() {
    if (scene.nextEffect) updateState(scene.nextEffect);
    goTo(scene.next);
  }

  const current = months[Math.min(idx, months.length - 1)];

  if (!started) {
    return (
      <div style={{
        position: "absolute", top: "50%", left: 18,
        transform: "translateY(-50%)",
        width: 270, zIndex: 20,
        background: "rgba(5,8,14,0.94)", border: "1px solid #1E3050", borderRadius: 4,
        padding: "26px 22px",
        display: "flex", flexDirection: "column", gap: 16,
        userSelect: "none",
      }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#4A7FA5", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          {scene.year}
        </div>
        <button onClick={advance} style={{
          fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700,
          background: "#1C3050", color: "#7BBFE8",
          border: "1px solid #2E5080", borderRadius: 3,
          padding: "11px 14px", cursor: "pointer", letterSpacing: "0.1em", width: "100%",
        }}>
          ADVANCE TIME →
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={skip}
      style={{
        position: "absolute", inset: 0, zIndex: 20,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "rgba(5, 8, 14, 0.55)",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 10, color: "#4A7FA5",
        letterSpacing: "0.25em", textTransform: "uppercase",
        marginBottom: 10, opacity: 0.8,
      }}>
        {scene.year}
      </div>
      <div style={{
        fontSize: 36, fontWeight: 700,
        color: "#E8E4D8", letterSpacing: "0.04em",
        transition: "opacity 0.3s",
        opacity: done ? 0 : 1,
      }}>
        {current}
      </div>
      <div style={{
        marginTop: 32, fontFamily: "'Space Mono', monospace",
        fontSize: 9, color: "#444", letterSpacing: "0.15em",
      }}>
        click to skip
      </div>
    </div>
  );
}

function HubMapOverlay({ scene, goTo, updateState, isMobile }) {
  const [taken, setTaken] = useState([]);
  const [pending, setPending] = useState(null);
  const infoDrag = useDrag();
  const confirmDrag = useDrag();
  const slotsLeft = scene.maxActions - taken.length;
  const pinR = isMobile ? 20 : 14;
  const dotR = isMobile ? 6 : 4;
  const pulseR = isMobile ? 32 : 24;

  function confirm() {
    if (!pending) return;
    updateState(pending.effect);
    setTaken((t) => [...t, pending.id]);
    setPending(null);
  }

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 15, pointerEvents: "none" }}>
      {/* dim + pins — same viewBox as DistrictMap so coords align */}
      <svg
        viewBox="0 0 900 900"
        preserveAspectRatio="xMidYMid meet"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <rect width="900" height="900" fill="rgba(5,8,14,0.42)" />

        {scene.actions.map((action) => {
          const done = taken.includes(action.id);
          const blocked = !done && slotsLeft === 0;
          const isPending = pending?.id === action.id;
          const { x, y, name } = action.location;
          const ringColor = done ? "#6A9A50" : isPending ? "#90D0F0" : blocked ? "#333" : "#4A9FD4";
          const fillColor = done ? "#142810" : isPending ? "#0D253D" : blocked ? "#111" : "#0A1828";

          return (
            <g
              key={action.id}
              onClick={() => !done && !blocked && setPending(action)}

              style={{ cursor: done || blocked ? "default" : "pointer", pointerEvents: "all" }}
            >
              {isPending && (
                <circle cx={x} cy={y} r={pulseR} fill="none" stroke="#4A9FD4" strokeWidth={1.5} opacity={0.5} />
              )}
              <circle cx={x} cy={y} r={pinR} fill={fillColor} stroke={ringColor} strokeWidth={2.5} />
              {done ? (
                <text x={x} y={y + 5} textAnchor="middle" fontSize="11" fill="#6A9A50" fontWeight="bold" style={{ pointerEvents: "none" }}>✓</text>
              ) : (
                <circle cx={x} cy={y} r={dotR} fill={ringColor} opacity={blocked ? 0.25 : 0.85} style={{ pointerEvents: "none" }} />
              )}
              <text x={x} y={y + 30} textAnchor="middle" fontSize="9" fill={ringColor}
                    fontFamily="'Space Mono', monospace" letterSpacing="0.04em" style={{ pointerEvents: "none" }}>
                {name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Confirmation popup */}
      {pending && (
        <div
          ref={confirmDrag.ref}
          style={confirmDrag.pos ? {
            position: "absolute", left: confirmDrag.pos.x, top: confirmDrag.pos.y, zIndex: 20,
            background: "#0A1422", border: "1px solid #2E5080", borderRadius: 4,
            width: 300, boxShadow: "0 6px 40px rgba(0,0,0,0.7)", pointerEvents: "auto",
          } : {
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 20,
            background: "#0A1422", border: "1px solid #2E5080", borderRadius: 4,
            width: 300, boxShadow: "0 6px 40px rgba(0,0,0,0.7)", pointerEvents: "auto",
          }}
        >
            <div onMouseDown={confirmDrag.onMouseDown} style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 8.5, color: "#4A7FA5",
              letterSpacing: "0.18em", textTransform: "uppercase",
              padding: "14px 22px 0",
              cursor: "grab", userSelect: "none",
            }}>
              {pending.location.name}
            </div>
            <div style={{ padding: "10px 22px 22px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E4D8", marginBottom: 10, lineHeight: 1.3 }}>
                {pending.label}
              </div>
              <div style={{ fontSize: 12, color: "#887870", lineHeight: 1.55, marginBottom: 20 }}>
                {pending.description}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={confirm} style={{ flex: 1, fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700, background: "#162A14", color: "#8DB87A", border: "1px solid #2A4A28", padding: "9px 0", borderRadius: 3, cursor: "pointer", letterSpacing: "0.08em" }}>
                  Confirm →
                </button>
                <button onClick={() => setPending(null)} style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, background: "transparent", color: "#555", border: "1px solid #1E1E1E", padding: "9px 16px", borderRadius: 3, cursor: "pointer" }}>
                  ✕
                </button>
              </div>
            </div>
        </div>
      )}

      {/* Info panel — left on desktop, bottom on mobile */}
      <div ref={infoDrag.ref} style={isMobile ? {
        position: "absolute", bottom: 16, left: 16, right: 16,
        zIndex: 16, pointerEvents: "auto",
        background: "rgba(5,8,14,0.92)", border: "1px solid #1E3050", borderRadius: 4,
        padding: "14px 16px",
        display: "flex", flexDirection: "row", alignItems: "center", gap: 12,
      } : infoDrag.pos ? {
        position: "absolute", left: infoDrag.pos.x, top: infoDrag.pos.y,
        width: 210, zIndex: 16, pointerEvents: "auto",
        background: "rgba(5,8,14,0.88)", border: "1px solid #1E3050", borderRadius: 4,
        padding: "20px 18px",
        display: "flex", flexDirection: "column", gap: 14,
      } : {
        position: "absolute", top: "50%", left: 18,
        transform: "translateY(-50%)",
        width: 210, zIndex: 16, pointerEvents: "auto",
        background: "rgba(5,8,14,0.88)", border: "1px solid #1E3050", borderRadius: 4,
        padding: "20px 18px",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        {!isMobile && (
          <div>
            <div onMouseDown={infoDrag.onMouseDown} style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 8, color: "#4A7FA5",
              letterSpacing: "0.18em", textTransform: "uppercase",
              marginBottom: 7, cursor: "grab", userSelect: "none",
            }}>
              CITY HALL
            </div>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 8, color: "#2E5080",
              letterSpacing: "0.12em", textTransform: "uppercase",
              marginBottom: 10,
            }}>
              {scene.month}
            </div>
            <div style={{ fontSize: 12, color: "#A09888", lineHeight: 1.55 }}>
              {scene.headline}
            </div>
          </div>
        )}
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 9,
          color: slotsLeft > 0 ? "#8DB87A" : "#3A3A3A",
          letterSpacing: "0.06em",
          ...(isMobile ? { flex: 1 } : { borderTop: "1px solid #181E28", paddingTop: 12 }),
        }}>
          {isMobile
            ? (slotsLeft > 0 ? `${slotsLeft} stop${slotsLeft !== 1 ? "s" : ""} left` : "Ready")
            : (slotsLeft > 0 ? `${slotsLeft} stop${slotsLeft !== 1 ? "s" : ""} remaining` : "All stops taken")}
        </div>
        <button
          onClick={() => slotsLeft === 0 && goTo(scene.next, scene.nextEffect ?? null)}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10, fontWeight: 700,
            background: slotsLeft > 0 ? "#101820" : "#1C3050",
            color: slotsLeft > 0 ? "#2A4A5A" : "#7BBFE8",
            border: `1px solid ${slotsLeft > 0 ? "#1A2A35" : "#2E5080"}`,
            padding: "9px 14px", borderRadius: 3,
            cursor: slotsLeft > 0 ? "not-allowed" : "pointer",
            letterSpacing: "0.1em",
            whiteSpace: "nowrap",
            ...(isMobile ? {} : { width: "100%" }),
          }}
        >
          {slotsLeft > 0 ? `${slotsLeft} stop${slotsLeft !== 1 ? "s" : ""} remaining` : `${scene.nextLabel} →`}
        </button>
      </div>
    </div>
  );
}

function ChamberActionBar({ scene, goTo, isMobile }) {
  const { pos, ref, onMouseDown } = useDrag();
  const base = { background: "rgba(5,8,14,0.94)", border: "1px solid #1E3050", borderRadius: 4 };
  return (
    <div ref={ref} style={isMobile ? {
      position: "absolute", bottom: 16, left: 16, right: 16,
      zIndex: 16, ...base,
      padding: "14px 16px",
      display: "flex", flexDirection: "row", alignItems: "center", gap: 12,
    } : pos ? {
      position: "absolute", left: pos.x, top: pos.y,
      width: 270, zIndex: 16, ...base,
      padding: "26px 22px",
      display: "flex", flexDirection: "column", gap: 16,
    } : {
      position: "absolute", top: "50%", left: 18,
      transform: "translateY(-50%)",
      width: 270, zIndex: 16, ...base,
      padding: "26px 22px",
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      {!isMobile && (
        <div onMouseDown={onMouseDown} style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 9, color: "#4A7FA5",
          letterSpacing: "0.2em", textTransform: "uppercase",
          marginBottom: 2, cursor: "grab", userSelect: "none",
        }}>
          IN SESSION
        </div>
      )}
      <div style={{ fontSize: 15, color: "#C8C0A8", lineHeight: 1.65, flex: isMobile ? 1 : undefined }}>
        {scene.prompt}
      </div>
      <button
        onClick={() => goTo(scene.next, scene.effect)}
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10, fontWeight: 700,
          background: "#1C3050", color: "#7BBFE8",
          border: "1px solid #2E5080",
          padding: "11px 14px", borderRadius: 3,
          cursor: "pointer", letterSpacing: "0.1em",
          whiteSpace: "nowrap",
          ...(isMobile ? {} : { width: "100%" }),
        }}
      >
        {scene.buttonText} →
      </button>
    </div>
  );
}

function PhoneCallPanel({ scene, state, goTo, updateState, isMobile }) {
  const [visible, setVisible] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [history, setHistory] = useState([]);
  const [turnIdx, setTurnIdx] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [responseVisible, setResponseVisible] = useState(false);
  const { pos, ref: panelRef, onMouseDown: onHeaderMouseDown } = useDrag();
  const scrollRef = useRef(null);
  const c = CHARACTERS[scene.speaker];

  const turns = scene.turns || [{ lines: scene.lines, choices: scene.choices }];
  const turn = turns[turnIdx];
  const choices = (turn.choices || []).filter((ch) => !ch.show || ch.show(state));
  const [choicesReady, setChoicesReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!answered) return;
    setChoicesReady(false);
    const t = setTimeout(() => setChoicesReady(true), turn.lines.length * 1200 + 600);
    return () => clearTimeout(t);
  }, [turnIdx, answered]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, chosen, turnIdx]);

  function pick(ch) {
    if (ch.effect) updateState(ch.effect);
    setChosen(ch);
    setResponseVisible(false);
    setTimeout(() => setResponseVisible(true), 500);
    if (!ch.next) {
      setTimeout(() => {
        setHistory((h) => [...h, { lines: turn.lines, response: ch.text }]);
        setTurnIdx((t) => t + 1);
        setChosen(null);
        setResponseVisible(false);
      }, 1600);
    }
  }

  if (!visible) return null;

  const baseStyle = { background: "rgba(5,8,14,0.96)", border: "1px solid #1E3050", borderRadius: 4 };
  const ringingStyle = isMobile ? {
    position: "absolute", bottom: 16, left: 16, right: 16, zIndex: 16, ...baseStyle,
  } : pos ? {
    position: "absolute", left: pos.x, top: pos.y, width: 270, zIndex: 16, ...baseStyle,
  } : {
    position: "absolute", top: "50%", left: 18, transform: "translateY(-50%)",
    width: 270, zIndex: 16, ...baseStyle,
  };
  const answeredBase = { ...baseStyle, display: "flex", flexDirection: "column", height: 620 };
  const answeredStyle = isMobile ? {
    position: "absolute", bottom: 16, left: 16, right: 16, zIndex: 16, ...answeredBase,
  } : pos ? {
    position: "absolute", left: pos.x, top: pos.y, width: 640, zIndex: 16, ...answeredBase,
  } : {
    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
    width: 640, zIndex: 16, ...answeredBase,
  };

  if (!answered) {
    return (
      <div ref={panelRef} style={ringingStyle}>
        <style>{`@keyframes cfPulse{0%,100%{opacity:1}50%{opacity:0.2}} @keyframes cfRing{0%,100%{transform:scale(1)}40%,60%{transform:scale(1.06)}}`}</style>
        <div onMouseDown={onHeaderMouseDown} style={{ borderTop: `3px solid ${c.color}`, borderRadius: "4px 4px 0 0", cursor: "grab", height: 6 }} />
        <div style={{ padding: "26px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          {c.avatar ? (
            <img src={c.avatar} alt="" style={{ width: 72, height: 72, imageRendering: "pixelated", borderRadius: 3, animation: "cfRing 1.6s ease-in-out infinite" }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 3, background: c.color, opacity: 0.2, animation: "cfRing 1.6s ease-in-out infinite" }} />
          )}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#E8E4D8", marginBottom: 6 }}>{c.name}</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: c.color, opacity: 0.8, letterSpacing: "0.12em", textTransform: "uppercase" }}>{c.role}</div>
          </div>
          <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 4 }}>
            <button onClick={() => setAnswered(true)} style={{ flex: 1, fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, background: "#1C4A2E", color: "#6DBF8A", border: "1px solid #2A6A40", padding: "13px 0", borderRadius: 3, cursor: "pointer", letterSpacing: "0.12em" }}>
              ANSWER
            </button>
            {scene.decline && (
              <button onClick={() => goTo(scene.decline.next, scene.decline.effect)} style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, background: "transparent", color: "#6A3030", border: "1px solid #3A1E1E", padding: "13px 18px", borderRadius: 3, cursor: "pointer", letterSpacing: "0.12em" }}>
                DECLINE
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={panelRef} style={answeredStyle}>
      <style>{`@keyframes fadeSlideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} .cf-scroll::-webkit-scrollbar{width:4px} .cf-scroll::-webkit-scrollbar-track{background:transparent} .cf-scroll::-webkit-scrollbar-thumb{background:#1E3050;border-radius:2px} .cf-scroll{scrollbar-width:thin;scrollbar-color:#1E3050 transparent}`}</style>
      <div onMouseDown={onHeaderMouseDown} style={{ background: "#050810", borderBottom: "1px solid #1A2535", borderLeft: `3px solid ${c.color}`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderRadius: "4px 4px 0 0", cursor: "grab", userSelect: "none" }}>
        {c.avatar && <img src={c.avatar} alt="" style={{ width: 32, height: 32, imageRendering: "pixelated", borderRadius: 2, flexShrink: 0 }} />}
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#E8E4D8" }}>{c.name}</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: c.color, opacity: 0.7, letterSpacing: "0.14em" }}>IN CALL</div>
      </div>

      <div ref={scrollRef} className="cf-scroll" style={{ padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 8, flex: 1, overflowY: "auto" }}>
        {/* past turns */}
        {history.map((h, hi) => (
          <div key={hi}>
            {h.lines.map((l, li) => (
              <div key={li} style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 8 }}>
                {li === 0 && c.avatar ? <img src={c.avatar} alt="" style={{ width: 24, height: 24, imageRendering: "pixelated", borderRadius: 2, flexShrink: 0 }} /> : <div style={{ width: 24, flexShrink: 0 }} />}
                <div style={{ background: "#0E1520", border: "1px solid #1A2535", borderRadius: "2px 8px 8px 8px", padding: "10px 14px", fontSize: 15, color: "#C8C2B4", lineHeight: 1.6 }}>{typeof l === "function" ? l(state) : l}</div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <div style={{ background: "#142038", border: "1px solid #1E3A5A", borderRadius: "8px 2px 8px 8px", padding: "10px 14px", fontSize: 15, color: "#7BBFE8", lineHeight: 1.6, maxWidth: "85%" }}>{h.response}</div>
            </div>
          </div>
        ))}

        {/* current turn caller lines */}
        {turn.lines.map((l, i) => (
          <div key={`${turnIdx}-${i}`} style={{ display: "flex", alignItems: "flex-end", gap: 8, animation: "fadeSlideUp 0.5s ease both", animationDelay: `${i * 1200}ms` }}>
            {i === 0 && c.avatar ? <img src={c.avatar} alt="" style={{ width: 24, height: 24, imageRendering: "pixelated", borderRadius: 2, flexShrink: 0 }} /> : <div style={{ width: 24, flexShrink: 0 }} />}
            <div style={{ background: "#0E1520", border: "1px solid #1A2535", borderRadius: "2px 8px 8px 8px", padding: "10px 14px", fontSize: 15, color: "#C8C2B4", lineHeight: 1.6 }}>{typeof l === "function" ? l(state) : l}</div>
          </div>
        ))}

        {/* chosen response for current turn */}
        {chosen && responseVisible && (
          <div style={{ display: "flex", justifyContent: "flex-end", animation: "fadeSlideUp 0.3s ease both" }}>
            <div style={{ background: "#142038", border: "1px solid #1E3A5A", borderRadius: "8px 2px 8px 8px", padding: "10px 14px", fontSize: 15, color: "#7BBFE8", lineHeight: 1.6, maxWidth: "85%" }}>{chosen.text}</div>
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0, minHeight: 160, padding: "4px 14px 14px", display: "flex", flexDirection: "column", gap: 8, justifyContent: "flex-end" }}>
        {choicesReady && !chosen && choices.map((ch, i) => (
          <button key={i} onClick={() => pick(ch)} style={{ textAlign: "left", fontFamily: "'Lora', Georgia, serif", fontSize: 14, color: "#A09888", background: "#0C1219", border: "1px solid #1A2535", borderRadius: 3, padding: "10px 14px", cursor: "pointer", lineHeight: 1.55, animation: "fadeSlideUp 0.5s ease both", animationDelay: `${i * 120}ms` }}>
            <span style={{ color: "#3A5A7A", marginRight: 8, fontFamily: "'Space Mono', monospace", fontSize: 11 }}>§</span>{ch.text}
          </button>
        ))}
        {chosen && chosen.next && (
          <button onClick={() => goTo(chosen.next, chosen.effect)} style={{ width: "100%", fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700, background: "#1C3050", color: "#7BBFE8", border: "1px solid #2E5080", padding: "11px 0", borderRadius: 3, cursor: "pointer", letterSpacing: "0.1em" }}>
            CONTINUE →
          </button>
        )}
      </div>
    </div>
  );
}
