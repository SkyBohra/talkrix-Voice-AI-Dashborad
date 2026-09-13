"use client";

import { useEffect, useRef } from "react";
import { MessageSquareOff } from "lucide-react";
import { formatOffset, TranscriptLine } from "@/lib/callHistoryApi";

interface Props {
    lines: TranscriptLine[];
    loading: boolean;
    message: string | null;
    /** The line being spoken at this point of the recording, or -1 */
    activeIndex: number;
    customerName?: string;
    /** When set, a line with a time can be clicked to play the recording from there */
    onSeek?: (seconds: number) => void;
}

/** The conversation, following the recording as it plays. */
export default function CallTranscript({ lines, loading, message, activeIndex, customerName, onSeek }: Props) {
    const list = useRef<HTMLDivElement>(null);
    const rows = useRef<(HTMLDivElement | null)[]>([]);

    // Keep the line being spoken in view — inside the transcript only, never scrolling the page
    useEffect(() => {
        const box = list.current;
        const row = rows.current[activeIndex];
        if (!box || !row) return;
        const top = row.offsetTop - box.offsetTop;
        if (top < box.scrollTop || top + row.offsetHeight > box.scrollTop + box.clientHeight) {
            box.scrollTo({ top: Math.max(top - box.clientHeight / 3, 0), behavior: "smooth" });
        }
    }, [activeIndex]);

    if (loading) {
        return (
            <div className="ctx-list" aria-busy="true" aria-label="Loading the transcript">
                {[70, 45, 80, 55].map((width, i) => (
                    <div key={i} className={`ctx-row ${i % 2 ? "ctx-customer" : "ctx-agent"}`}>
                        <div className="ctx-skeleton" style={{ width: `${width}%` }} />
                    </div>
                ))}
            </div>
        );
    }

    if (lines.length === 0) {
        return (
            <div className="ctx-empty">
                <MessageSquareOff size={20} />
                <span>{message ?? "Nothing was said on this call."}</span>
            </div>
        );
    }

    return (
        <div ref={list} className="ctx-list">
            {lines.map((line, index) => {
                const agent = line.speaker === "agent";
                const seekable = !!onSeek && line.startSec !== null;
                const active = index === activeIndex;
                return (
                    <div
                        key={index}
                        ref={(el) => {
                            rows.current[index] = el;
                        }}
                        className={`ctx-row ${agent ? "ctx-agent" : "ctx-customer"}${active ? " ctx-active" : ""}${seekable ? " ctx-seekable" : ""}`}
                        role={seekable ? "button" : undefined}
                        tabIndex={seekable ? 0 : undefined}
                        title={seekable ? `Play from ${formatOffset(line.startSec)}` : undefined}
                        onClick={() => seekable && onSeek!(line.startSec!)}
                        onKeyDown={(e) => {
                            if (seekable && (e.key === "Enter" || e.key === " ")) {
                                e.preventDefault();
                                onSeek!(line.startSec!);
                            }
                        }}
                    >
                        <div className="ctx-meta">
                            <span className={`ctx-dot ${agent ? "ctx-dot-agent" : "ctx-dot-customer"}`} />
                            <span className="ctx-who">{agent ? "Agent" : customerName || "Customer"}</span>
                            {line.startSec !== null && <span className="ctx-at">{formatOffset(line.startSec)}</span>}
                        </div>
                        <div className="ctx-bubble">{line.text}</div>
                    </div>
                );
            })}
        </div>
    );
}
