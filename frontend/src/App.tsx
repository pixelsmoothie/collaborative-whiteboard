import { useEffect, useRef, useState } from "react";
import Toolbar from "./ui/Toolbar";
import CodeNode, { type CodeNodeData } from "./ui/CodeNode";

const API_URL = "https://skitch-board.onrender.com";
const WS_URL = "wss://skitch-board.onrender.com/ws/board";

//everyone on the same ?room=<id> ends up on the same board, make one up if missing
function getRoomId(): string
{
    const params = new URLSearchParams(window.location.search);
    let roomId = params.get("room");
    if (!roomId)
    {
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

export default function App()
{
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

    //buffer only matches its CSS size once at mount by default -- resize would desync it,
    //so this snapshots + redraws on every actual resize (window resize, zoom, whatever)
    useEffect(() =>
    {
        const canvas = canvasRef.current!;
        const resize = () =>
        {
            if (canvas.clientWidth === 0 || canvas.clientHeight === 0) return;      //not laid out yet, nothing to do

            const snapshot = document.createElement("canvas");
            snapshot.width = canvas.width;
            snapshot.height = canvas.height;
            if (snapshot.width > 0 && snapshot.height > 0)
            {
                snapshot.getContext("2d")?.drawImage(canvas, 0, 0);      //only copy if there's actually something to copy
            }
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            if (snapshot.width > 0 && snapshot.height > 0)
            {
                canvas.getContext("2d")?.drawImage(snapshot, 0, 0);
            }
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        return () => observer.disconnect();
    }, []);

    //connects once, retries every second if it drops
    useEffect(() =>
    {
        let cancelled = false;

        function connect()
        {
            const socket = new WebSocket(`${WS_URL}/${roomId}`);
            socketRef.current = socket;

            socket.onmessage = (event) =>
            {
                const msg: BoardMsg = JSON.parse(event.data);
                if (msg.type === "draw")
                {
                    drawLine(msg.prevX, msg.prevY, msg.x, msg.y, msg.color, msg.size);
                }
                else if (msg.type === "node-add")
                {
                    setNodes((prev) => [...prev, msg.node]);
                }
                else if (msg.type === "node-move")
                {
                    setNodes((prev) => prev.map((n) => (n.id === msg.id ? { ...n, x: msg.x, y: msg.y } : n)));
                }
                else if (msg.type === "node-resize")
                {
                    setNodes((prev) => prev.map((n) => (n.id === msg.id ? { ...n, width: msg.width, height: msg.height } : n)));
                }
                else if (msg.type === "node-edit")
                {
                    setNodes((prev) => prev.map((n) => (n.id === msg.id ? { ...n, code: msg.code } : n)));
                }
                else if (msg.type === "node-output")
                {
                    setNodes((prev) => prev.map((n) => (n.id === msg.id ? { ...n, output: msg.output } : n)));
                }
                else if (msg.type === "node-close")
                {
                    setNodes((prev) => prev.filter((n) => n.id !== msg.id));
                }
            };

            socket.onclose = () =>
            {
                if (!cancelled) setTimeout(connect, 1000);
            };
        }

        connect();
        return () =>
        {
            cancelled = true;
            socketRef.current?.close();
        };
    }, []);

    function drawLine(prevX: number, prevY: number, x: number, y: number, strokeColor: string, strokeSize: number)
    {
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

    function pointFromEvent(e: { clientX: number; clientY: number })
    {
        const rect = canvasRef.current!.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function startDrawing(point: { x: number; y: number })
    {
        isDrawing.current = true;
        lastPoint.current = point;
    }

    function continueDrawing(point: { x: number; y: number })
    {
        if (!isDrawing.current) return;

        const strokeColor = isEraser ? "#ffffff" : color;
        const strokeSize = isEraser ? Math.max(size, 20) : size;

        drawLine(lastPoint.current.x, lastPoint.current.y, point.x, point.y, strokeColor, strokeSize);      //draw local first, feels instant
        send({ type: "draw", prevX: lastPoint.current.x, prevY: lastPoint.current.y, x: point.x, y: point.y, color: strokeColor, size: strokeSize });

        lastPoint.current = point;
    }

    function stopDrawing()
    {
        isDrawing.current = false;
    }

    function handleMouseDown(e: React.MouseEvent) { startDrawing(pointFromEvent(e)); }
    function handleMouseMove(e: React.MouseEvent) { continueDrawing(pointFromEvent(e)); }

    function handleTouchStart(e: React.TouchEvent)
    {
        e.preventDefault();
        startDrawing(pointFromEvent(e.touches[0]));
    }

    function handleTouchMove(e: React.TouchEvent)
    {
        e.preventDefault();
        continueDrawing(pointFromEvent(e.touches[0]));
    }

    function send(msg: BoardMsg)
    {
        if (socketRef.current?.readyState === WebSocket.OPEN)
        {
            socketRef.current.send(JSON.stringify(msg));
        }
    }

    function handleAddCodeNode()
    {
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

    function handleNodeDragStart(id: string, e: React.MouseEvent)
    {
        const node = nodes.find((n) => n.id === id);
        if (!node) return;
        action.current = { mode: "move", id, startX: e.clientX, startY: e.clientY, origin: node };
    }

    function handleNodeResizeStart(id: string, e: React.MouseEvent)
    {
        e.stopPropagation();          //don't also fire the header's drag handler
        const node = nodes.find((n) => n.id === id);
        if (!node) return;
        action.current = { mode: "resize", id, startX: e.clientX, startY: e.clientY, origin: node };
    }

    useEffect(() =>
    {
        function onMouseMove(e: MouseEvent)
        {
            const current = action.current;
            if (!current) return;
            const { mode, id, startX, startY, origin } = current;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (mode === "move")
            {
                const x = origin.x + dx;
                const y = origin.y + dy;
                setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
                send({ type: "node-move", id, x, y });
            }
            else
            {
                const width = Math.max(220, origin.width + dx);
                const height = Math.max(140, origin.height + dy);
                setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, width, height } : n)));
                send({ type: "node-resize", id, width, height });
            }
        }
        function onMouseUp() { action.current = null; }

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () =>
        {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, []);

    function handleNodeCodeChange(id: string, code: string)
    {
        setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, code } : n)));
        send({ type: "node-edit", id, code });
    }

    function handleNodeRun(id: string, output: string)
    {
        setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, output } : n)));
        send({ type: "node-output", id, output });
    }

    function handleNodeClose(id: string)
    {
        setNodes((prev) => prev.filter((n) => n.id !== id));
        send({ type: "node-close", id });
    }

    function handleShare()
    {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    function handleClear()
    {
        const canvas = canvasRef.current!;
        canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    }

    async function handleSave()
    {
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

    function handleDownload()
    {
        const link = document.createElement("a");
        link.href = canvasRef.current!.toDataURL("image/png");
        link.download = `whiteboard-${roomId}.png`;
        link.click();
    }

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-gray-100">
            <div className="pointer-events-none absolute left-4 top-4 z-10 text-sm font-semibold text-gray-500">
                Skitch Board
            </div>

            <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2">
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
                    onDownload={handleDownload}
                    onShare={handleShare}
                    copied={copied}
                    onAddCodeNode={handleAddCodeNode}
                />
            </div>

            <div className="relative h-full w-full">
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 h-full w-full touch-none cursor-crosshair bg-white"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={stopDrawing}
                />
                {nodes.map((node) => (
                    <CodeNode
                        key={node.id}
                        node={node}
                        onDragStart={handleNodeDragStart}
                        onResizeStart={handleNodeResizeStart}
                        onCodeChange={handleNodeCodeChange}
                        onRun={handleNodeRun}
                        onClose={handleNodeClose}
                    />
                ))}
            </div>
        </div>
    );
}
