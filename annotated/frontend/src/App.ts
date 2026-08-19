import React, { useEffect, useRef, useState } from "react";
import Toolbar from "./Toolbar";
import CodeNode, { type CodeNodeData } from "./CodeNode";

// Same alias as the other files -- just React.createElement under a shorter name.
const e = React.createElement;

const API_URL = "https://skitch-board.onrender.com";
const WS_URL = "wss://skitch-board.onrender.com/ws/board";

function getRoomId(): string {
  const params = new URLSearchParams(window.location.search);
  let roomId = params.get("room");
  if (!roomId) {
    roomId = Math.random().toString(36).slice(2, 10);
    params.set("room", roomId);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }
  return roomId;
}

type DrawMsg = {
  type: "draw";
  prevX: number;
  prevY: number;
  x: number;
  y: number;
  color: string;
  size: number;
};

type NodeAddMsg = { type: "node-add"; node: CodeNodeData };
type NodeMoveMsg = { type: "node-move"; id: string; x: number; y: number };
type NodeResizeMsg = { type: "node-resize"; id: string; width: number; height: number };
type NodeEditMsg = { type: "node-edit"; id: string; code: string };
type NodeOutputMsg = { type: "node-output"; id: string; output: string };
type NodeCloseMsg = { type: "node-close"; id: string };

type BoardMsg = DrawMsg | NodeAddMsg | NodeMoveMsg | NodeResizeMsg | NodeEditMsg | NodeOutputMsg | NodeCloseMsg;

