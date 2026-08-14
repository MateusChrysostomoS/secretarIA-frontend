// SecretariaWordmark — the secretarIA product wordmark: "secretar" in the brand
// serif followed by an italic, brand-coloured "IA". This is the single source of
// that styling; it used to be duplicated inline inside the secretarIA product
// header (secretaria/_shared/Header.tsx's Logo).
//
// Use it wherever the product is NAMED AS A MARK — the header lockup, the doctor
// nav item ("Configurações secretarIA"), card titles — not in body copy, where the
// plain word "secretarIA" reads better.

import "./SecretariaWordmark.css";

type SecretariaWordmarkProps = {
  // Font size in px. Omit to inherit the surrounding text size (nav items, headings).
  size?: number;
};

export function SecretariaWordmark({ size }: SecretariaWordmarkProps) {
  return (
    <span className="secretaria-wordmark" style={size ? { fontSize: size } : undefined}>
      secretar<em>IA</em>
    </span>
  );
}
