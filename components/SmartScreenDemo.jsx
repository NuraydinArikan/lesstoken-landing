/**
 * A looping, stylised recreation of the Windows SmartScreen dialog.
 *
 * The screen hides "Run anyway" behind a "More info" link, which is why people
 * give up on it. Showing the two clicks is far clearer than describing them.
 */
export default function SmartScreenDemo({ labels }) {
  return (
    <div className="ss-wrap" aria-hidden="true">
      <div className="ss-dialog">
        <div className="ss-title">{labels.dialogTitle}</div>
        <div className="ss-body">{labels.dialogBody}</div>

        <button className="ss-link" type="button" tabIndex={-1}>
          {labels.more}
        </button>

        <div className="ss-details">
          <div className="ss-detail-row">
            <span className="ss-detail-key">{labels.appLabel}</span>
            <span>lesstoken-setup.exe</span>
          </div>
          <div className="ss-detail-row">
            <span className="ss-detail-key">{labels.publisherLabel}</span>
            <span>{labels.publisherValue}</span>
          </div>
          <button className="ss-run" type="button" tabIndex={-1}>
            {labels.runAnyway}
          </button>
        </div>

        <div className="ss-footer">
          <span className="ss-dont">{labels.dontRun}</span>
        </div>

        <span className="ss-cursor" />
      </div>

      <style jsx>{`
        .ss-wrap {
          display: flex;
          justify-content: center;
          margin-top: 1.25rem;
        }
        .ss-dialog {
          position: relative;
          width: 100%;
          max-width: 420px;
          background: #0f6c74;
          color: #fff;
          border-radius: 10px;
          padding: 20px 20px 16px;
          font-size: 13px;
          line-height: 1.5;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
          overflow: hidden;
        }
        .ss-title {
          font-size: 17px;
          font-weight: 600;
          margin-bottom: 10px;
        }
        .ss-body {
          opacity: 0.9;
          margin-bottom: 8px;
        }
        .ss-link {
          background: none;
          border: none;
          padding: 0;
          color: #fff;
          font: inherit;
          text-decoration: underline;
          cursor: default;
          border-radius: 3px;
          animation: ss-link-flash 9s ease-in-out infinite;
        }
        .ss-details {
          margin-top: 10px;
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          animation: ss-reveal 9s ease-in-out infinite;
        }
        .ss-detail-row {
          display: flex;
          gap: 8px;
          opacity: 0.9;
        }
        .ss-detail-key {
          min-width: 78px;
          opacity: 0.75;
        }
        .ss-run {
          margin-top: 12px;
          background: #ffffff;
          color: #0f6c74;
          border: none;
          border-radius: 4px;
          padding: 7px 16px;
          font: inherit;
          font-weight: 600;
          cursor: default;
          animation: ss-run-flash 9s ease-in-out infinite;
        }
        .ss-footer {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }
        .ss-dont {
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 4px;
          padding: 6px 18px;
          opacity: 0.75;
        }
        .ss-cursor {
          position: absolute;
          width: 16px;
          height: 22px;
          left: 0;
          top: 0;
          pointer-events: none;
          background: no-repeat center/contain
            url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 22'><path d='M1 1l13 10-5.6.9 3.2 6.4-2.6 1.3-3.2-6.4-3.8 4z' fill='white' stroke='black' stroke-width='1.2' stroke-linejoin='round'/></svg>");
          animation: ss-cursor-move 9s ease-in-out infinite;
        }

        /* The link is revealed, clicked, and the panel behind it opens. */
        @keyframes ss-cursor-move {
          0%,
          14% {
            transform: translate(300px, 150px);
          }
          26%,
          40% {
            transform: translate(38px, 74px);
          }
          52%,
          72% {
            transform: translate(86px, 150px);
          }
          84%,
          100% {
            transform: translate(300px, 150px);
          }
        }
        @keyframes ss-link-flash {
          0%,
          25% {
            background: transparent;
          }
          28%,
          33% {
            background: rgba(255, 255, 255, 0.3);
          }
          36%,
          100% {
            background: transparent;
          }
        }
        @keyframes ss-reveal {
          0%,
          32% {
            max-height: 0;
            opacity: 0;
          }
          42%,
          88% {
            max-height: 150px;
            opacity: 1;
          }
          96%,
          100% {
            max-height: 0;
            opacity: 0;
          }
        }
        @keyframes ss-run-flash {
          0%,
          68% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
          }
          74% {
            transform: scale(0.96);
            box-shadow: 0 0 0 8px rgba(255, 255, 255, 0.25);
          }
          80%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
          }
        }

        /* A looping animation is exactly what motion sensitivity flags, so
           hold the useful end state instead of animating to it. */
        @media (prefers-reduced-motion: reduce) {
          .ss-cursor {
            display: none;
          }
          .ss-link,
          .ss-run,
          .ss-details {
            animation: none;
          }
          .ss-details {
            max-height: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
