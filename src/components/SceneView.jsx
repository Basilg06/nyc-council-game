import { useState, useMemo } from "react";
import { CHARACTERS } from "../data/characters";
import { SCENES } from "../data/scenes";
import styles from "../styles";

export default function SceneView({ state, sceneId, goTo, updateState }) {
  const scene = SCENES[sceneId];
  if (!scene) {
    return (
      <div style={styles.sceneCard}>
        <div style={{ padding: 28, fontStyle: "italic", color: "#888" }}>— End of demo build —</div>
      </div>
    );
  }
  if (scene.type === "negotiation") {
    return <NegotiationScene scene={scene} state={state} goTo={goTo} />;
  }
  if (scene.type === "whip_vote") {
    return <WhipScene scene={scene} state={state} goTo={goTo} updateState={updateState} />;
  }
  if (scene.type === "budget_round") {
    return <BudgetRoundScene scene={scene} state={state} goTo={goTo} />;
  }
  if (scene.type === "hub") {
    return <HubScene scene={scene} state={state} goTo={goTo} updateState={updateState} />;
  }
  if (scene.type === "phone_call") {
    return <PhoneCallScene key={sceneId} scene={scene} state={state} goTo={goTo} />;
  }
  return <DialogueScene scene={scene} state={state} goTo={goTo} />;
}

function PhoneCallScene({ scene, state, goTo }) {
  const [answered, setAnswered] = useState(false);
  const c = CHARACTERS[scene.speaker];
  const choices = (scene.choices || []).filter((ch) => !ch.show || ch.show(state));

  if (!answered) {
    return (
      <div style={{
        ...styles.sceneCard, background: "#070B12",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: 340, gap: 0, padding: "40px 28px",
      }}>
        <style>{`@keyframes cfPulse{0%,100%{opacity:1}50%{opacity:0.2}} @keyframes cfRing{0%,100%{transform:scale(1)}40%,60%{transform:scale(1.06)}}`}</style>
        <div style={{ marginBottom: 22 }}>
          {c.avatar ? (
            <img src={c.avatar} alt="" style={{
              width: 88, height: 88, imageRendering: "pixelated",
              borderRadius: 4, display: "block",
              animation: "cfRing 1.6s ease-in-out infinite",
            }} />
          ) : (
            <div style={{
              width: 88, height: 88, borderRadius: 4,
              background: c.color, opacity: 0.25,
              animation: "cfRing 1.6s ease-in-out infinite",
            }} />
          )}
        </div>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 8,
          color: "#4A7FA5", letterSpacing: "0.22em", textTransform: "uppercase",
          marginBottom: 10, display: "flex", alignItems: "center", gap: 7,
        }}>
          <span style={{
            display: "inline-block", width: 6, height: 6, borderRadius: "50%",
            background: "#4A9FD4", animation: "cfPulse 1.4s ease-in-out infinite",
          }} />
          INCOMING CALL
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#E8E4D8", textAlign: "center", marginBottom: 5 }}>{c.name}</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#444", marginBottom: 32 }}>{c.role}</div>
        <button
          onClick={() => setAnswered(true)}
          style={{
            fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700,
            background: "#1C4A2E", color: "#6DBF8A",
            border: "1px solid #2A6A40",
            padding: "11px 40px", borderRadius: 3,
            cursor: "pointer", letterSpacing: "0.14em",
          }}
        >
          ANSWER
        </button>
      </div>
    );
  }

  return <PhoneCallChat c={c} scene={scene} state={state} choices={choices} goTo={goTo} />;
}

