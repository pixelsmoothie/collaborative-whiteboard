import { useEffect, useRef, useState } from "react";
import Toolbar from "./Toolbar";

// Change these if your backend runs somewhere else.
const API_URL = "http://localhost:8080";
const WS_URL = "ws://localhost:8080/ws/board";

// A "draw" message is just: draw a line from (prevX, prevY) to (x, y).
type DrawMsg = {
  type: "draw";
  prevX: number;
  prevY: number;
  x: number;
  y: number;
  color: string;
  size: number;
};

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

  // Make the canvas fill its container and match its pixel size.
  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }, []);

  // Open the WebSocket once. If it drops, keep retrying every second.
  useEffect(() => {
    let cancelled = false;

    function connect() {
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      // A message arrived from another browser: draw it here too.
      socket.onmessage = (event) => {
        const msg: DrawMsg = JSON.parse(event.data);
        drawLine(msg.prevX, msg.prevY, msg.x, msg.y, msg.color, msg.size);
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

  // Draws one line segment on the canvas. Used for both local and remote strokes.
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

  function pointFromEvent(e: React.MouseEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleMouseDown(e: React.MouseEvent) {
    isDrawing.current = true;
    lastPoint.current = pointFromEvent(e);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDrawing.current) return;

    const point = pointFromEvent(e);
    const strokeColor = isEraser ? "#ffffff" : color;
    const strokeSize = isEraser ? Math.max(size, 20) : size;

    // 1. Draw locally right away, so it feels instant.
    drawLine(lastPoint.current.x, lastPoint.current.y, point.x, point.y, strokeColor, strokeSize);

    // 2. Tell everyone else to draw the same line (only if the connection is actually open).
    const msg: DrawMsg = { type: "draw", prevX: lastPoint.current.x, prevY: lastPoint.current.y, x: point.x, y: point.y, color: strokeColor, size: strokeSize };
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }

    lastPoint.current = point;
  }

  function handleMouseUp() {
    isDrawing.current = false;
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

  return (
    <div className="flex h-screen w-screen flex-col">
      <header className="border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold">Collaborative Whiteboard</h1>
      </header>

      <Toolbar
        color={color}
        onColorChange={setColor}
        size={size}
        onSizeChange={setSize}
        isEraser={isEraser}
        onToggleEraser={() => setIsEraser((prev) => !prev)}
        onClear={handleClear}
        onSave={handleSave}
        saving={saving}
        savedUrl={savedUrl}
      />

      <canvas
        ref={canvasRef}
        className="flex-1 cursor-crosshair bg-white"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