// --- Everything from here down to the `return e(...)` at the very end is IDENTICAL logic to
// App.tsx. None of the hooks, event handlers, or WebSocket code involve JSX -- JSX only ever
// appeared in the final `return (...)` block, which is why that's the only part that changes
// between the .tsx and .ts versions of this file. ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });

  const [color, setColor] = useState("#111111");
  const [size, setSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const roomId = useRef(getRoomId()).current;

  const [nodes, setNodes] = useState<CodeNodeData[]>([]);
  const action = useRef<{ mode: "move" | "resize"; id: string; startX: number; startY: number; origin: CodeNodeData } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }, []);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      const socket = new WebSocket(`${WS_URL}/${roomId}`);
      socketRef.current = socket;

      socket.onmessage = (event) => {
        const msg: BoardMsg = JSON.parse(event.data);
        if (msg.type === "draw") {
          drawLine(msg.prevX, msg.prevY, msg.x, msg.y, msg.color, msg.size);
        } else if (msg.type === "node-add") {
          setNodes((prev) => [...prev, msg.node]);
        } else if (msg.type === "node-move") {
          setNodes((prev) => prev.map((n) => (n.id === msg.id ? { ...n, x: msg.x, y: msg.y } : n)));
        } else if (msg.type === "node-resize") {
          setNodes((prev) => prev.map((n) => (n.id === msg.id ? { ...n, width: msg.width, height: msg.height } : n)));
        } else if (msg.type === "node-edit") {
          setNodes((prev) => prev.map((n) => (n.id === msg.id ? { ...n, code: msg.code } : n)));
        } else if (msg.type === "node-output") {
          setNodes((prev) => prev.map((n) => (n.id === msg.id ? { ...n, output: msg.output } : n)));
        } else if (msg.type === "node-close") {
          setNodes((prev) => prev.filter((n) => n.id !== msg.id));
        }
      };

      socket.onclose = () => {
        if (!cancelled) setTimeout(connect, 1000);
      };
    }

    connect();
    return () => {
      cancelled = true;
      socketRef.current?.close();
    };
  }, []);

  function drawLine(prevX: number, prevY: number, x: number, y: number, strokeColor: string, strokeSize: number) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeSize;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function pointFromEvent(ev: { clientX: number; clientY: number }) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }

  function startDrawing(point: { x: number; y: number }) {
    isDrawing.current = true;
    lastPoint.current = point;
  }

  function continueDrawing(point: { x: number; y: number }) {
    if (!isDrawing.current) return;
    const strokeColor = isEraser ? "#ffffff" : color;
    const strokeSize = isEraser ? Math.max(size, 20) : size;
    drawLine(lastPoint.current.x, lastPoint.current.y, point.x, point.y, strokeColor, strokeSize);
    send({ type: "draw", prevX: lastPoint.current.x, prevY: lastPoint.current.y, x: point.x, y: point.y, color: strokeColor, size: strokeSize });
    lastPoint.current = point;
  }

  function stopDrawing() {
    isDrawing.current = false;
  }

  function handleMouseDown(ev: React.MouseEvent) {
    startDrawing(pointFromEvent(ev));
  }

  function handleMouseMove(ev: React.MouseEvent) {
    continueDrawing(pointFromEvent(ev));
  }

  function handleTouchStart(ev: React.TouchEvent) {
    ev.preventDefault();
    startDrawing(pointFromEvent(ev.touches[0]));
  }

  function handleTouchMove(ev: React.TouchEvent) {
    ev.preventDefault();
    continueDrawing(pointFromEvent(ev.touches[0]));
  }

  function send(msg: BoardMsg) {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  }

  function handleAddCodeNode() {
    const node: CodeNodeData = {
      id: Math.random().toString(36).slice(2, 10),
      x: 80,
      y: 80,
      width: 420,
      height: 280,
      code: "// start typing...\n",
      output: null,
    };
    setNodes((prev) => [...prev, node]);
    send({ type: "node-add", node });
  }

  function handleNodeDragStart(id: string, ev: React.MouseEvent) {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    action.current = { mode: "move", id, startX: ev.clientX, startY: ev.clientY, origin: node };
  }

  function handleNodeResizeStart(id: string, ev: React.MouseEvent) {
    ev.stopPropagation();
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    action.current = { mode: "resize", id, startX: ev.clientX, startY: ev.clientY, origin: node };
  }

  useEffect(() => {
    function onMouseMove(ev: MouseEvent) {
      const current = action.current;
      if (!current) return;
      const { mode, id, startX, startY, origin } = current;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (mode === "move") {
        const x = origin.x + dx;
        const y = origin.y + dy;
        setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
        send({ type: "node-move", id, x, y });
      } else {
        const width = Math.max(220, origin.width + dx);
        const height = Math.max(140, origin.height + dy);
        setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, width, height } : n)));
        send({ type: "node-resize", id, width, height });
      }
    }
    function onMouseUp() {
      action.current = null;
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function handleNodeCodeChange(id: string, code: string) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, code } : n)));
    send({ type: "node-edit", id, code });
  }

  function handleNodeRun(id: string, output: string) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, output } : n)));
    send({ type: "node-output", id, output });
  }

  function handleNodeClose(id: string) {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    send({ type: "node-close", id });
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleClear() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function handleSave() {
    setSaving(true);
    const imageDataUrl = canvasRef.current!.toDataURL("image/png");
    const res = await fetch(`${API_URL}/api/board/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageDataUrl }),
    });
    const data = await res.json();
    setSavedUrl(data.url);
    setSaving(false);
  }

  function handleDownload() {
    const link = document.createElement("a");
    link.href = canvasRef.current!.toDataURL("image/png");
    link.download = `whiteboard-${roomId}.png`;
    link.click();
  }

  // --- Here's the part that actually changes: the JSX return block, desugared to nested
  // e() = React.createElement() calls. Compare this shape directly against App.tsx's return
  // statement -- every <tag prop={x}>child</tag> became e("tag", {prop: x}, child). ---
  return e(
    "div",
    { className: "flex h-screen w-screen flex-col" },

    e(
      "header",
      { className: "border-b border-gray-200 px-4 py-3" },
      e("h1", { className: "text-lg font-semibold" }, "Collaborative Whiteboard")
    ),

    // Toolbar is a component (imported function), so it's passed as the TYPE argument here,
    // and its props object lists everything App.tsx used to pass as JSX attributes.
    e(Toolbar, {
      color,
      onColorChange: setColor,
      size,
      onSizeChange: setSize,
      isEraser,
      onToggleEraser: () => setIsEraser((prev) => !prev),
      onClear: handleClear,
      onSave: handleSave,
      saving,
      savedUrl,
      onDownload: handleDownload,
      onShare: handleShare,
      copied,
      onAddCodeNode: handleAddCodeNode,
    }),

    e(
      "div",
      { className: "relative flex-1 overflow-hidden" },
      e("canvas", {
        ref: canvasRef,
        className: "absolute inset-0 h-full w-full touch-none cursor-crosshair bg-white",
        onMouseDown: handleMouseDown,
        onMouseMove: handleMouseMove,
        onMouseUp: stopDrawing,
        onMouseLeave: stopDrawing,
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: stopDrawing,
      }),
      // The JSX "{nodes.map((node) => <CodeNode .../>)}" becomes exactly this: an array of
      // e(CodeNode, {...}) calls, passed as a single child argument to the outer e("div", ...).
      nodes.map((node) =>
        e(CodeNode, {
          key: node.id,
          node,
          onDragStart: handleNodeDragStart,
          onResizeStart: handleNodeResizeStart,
          onCodeChange: handleNodeCodeChange,
          onRun: handleNodeRun,
          onClose: handleNodeClose,
        })
      )
    )
  );
}
