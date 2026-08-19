import React from "react";

// A short alias for React.createElement, purely so the nested calls below don't become
// unreadably wide. In real compiled JSX output the compiler always writes the full
// "React.createElement(...)" (or, with the newer JSX transform, an auto-imported "jsx(...)"
// function) -- this alias is just a hand-written convenience, not something JSX itself does.
const e = React.createElement;

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
  // Every JSX element becomes one e(...) call. The structure nests exactly the way the JSX
  // tags were nested -- a child element becomes an argument passed after the props object.
  return e(
    "div", // plain string = a real HTML tag, not a React component
    { className: "flex flex-wrap items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3" },

    // --- First child: the color swatch row ---
    e(
      "div",
      { className: "flex items-center gap-2" },
      // In JSX, "{PALETTE.map(...)}" embeds an ARRAY of elements as children. createElement
      // accepts an array as a single child argument the same way JSX does.
      PALETTE.map((swatch) =>
        e("button", {
          // React still requires a "key" prop when you hand it an array of elements, exactly
          // as it does with JSX -- this is a React requirement, not a JSX-specific one.
          key: swatch,
          onClick: () => {
            onColorChange(swatch);
            if (isEraser) onToggleEraser();
          },
          className: `h-7 w-7 rounded-full border-2 transition ${
            !isEraser && color === swatch ? "border-black" : "border-transparent"
          }`,
          style: { backgroundColor: swatch },
          "aria-label": `color ${swatch}`, // props with a dash in the name must be quoted as string keys
        })
      )
    ),

    // --- Second child: the Eraser button ---
    e(
      "button",
      {
        onClick: onToggleEraser,
        className: `rounded-md px-3 py-1.5 text-sm font-medium transition ${
          isEraser ? "bg-black text-white" : "bg-white text-black border border-gray-300"
        }`,
      },
      "Eraser" // a plain string as a child = the button's visible text content
    ),

    // --- Third child: the Size slider ---
    e(
      "label",
      { className: "flex items-center gap-2 text-sm text-gray-600" },
      "Size",
      e("input", {
        type: "range",
        min: 2,
        max: 40,
        value: size,
        onChange: (ev: React.ChangeEvent<HTMLInputElement>) => onSizeChange(Number(ev.target.value)),
      })
    ),

    // --- Fourth child: the right-aligned button group ---
    e(
      "div",
      { className: "ml-auto flex items-center gap-2" },
      e(
        "button",
        { onClick: onAddCodeNode, className: "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-100" },
        "+ Code Node"
      ),
      e(
        "button",
        { onClick: onShare, className: "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-100" },
        // The JSX ternary "{copied ? ... : ...}" is just a plain JS ternary expression here too --
        // JSX never had special ternary syntax, it always just evaluated normal JS inside the braces.
        copied ? "Link copied!" : "Share Board"
      ),
      e(
        "button",
        { onClick: onClear, className: "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-100" },
        "Clear"
      ),
      e(
        "button",
        { onClick: onDownload, className: "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-100" },
        "Download"
      ),
      e(
        "button",
        {
          onClick: onSave,
          disabled: saving,
          className: "rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50",
        },
        saving ? "Saving..." : "Save Board"
      ),
      // JSX's "{savedUrl && (<a>...)}" conditional-rendering trick is ALSO just plain JS: if
      // savedUrl is falsy (null), the && short-circuits and the whole expression evaluates to
      // that falsy value -- and React simply renders nothing for null/false/undefined children.
      savedUrl &&
        e(
          "a",
          { href: savedUrl, target: "_blank", rel: "noreferrer", className: "text-sm text-blue-600 underline" },
          "View saved"
        )
    )
  );
}
