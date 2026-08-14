"use client";

// CadastroWizard — owns all step state and the branching transition table for
// the /cadastro flow (Feature 0). The FIRST card (ContactStep) now REGISTERS the
// account: on submit the wizard calls registerSignup (creating the tenant + owner user
// + inert entitlement + linked intent) and saveSession(), so the lead is captured in the
// DB and the visitor is logged in before they answer another question — even if they
// abandon the wizard or never pay. Steps are pushed onto a history stack on every forward
// move so "Voltar" always returns to the exact previous step, including the two
// conditional guided screens. Two more steps sit right before `summary`: `addons`
// (Task 1a), then `test_window` (the WhatsApp Coexistence connection-test-window
// explainer) — either can skip itself if the backend reports nothing to show.

import { useState } from "react";
import { WizardShell } from "./WizardShell";
import { ContactStep } from "./ContactStep";
import { WhatsappUsageStep } from "./WhatsappUsageStep";
import { DedicatedNumberGuide } from "./DedicatedNumberGuide";
import { PriorApiStep } from "./PriorApiStep";
import { FacebookPageStep } from "./FacebookPageStep";
import { PageCreationGuide } from "./PageCreationGuide";
import { AddonsStep } from "./AddonsStep";
import { TestWindowExplainerStep } from "./TestWindowExplainerStep";
import { SummaryStep } from "./SummaryStep";
import { registerSignup, saveSession, ManageApiError } from "@/lib/manage-api";
import { EMPTY_ANSWERS, SIGNUP_ADDON_IDS, type StepId, type WizardAnswers } from "../lib/types";
import type { ResolvedPlan } from "../lib/plans";

// Ordinal position per step, used only for the progress bar (0..8). Branches
// that skip a conditional screen simply jump positions instead of by one —
// a minor visual jump, not worth a fully dynamic step count.
const PROGRESS: Record<StepId, number> = {
  contact: 0,
  usage: 1,
  dedicated_number: 2,
  prior_api: 3,
  fb_page: 4,
  page_creation: 5,
  addons: 6,
  test_window: 7,
  summary: 8,
};
const LAST_INDEX = 8;

const PROGRESS_LABEL: Record<StepId, string> = {
  contact: "Dados de contato",
  usage: "Uso do WhatsApp",
  dedicated_number: "Número dedicado",
  prior_api: "Histórico do número",
  fb_page: "Página no Facebook",
  page_creation: "Criar Página",
  addons: "Complementos",
  test_window: "Período de teste",
  summary: "Revisão",
};

// The branching transition table (spec §A): Q1 "none" detours through the
// dedicated-number guide; Q4 "no" detours through the page-creation guide. Both
// eligibility branches converge on `addons` (Task 1a) before `summary`, which
// then always continues to `test_window` next (the connection-test-window
// explainer). Every signup in this app is secretarIA, so the full intake flow
// always runs — there's no branch that skips straight from `contact` to `summary`.
function nextStepId(current: StepId, answers: WizardAnswers): StepId {
  switch (current) {
    case "contact":
      return "usage";
    case "usage":
      return answers.whatsappUsage === "none" ? "dedicated_number" : "prior_api";
    case "dedicated_number":
      return "prior_api";
    case "prior_api":
      return "fb_page";
    case "fb_page":
      return answers.fbPage === "no" ? "page_creation" : "addons";
    case "page_creation":
      return "addons";
    case "addons":
      return "test_window";
    case "test_window":
    case "summary":
      return "summary";
  }
}

type CadastroWizardProps = {
  plan: ResolvedPlan;
};

