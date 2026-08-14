// ProductLockup — the per-screen product mark that sits in the portal header,
// right after the Brain brand. The Brain identity on the left is IDENTICAL on
// every logged-in screen; this only ADDS which product the current screen belongs
// to, so the header reads "Brain │ secretarIA".
//
// In brain-frontend this component switched between the secretarIA and PreCheck
// wordmarks. This domain only ever hosts secretarIA screens, so the PreCheck
// branch (and PreCheckWordmark itself) was not ported. `PortalProduct` is kept as
// a one-member union so PortalHeader's `product` prop keeps its shape — and so
// adding a second product back later is a type error at every call site rather
// than a silent wrong mark.

import { SecretariaWordmark } from "./SecretariaWordmark";
import "./ProductLockup.css";

// Matches the product keys used by the entitlements payload.
export type PortalProduct = "secretaria";

const PRODUCT_NAME: Record<PortalProduct, string> = {
  secretaria: "secretarIA",
};

export function ProductLockup({ product }: { product: PortalProduct }) {
  return (
    <span className="portal-lockup" aria-label={`${PRODUCT_NAME[product]} by Brain`}>
      <SecretariaWordmark />
    </span>
  );
}
