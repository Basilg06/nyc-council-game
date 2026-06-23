import { useState, useMemo } from "react";
import { DISTRICT_PATHS } from "../data/districts";
import { FACTIONS } from "../data/council";
import styles from "../styles";

export default function DistrictMap({ council }) {
  const [tooltip, setTooltip] = useState(null);

  const byId = useMemo(() => {
    const m = {};
    council.forEach((c) => { m[c.id] = c; });
    return m;
  }, [council]);

  return (
    <>
      <svg
        viewBox="0 0 900 900"
        preserveAspectRatio="xMidYMid meet"
        style={styles.mapSvg}
        onMouseLeave={() => setTooltip(null)}
      >
        {Object.entries(DISTRICT_PATHS).map(([cd, points]) => {
          const member = byId[cd];
          const f = member ? FACTIONS[member.faction] : null;
          const fillColor = f ? f.color : "#444";
          return (
            <polygon
              key={cd}
              points={points}
              fill={fillColor}
              fillOpacity={tooltip?.member?.id === member?.id ? 0.85 : 0.55}
              stroke="#0E0E10"
              strokeWidth={1}
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) => member && setTooltip({ member, x: e.clientX, y: e.clientY })}
              onMouseMove={(e) => setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
            />
          );
        })}
      </svg>
      {tooltip && (
        <div style={{ ...styles.districtTooltip, left: tooltip.x + 16, top: tooltip.y - 12 }}>
          <div style={styles.ttName}>{tooltip.member.name}</div>
          <div style={{ ...styles.ttFaction, color: FACTIONS[tooltip.member.faction]?.color }}>
            D{tooltip.member.id} · {FACTIONS[tooltip.member.faction]?.name}
          </div>
          {tooltip.member.vote === "yes" && <div style={styles.ttVoteYes}>✓ Voting YES</div>}
          {tooltip.member.vote === "no"  && <div style={styles.ttVoteNo}>✗ Voting NO</div>}
          <div style={{ ...styles.ttTerm, color: tooltip.member.termLimited ? "#C9A227" : "#666" }}>
            {tooltip.member.termLimited ? "⚑ Term limited 2029" : "Term expires 2033+"}
          </div>
        </div>
      )}
    </>
  );
}
