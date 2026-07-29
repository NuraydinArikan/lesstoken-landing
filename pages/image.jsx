// pages/image.jsx
import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import ToolNav from '../components/ToolNav';
import { computeTargetDimensions } from '../lib/imageResize';
import { detectLang } from '../lib/toolI18n';

const MAX_WIDTH = 1024;
const MAX_HEIGHT = 768;

export default function ImageResizePage() {
  const [lang, setLang] = useState('tr');
  const [status, setStatus] = useState('idle'); // idle | processing | done | no-image | error
  const [previewUrl, setPreviewUrl] = useState(null);
  const [original, setOriginal] = useState(null); // { width, height, bytes }
  const [resized, setResized] = useState(null); // { width, height, bytes }
  const [copyState, setCopyState] = useState('idle'); // idle | copied | failed
  const blobRef = useRef(null);
  const previewUrlRef = useRef(null);
  const pasteSeqRef = useRef(0);

  useEffect(() => {
    setLang(detectLang());
  }, []);

  useEffect(() => {
    const handlePaste = (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const imageItem = Array.from(items).find((item) => item.kind === 'file' && item.type.startsWith('image/'));
      if (!imageItem) {
        setStatus('no-image');
        return;
      }

      const mySeq = ++pasteSeqRef.current;

      setStatus('processing');
      setPreviewUrl(null);
      setCopyState('idle');
      blobRef.current = null;

      const sourceBlob = imageItem.getAsFile();
      if (!sourceBlob) {
        setStatus('error');
        return;
      }

      createImageBitmap(sourceBlob).then((bitmap) => {
        const { width, height } = computeTargetDimensions(bitmap.width, bitmap.height, MAX_WIDTH, MAX_HEIGHT);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);

        canvas.toBlob((resizedBlob) => {
          if (mySeq !== pasteSeqRef.current) return;

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
        if (mySeq !== pasteSeqRef.current) return;
        setStatus('error');
      });
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
        <title>Görsel Küçült - LessToken</title>
        <meta name="description" content="Bir görseli panodan yapıştırın, tarayıcınızda küçültülmüş halini alın. Sunucuya yükleme yok, ücretsiz." />
      </Head>
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px' }}>
        <div style={{ width: '100%', maxWidth: '860px' }}>
          <ToolNav lang={lang} active="image" />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '12px' }}>
          Görsel Küçült
        </h1>
        <p style={{ color: '#666', marginBottom: '30px', textAlign: 'center', maxWidth: '480px' }}>
          Bir görseli kopyalayın (ekran görüntüsü, resim vb.) ve buraya yapıştırın (Ctrl+V).
          Sunucuya hiçbir şey yüklenmez, işlem tamamen tarayıcınızda yapılır.
        </p>

        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            minHeight: '200px',
            border: '2px dashed #9ca3af',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          {status === 'idle' && <p style={{ color: '#9ca3af' }}>Buraya tıklayıp Ctrl+V ile yapıştırın</p>}
          {status === 'no-image' && (
            <p style={{ color: '#991b1b' }}>Panoda görsel bulunamadı. Bir görsel kopyalayıp tekrar deneyin.</p>
          )}
          {status === 'error' && (
            <p style={{ color: '#991b1b' }}>Görsel işlenemedi. Farklı bir görsel deneyin.</p>
          )}
          {status === 'processing' && <p style={{ color: '#9ca3af' }}>İşleniyor...</p>}
          {status === 'done' && previewUrl && (
            <img src={previewUrl} alt="Küçültülmüş görsel önizleme" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
          )}
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
                <p style={{ fontSize: '12px', color: '#047857', fontWeight: '600' }}>Boyut</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669', margin: '4px 0 0 0' }}>
                  {original.width}×{original.height} → {resized.width}×{resized.height}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#047857', fontWeight: '600' }}>Piksel Azaltma</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669', margin: '4px 0 0 0' }}>
                  %{pixelReduction}
                </p>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#047857', marginTop: '12px' }}>
              Dosya boyutu: {Math.round(original.bytes / 1024)} KB → {Math.round(resized.bytes / 1024)} KB
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
              {copyState === 'copied' ? '✓ Kopyalandı' : '📋 Panoya Kopyala'}
            </button>
            {copyState === 'failed' && (
              <p style={{ fontSize: '12px', color: '#991b1b', marginTop: '8px' }}>
                Otomatik kopyalama başarısız oldu. Yukarıdaki butona tekrar tıklayın.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
