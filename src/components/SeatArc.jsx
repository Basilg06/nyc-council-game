import { useMemo } from "react";
import { FACTIONS, FACTION_COUNTS } from "../data/council";

const FACTION_ORDER = ["dsa", "leftWfp", "progressive", "establishment", "centrist", "felder", "republican", "farRight"];

function generateSeatPositions(totalSeats, { seatRadius, rowHeight, graphRadius }) {
  const points = [];
  let currentRow = 0;
  const startRad = 0;
  const endRad = Math.PI;

  while (points.length < totalSeats) {
    const currentRowRadius = graphRadius - rowHeight * currentRow;
    if (currentRowRadius <= 0) break;

    const radStep = Math.atan((2.5 * seatRadius) / currentRowRadius);
    const remaining = totalSeats - points.length;
    const rowSeats = Math.min(Math.floor((endRad - startRad) / radStep), remaining - 1);
    const evenStep = rowSeats ? (endRad - startRad) / rowSeats : 0;

    for (let i = 0; i <= rowSeats; i++) {
      const angle = rowSeats ? i * evenStep + startRad : (startRad + endRad) / 2;
      points.push({ angle, row: currentRow, r: currentRowRadius });
    }
    currentRow += 1;
  }

  points.sort((a, b) => b.angle - a.angle);
  return points;
}

export default function SeatArc({ council, highlightKey }) {
  const width = 260;
  const height = 130;
  const cx = width / 2;
  const cy = height - 4;
  const seatRadius = 6.2;
  const rowHeight = 14.2;
  const graphRadius = height - 6;

  const positions = useMemo(
    () => generateSeatPositions(council.length, { seatRadius, rowHeight, graphRadius }),
    [council.length]
  );

  const ordered = useMemo(
    () => [...council].sort((a, b) => FACTION_ORDER.indexOf(a.faction) - FACTION_ORDER.indexOf(b.faction)),
    [council]
  );

  return (
    <>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
        {positions.map((pos, i) => {
          const member = ordered[i];
          if (!member) return null;
          const x = cx + pos.r * Math.cos(pos.angle);
          const y = cy - pos.r * Math.sin(pos.angle);
          const f = FACTIONS[member.faction];
          const isNamed = member.named;
          const isHighlighted = isNamed && member.key === highlightKey;
          return (
            <g key={member.id}>
              <circle
                cx={x} cy={y} r={isNamed ? seatRadius + 1 : seatRadius} fill={f.color}
                stroke={isNamed ? "#F5F2E8" : "none"} strokeWidth={isNamed ? 1.5 : 0}
              />
              {isHighlighted && (
                <circle cx={x} cy={y} r={seatRadius + 4} fill="none" stroke="#C9A227" strokeWidth={1.5}>
                  <animate attributeName="r" values={`${seatRadius + 2};${seatRadius + 5};${seatRadius + 2}`} dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ marginTop: 8, borderTop: "1px solid #2A2A30", paddingTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 10px" }}>
        {FACTION_ORDER.map((k) => {
          const f = FACTIONS[k];
          return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: f.color, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8.5, color: "#888", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.name}
              </span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8.5, color: "#C8C4B8", flexShrink: 0 }}>
                {FACTION_COUNTS[k]}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
