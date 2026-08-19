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
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-2">
        {PALETTE.map((swatch) => (
          <button
            key={swatch}
            onClick={() => {
              onColorChange(swatch);
              if (isEraser) onToggleEraser();
            }}
            className={`h-7 w-7 rounded-full border-2 transition ${
              !isEraser && color === swatch ? "border-black" : "border-transparent"
            }`}
            style={{ backgroundColor: swatch }}
            aria-label={`color ${swatch}`}
          />
        ))}
      </div>

      <button
        onClick={onToggleEraser}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
          isEraser ? "bg-black text-white" : "bg-white text-black border border-gray-300"
        }`}
      >
        Eraser
      </button>

      <label className="flex items-center gap-2 text-sm text-gray-600">
        Size
        <input
          type="range"
          min={2}
          max={40}
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
        />
      </label>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onAddCodeNode}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
        >
          + Code Node
        </button>
        <button
          onClick={onShare}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
        >
          {copied ? "Link copied!" : "Share Board"}
        </button>
        <button
          onClick={onClear}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
        >
          Clear
        </button>
        <button
          onClick={onDownload}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
        >
          Download
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Board"}
        </button>
        {savedUrl && (
          <a
            href={savedUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 underline"
          >
            View saved
          </a>
        )}
      </div>
    </div>
  );
}
