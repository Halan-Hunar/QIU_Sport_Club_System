import { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Loader2, Smartphone, Square } from 'lucide-react';
import Modal from './Modal';
import ExportCanvas from './ExportCanvas';

const ASPECT_OPTIONS = [
  { id: '9:16', label: 'Stories', size: '1080×1920', icon: Smartphone, w: 1080, h: 1920 },
  { id: '1:1',  label: 'Square',  size: '1080×1080', icon: Square,     w: 1080, h: 1080 },
];

export default function TeamExportModal({ open, onClose, team, players, captains }) {
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(0.25);

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const compute = () => {
      const el = previewRef.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      const dim = ASPECT_OPTIONS.find((a) => a.id === aspectRatio);
      if (!dim) return;
      const scale = Math.min(width / dim.w, height / dim.h);
      setPreviewScale(scale > 0 ? scale : 0.25);
    };
    compute();
    window.addEventListener('resize', compute);
    const t = setTimeout(compute, 50);
    return () => {
      window.removeEventListener('resize', compute);
      clearTimeout(t);
    };
  }, [open, aspectRatio]);

  const handleDownload = async () => {
    if (!canvasRef.current || downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const dim = ASPECT_OPTIONS.find((a) => a.id === aspectRatio);
      const dataUrl = await toPng(canvasRef.current, {
        width: dim.w,
        height: dim.h,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#06334e',
      });
      const safeName = (team?.name || 'team').replace(/[^a-z0-9-_]+/gi, '_').toLowerCase();
      const link = document.createElement('a');
      link.download = `${safeName}-squad.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      setError(err?.message || 'Export failed.');
    } finally {
      setDownloading(false);
    }
  };

  const dim = ASPECT_OPTIONS.find((a) => a.id === aspectRatio);

  return (
    <Modal
      open={open}
      onClose={downloading ? () => {} : onClose}
      title="Export Squad"
      subtitle="Generate a styled PNG ready for social."
    >
      <div className="space-y-5">
        {/* Aspect ratio */}
        <div>
          <p className="font-label text-label-md uppercase tracking-wider
                        text-ink-variant mb-2">Aspect Ratio</p>
          <div className="grid grid-cols-2 gap-2">
            {ASPECT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = aspectRatio === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAspectRatio(opt.id)}
                  className={`flex flex-col items-center gap-1 py-3 px-2
                              rounded-sm border transition-all
                              ${active
                                ? 'border-primary bg-primary-container/10 text-primary'
                                : 'border-outline-variant/40 text-ink-variant hover:bg-surface-low'}`}
                >
                  <Icon size={18} strokeWidth={2} />
                  <span className="text-xs font-semibold">{opt.id}</span>
                  <span className="text-[10px] text-ink-variant">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        <div>
          <p className="font-label text-label-md uppercase tracking-wider
                        text-ink-variant mb-2">Preview</p>
          <div
            ref={previewRef}
            className="w-full bg-ink/5 rounded-md border border-outline-variant/40
                       overflow-hidden flex items-center justify-center"
            style={{ height: 'min(55vh, 460px)' }}
          >
            <div
              style={{
                width: dim.w * previewScale,
                height: dim.h * previewScale,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                  width: dim.w,
                  height: dim.h,
                }}
              >
                <ExportCanvas
                  type="squad"
                  team={team}
                  players={players}
                  captains={captains}
                  aspectRatio={aspectRatio}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-ink-variant mt-2 text-center">
            {dim.size} · {dim.id}
          </p>
        </div>

        {error && (
          <div className="bg-danger-container text-danger-on-container
                          rounded-sm px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="sc-btn-primary w-full"
        >
          {downloading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Exporting…
            </>
          ) : (
            <>
              <Download size={16} strokeWidth={2.25} />
              Download PNG
            </>
          )}
        </button>
      </div>

      {/* Off-screen full-resolution canvas for capture */}
      <div
        style={{
          position: 'fixed',
          left: -9999,
          top: -9999,
          width: dim.w,
          height: dim.h,
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        <ExportCanvas
          ref={canvasRef}
          type="squad"
          team={team}
          players={players}
          captains={captains}
          aspectRatio={aspectRatio}
        />
      </div>
    </Modal>
  );
}
