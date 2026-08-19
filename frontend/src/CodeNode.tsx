import Editor from "@monaco-editor/react";

export type CodeNodeData = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  code: string;
};

type Props = {
  node: CodeNodeData;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onCodeChange: (id: string, code: string) => void;
  onClose: (id: string) => void;
};

// A draggable box that floats on top of the canvas with a Monaco editor inside --
// like a ComfyUI node, but for showing/teaching code instead of pixels.
export default function CodeNode({ node, onDragStart, onCodeChange, onClose }: Props) {
  return (
    <div
      className="absolute flex flex-col overflow-hidden rounded-md border border-gray-300 bg-white shadow-lg"
      style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
    >
      <div
        className="flex cursor-move items-center justify-between bg-gray-800 px-3 py-1.5 text-xs text-white"
        onMouseDown={(e) => onDragStart(node.id, e)}
      >
        <span>Code</span>
        <button onClick={() => onClose(node.id)} className="px-1 hover:text-red-400">
          ✕
        </button>
      </div>
      <div className="flex-1">
        <Editor
          language="javascript"
          value={node.code}
          onChange={(value) => onCodeChange(node.id, value ?? "")}
          theme="vs-dark"
          options={{ minimap: { enabled: false }, fontSize: 13 }}
        />
      </div>
    </div>
  );
}
