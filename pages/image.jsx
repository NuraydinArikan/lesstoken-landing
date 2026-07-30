// pages/image.jsx
import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import ToolNav from '../components/ToolNav';
import { computeTargetDimensions } from '../lib/imageResize';
import { classifyFile } from '../lib/imageInput.mjs';
import { toolLocales, detectLang } from '../lib/toolI18n';

const MAX_WIDTH = 1024;
const MAX_HEIGHT = 768;

export default function ImageResizePage() {
  const [lang, setLang] = useState('tr');
  const [status, setStatus] = useState('idle'); // idle | processing | done | no-image | not-image | error
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [original, setOriginal] = useState(null); // { width, height, bytes }
  const [resized, setResized] = useState(null); // { width, height, bytes }
  const [copyState, setCopyState] = useState('idle'); // idle | copied | failed
  const blobRef = useRef(null);
  const previewUrlRef = useRef(null);
  // Guards against an earlier, slower image finishing after a newer one and
  // overwriting its result. Shared by every input path.
  const jobSeqRef = useRef(0);
  const fileInputRef = useRef(null);

  const t = toolLocales[lang].image;

  useEffect(() => {
    setLang(detectLang());
  }, []);

  // Every way of supplying an image - paste, file picker, drag and drop -
  // funnels through here, so they all shrink, preview and copy identically.
  const processBlob = (sourceBlob) => {
      const mySeq = ++jobSeqRef.current;

      setStatus('processing');
      setPreviewUrl(null);
      setCopyState('idle');
      blobRef.current = null;

      createImageBitmap(sourceBlob).then((bitmap) => {
        const { width, height } = computeTargetDimensions(bitmap.width, bitmap.height, MAX_WIDTH, MAX_HEIGHT);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);

        canvas.toBlob((resizedBlob) => {
          if (mySeq !== jobSeqRef.current) return;

          if (!resizedBlob) {
            setStatus('error');
            return;
          }
          blobRef.current = resizedBlob;
          setOriginal({ width: bitmap.width, height: bitmap.height, bytes: sourceBlob.size });
          setResized({ width, height, bytes: resizedBlob.size });
          if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
          }
          const newPreviewUrl = URL.createObjectURL(resizedBlob);
          previewUrlRef.current = newPreviewUrl;
          setPreviewUrl(newPreviewUrl);
          setStatus('done');
          copyToClipboard();
        }, 'image/png');
      }).catch(() => {
        if (mySeq !== jobSeqRef.current) return;
        setStatus('error');
      });
  };

  // Rejects non-images up front so the picker and drag-drop fail with a clear
  // message instead of a generic decode error.
  const handleFile = (file) => {
    const verdict = classifyFile(file);
    if (verdict === 'ignore') return;
    if (verdict === 'not-image') {
      setStatus('not-image');
      return;
    }
    processBlob(file);
  };

  useEffect(() => {
    const handlePaste = (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const imageItem = Array.from(items).find((item) => item.kind === 'file' && item.type.startsWith('image/'));
      if (!imageItem) {
        setStatus('no-image');
        return;
      }

      const sourceBlob = imageItem.getAsFile();
      if (!sourceBlob) {
        setStatus('error');
        return;
      }
      processBlob(sourceBlob);
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const pixelReduction = original && resized
    ? Math.round((1 - (resized.width * resized.height) / (original.width * original.height)) * 100)
    : null;

  const copyToClipboard = async () => {
    if (!blobRef.current) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blobRef.current }),
      ]);
      setCopyState('copied');
    } catch (err) {
      console.warn('clipboard write failed', err);
      setCopyState('failed');
    }
  };

  return (
    <>
      <Head>
        <title>{t.pageTitle}</title>
        <meta name="description" content={t.pageDescription} />
      </Head>
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px' }}>
        <div style={{ width: '100%', maxWidth: '860px' }}>
          <ToolNav lang={lang} active="image" />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '12px' }}>
          {t.title}
        </h1>
        <p style={{ color: '#666', marginBottom: '30px', textAlign: 'center', maxWidth: '480px' }}>
          {t.intro}
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          style={{
            width: '100%',
            maxWidth: '480px',
            minHeight: '200px',
            border: `2px dashed ${dragging ? '#2563eb' : '#9ca3af'}`,
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            background: dragging ? '#eff6ff' : 'white',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          {status === 'no-image' && (
            <p style={{ color: '#991b1b', margin: 0 }}>{t.statusNoImage}</p>
          )}
          {status === 'not-image' && (
            <p style={{ color: '#991b1b', margin: 0 }}>{t.statusNotImage}</p>
          )}
          {status === 'error' && (
            <p style={{ color: '#991b1b', margin: 0 }}>{t.statusError}</p>
          )}
          {status === 'processing' && <p style={{ color: '#9ca3af', margin: 0 }}>{t.statusProcessing}</p>}
          {status === 'done' && previewUrl && (
            <img src={previewUrl} alt={t.previewAlt} style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
          )}

          {status !== 'processing' && (
            <div>
              {status !== 'done' && (
                <p style={{ color: '#9ca3af', margin: '0 0 12px 0' }}>{t.statusIdle}</p>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2563eb',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {t.selectFile}
              </button>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '10px 0 0 0' }}>{t.dropHint}</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              // Lets the same file be picked again after a reset.
              e.target.value = '';
            }}
          />
        </div>

        {status === 'done' && original && resized && (
          <div style={{
            marginTop: '20px',
            background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #6ee7b7',
            width: '100%',
            maxWidth: '480px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#047857', fontWeight: '600' }}>{t.statSize}</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669', margin: '4px 0 0 0' }}>
                  {original.width}×{original.height} → {resized.width}×{resized.height}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#047857', fontWeight: '600' }}>{t.statPixelReduction}</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669', margin: '4px 0 0 0' }}>
                  {t.pixelReductionFormat(pixelReduction)}
                </p>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#047857', marginTop: '12px' }}>
              {t.statFileSize}: {Math.round(original.bytes / 1024)} KB → {Math.round(resized.bytes / 1024)} KB
            </p>
          </div>
        )}

        {status === 'done' && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={copyToClipboard}
              style={{
                padding: '10px 20px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              {copyState === 'copied' ? t.copied : t.copy}
            </button>
            {copyState === 'failed' && (
              <p style={{ fontSize: '12px', color: '#991b1b', marginTop: '8px' }}>
                {t.copyFailed}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
