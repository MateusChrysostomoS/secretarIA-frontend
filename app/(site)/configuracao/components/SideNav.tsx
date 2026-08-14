"use client";
// SideNav — sticky left navigation for the config page.
// Renders eight section jump-links; highlights the active one via scrollspy.
// The `active` id is tracked by onScroll in the parent (ConfiguracaoPage).

import { Icon } from "../../_shared/ui";
import type { IconName } from "../../_shared/ui";

type NavItem = {
  id: string;
  label: string;
  icon: IconName;
};

// The eight config sections (Onboarding & Multi-Professional pass added
// Mensagens + Profissionais, and moved Services/Availability to be
// professional-scoped; Pós-consulta was added right after Mensagens, and
// Sinal via Pix right after Pós-consulta — see page.tsx).
const NAV: NavItem[] = [
  { id: "ctx",  label: "Contexto da clínica", icon: "note"        },
  { id: "msg",  label: "Mensagens",           icon: "send"        },
  { id: "pos",  label: "Pós-consulta",        icon: "checkCircle" },
  { id: "pix",  label: "Sinal via Pix",       icon: "swap"        },
  { id: "prof", label: "Profissionais",       icon: "users"       },
  { id: "srv",  label: "Serviços oferecidos",  icon: "doc"         },
  { id: "disp", label: "Dias e horários",      icon: "clock"       },
  { id: "gcal", label: "Google Calendar",      icon: "calendar"    },
];

type SideNavProps = {
  active: string;
  onJump: (id: string) => void;
};

// Sticky sidebar that lists section links and highlights the scrollspy-active one.
export function SideNav({ active, onJump }: SideNavProps) {
  return (
    <nav style={{
      position: "sticky",
      top: 0,
      width: 234,
      flexShrink: 0,
      alignSelf: "flex-start",
      paddingTop: 4,
    }}>
      {/* section label */}
      <div style={{
        fontSize: 11.5, fontWeight: 700,
        color: "var(--ink-faint)", letterSpacing: ".06em",
        textTransform: "uppercase",
        padding: "0 12px 10px",
      }}>
        {/* Plain text, not the stylized wordmark: this eyebrow is uppercased,
            which would mangle "secretarIA". The stylized name is right beside
            it, in the page's own h1. */}
        Configurações
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(n => {
          const isActive = active === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onJump(n.id)}
              style={{
                display: "flex", alignItems: "center", gap: 11,
                padding: "10px 12px", borderRadius: 10,
                textAlign: "left", fontSize: 14, fontWeight: 600,
                transition: "all .15s var(--ease)",
                color: isActive ? "var(--brand-ink)" : "var(--ink-soft)",
                background: isActive ? "var(--brand-tint)" : "transparent",
                border: "none", cursor: "pointer",
              }}
            >
              <Icon
                name={n.icon}
                size={17}
                style={{ color: isActive ? "var(--brand)" : "var(--ink-faint)" }}
              />
              {n.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
