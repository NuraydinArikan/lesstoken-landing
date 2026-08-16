import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { supportContent } from '../lib/supportContent.mjs';
import { detectLang } from '../lib/toolI18n';
import ContactForm from '../components/ContactForm';

const PRODUCTS = ['extension', 'desktop', 'web'];

// English regardless of page language: this reaches the maintainer's inbox,
// and a per-language prefix would split one product across two labels.
const SUBJECT_PREFIX = {
  extension: 'Extension — ',
  desktop: 'Desktop — ',
  web: 'Web Tools — '
};

export default function Support() {
  const [lang, setLang] = useState('tr');
  const [activeTab, setActiveTab] = useState('extension');
  const [openFaq, setOpenFaq] = useState(null);

  // detectLang reads the same 'lang' key the rest of the site uses, through
  // safeGet -- so a blocked-storage browser falls back instead of throwing.
  useEffect(() => { setLang(detectLang()); }, []);

  const t = supportContent[lang];
  const items = t.faq[activeTab];

  const selectTab = (product) => {
    setActiveTab(product);
    // openFaq is an index into the current tab's list. Leaving it set would
    // point past the end of a shorter tab and collapse every item.
    setOpenFaq(null);
  };

  return (
    <>
      <Head>
        <title>{t.meta.title}</title>
        <meta name="description" content={t.meta.description} />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-10">
            <img src="/mark-sm.svg" alt="LessToken" style={{ width: '40px', height: '40px' }} />
            <a href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              LessToken
            </a>
          </div>

          <h1 className="text-4xl font-bold mb-4">{t.meta.heading}</h1>
          <p className="text-xl text-gray-300 mb-12">{t.meta.description}</p>

          <div className="flex flex-wrap gap-2 mb-10">
            {PRODUCTS.map((product) => (
              <button
                key={product}
                onClick={() => selectTab(product)}
                aria-pressed={activeTab === product}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === product
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800/50 border border-slate-700 text-gray-400 hover:text-white'
                }`}
              >
                {t.tabs[product]}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {items.map((item, idx) => {
              const open = openFaq === idx;
              return (
                <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <button
                    onClick={() => setOpenFaq(open ? null : idx)}
                    aria-expanded={open}
                    className="w-full flex justify-between items-center gap-4 text-left font-semibold text-lg hover:text-blue-400 transition"
                  >
                    <span>{item.q}</span>
                    <span className="text-2xl leading-none shrink-0">{open ? '−' : '+'}</span>
                  </button>
                  {open && (
                    <>
                      <p className="mt-4 text-gray-300 leading-relaxed">{item.a}</p>
                      {item.links && item.links.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                          {item.links.map((link) => {
                            const external = /^https?:\/\//.test(link.href);
                            return (
                              <li key={link.href}>
                                <a
                                  href={link.href}
                                  target={external ? '_blank' : undefined}
                                  rel={external ? 'noopener noreferrer' : undefined}
                                  className="text-blue-300 underline underline-offset-2 hover:text-blue-400 transition"
                                >
                                  {link.label}
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <ContactForm lang={lang} defaultSubject={SUBJECT_PREFIX[activeTab]} />
        </div>
      </div>
    </>
  );
}
