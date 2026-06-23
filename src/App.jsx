import { useState, useEffect } from "react";
import { SCENES } from "./data/scenes";
import { initialState } from "./gameState";
import TopBar from "./components/TopBar";
import DistrictMap from "./components/DistrictMap";
import SeatArc from "./components/SeatArc";
import Legend from "./components/Legend";
import CaseFile from "./components/CaseFile";
import SceneView from "./components/SceneView";
import styles from "./styles";

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

export default function App() {
  const [state, setState] = useState(initialState);
  const [sceneId, setSceneId] = useState("intro");
  const isMobile = useIsMobile();

  function goTo(id, effect) {
    if (effect) setState((prev) => { const next = structuredClone(prev); effect(next); return next; });
    setSceneId(id);
  }

  function updateState(effect) {
    setState((prev) => { const next = structuredClone(prev); effect(next); return next; });
  }

  const scene = SCENES[sceneId];
  const isChamber = scene?.type === "chamber_action";
  const isTimePass = scene?.type === "time_pass";
  const isHub = scene?.type === "hub";

  const majorityCount = state.council.filter(
    (m) => !["republican", "farRight"].includes(m.faction)
  ).length;
  const minorityCount = state.council.length - majorityCount;

  return (
    <div style={styles.appShell}>
      <TopBar month={state.monthLabel} monthNum={state.month} />

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
      </div>

      {!isChamber && !isTimePass && !isHub && (
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
  const [idx, setIdx] = useState(0);
  const months = scene.months;
  const done = idx >= months.length;

  useEffect(() => {
    setIdx(0);
  }, [scene]);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => {
        if (scene.nextEffect) updateState(scene.nextEffect);
        goTo(scene.next);
      }, 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIdx((i) => i + 1), 700);
    return () => clearTimeout(t);
  }, [idx, done]);

  function skip() {
    if (scene.nextEffect) updateState(scene.nextEffect);
    goTo(scene.next);
  }

  const current = months[Math.min(idx, months.length - 1)];

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
        fontFamily: "'JetBrains Mono', monospace",
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
        marginTop: 32, fontFamily: "'JetBrains Mono', monospace",
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
    <div style={{ position: "absolute", inset: 0, zIndex: 15 }}>
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
              onClick={() => !done && !blocked && !pending && setPending(action)}
              style={{ cursor: done || blocked || pending ? "default" : "pointer", pointerEvents: "all" }}
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
                    fontFamily="'JetBrains Mono', monospace" letterSpacing="0.04em" style={{ pointerEvents: "none" }}>
                {name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Confirmation popup */}
      {pending && (
        <div
          onClick={() => setPending(null)}
          style={{
            position: "absolute", inset: 0, zIndex: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0A1422",
              border: "1px solid #2E5080",
              borderRadius: 4,
              padding: "22px 26px",
              maxWidth: 340, width: "88%",
              boxShadow: "0 6px 40px rgba(0,0,0,0.7)",
            }}
          >
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8.5, color: "#4A7FA5",
              letterSpacing: "0.18em", textTransform: "uppercase",
              marginBottom: 8,
            }}>
              {pending.location.name}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E4D8", marginBottom: 10, lineHeight: 1.3 }}>
              {pending.label}
            </div>
            <div style={{ fontSize: 12, color: "#887870", lineHeight: 1.55, marginBottom: 20 }}>
              {pending.description}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={confirm}
                style={{
                  flex: 1,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
                  background: "#162A14", color: "#8DB87A",
                  border: "1px solid #2A4A28",
                  padding: "9px 0", borderRadius: 3, cursor: "pointer",
                  letterSpacing: "0.08em",
                }}
              >
                Confirm →
              </button>
              <button
                onClick={() => setPending(null)}
                style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  background: "transparent", color: "#555",
                  border: "1px solid #1E1E1E",
                  padding: "9px 16px", borderRadius: 3, cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info panel — left on desktop, bottom on mobile */}
      <div style={isMobile ? {
        position: "absolute", bottom: 16, left: 16, right: 16,
        zIndex: 16,
        background: "rgba(5,8,14,0.92)",
        border: "1px solid #1E3050",
        borderRadius: 4,
        padding: "14px 16px",
        display: "flex", flexDirection: "row", alignItems: "center", gap: 12,
      } : {
        position: "absolute", top: "50%", left: 18,
        transform: "translateY(-50%)",
        width: 210, zIndex: 16,
        background: "rgba(5,8,14,0.88)",
        border: "1px solid #1E3050",
        borderRadius: 4,
        padding: "20px 18px",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        {!isMobile && (
          <div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8, color: "#4A7FA5",
              letterSpacing: "0.18em", textTransform: "uppercase",
              marginBottom: 7,
            }}>
              CITY HALL
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
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
          fontFamily: "'JetBrains Mono', monospace",
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
            fontFamily: "'JetBrains Mono', monospace",
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
  return (
    <div style={isMobile ? {
      position: "absolute", bottom: 16, left: 16, right: 16,
      zIndex: 16,
      background: "rgba(5,8,14,0.92)",
      border: "1px solid #1E3050",
      borderRadius: 4,
      padding: "14px 16px",
      display: "flex", flexDirection: "row", alignItems: "center", gap: 12,
    } : {
      position: "absolute", top: "50%", left: 18,
      transform: "translateY(-50%)",
      width: 210, zIndex: 16,
      background: "rgba(5,8,14,0.88)",
      border: "1px solid #1E3050",
      borderRadius: 4,
      padding: "20px 18px",
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      {!isMobile && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8, color: "#4A7FA5",
          letterSpacing: "0.18em", textTransform: "uppercase",
          marginBottom: 4,
        }}>
          IN SESSION
        </div>
      )}
      <div style={{ fontSize: 12, color: "#A09888", lineHeight: 1.55, flex: isMobile ? 1 : undefined }}>
        {scene.prompt}
      </div>
      <button
        onClick={() => goTo(scene.next, scene.effect)}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700,
          background: "#1C3050", color: "#7BBFE8",
          border: "1px solid #2E5080",
          padding: "9px 14px", borderRadius: 3,
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