function PhoneCallChat({ c, scene, state, choices, goTo }) {
  const [chosen, setChosen] = useState(null);

  function pick(ch) {
    setChosen(ch);
    setTimeout(() => goTo(ch.next, ch.effect), 650);
  }

  return (
    <div style={{ ...styles.sceneCard, background: "#070B12" }}>
      <style>{`@keyframes cfPulse{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>

      {/* Compact header */}
      <div style={{
        background: "#050810", borderBottom: "1px solid #141E2A",
        padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
      }}>
        {c.avatar ? (
          <img src={c.avatar} alt="" style={{ width: 30, height: 30, imageRendering: "pixelated", borderRadius: 2, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#E8E4D8" }}>{c.name}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "'Space Mono', monospace", fontSize: 7.5, color: "#4A7FA5", letterSpacing: "0.14em" }}>
          <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#4A9FD4", animation: "cfPulse 1.4s ease-in-out infinite" }} />
          IN CALL
        </div>
      </div>

      {/* Chat chain */}
      <div style={{ padding: "18px 16px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
        {scene.lines.map((l, i) => {
          const text = typeof l === "function" ? l(state) : l;
          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-end", gap: 9 }}>
              {c.avatar ? (
                i === 0
                  ? <img src={c.avatar} alt="" style={{ width: 28, height: 28, imageRendering: "pixelated", borderRadius: 2, flexShrink: 0 }} />
                  : <div style={{ width: 28, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 28, flexShrink: 0 }} />
              )}
              <div style={{
                background: "#0E1520", border: "1px solid #1A2535",
                borderRadius: "3px 10px 10px 10px",
                padding: "10px 14px", maxWidth: "82%",
                fontSize: 13, color: "#C8C2B4", lineHeight: 1.6,
              }}>
                {text}
              </div>
            </div>
          );
        })}

        {/* Player response bubble */}
        {chosen && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{
              background: "#142038", border: "1px solid #1E3A5A",
              borderRadius: "10px 3px 10px 10px",
              padding: "10px 14px", maxWidth: "78%",
              fontSize: 13, color: "#7BBFE8", lineHeight: 1.6,
            }}>
              {chosen.text}
            </div>
          </div>
        )}
      </div>

      {/* Response options */}
      {!chosen && (
        <div style={{ padding: "8px 16px 20px", display: "flex", flexDirection: "column", gap: 7 }}>
          {choices.map((ch, i) => (
            <button
              key={i}
              onClick={() => pick(ch)}
              style={{
                textAlign: "left", fontFamily: "'Lora', Georgia, serif",
                fontSize: 12.5, color: "#A09888",
                background: "#0C1219", border: "1px solid #1A2535",
                borderRadius: 4, padding: "10px 14px",
                cursor: "pointer", lineHeight: 1.5,
              }}
            >
              <span style={{ color: "#3A5A7A", marginRight: 8, fontFamily: "'Space Mono', monospace", fontSize: 10 }}>§</span>
              {ch.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DialogueScene({ scene, state, goTo }) {
  const c = CHARACTERS[scene.speaker];
  const choices = (scene.choices || []).filter((ch) => !ch.show || ch.show(state));
  return (
    <div style={styles.sceneCard}>
      <div style={{ ...styles.speakerTag, background: c.color }}>
        <div style={styles.speakerName}>{c.name}</div>
        <div style={styles.speakerRole}>{c.role}</div>
      </div>
      <div style={styles.transcriptText}>
        {scene.lines.map((l, i) => {
          const text = typeof l === "function" ? l(state) : l;
          return <p key={i} style={styles.line}>{text}</p>;
        })}
      </div>
      <div style={styles.choiceList}>
        {choices.map((ch, i) => {
            const unavailable = ch.available ? !ch.available(state) : false;
            const isDisabled = !!ch.disabled || unavailable;
            return (
              <button
                key={i}
                disabled={isDisabled}
                title={isDisabled && ch.tooltip ? ch.tooltip : undefined}
                style={{
                  ...styles.choiceBtn,
                  ...(isDisabled ? { opacity: 0.38, cursor: "not-allowed", color: "#888" } : {}),
                }}
                onClick={isDisabled ? undefined : () => goTo(ch.next, ch.effect)}
              >
                <span style={styles.choiceMark}>§</span> {ch.text}
              </button>
            );
          })}
      </div>
    </div>
  );
}

function NegotiationScene({ scene, state, goTo }) {
  const [selected, setSelected] = useState([]);
  const projection = useMemo(() => scene.project(state, selected), [state, selected, scene]);

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function submit() {
    const result = scene.resolve(state, selected);
    goTo(result.next, result.effect);
  }

  const c = CHARACTERS[scene.target];
  const askText = typeof scene.ask === "function" ? scene.ask(state) : scene.ask;

  return (
    <div style={styles.sceneCard}>
      <div style={{ ...styles.speakerTag, background: c.color }}>
        <div style={styles.speakerName}>{c.name}</div>
        <div style={styles.speakerRole}>Negotiation — {scene.title}</div>
      </div>
      <div style={styles.transcriptText}><p style={styles.line}>{askText}</p></div>
      <div style={styles.daisLabel}>ASSEMBLE YOUR OFFER</div>
      <div style={styles.offerTable}>
        {scene.offers.map((o) => {
          const valid = o.available(state);
          const active = selected.includes(o.id);
          return (
            <button
              key={o.id} disabled={!valid} onClick={() => toggle(o.id)}
              style={{
                ...styles.offerChit,
                ...(active ? styles.offerChitActive : {}),
                ...(valid ? {} : styles.offerChitDisabled),
              }}
            >
              <div style={styles.offerChitLabel}>{o.label}</div>
              <div style={styles.offerChitCost}>{o.costLabel}</div>
            </button>
          );
        })}
      </div>
      <div style={styles.projectionBar}>
        <div style={styles.projectionLabel}>PROJECTED REACTION</div>
        <div style={styles.projectionTrack}>
          <div style={{
            ...styles.projectionFill,
            width: `${projection.pct}%`,
            background: projection.pct >= 55 ? "#2D5C3E" : projection.pct >= 35 ? "#C9A227" : "#8B1A1A",
          }} />
        </div>
        <div style={styles.projectionNote}>{projection.note}</div>
      </div>
      <div style={styles.choiceList}>
        <button style={styles.submitBtn} onClick={submit}>PRESENT OFFER →</button>
      </div>
    </div>
  );
}

function WhipScene({ scene, state, goTo, updateState }) {
  const [activeKey, setActiveKey] = useState(null);
  const groupStatus = state.flags.groupStatus || {};

  const committed = scene.groups.reduce((sum, g) => {
    if (g.locked) return sum + g.votes;
    if (groupStatus[g.key] === "won") return sum + g.votes;
    return sum;
  }, 0);

  const isShort = committed < scene.needed;
  const pct = Math.min(100, Math.round((committed / scene.needed) * 100));

  const callNext = scene.callNext || "vote_scene";
  const callEffect = scene.callNext ? undefined : (s) => { s.month = 3; s.monthLabel = "March"; };
  const callBtnLabel = scene.callLabel
    ? `${scene.callLabel} (${committed} committed) →`
    : isShort
      ? `CALL THE VOTE — ${committed}/${scene.needed} (SHORT) →`
      : `CALL THE VOTE — ${committed} COMMITTED →`;
  const callBtnBg = scene.callLabel ? "#1C2B4A" : isShort ? "#8B1A1A" : "#2D5C3E";

  if (activeKey) {
    const group = scene.groups.find((g) => g.key === activeKey);
    return (
      <GroupNeg
        group={group}
        state={state}
        updateState={updateState}
        onBack={() => setActiveKey(null)}
      />
    );
  }

  return (
    <div style={styles.sceneCard}>
      <div style={{ ...styles.speakerTag, background: "#1C2B4A" }}>
        <div style={styles.speakerName}>{scene.title}</div>
        <div style={styles.speakerRole}>SPEAKER RACE — VOTE WHIP</div>
      </div>

      <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid #E5DFCC" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9.5, letterSpacing: "0.12em", color: "#888", marginBottom: 4 }}>VOTES COMMITTED</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "'Lora', Georgia, serif", fontWeight: 700, fontSize: 40, lineHeight: 1, color: isShort ? "#8B1A1A" : "#2D5C3E" }}>
            {committed}
          </span>
          <span style={{ fontSize: 15, color: "#999" }}>/ {scene.needed} needed</span>
        </div>
        <div style={{ marginTop: 8, height: 7, background: "#E5DFCC", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: isShort ? "#C9A227" : "#2D5C3E", transition: "width 0.3s ease" }} />
        </div>
      </div>

      <div>
        {scene.groups.map((g) => {
          const status = g.unavailable ? "unavailable" : g.locked ? "locked" : (groupStatus[g.key] || "pending");
          return (
            <GroupRow
              key={g.key}
              group={g}
              status={status}
              onNegotiate={() => setActiveKey(g.key)}
            />
          );
        })}
      </div>

      <div style={{ padding: "12px 20px 20px" }}>
        <button
          style={{ ...styles.submitBtn, width: "100%", background: callBtnBg, textAlign: "center" }}
          onClick={() => goTo(callNext, callEffect)}
        >
          {callBtnLabel}
        </button>
      </div>
    </div>
  );
}

function GroupRow({ group, status, onNegotiate }) {
  const STATUS_COLOR = { locked: "#777", pending: "#C9A227", won: "#2D5C3E", lost: "#8B1A1A", unavailable: "#8B1A1A" };
  const STATUS_LABEL = { locked: "LOCKED", pending: "—", won: "WON", lost: "LOST", unavailable: "BLOCKED" };
  const isUnavailable = status === "unavailable";

  const subtext = group.locked ? ` — ${group.lockedMsg}`
    : group.unavailable ? ` — ${group.unavailableMsg}`
    : "";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: "1px solid #F0EDE0", opacity: isUnavailable ? 0.45 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#3D3D3D", lineHeight: 1.2 }}>{group.name}</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9.5, color: "#999", marginTop: 2 }}>
          {group.votes} vote{group.votes !== 1 ? "s" : ""}{subtext}
        </div>
      </div>
      {status === "pending" ? (
        <button
          onClick={onNegotiate}
          style={{ flexShrink: 0, background: "#1C2B4A", color: "#FFFDF8", border: "none", borderRadius: 3, padding: "6px 12px", fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: "0.07em", cursor: "pointer" }}
        >
          NEGOTIATE →
        </button>
      ) : (
        <span style={{ flexShrink: 0, fontFamily: "'Space Mono', monospace", fontSize: 9.5, letterSpacing: "0.08em", color: STATUS_COLOR[status], fontWeight: 700 }}>
          {STATUS_LABEL[status]}
        </span>
      )}
    </div>
  );
}

function BudgetRoundScene({ scene, state, goTo }) {
  const [selected, setSelected] = useState(null);

  function effectiveDelta(opt) {
    return typeof opt.delta === "function" ? opt.delta(state) : opt.delta;
  }

  function submit() {
    if (!selected) return;
    const opt = scene.options.find((o) => o.id === selected);
    const postBudget = state.resources.budget + effectiveDelta(opt);
    const nextId = typeof scene.next === "function" ? scene.next(postBudget, state) : scene.next;
    goTo(nextId, opt.effect);
  }

  const headerBg = scene.urgent ? "#8B1A1A" : "#1C2B4A";

  return (
    <div style={styles.sceneCard}>
      <div style={{ ...styles.speakerTag, background: headerBg }}>
        <div style={styles.speakerName}>{scene.title}</div>
        <div style={{ ...styles.speakerRole, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>BUDGET FIGHT</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, color: state.resources.budget < 0 ? "#E88" : "#8E8" }}>
            {state.resources.budget > 0 ? "+" : ""}{state.resources.budget} pts
          </span>
        </div>
      </div>

      <div style={styles.transcriptText}>
        <p style={styles.line}>{scene.prompt}</p>
      </div>

      <div style={{ padding: "0 20px 8px" }}>
        {[...scene.options].sort((a, b) => effectiveDelta(a) - effectiveDelta(b)).map((opt) => {
          const delta = effectiveDelta(opt);
          const avail = !opt.available || opt.available(state);
          const reason = avail ? opt.costLabel
            : typeof opt.unavailableReason === "function" ? opt.unavailableReason(state)
            : (opt.unavailableReason || "Not available");
          return (
            <BudgetOption
              key={opt.id}
              opt={opt}
              delta={delta}
              available={avail}
              active={selected === opt.id}
              reason={reason}
              onSelect={() => { if (avail) setSelected(opt.id); }}
            />
          );
        })}
      </div>

      <div style={{ padding: "4px 20px 20px" }}>
        <button
          disabled={!selected}
          style={{ ...styles.submitBtn, width: "100%", textAlign: "center", opacity: selected ? 1 : 0.4, cursor: selected ? "pointer" : "not-allowed" }}
          onClick={submit}
        >
          PUSH THIS MEASURE →
        </button>
      </div>
    </div>
  );
}

function BudgetOption({ opt, delta, available, active, reason, onSelect }) {
  const pos = delta > 0;
  const deltaColor = pos ? "#2D5C3E" : "#8B1A1A";
  const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex", alignItems: "flex-start", gap: 14,
        padding: "11px 14px", marginBottom: 8,
        background: active ? "#1C2B4A" : "#FFFDF8",
        border: `1.5px solid ${active ? "#1C2B4A" : "#D8D2C0"}`,
        borderRadius: 4,
        cursor: available ? "pointer" : "not-allowed",
        opacity: available ? 1 : 0.38,
      }}
    >
      <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 15, color: active ? "#FFFDF8" : deltaColor, flexShrink: 0, width: 32, textAlign: "right", paddingTop: 1 }}>
        {deltaStr}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: active ? "#FFFDF8" : "#3D3D3D", lineHeight: 1.3 }}>
          {opt.label}
        </div>
        <div style={{ fontSize: 10.5, fontStyle: "italic", marginTop: 3, color: active ? "rgba(255,255,255,0.65)" : "#888" }}>
          {reason}
        </div>
      </div>
    </div>
  );
}

function GroupNeg({ group, state, updateState, onBack }) {
  const [selected, setSelected] = useState([]);
  const projection = useMemo(() => group.project(selected), [selected, group]);

  function toggle(id) {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  function submit() {
    updateState((s) => {
      if (!s.flags.groupStatus) s.flags.groupStatus = {};
      s.flags.groupStatus[group.key] = projection.won ? "won" : "lost";
      if (projection.won) group.winFx(s, selected);
      else                group.loseFx(s, selected);
    });
    onBack();
  }

  return (
    <div style={styles.sceneCard}>
      <div style={{ ...styles.speakerTag, background: "#1C2B4A" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onBack}
            style={{ flexShrink: 0, background: "transparent", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 3, color: "#FFFDF8", fontFamily: "'Space Mono', monospace", fontSize: 9, padding: "3px 8px", cursor: "pointer", letterSpacing: "0.06em" }}
          >
            ← BACK
          </button>
          <div>
            <div style={styles.speakerName}>{group.name}</div>
            <div style={styles.speakerRole}>{group.votes} votes available</div>
          </div>
        </div>
      </div>
      <div style={styles.transcriptText}>
        <p style={styles.line}>{group.ask}</p>
      </div>
      <div style={styles.daisLabel}>YOUR OFFER</div>
      <div style={styles.offerTable}>
        {group.offers.map((o) => {
          const avail = !o.available || o.available(state);
          const active = selected.includes(o.id);
          return (
            <button
              key={o.id}
              disabled={!avail}
              onClick={() => toggle(o.id)}
              style={{
                ...styles.offerChit,
                ...(active ? styles.offerChitActive : {}),
                ...(!avail ? styles.offerChitDisabled : {}),
              }}
            >
              <div style={styles.offerChitLabel}>{o.label}</div>
              <div style={styles.offerChitCost}>{o.costLabel}</div>
            </button>
          );
        })}
      </div>
      <div style={styles.projectionBar}>
        <div style={styles.projectionLabel}>PROJECTED OUTCOME</div>
        <div style={styles.projectionTrack}>
          <div style={{
            ...styles.projectionFill,
            width: `${projection.pct}%`,
            background: projection.won ? "#2D5C3E" : projection.pct >= 40 ? "#C9A227" : "#8B1A1A",
          }} />
        </div>
        <div style={styles.projectionNote}>{projection.note}</div>
      </div>
      <div style={styles.choiceList}>
        <button style={styles.submitBtn} onClick={submit}>PRESENT OFFER →</button>
      </div>
    </div>
  );
}

function HubScene({ scene, state, goTo, updateState }) {
  const [taken, setTaken] = useState([]);
  const slotsLeft = scene.maxActions - taken.length;

  function take(action) {
    if (taken.includes(action.id) || slotsLeft === 0) return;
    updateState(action.effect);
    setTaken((t) => [...t, action.id]);
  }

  function advance() {
    goTo(scene.next, scene.nextEffect ?? null);
  }

  return (
    <div style={{ ...styles.sceneCard, background: "#0D1117", border: "1px solid #1E2D3D" }}>
      <div style={{ padding: "18px 20px 10px", borderBottom: "1px solid #1E2D3D" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#4A7FA5", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
          CITY HALL — {scene.month}
        </div>
        <div style={{ fontSize: 13, color: "#C8C0A8", lineHeight: 1.5 }}>{scene.headline}</div>
      </div>

      <div style={{ padding: "12px 20px 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#4A7FA5", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Available meetings
          </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: slotsLeft > 0 ? "#8DB87A" : "#666" }}>
            {slotsLeft} slot{slotsLeft !== 1 ? "s" : ""} remaining
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {scene.actions.map((action) => {
            const done = taken.includes(action.id);
            const blocked = !done && slotsLeft === 0;
            const dim = done || blocked;
            return (
              <div
                key={action.id}
                onClick={() => !dim && take(action)}
                style={{
                  padding: "10px 12px",
                  background: done ? "#1A2810" : blocked ? "#111" : "#111820",
                  border: `1px solid ${done ? "#2D4A1E" : blocked ? "#1E2D3D" : "#1E3050"}`,
                  borderRadius: 4,
                  cursor: dim ? "default" : "pointer",
                  opacity: blocked ? 0.4 : 1,
                  transition: "border-color 0.15s",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: done ? "#6A9A50" : "#B8D0E8", marginBottom: 4, lineHeight: 1.3 }}>
                  {done ? "✓ " : ""}{action.label}
                </div>
                <div style={{ fontSize: 10, color: "#667788", lineHeight: 1.4 }}>{action.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "14px 20px 18px" }}>
        <button
          onClick={advance}
          style={{ ...styles.submitBtn, width: "100%", textAlign: "center", background: "#1C3050", borderColor: "#2E5080" }}
        >
          {scene.nextLabel} →
        </button>
      </div>
    </div>
  );
}
