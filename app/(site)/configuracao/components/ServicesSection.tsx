"use client";
// ServicesSection — Section 06 "Serviços oferecidos".
//
// One list: the CLINIC's catalog, every service any professional has added.
// The selected professional ticks the ones they also offer and fills in their
// own price and duration. The name and the descriptive copy belong to the
// clinic's row and are edited once, for everybody (ServiceEditorModal).
//
// WHY IT IS NOT AN INHERIT/OWN CHOICE ANY MORE
// --------------------------------------------
// It used to be "herdar da clínica" or "configuração própria" — take the whole
// clinic list, or retype your own from scratch. Neither describes a real
// clinic, where Dra. Ana and Dr. Bruno both do "Limpeza" and only Ana does
// "Clareamento". Worse, retyping created a SECOND, unrelated service with the
// same name, and that broke something patients feel: when a doctor cancels,
// the backend looks for a colleague who offers the same service by catalog id
// (secretarIA services/flow_router.py::rebooking_candidates). Two strings that
// merely look alike find nobody, and the patient is sent back to choose from
// scratch.
//
// So ticking a colleague's service is not a convenience — it is what makes the
// two doctors provably interchangeable for that service.
//
// The rules live in lib/catalog.ts (pure, unit-tested); this file is the view.

import { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Btn, HelpTip, Icon } from "../../_shared/ui";
import { Section } from "./Section";
import { CSelect } from "./CSelect";
import { InlineNote } from "./InlineNote";
import { catalogRows, offerService, type CatalogRow } from "../lib/catalog";
import type { CatalogService, Service } from "../lib/types";

// Duration options in minutes — unchanged from the previous card.
const DURATION_OPTIONS = [15, 20, 30, 40, 50, 60, 90];

type ServicesSectionProps = {
  // What THIS professional offers: price/duration per service.
  services: Service[];
  setServices: Dispatch<SetStateAction<Service[]>>;
  // The clinic's catalog. `null` while it is still loading — distinct from an
  // empty catalog, which is a real (and common) state for a clinic that has
  // never used this screen.
  catalog: CatalogService[] | null;
  catalogError?: boolean;
  onRetryCatalog?: () => void;
  professionalName?: string;
  // The clinic's default consult length, used to seed a newly ticked service.
  defaultDuration: number;
  // Roster, for "também oferecido por" — ids come from the catalog, names from
  // here.
  roster: { id: string; name: string }[] | null;
  selectedProfessionalId: string | null;
  // Opens ServiceEditorModal. `null` = create a new catalog service.
  onEditCatalogService: (service: CatalogService | null) => void;
  // True until the SELECTED professional's config has hydrated. Editing the
  // (necessarily empty) list before that would build a payload that wipes
  // whatever the hub actually holds for them — see lib/hydration.ts.
  readOnly?: boolean;
};

