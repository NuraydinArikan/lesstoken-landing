import React, { useEffect, useState } from 'react';
import { supportContent } from '../lib/supportContent.mjs';
import { apiUrl } from '../lib/api';

const FIELD_CLASS =
  'w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 ' +
  'text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition';

const EMPTY = { name: '', email: '', subject: '', message: '' };

export default function ContactForm({ lang = 'tr', defaultSubject = '' }) {
  const t = supportContent[lang].form;
  const [form, setForm] = useState({ ...EMPTY, subject: defaultSubject });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  // Follows the active tab while the user has not typed their own subject.
  useEffect(() => {
    setForm((prev) =>
      prev.subject === '' || prev.subject.endsWith('— ')
        ? { ...prev, subject: defaultSubject }
        : prev
    );
  }, [defaultSubject]);

  // The success banner clears itself; without the cleanup this timer fires
  // after unmount and React warns about setting state on a dead component.
  useEffect(() => {
    if (status !== 'success') return undefined;
    const timer = setTimeout(() => setStatus('idle'), 5000);
    return () => clearTimeout(timer);
  }, [status]);

  const change = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    if (status === 'submitting') return;

    setStatus('submitting');
    setError('');

    try {
      const response = await fetch(apiUrl('/api/v1/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (response.ok) {
        setForm({ ...EMPTY, subject: defaultSubject });
        setStatus('success');
        return;
      }

      // The backend rate-limits per IP. Without this branch a throttled user
      // sees the generic failure and retries immediately, making it worse.
      if (response.status === 429) {
        setError(t.errorRateLimit);
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.error || t.errorGeneric);
      }
      setStatus('error');
    } catch {
      setError(t.errorNetwork);
      setStatus('error');
    }
  };

  const submitting = status === 'submitting';

  return (
    <section className="mt-16 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h2 className="text-2xl font-bold mb-6">{t.title}</h2>

      {status === 'success' && (
        <p className="mb-6 px-4 py-3 rounded-lg bg-emerald-900/40 border border-emerald-700 text-emerald-200">
          {t.success}
        </p>
      )}
      {status === 'error' && (
        <p className="mb-6 px-4 py-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="text-sm font-medium text-gray-300">
          {t.name}
          <input type="text" name="name" required value={form.name}
                 onChange={change} className={`${FIELD_CLASS} mt-1`} />
        </label>

        <label className="text-sm font-medium text-gray-300">
          {t.email}
          <input type="email" name="email" required value={form.email}
                 onChange={change} className={`${FIELD_CLASS} mt-1`} />
        </label>

        <label className="text-sm font-medium text-gray-300">
          {t.subject}
          <input type="text" name="subject" required value={form.subject}
                 onChange={change} className={`${FIELD_CLASS} mt-1`} />
        </label>

        <label className="text-sm font-medium text-gray-300">
          {t.message}
          <textarea name="message" required rows="6" value={form.message}
                    onChange={change} className={`${FIELD_CLASS} mt-1 resize-y`} />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="self-start px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {submitting ? t.sending : t.send}
        </button>
      </form>
    </section>
  );
}
