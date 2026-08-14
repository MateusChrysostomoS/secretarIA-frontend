"use client";
// PostConsultSection — Section 03 "Pós-consulta": two new tenant-level wire
// fields (siblings of greeting_message) — a fixed message sent right after a
// consult, and reference knowledge the AI uses to answer the patient's
// post-consult questions. The two must never be conflated — see each
// field's tip below.

import { Field, TextArea } from "../../_shared/ui";
import { Section } from "./Section";
import type { PostConsult } from "../lib/types";

type PostConsultSectionProps = {
  v: PostConsult;
  set: <K extends keyof PostConsult>(key: K, value: PostConsult[K]) => void;
  // True when the secretarIA hub is unreachable right now (see
  // useSecretariaHub) — inputs are disabled since nothing typed here could
  // be saved until the connection returns.
  readOnly?: boolean;
};

export function PostConsultSection({ v, set, readOnly }: PostConsultSectionProps) {
  return (
    <Section
      id="pos"
      num="03"
      icon="checkCircle"
      title="Pós-consulta"
      desc="O que a secretarIA envia e responde depois que o paciente já passou pela consulta."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Field
          label="Mensagem pós-consulta"
          tip="Mensagem pronta que a secretarIA usa com o paciente logo depois da consulta — ex.: agradecer a visita e lembrar os próximos passos. É enviada como está escrita, não improvisada pela IA."
        >
          <TextArea
            value={v.postConsultMessage}
            onChange={e => set("postConsultMessage", e.target.value)}
            rows={3}
            placeholder='Ex.: "Esperamos que sua consulta tenha ido bem! Qualquer dúvida sobre as orientações, é só chamar por aqui."'
            disabled={readOnly}
          />
        </Field>

        <Field
          label="Conhecimento para dúvidas pós-consulta"
          tip="Informações de referência que a secretarIA usa para RESPONDER dúvidas do paciente depois da consulta — cuidados de recuperação, quando agendar o retorno, como receber resultados de exames. Não é enviada pronta ao paciente."
        >
          <TextArea
            value={v.postConsultKnowledge}
            onChange={e => set("postConsultKnowledge", e.target.value)}
            rows={5}
            placeholder="Ex.: Resultados de exames ficam prontos em até 5 dias úteis e são enviados por aqui. O retorno pós-operatório deve ser agendado para 15 dias após o procedimento."
            disabled={readOnly}
          />
        </Field>
      </div>
    </Section>
  );
}
