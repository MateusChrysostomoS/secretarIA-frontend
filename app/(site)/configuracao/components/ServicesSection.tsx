"use client";
// ServicesSection — Section 06 "Serviços oferecidos" (appointment types).
// Manages the list of types SecretarIA can book; each one is a ServiceCard
// that also holds its pre-visit requirements. Composition only — the per-card
// editing logic lives in ServiceCard.
//
// Onboarding & Multi-Professional pass: this now edits the SELECTED
// professional's appointment_types (see page.tsx's professional selector in
// ProfessionalsSection) rather than a single tenant-wide list — `professionalName`
// is appended to the title as a reminder once there's more than one to confuse with.

import { Icon } from "../../_shared/ui";
import { Section } from "./Section";
import { ServiceCard } from "./ServiceCard";
import type { Service } from "../lib/types";
import type { Dispatch, SetStateAction } from "react";

type ServicesSectionProps = {
  services: Service[];
  setServices: Dispatch<SetStateAction<Service[]>>;
  professionalName?: string;
  // True until the SELECTED professional's config has hydrated. Editing the
  // (necessarily empty) list before that would build a payload that wipes
  // whatever the hub actually holds for them — see lib/hydration.ts.
  readOnly?: boolean;
};

// Renders the appointment-type cards with add/remove controls inside Section 06.
export function ServicesSection({
  services,
  setServices,
  professionalName,
  readOnly,
}: ServicesSectionProps) {
  const update = (i: number, s: Service) =>
    setServices(prev => prev.map((x, j) => (j === i ? s : x)));

  const remove = (i: number) =>
    setServices(prev => prev.filter((_, j) => j !== i));

  // New types default to active with no requirements yet.
  const add = () =>
    setServices(prev => [
      ...prev,
      { id: Date.now(), name: "", dur: 50, price: "", active: true, requirements: [] },
    ]);

  return (
    <Section
      id="srv"
      num="06"
      icon="doc"
      title={"Serviços oferecidos" + (professionalName ? " · " + professionalName : "")}
      desc="Os tipos de atendimento que a secretarIA pode agendar. A duração define o tamanho do horário, e as orientações de pré-consulta são enviadas ao paciente ao marcar cada tipo."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* one card per appointment type */}
        {services.map((s, i) => (
          <ServiceCard
            key={s.id}
            service={s}
            onChange={ns => update(i, ns)}
            onRemove={() => remove(i)}
            canRemove={services.length > 1}
            readOnly={readOnly}
          />
        ))}

        {/* add appointment type button */}
        <button
          type="button"
          onClick={add}
          disabled={readOnly}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            alignSelf: "flex-start", marginTop: 2,
            padding: "9px 15px", borderRadius: 10,
            fontSize: 13.5, fontWeight: 600,
            color: "var(--brand)", background: "var(--brand-tint)",
            border: "1px dashed var(--brand)",
            opacity: readOnly ? 0.5 : 1,
            cursor: readOnly ? "not-allowed" : "pointer",
          }}
        >
          <Icon name="plus" size={16} />
          Adicionar serviço
        </button>
      </div>
    </Section>
  );
}
