import { Eraser, Code2, Share2, Trash2, Download as DownloadIcon, UploadCloud } from "lucide-react";

const PALETTE = ["#111111", "#ef4444", "#3b82f6", "#22c55e"];

type Props = {
  color: string;
  onColorChange: (color: string) => void;
  size: number;
  onSizeChange: (size: number) => void;
  isEraser: boolean;
  onToggleEraser: () => void;
  onClear: () => void;
  onSave: () => void;
  saving: boolean;
  savedUrl: string | null;
  onShare: () => void;
  copied: boolean;
  onAddCodeNode: () => void;
  onDownload: () => void;
};

export default function Toolbar({
  color,
  onColorChange,
  size,
  onSizeChange,
  isEraser,
  onToggleEraser,
  onClear,
  onSave,
  saving,
  savedUrl,
  onShare,
  copied,
  onAddCodeNode,
  onDownload,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur">
      <div className="flex items-center gap-2">
        {PALETTE.map((swatch) => (
          <button
            key={swatch}
            onClick={() => {
              onColorChange(swatch);
              if (isEraser) onToggleEraser();
            }}
            className={`h-6 w-6 rounded-full ring-2 ring-offset-2 transition ${
              !isEraser && color === swatch ? "ring-gray-900" : "ring-transparent"
            }`}
            style={{ backgroundColor: swatch }}
            aria-label={`color ${swatch}`}
          />
        ))}
      </div>

      <button
        onClick={onToggleEraser}
        title="Eraser"
        className={`rounded-lg p-2 transition ${
          isEraser ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <Eraser size={16} />
      </button>

      <input
        type="range"
        min={2}
        max={40}
        value={size}
        onChange={(e) => onSizeChange(Number(e.target.value))}
        className="w-20"
        title="Pen size"
      />

      <div className="ml-auto flex items-center gap-1">
        <button onClick={onAddCodeNode} title="Code Node" className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">
          <Code2 size={16} />
        </button>
        <button onClick={onShare} title={copied ? "Link copied!" : "Share Board"} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">
          <Share2 size={16} />
        </button>
        <button onClick={onClear} title="Clear" className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">
          <Trash2 size={16} />
        </button>
        <button onClick={onDownload} title="Download" className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">
          <DownloadIcon size={16} />
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          title={saving ? "Saving..." : "Save Board"}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <UploadCloud size={16} />
          {saving ? "Saving..." : "Save"}
        </button>
        {savedUrl && (
          <a href={savedUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">
            View saved
          </a>
        )}
      </div>
    </div>
  );
}
