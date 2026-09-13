"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, PhoneIncoming, PhoneOutgoing, TestTube, X } from "lucide-react";
import { CallHistoryRecord, formatCallDate, formatDuration, getCallDisplayDate } from "@/lib/callHistoryApi";
import CallDetailPanel from "./CallDetailPanel";

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
    completed: { label: "Completed", color: "#22c55e", bg: "rgba(34, 197, 94, 0.14)" },
    "in-progress": { label: "In progress", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.14)" },
    initiated: { label: "Started", color: "#eab308", bg: "rgba(234, 179, 8, 0.14)" },
    missed: { label: "Missed", color: "#FF3C64", bg: "rgba(255, 60, 100, 0.14)" },
    failed: { label: "Failed", color: "#ef4444", bg: "rgba(239, 68, 68, 0.14)" },
};

interface Props {
    call: CallHistoryRecord | null;
    autoPlay?: boolean;
    /** Where this call sits in the list, for "3 of 12" and the previous/next buttons */
    position?: { index: number; total: number };
    onPrevious?: () => void;
    onNext?: () => void;
    onClose: () => void;
}

/**
 * A call, opened beside the list rather than under its row: the list stays in view, and a long
 * conversation has the whole height of the screen. Escape or the backdrop closes it; the arrows in
 * its header move to the neighbouring call without closing.
 */
export default function CallDetailDrawer({ call, autoPlay, position, onPrevious, onNext, onClose }: Props) {
    const body = useRef<HTMLDivElement>(null);
    const closeButton = useRef<HTMLButtonElement>(null);
    const [mounted, setMounted] = useState(false);
    const open = call !== null;

    useEffect(() => setMounted(true), []);

    // Escape closes; the page behind does not scroll while the panel is open; focus comes back after
    useEffect(() => {
        if (!open) return;
        const returnFocus = document.activeElement as HTMLElement | null;
        closeButton.current?.focus({ preventScroll: true });
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
            returnFocus?.focus?.({ preventScroll: true });
        };
    }, [open, onClose]);

    // A different call starts at the top
    useEffect(() => {
        body.current?.scrollTo({ top: 0 });
    }, [call?._id]);

    if (!mounted || !call) return null;

    const status = STATUS[call.status] ?? { label: call.status, color: "#00C8FF", bg: "rgba(0, 200, 255, 0.14)" };
    const TypeIcon = call.callType === "test" ? TestTube : call.callType === "inbound" ? PhoneIncoming : PhoneOutgoing;
    const title = call.customerName || (call.callType === "test" ? "Test call" : call.customerPhone || "Unknown caller");

    return createPortal(
        <div className="cdd-root">
            <style>{STYLES}</style>
            <div className="cdd-backdrop" onClick={onClose} aria-hidden />
            <aside className="cdd-panel" role="dialog" aria-modal="true" aria-labelledby="cdd-title">
                <header className="cdd-header">
                    <div className="cdd-avatar" style={{ color: status.color, background: status.bg }}>
                        <TypeIcon size={18} />
                    </div>
                    <div className="cdd-heading">
                        <h2 id="cdd-title" className="cdd-title">
                            {title}
                        </h2>
                        <div className="cdd-sub">
                            <span className="cdd-status" style={{ color: status.color, background: status.bg }}>
                                {status.label}
                            </span>
                            {call.customerPhone && call.customerName && <span className="cdd-mono">{call.customerPhone}</span>}
                            <span>{formatCallDate(getCallDisplayDate(call))}</span>
                            <span className="cdd-mono">{formatDuration(call.durationSeconds)}</span>
                        </div>
                    </div>
                    <div className="cdd-actions">
                        {position && position.total > 1 && (
                            <>
                                <span className="cdd-position">
                                    {position.index + 1} / {position.total}
                                </span>
                                <button type="button" className="cdd-icon" onClick={onPrevious} disabled={!onPrevious} aria-label="Previous call" title="Previous call">
                                    <ChevronUp size={16} />
                                </button>
                                <button type="button" className="cdd-icon" onClick={onNext} disabled={!onNext} aria-label="Next call" title="Next call">
                                    <ChevronDown size={16} />
                                </button>
                            </>
                        )}
                        <button ref={closeButton} type="button" className="cdd-icon cdd-close" onClick={onClose} aria-label="Close" title="Close (Esc)">
                            <X size={18} />
                        </button>
                    </div>
                </header>

                <div ref={body} className="cdd-body">
                    <CallDetailPanel key={call._id} call={call} autoPlay={autoPlay} scrollRoot={body} />
                </div>
            </aside>
        </div>,
        document.body,
    );
}

const STYLES = `
.cdd-root { position: fixed; inset: 0; z-index: 1000; }
.cdd-backdrop { position: absolute; inset: 0; background: rgba(2, 4, 14, 0.55); backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
  animation: cdd-fade 0.18s ease-out; }
.cdd-panel { position: absolute; top: 0; right: 0; bottom: 0; width: min(620px, 100vw); box-sizing: border-box; display: flex; flex-direction: column;
  background: linear-gradient(180deg, #0c1024 0%, #0a0d1f 100%); border-left: 1px solid rgba(0, 200, 255, 0.16);
  box-shadow: -24px 0 60px rgba(0, 0, 0, 0.45); animation: cdd-slide 0.24s cubic-bezier(0.22, 1, 0.36, 1); }
.cdd-header { display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); }
.cdd-avatar { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cdd-heading { flex: 1; min-width: 0; }
.cdd-title { margin: 0; font-size: 17px; font-weight: 600; color: #fff; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cdd-sub { margin-top: 6px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; font-size: 12px; color: rgba(255, 255, 255, 0.5); }
.cdd-status { padding: 2px 8px; border-radius: 999px; font-weight: 600; font-size: 11.5px; }
.cdd-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; }
.cdd-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.cdd-position { font-size: 12px; color: rgba(255, 255, 255, 0.4); font-variant-numeric: tabular-nums; margin-right: 2px; }
.cdd-icon { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.03); color: rgba(255, 255, 255, 0.75); transition: all 0.15s ease; }
.cdd-icon:hover:not(:disabled) { border-color: rgba(0, 200, 255, 0.45); color: #00C8FF; }
.cdd-icon:disabled { opacity: 0.3; cursor: default; }
.cdd-icon:focus-visible { outline: 2px solid #00C8FF; outline-offset: 2px; }
.cdd-close { margin-left: 4px; }
.cdd-body { flex: 1; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: rgba(0, 200, 255, 0.25) transparent; }
@keyframes cdd-slide { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes cdd-fade { from { opacity: 0; } to { opacity: 1; } }
@media (max-width: 640px) {
  .cdd-header { padding: 14px 14px 12px; gap: 10px; }
  .cdd-avatar { width: 36px; height: 36px; }
  .cdd-position { display: none; }
}
@media (prefers-reduced-motion: reduce) { .cdd-panel, .cdd-backdrop { animation: none; } }
`;
