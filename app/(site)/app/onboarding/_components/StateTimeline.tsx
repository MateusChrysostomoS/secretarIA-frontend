// StateTimeline — renders the aquecimento -> conectado -> ativo progress
// timeline (Feature 2). The finer-grained states (pending, aguardando_*) all
// collapse onto the first "Aquecendo" node — they're sub-states of the same
// warming-up phase from the doctor's point of view.
// Pure presentational — no interactivity, no client JS needed.

import type { OnboardingState } from "@/lib/manage-api";

const NODES = [
  { label: "Aquecendo" },
  { label: "Conectado" },
  { label: "Ativo" },
] as const;

// Maps every onboarding_state onto a 0/1/2 timeline rank.
function rankOf(state: OnboardingState): number {
  switch (state) {
    case "conectado":
      return 1;
    case "ativo":
      return 2;
    default:
      return 0;
  }
}

export function StateTimeline({ state }: { state: OnboardingState }) {
  const rank = rankOf(state);

  return (
    <div className="onb-timeline">
      {NODES.map((node, i) => {
        const status = i < rank ? "done" : i === rank ? "current" : "upcoming";
        return (
          <div key={node.label} style={{ display: "flex", alignItems: "center", flex: i < NODES.length - 1 ? 1 : undefined }}>
            <div className={`onb-node ${status}`}>
              <span className="onb-node-dot">{status === "done" ? "✓" : i + 1}</span>
              <span className="onb-node-label">{node.label}</span>
            </div>
            {i < NODES.length - 1 && (
              <div className={"onb-connector" + (i < rank ? " done" : "")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
