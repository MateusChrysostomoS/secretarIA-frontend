// LegalDocumentPage — the long-form reading layout shared by /termos/ and
// /privacidade/. A server component: it renders the tree parsed from
// docs/legal/*.md (app/(legal)/_content/documents.ts) into static HTML at build
// time. No client JS beyond the theme toggle.
//
// Layout: a slim header (wordmark + cross-links), the document title block, a
// table of contents (sticky sidebar on wide screens, a <details> disclosure on
// narrow ones — both plain anchors, no script), and the body at a ~70ch measure.
// Print styles in legal.css drop the chrome and keep the text.

import Link from "next/link";
import type { ReactNode } from "react";

import { SecretariaWordmark } from "../../(site)/_components/SecretariaWordmark";
import { ThemeToggle } from "../../(site)/_components/ThemeToggle";
import { LEGAL_DOCUMENTS, type LegalDocumentKey } from "../_content/documents";
import {
  isAllowedHref,
  parseInline,
  type Block,
  type Inline,
  type LegalDocument,
} from "../_lib/legal-markdown";

function renderInline(nodes: Inline[]): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return node.text;
      case "strong":
        return <strong key={i}>{renderInline(node.children)}</strong>;
      case "em":
        return <em key={i}>{renderInline(node.children)}</em>;
      case "code":
        return <code key={i}>{node.text}</code>;
      case "fill":
        // Highlighted on purpose: a blank that still needs filling must be
        // impossible to miss on the published page.
        return (
          <mark key={i} className="legal-fill">
            {node.text}
          </mark>
        );
      case "link": {
        const children = renderInline(node.children);
        if (!isAllowedHref(node.href)) return <span key={i}>{children}</span>;
        if (node.href.startsWith("/")) {
          return (
            <Link key={i} href={node.href}>
              {children}
            </Link>
          );
        }
        const external = node.href.startsWith("https://");
        return (
          <a
            key={i}
            href={node.href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {children}
          </a>
        );
      }
    }
  });
}

function Text({ children }: { children: string }) {
  return <>{renderInline(parseInline(children))}</>;
}

// Heading levels shift by one when the document is grouped into parts
// ("Parte II — Para pacientes" is the h2, its sections the h3s), so the outline
// a screen reader builds always matches the visual hierarchy.
type SubheadingTag = "h3" | "h4";

function Blocks({ blocks, subTag = "h3" }: { blocks: Block[]; subTag?: SubheadingTag }) {
  const Sub = subTag;
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={i}>
                <Text>{block.text}</Text>
              </p>
            );
          case "subheading":
            return (
              <Sub key={i} id={block.id} className="legal-h3">
                <Text>{block.text}</Text>
              </Sub>
            );
          case "list": {
            const items = block.items.map((item, j) => (
              <li key={j}>
                <Text>{item}</Text>
              </li>
            ));
            return block.ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>;
          }
          case "table":
            return (
              <div key={i} className="legal-table-wrap" role="region" aria-label="Tabela" tabIndex={0}>
                <table className="legal-table">
                  <thead>
                    <tr>
                      {block.header.map((cell, j) => (
                        <th key={j} scope="col">
                          <Text>{cell}</Text>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td key={c}>
                            <Text>{cell}</Text>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "callout":
            return (
              <aside key={i} className="legal-callout">
                <Blocks blocks={block.blocks} subTag={subTag} />
              </aside>
            );
        }
      })}
    </>
  );
}

function Toc({ doc }: { doc: LegalDocument }) {
  return (
    <ol className="legal-toc__list">
      {doc.sections.map((section) => (
        <li key={section.id} className={section.kind === "part" ? "legal-toc__part" : undefined}>
          <a href={`#${section.id}`}>
            <Text>{section.title}</Text>
          </a>
        </li>
      ))}
    </ol>
  );
}

export function LegalDocumentPage({
  docKey,
  doc,
}: {
  docKey: LegalDocumentKey;
  doc: LegalDocument;
}) {
  const other: LegalDocumentKey = docKey === "termos" ? "privacidade" : "termos";
  const hasParts = doc.sections.some((section) => section.kind === "part");

  return (
    <div className="legal-page">
      <a className="legal-skip" href="#conteudo">
        Pular para o conteúdo
      </a>

      <header className="legal-topbar">
        <div className="legal-topbar__inner">
          <Link href="/" className="legal-topbar__brand" aria-label="secretarIA — página inicial">
            <SecretariaWordmark size={24} />
          </Link>
          <nav className="legal-topbar__nav" aria-label="Documentos legais">
            {(Object.keys(LEGAL_DOCUMENTS) as LegalDocumentKey[]).map((key) => (
              <Link
                key={key}
                href={LEGAL_DOCUMENTS[key].href}
                className="legal-topbar__link"
                aria-current={key === docKey ? "page" : undefined}
              >
                {LEGAL_DOCUMENTS[key].label}
              </Link>
            ))}
            <ThemeToggle className="legal-topbar__theme" />
          </nav>
        </div>
      </header>

      <div className="legal-shell">
        <aside className="legal-toc legal-toc--side" aria-label="Sumário">
          <p className="legal-toc__title">Sumário</p>
          <Toc doc={doc} />
        </aside>

        <main id="conteudo" className="legal-main">
          <header className="legal-head">
            <p className="legal-eyebrow">Documento legal</p>
            <h1 className="legal-title">
              <Text>{doc.title}</Text>
            </h1>
            {doc.updatedAt ? (
              <p className="legal-updated">
                Última atualização: <Text>{doc.updatedAt}</Text>
              </p>
            ) : null}
          </header>

          <details className="legal-toc legal-toc--inline">
            <summary>Sumário</summary>
            <Toc doc={doc} />
          </details>

          <div className="legal-body">
            {doc.preamble.length > 0 ? (
              <div className="legal-preamble">
                <Blocks blocks={doc.preamble} />
              </div>
            ) : null}

            {doc.sections.map((section) => {
              if (section.kind === "part") {
                return (
                  <section key={section.id} id={section.id} className="legal-part" aria-labelledby={`${section.id}-h`}>
                    <h2 id={`${section.id}-h`} className="legal-part__title">
                      <Text>{section.title}</Text>
                    </h2>
                    <Blocks blocks={section.blocks} subTag="h4" />
                  </section>
                );
              }
              const Heading = hasParts ? "h3" : "h2";
              return (
                <section key={section.id} id={section.id} className="legal-section" aria-labelledby={`${section.id}-h`}>
                  <Heading id={`${section.id}-h`} className="legal-h2">
                    <Text>{section.title}</Text>
                  </Heading>
                  <Blocks blocks={section.blocks} subTag={hasParts ? "h4" : "h3"} />
                </section>
              );
            })}
          </div>

          <footer className="legal-foot">
            <p>
              Veja também: <Link href={LEGAL_DOCUMENTS[other].href}>{LEGAL_DOCUMENTS[other].label}</Link>
            </p>
            <p>
              <a href="#conteudo">Voltar ao início do documento</a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
