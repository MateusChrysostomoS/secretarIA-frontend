// types.ts — local state shapes for the /cadastro wizard. Kept separate from
// the step components so CadastroWizard's state machine and each step's props
// stay easy to read.

import type {
  SignupIntakeFbPage,
  SignupIntakePriorApi,
  SignupIntakeWhatsappUsage,
} from "@/lib/manage-api";

export type ContactFields = {
  name: string;
  clinicName: string;
  email: string;
  whatsappPhone: string;
  // The password the visitor chooses on this first card — the account is registered
  // (and the visitor logged in) the moment this step is submitted, so they can log
  // back in later regardless of whether they finish the wizard or pay.
  password: string;
  confirmPassword: string;
  // Honeypot — always empty for real visitors (see ContactStep).
  website: string;
};

export const EMPTY_CONTACT: ContactFields = {
  name: "",
  clinicName: "",
  email: "",
  whatsappPhone: "",
  password: "",
  confirmPassword: "",
  website: "",
};

// The two add-ons the /cadastro wizard can offer today (Task 1a) — this app
// sells secretarIA only, so both are always relevant. Shared between
// CadastroWizard (initial preselection from plan.catalogIds) and AddonsStep
// (rendering + the PATCH payload) so the two can never drift apart.
export type SignupAddonId = "analytics_bi_advanced" | "pix_deposit";
export const SIGNUP_ADDON_IDS: readonly SignupAddonId[] = [
  "analytics_bi_advanced",
  "pix_deposit",
];

// Every step the wizard can visit. `dedicated_number` and `page_creation` are
// conditional guided screens; `addons` and `test_window` sit near the end of
// the flow (see CadastroWizard's transition table) and can each skip
// themselves if the backend reports nothing to show.
export type StepId =
  | "contact"
  | "usage"
  | "dedicated_number"
  | "prior_api"
  | "fb_page"
  | "page_creation"
  | "addons"
  | "test_window"
  | "summary";

export type WizardAnswers = {
  contact: ContactFields;
  whatsappUsage: SignupIntakeWhatsappUsage | null;
  priorApi: SignupIntakePriorApi | null;
  fbPage: SignupIntakeFbPage | null;
  // Add-on catalog ids selected on the addons step (Task 1a). Starts as the
  // intersection of the incoming plan.catalogIds with SIGNUP_ADDON_IDS (see
  // CadastroWizard) so a `?catalog=` link that already names an add-on shows it
  // pre-checked; stays empty if the backend reports no add-ons available (the
  // step then skips itself — see AddonsStep).
  selectedAddonIds: string[];
};

export const EMPTY_ANSWERS: WizardAnswers = {
  contact: EMPTY_CONTACT,
  whatsappUsage: null,
  priorApi: null,
  fbPage: null,
  selectedAddonIds: [],
};
