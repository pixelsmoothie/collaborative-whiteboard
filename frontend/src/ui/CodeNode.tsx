import { useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { Play, X } from "lucide-react";

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
    onDragStart: (id: string, e: React.MouseEvent) => void;
    onResizeStart: (id: string, e: React.MouseEvent) => void;
    onCodeChange: (id: string, code: string) => void;
    onClose: (id: string) => void;
    onRun: (id: string, output: string) => void;
};

//sandboxed, no allow-same-origin -- cannot touch this page/cookies, only runs JS and reports back
function runInSandbox(code: string): Promise<string>
{
    return new Promise((resolve) =>
    {
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

        function onMessage(e: MessageEvent)
        {
            if (e.source !== iframe.contentWindow) return;
            window.removeEventListener("message", onMessage);
            iframe.remove();
            resolve(e.data.__sandboxResult || "(no output)");
        }
        window.addEventListener("message", onMessage);
        document.body.appendChild(iframe);
    });
}

//floating draggable/resizable box, comfyui-style node but for code instead of pixels
export default function CodeNode({ node, onDragStart, onResizeStart, onCodeChange, onClose, onRun }: Props)
{
    const [running, setRunning] = useState(false);
    const codeRef = useRef(node.code);
    codeRef.current = node.code;                //keep latest code around for handleRun's closure

    async function handleRun()
    {
        setRunning(true);
        const result = await runInSandbox(codeRef.current);
        onRun(node.id, result);                  //broadcast to everyone in the room, not just us
        setRunning(false);
    }

    return (
        <div
            className="absolute flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
            style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
        >
            <div
                className="flex cursor-move items-center justify-between bg-gray-800 px-3 py-1.5 text-xs text-white"
                onMouseDown={(e) => onDragStart(node.id, e)}
            >
                <span>Code</span>
                <div className="flex items-center gap-3">
                    <button onClick={handleRun} disabled={running} className="flex items-center gap-1 hover:text-green-400 disabled:opacity-50">
                        <Play size={12} fill="currentColor" />
                        {running ? "Running..." : "Run"}
                    </button>
                    <button onClick={() => onClose(node.id)} className="hover:text-red-400">
                        <X size={14} />
                    </button>
                </div>
            </div>

            <div className="min-h-0 flex-1">
                <Editor
                    language="javascript"
                    value={node.code}
                    onChange={(value) => onCodeChange(node.id, value ?? "")}
                    theme="vs-dark"
                    options={{ minimap: { enabled: false }, fontSize: 13 }}
                />
            </div>

            {node.output !== null && (
                <div className="max-h-24 overflow-auto border-t border-gray-300 bg-black px-2 py-1 font-mono text-xs text-green-400">
                    {node.output}
                </div>
            )}

            {/* drag this corner to resize */}
            <div
                onMouseDown={(e) => onResizeStart(node.id, e)}
                className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
                style={{ background: "linear-gradient(135deg, transparent 50%, #9ca3af 50%)" }}
            />
        </div>
    );
}
