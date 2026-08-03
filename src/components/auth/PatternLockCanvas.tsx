import React, { useState, useRef, useEffect, useCallback } from "react";

interface PatternLockCanvasProps {
  onComplete: (pattern: number[]) => void;
  status?: "idle" | "error" | "success";
  onResetStatus?: () => void;
}

interface NodePoint {
  id: number;
  x: number;
  y: number;
}

// Fixed outside component so they never change between renders
const SIZE = 280;
const PADDING = 45;
const STEP = (SIZE - PADDING * 2) / 2;

const NODES: NodePoint[] = Array.from({ length: 9 }, (_, i) => {
  const row = Math.floor(i / 3);
  const col = i % 3;
  return {
    id: i,
    x: PADDING + col * STEP,
    y: PADDING + row * STEP,
  };
});

function getNodeAtCoords(
  clientX: number,
  clientY: number,
  rect: DOMRect
): number | null {
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const threshold = 44;
  for (const node of NODES) {
    const dist = Math.hypot(node.x - x, node.y - y);
    if (dist <= threshold) return node.id;
  }
  return null;
}

export const PatternLockCanvas: React.FC<PatternLockCanvasProps> = ({
  onComplete,
  status = "idle",
  onResetStatus,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeNodes, setActiveNodes] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentCursor, setCurrentCursor] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Use refs for values needed in event handlers to avoid stale closures
  const isDrawingRef = useRef(false);
  const activeNodesRef = useRef<number[]>([]);
  const onCompleteRef = useRef(onComplete);
  const onResetStatusRef = useRef(onResetStatus);
  onCompleteRef.current = onComplete;
  onResetStatusRef.current = onResetStatus;

  const startDraw = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    if (onResetStatusRef.current) onResetStatusRef.current();

    isDrawingRef.current = true;
    activeNodesRef.current = [];
    setActiveNodes([]);
    setIsDrawing(true);

    const rect = containerRef.current.getBoundingClientRect();
    setCurrentCursor({ x: clientX - rect.left, y: clientY - rect.top });

    const hitNode = getNodeAtCoords(clientX, clientY, rect);
    if (hitNode !== null) {
      activeNodesRef.current = [hitNode];
      setActiveNodes([hitNode]);
    }
  }, []);

  const moveDraw = useCallback((clientX: number, clientY: number) => {
    if (!isDrawingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCurrentCursor({ x: clientX - rect.left, y: clientY - rect.top });

    const hitNode = getNodeAtCoords(clientX, clientY, rect);
    if (hitNode !== null && !activeNodesRef.current.includes(hitNode)) {
      activeNodesRef.current = [...activeNodesRef.current, hitNode];
      setActiveNodes([...activeNodesRef.current]);
    }
  }, []);

  const endDraw = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);
    setCurrentCursor(null);

    const finalNodes = [...activeNodesRef.current];
    if (finalNodes.length >= 3) {
      onCompleteRef.current(finalNodes);
    } else {
      activeNodesRef.current = [];
      setActiveNodes([]);
    }
  }, []);

  // Attach all touch + mouse listeners once (no dependency churn)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      startDraw(t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      moveDraw(t.clientX, t.clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      endDraw();
    };
    const onMouseDown = (e: MouseEvent) => startDraw(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => moveDraw(e.clientX, e.clientY);
    const onMouseUp = () => endDraw();

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: false });
    window.addEventListener("touchcancel", onTouchEnd, { passive: false });
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [startDraw, moveDraw, endDraw]);

  const getColors = () => {
    if (status === "error") {
      return {
        line: "#f43f5e",
        glow: "rgba(244, 63, 94, 0.6)",
        dotFill: "#f43f5e",
        dotBorder: "#fb7185",
      };
    }
    if (status === "success") {
      return {
        line: "#10b981",
        glow: "rgba(16, 185, 129, 0.6)",
        dotFill: "#10b981",
        dotBorder: "#34d399",
      };
    }
    return {
      line: "#6366f1",
      glow: "rgba(99, 102, 241, 0.6)",
      dotFill: "#818cf8",
      dotBorder: "#a5b4fc",
    };
  };

  const colors = getColors();

  return (
    <div className="flex flex-col items-center select-none">
      <div
        ref={containerRef}
        style={{ touchAction: "none", userSelect: "none" }}
        className={`relative w-[280px] h-[280px] cursor-pointer transition-all ${
          status === "error" ? "animate-shake" : ""
        }`}
      >
        <svg
          className="w-full h-full overflow-visible"
          style={{ pointerEvents: "none" }}
        >
          {activeNodes.length > 1 && (
            <polyline
              points={activeNodes
                .map((id) => `${NODES[id].x},${NODES[id].y}`)
                .join(" ")}
              fill="none"
              stroke={colors.line}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {isDrawing && activeNodes.length > 0 && currentCursor && (
            <line
              x1={NODES[activeNodes[activeNodes.length - 1]].x}
              y1={NODES[activeNodes[activeNodes.length - 1]].y}
              x2={currentCursor.x}
              y2={currentCursor.y}
              stroke={colors.line}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="4 4"
              opacity="0.8"
            />
          )}

          {NODES.map((node) => {
            const isActive = activeNodes.includes(node.id);

            return (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isActive ? 20 : 16}
                  fill={
                    isActive ? colors.glow : "rgba(241, 245, 249, 0.9)"
                  }
                  stroke={isActive ? colors.dotBorder : "#cbd5e1"}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isActive ? 8 : 5}
                  fill={isActive ? colors.dotFill : "#64748b"}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {activeNodes.length > 0 && !isDrawing && (
        <button
          onClick={() => {
            activeNodesRef.current = [];
            setActiveNodes([]);
            if (onResetStatus) onResetStatus();
          }}
          className="mt-3 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          Reset Pattern
        </button>
      )}
    </div>
  );
};
