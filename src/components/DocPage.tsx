import type { ReactNode } from 'react';
import { usePageTitle } from '../lib/hooks';
import { SiteFooter, SiteHeader } from './Layout';

export interface DocSection {
  id: string;
  title: string;
  body: ReactNode;
}

interface Props {
  title: string;
  /** Used for the browser tab title. */
  pageTitle?: string;
  lede?: ReactNode;
  updated?: string;
  sections?: DocSection[];
  toc?: boolean;
  children?: ReactNode;
}

/** Shared frame for help, legal and contact pages. */
export function DocPage({ title, pageTitle, lede, updated, sections = [], toc = true, children }: Props) {
  usePageTitle(`${pageTitle ?? title} · BeamDrop by Kriosity`);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main className="doc" id="main">
        <h1>{title}</h1>
        {updated ? <p className="doc__meta">Last updated {updated}</p> : null}
        {lede ? <p className="doc__lede">{lede}</p> : null}

        {toc && sections.length > 3 ? (
          <nav aria-label="On this page">
            <ol className="doc__toc">
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        {sections.map((section) => (
          <section className="doc__section" id={section.id} key={section.id} aria-labelledby={`${section.id}-h`}>
            <h2 id={`${section.id}-h`}>{section.title}</h2>
            {section.body}
          </section>
        ))}

        {children}
      </main>
      <SiteFooter />
    </>
  );
}
