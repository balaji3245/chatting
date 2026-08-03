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

export const PatternLockCanvas: React.FC<PatternLockCanvasProps> = ({
  onComplete,
  status = "idle",
  onResetStatus,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeNodes, setActiveNodes] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentCursor, setCurrentCursor] = useState<{ x: number; y: number } | null>(null);

  const SIZE = 280;
  const PADDING = 45;
  const STEP = (SIZE - PADDING * 2) / 2; // Distance between dots

  // Pre-calculate 3x3 node positions
  const NODES: NodePoint[] = Array.from({ length: 9 }, (_, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    return {
      id: i,
      x: PADDING + col * STEP,
      y: PADDING + row * STEP,
    };
  });

  const getNodeAtCoords = (clientX: number, clientY: number): number | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const threshold = 32; // Hit target radius

    for (const node of NODES) {
      const dist = Math.hypot(node.x - x, node.y - y);
      if (dist <= threshold) {
        return node.id;
      }
    }
    return null;
  };

  const updateCursorPosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCurrentCursor({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  };

  const handleStart = (clientX: number, clientY: number) => {
    if (onResetStatus) onResetStatus();
    setIsDrawing(true);
    updateCursorPosition(clientX, clientY);

    const hitNode = getNodeAtCoords(clientX, clientY);
    if (hitNode !== null) {
      setActiveNodes([hitNode]);
    } else {
      setActiveNodes([]);
    }
  };

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDrawing) return;
      updateCursorPosition(clientX, clientY);

      const hitNode = getNodeAtCoords(clientX, clientY);
      if (hitNode !== null && !activeNodes.includes(hitNode)) {
        setActiveNodes((prev) => [...prev, hitNode]);
      }
    },
    [isDrawing, activeNodes]
  );

  const handleEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setCurrentCursor(null);

    if (activeNodes.length >= 3) {
      onComplete(activeNodes);
    } else if (activeNodes.length > 0) {
      // Clear if too short
      setActiveNodes([]);
    }
  }, [isDrawing, activeNodes, onComplete]);

  // Touch & Mouse global move/up event handlers
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault(); // Prevent page scroll during pattern drag
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const onTouchEnd = () => handleEnd();

    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const onMouseUp = () => handleEnd();

    if (isDrawing) {
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", onTouchEnd);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }

    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDrawing, handleMove, handleEnd]);

  // Color theme mapping based on status
  const getColors = () => {
    if (status === "error") {
      return {
        line: "#f43f5e", // Rose
        glow: "rgba(244, 63, 94, 0.6)",
        dotFill: "#f43f5e",
        dotBorder: "#fb7185",
      };
    }
    if (status === "success") {
      return {
        line: "#10b981", // Emerald
        glow: "rgba(16, 185, 129, 0.6)",
        dotFill: "#10b981",
        dotBorder: "#34d399",
      };
    }
    return {
      line: "#6366f1", // Indigo
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
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          handleStart(touch.clientX, touch.clientY);
        }}
        className={`relative w-[280px] h-[280px] bg-[#111827]/80 backdrop-blur-md rounded-3xl border border-gray-800/90 shadow-2xl p-2 cursor-pointer touch-none transition-all ${
          status === "error" ? "animate-shake border-rose-500/50" : status === "success" ? "border-emerald-500/50" : ""
        }`}
      >
        <svg className="w-full h-full overflow-visible">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Polyline connecting active nodes */}
          {activeNodes.length > 1 && (
            <polyline
              points={activeNodes.map((id) => `${NODES[id].x},${NODES[id].y}`).join(" ")}
              fill="none"
              stroke={colors.line}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
          )}

          {/* Active line connecting last node to current cursor */}
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

          {/* Render 9 Nodes */}
          {NODES.map((node) => {
            const isActive = activeNodes.includes(node.id);
            const isLast = activeNodes[activeNodes.length - 1] === node.id;

            return (
              <g key={node.id} className="transition-all duration-150">
                {/* Outer Ring */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isActive ? 22 : 16}
                  fill={isActive ? colors.glow : "rgba(31, 41, 55, 0.5)"}
                  stroke={isActive ? colors.dotBorder : "#374151"}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  className="transition-all duration-200"
                />

                {/* Inner Center Dot */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isActive ? 8 : 5}
                  fill={isActive ? colors.dotFill : "#9ca3af"}
                  className="transition-all duration-200"
                />

                {/* Pulsing indicator for active last node */}
                {isActive && isLast && isDrawing && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={26}
                    fill="none"
                    stroke={colors.line}
                    strokeWidth="1.5"
                    className="animate-ping opacity-75"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Clear/Reset Action */}
      {activeNodes.length > 0 && !isDrawing && (
        <button
          onClick={() => {
            setActiveNodes([]);
            if (onResetStatus) onResetStatus();
          }}
          className="mt-3 text-xs text-gray-400 hover:text-white transition-colors"
        >
          Reset Pattern
        </button>
      )}
    </div>
  );
};