export function ServicesSection({
  services,
  setServices,
  catalog,
  catalogError,
  onRetryCatalog,
  professionalName,
  defaultDuration,
  roster,
  selectedProfessionalId,
  onEditCatalogService,
  readOnly,
}: ServicesSectionProps) {
  const rows = useMemo(() => catalogRows(catalog ?? [], services), [catalog, services]);
  const offeredCount = rows.filter((r) => r.service !== null).length;

  // Ticking a service on/off. "Off" REMOVES the entry rather than flagging it
  // inactive: an unticked box means "I do not offer this", and keeping a
  // disabled row around would be a second way to say the same thing that the
  // two could then disagree about.
  const toggle = (row: CatalogRow, on: boolean) => {
    if (!on) {
      setServices((prev) => prev.filter((s) => s !== row.service));
      return;
    }
    const entry = row.catalog;
    if (!entry) return; // an off-catalog row is, by definition, already offered
    setServices((prev) => [...prev, offerService(entry, defaultDuration, Date.now())]);
  };

  const patch = (row: CatalogRow, changes: Partial<Service>) =>
    setServices((prev) => prev.map((s) => (s === row.service ? { ...s, ...changes } : s)));

  return (
    <Section
      id="srv"
      num="06"
      icon="doc"
      title={"Serviços oferecidos" + (professionalName ? " · " + professionalName : "")}
      desc="Os serviços são da clínica: marque os que este profissional também atende e informe o preço e a duração dele. A duração define o tamanho do horário na agenda."
    >
      {catalogError ? (
        <div role="alert" style={{
          fontSize: 13, lineHeight: 1.55, padding: "12px 14px", borderRadius: 10,
          color: "var(--danger, #c0392b)",
          background: "var(--surface-2)", border: "1px solid var(--danger, #c0392b)",
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}>
          <span style={{ flex: 1, minWidth: 220 }}>
            Não foi possível carregar os serviços da clínica. Nada foi alterado.
          </span>
          {onRetryCatalog && (
            <Btn variant="outline" size="sm" onClick={onRetryCatalog}>
              Tentar de novo
            </Btn>
          )}
        </div>
      ) : catalog === null ? (
        <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>
          Carregando os serviços da clínica…
        </div>
      ) : (
        <>
          {rows.length === 0 ? (
            <InlineNote>
              A clínica ainda não tem nenhum serviço cadastrado. Crie o primeiro abaixo — ele entra
              no catálogo da clínica, e os outros profissionais poderão marcar que também o
              oferecem.
            </InlineNote>
          ) : offeredCount === 0 ? (
            <InlineNote>
              Este profissional não oferece <b>nenhum</b> serviço no momento, então a secretarIA{" "}
              <b>não vai agendar nada</b> com ele. Marque ao menos um serviço abaixo.
            </InlineNote>
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((row) => (
              <CatalogRowCard
                key={row.key}
                row={row}
                roster={roster}
                selectedProfessionalId={selectedProfessionalId}
                onToggle={(on) => toggle(row, on)}
                onPatch={(changes) => patch(row, changes)}
                onEdit={() => row.catalog && onEditCatalogService(row.catalog)}
                readOnly={readOnly}
              />
            ))}

            <button
              type="button"
              onClick={() => onEditCatalogService(null)}
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
              Criar serviço novo no catálogo
            </button>
          </div>
        </>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// CatalogRowCard — one service: the tick, and this professional's own numbers.
// ---------------------------------------------------------------------------

function CatalogRowCard({
  row,
  roster,
  selectedProfessionalId,
  onToggle,
  onPatch,
  onEdit,
  readOnly,
}: {
  row: CatalogRow;
  roster: { id: string; name: string }[] | null;
  selectedProfessionalId: string | null;
  onToggle: (on: boolean) => void;
  onPatch: (changes: Partial<Service>) => void;
  onEdit: () => void;
  readOnly?: boolean;
}) {
  const offered = row.service !== null;
  // Who else offers it, by name. Ids missing from the roster are dropped
  // rather than rendered blank — a roster still loading must not read as
  // "nobody else offers this", which is the one claim this line must never
  // make falsely.
  const others = useMemo(() => {
    if (!row.catalog || !roster) return [];
    const byId = new Map(roster.map((p) => [p.id, p.name]));
    return row.catalog.professionalIds
      .filter((id) => id !== selectedProfessionalId)
      .map((id) => byId.get(id))
      .filter((name): name is string => Boolean(name));
  }, [row.catalog, roster, selectedProfessionalId]);

  return (
    <div style={{
      background: offered ? "var(--brand-tint)" : "var(--surface-2)",
      border: "1px solid " + (offered ? "var(--brand)" : "var(--line)"),
      borderRadius: 14,
      padding: 14,
      transition: "background .16s var(--ease), border-color .16s var(--ease)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <label style={{
          display: "flex", alignItems: "center", gap: 10,
          flex: 1, minWidth: 200,
          cursor: readOnly ? "not-allowed" : "pointer",
        }}>
          <input
            type="checkbox"
            checked={offered}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={readOnly}
            aria-label={"Oferecer " + row.name}
            style={{ width: 17, height: 17, flexShrink: 0, cursor: "inherit" }}
          />
          <span style={{ minWidth: 0 }}>
            <span style={{
              display: "block", fontSize: 14, fontWeight: 700, color: "var(--ink)",
            }}>
              {row.name}
            </span>
            {row.catalog?.description && (
              <span style={{
                display: "block", fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2,
              }}>
                {row.catalog.description}
              </span>
            )}
          </span>
        </label>

        {row.offCatalog ? (
          <span
            title="Ao salvar, este serviço entra no catálogo da clínica e fica disponível para os outros profissionais."
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 10px", borderRadius: 999, flexShrink: 0,
              fontSize: 11.5, fontWeight: 600,
              color: "var(--st-pending-ink, #9a6b00)",
              background: "var(--surface)", border: "1px solid var(--line)",
            }}
          >
            <Icon name="clock" size={13} />
            Entra no catálogo ao salvar
          </span>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            disabled={readOnly}
            title="Editar nome, descrição e orientações — vale para toda a clínica"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
              padding: "6px 11px", borderRadius: 9,
              fontSize: 12.5, fontWeight: 600,
              color: "var(--ink-soft)",
              background: "var(--surface)", border: "1px solid var(--line)",
              opacity: readOnly ? 0.5 : 1,
              cursor: readOnly ? "not-allowed" : "pointer",
            }}
          >
            <Icon name="edit" size={13} />
            Editar
          </button>
        )}
      </div>

      {/* This professional's own numbers — only meaningful once they offer it. */}
      {offered && row.service && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          marginTop: 12, paddingLeft: 27,
        }}>
          <CSelect
            value={row.service.dur}
            onChange={(e) => onPatch({ dur: +e.target.value })}
            style={{ width: 116 }}
            disabled={readOnly}
            label={"Duração de " + row.name}
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>{d} min</option>
            ))}
          </CSelect>
          <input
            value={row.service.price}
            onChange={(e) => onPatch({ price: e.target.value })}
            placeholder="R$ — (opcional)"
            aria-label={"Valor de " + row.name}
            maxLength={40}
            disabled={readOnly}
            style={{
              width: 130, padding: "9px 11px", borderRadius: 9,
              fontSize: 13.5, fontFamily: "inherit", color: "var(--ink)",
              background: "var(--surface)", border: "1px solid var(--line)",
            }}
          />
          <HelpTip text="Preço e duração são deste profissional — dois médicos podem cobrar valores diferentes pelo mesmo serviço." />
        </div>
      )}

      {others.length > 0 && (
        <div style={{
          fontSize: 11.5, color: "var(--ink-faint)", marginTop: 9, paddingLeft: 27,
        }}>
          Também oferecido por {others.join(", ")}
        </div>
      )}
    </div>
  );
}