export function CadastroWizard({ plan }: CadastroWizardProps) {
  // Lazy init: preselect any add-on already named in the incoming `?catalog=`
  // (intersected against the two known offerable ids) so a marketing link that
  // already names an add-on shows it pre-checked on the addons step.
  const [answers, setAnswers] = useState<WizardAnswers>(() => ({
    ...EMPTY_ANSWERS,
    selectedAddonIds: SIGNUP_ADDON_IDS.filter((id) => plan.catalogIds.includes(id)),
  }));
  const [step, setStep] = useState<StepId>("contact");
  const [history, setHistory] = useState<StepId[]>([]);

  // --- Registration state (set once, at the first-card submit) ---
  // The signup intent id drives the later Stripe Checkout call; once set, it also marks
  // "already registered" so returning to the contact step doesn't re-register (which
  // would 409 on the visitor's own just-created email).
  const [intentId, setIntentId] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [showLoginLink, setShowLoginLink] = useState(false);

  function goNext() {
    setHistory((h) => [...h, step]);
    setStep(nextStepId(step, answers));
  }

  function goBack() {
    if (history.length === 0) return;
    setStep(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  }

  function patchContact(patch: Partial<WizardAnswers["contact"]>) {
    setAnswers((a) => ({ ...a, contact: { ...a.contact, ...patch } }));
  }

  // Register the account on first-card submit, then advance. Idempotent from the UI's
  // side: once registered (intentId set), a second submit (e.g. after "Voltar") just
  // advances — the account already exists and its email can't be re-registered.
  async function handleContactSubmit() {
    if (intentId) {
      goNext();
      return;
    }
    setRegisterError(null);
    setShowLoginLink(false);
    setRegistering(true);
    try {
      const { intentId: newIntentId, session } = await registerSignup({
        name: answers.contact.name.trim(),
        clinic_name: answers.contact.clinicName.trim(),
        email: answers.contact.email.trim(),
        whatsapp_phone: answers.contact.whatsappPhone.trim(),
        password: answers.contact.password,
        catalog_ids: plan.catalogIds,
        website: answers.contact.website,
      });
      // Persist the session immediately — the visitor is now logged in.
      saveSession(session);
      setIntentId(newIntentId);
      setRegistering(false);
      goNext();
    } catch (e) {
      const status = e instanceof ManageApiError ? e.status : 0;
      if (status === 409) {
        setRegisterError("Você já tem conta Brain — entre para contratar.");
        setShowLoginLink(true);
      } else if (status === 422) {
        setRegisterError("Confira os dados e a senha e tente novamente.");
      } else if (status === 429) {
        setRegisterError("Muitas tentativas. Aguarde um instante e tente de novo.");
      } else {
        setRegisterError("Não foi possível criar sua conta agora. Tente novamente.");
      }
      setRegistering(false);
    }
  }

  return (
    <WizardShell progress={PROGRESS[step] / LAST_INDEX} progressLabel={PROGRESS_LABEL[step]}>
      {step === "contact" && (
        <ContactStep
          value={answers.contact}
          onChange={patchContact}
          planLabel={plan.label}
          planTagline={plan.tagline}
          onSubmit={handleContactSubmit}
          submitting={registering}
          serverError={registerError}
          showLoginLink={showLoginLink}
        />
      )}
      {step === "usage" && (
        <WhatsappUsageStep
          value={answers.whatsappUsage}
          onChange={(v) => setAnswers((a) => ({ ...a, whatsappUsage: v }))}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {step === "dedicated_number" && <DedicatedNumberGuide onNext={goNext} onBack={goBack} />}
      {step === "prior_api" && (
        <PriorApiStep
          value={answers.priorApi}
          onChange={(v) => setAnswers((a) => ({ ...a, priorApi: v }))}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {step === "fb_page" && (
        <FacebookPageStep
          value={answers.fbPage}
          onChange={(v) => setAnswers((a) => ({ ...a, fbPage: v }))}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {step === "page_creation" && <PageCreationGuide onNext={goNext} onBack={goBack} />}
      {step === "addons" && (
        <AddonsStep
          intentId={intentId}
          plan={plan}
          selected={answers.selectedAddonIds}
          onSelectedChange={(ids) => setAnswers((a) => ({ ...a, selectedAddonIds: ids }))}
          onNext={goNext}
          onSkip={() => setStep("test_window")}
          onBack={goBack}
        />
      )}
      {step === "test_window" && (
        <TestWindowExplainerStep onNext={goNext} onSkip={() => setStep("summary")} onBack={goBack} />
      )}
      {step === "summary" && (
        <SummaryStep answers={answers} plan={plan} intentId={intentId} onBack={goBack} />
      )}
    </WizardShell>
  );
}
