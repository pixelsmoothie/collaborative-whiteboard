import React, { useRef, useState } from "react";
import Editor from "@monaco-editor/react";

const e = React.createElement;

export type CodeNodeData = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  code: string;
  output: string | null;
};

type Props = {
  node: CodeNodeData;
  onDragStart: (id: string, ev: React.MouseEvent) => void;
  onResizeStart: (id: string, ev: React.MouseEvent) => void;
  onCodeChange: (id: string, code: string) => void;
  onClose: (id: string) => void;
  onRun: (id: string, output: string) => void;
};

// This part has NO JSX in the original file either -- it's plain JS/TS logic, so it's
// completely unchanged from the .tsx version. The only thing .tsx vs .ts affects is
// whether angle-bracket syntax is allowed to appear in the file at all.
function runInSandbox(code: string): Promise<string> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.sandbox.add("allow-scripts");
    iframe.style.display = "none";
    iframe.srcdoc = `<script>
      const lines = [];
      const send = () => { parent.postMessage({ __sandboxResult: lines.join("\\n") }, "*"); };
      ["log", "error", "warn"].forEach((m) => {
        console[m] = (...args) => lines.push(args.map(String).join(" "));
      });
      try {
        ${code}
      } catch (err) {
        lines.push("Error: " + err.message);
      }
      send();
    </script>`;

    function onMessage(ev: MessageEvent) {
      if (ev.source !== iframe.contentWindow) return;
      window.removeEventListener("message", onMessage);
      iframe.remove();
      resolve(ev.data.__sandboxResult || "(no output)");
    }
    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
  });
}

export default function CodeNode({ node, onDragStart, onResizeStart, onCodeChange, onClose, onRun }: Props) {
  const [running, setRunning] = useState(false);
  const codeRef = useRef(node.code);
  codeRef.current = node.code;

  async function handleRun() {
    setRunning(true);
    const result = await runInSandbox(codeRef.current);
    onRun(node.id, result);
    setRunning(false);
  }

  // Everything below this point is where the original file's JSX gets desugared.
  return e(
    "div",
    {
      className: "absolute flex flex-col overflow-hidden rounded-md border border-gray-300 bg-white shadow-lg",
      style: { left: node.x, top: node.y, width: node.width, height: node.height },
    },

    // The dark draggable header bar, with its two nested buttons.
    e(
      "div",
      {
        className: "flex cursor-move items-center justify-between bg-gray-800 px-3 py-1.5 text-xs text-white",
        onMouseDown: (ev: React.MouseEvent) => onDragStart(node.id, ev),
      },
      e("span", null, "Code"),
      e(
        "div",
        { className: "flex items-center gap-2" },
        e(
          "button",
          { onClick: handleRun, disabled: running, className: "px-1 hover:text-green-400 disabled:opacity-50" },
          running ? "Running..." : "▶ Run"
        ),
        e(
          "button",
          { onClick: () => onClose(node.id), className: "px-1 hover:text-red-400" },
          "✕"
        )
      )
    ),

    // The Monaco editor. Note: Editor is a REACT COMPONENT (imported at the top), not a
    // plain HTML tag string -- so the first argument to e() here is the component function
    // itself, exactly the same way "App" was passed (not "app") in main.ts.
    e(
      "div",
      { className: "min-h-0 flex-1" },
      e(Editor, {
        language: "javascript",
        value: node.code,
        onChange: (value: string | undefined) => onCodeChange(node.id, value ?? ""),
        theme: "vs-dark",
        options: { minimap: { enabled: false }, fontSize: 13 },
      })
    ),

    // JSX's "{node.output !== null && (<div>...)}" conditional -- same short-circuit trick
    // as the "savedUrl &&" line in Toolbar.ts: a falsy left side means React renders nothing.
    node.output !== null &&
      e(
        "div",
        { className: "max-h-24 overflow-auto border-t border-gray-300 bg-black px-2 py-1 font-mono text-xs text-green-400" },
        node.output
      ),

    // The resize handle in the bottom-right corner.
    e("div", {
      onMouseDown: (ev: React.MouseEvent) => onResizeStart(node.id, ev),
      className: "absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize",
      style: { background: "linear-gradient(135deg, transparent 50%, #9ca3af 50%)" },
    })
  );
}
