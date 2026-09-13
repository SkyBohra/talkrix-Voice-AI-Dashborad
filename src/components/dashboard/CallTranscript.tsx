"use client";

import { useEffect, useState } from "react";
import { Bot, Loader2, MessageSquareOff, User } from "lucide-react";
import { fetchCallTranscript, formatOffset, TranscriptLine } from "@/lib/callHistoryApi";

/** A call read back as a conversation: the agent on one side, the customer on the other. */
export default function CallTranscript({ callId, customerName }: { callId: string; customerName?: string }) {
    const [lines, setLines] = useState<TranscriptLine[] | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setMessage(null);
        fetchCallTranscript(callId).then((res) => {
            if (cancelled) return;
            if (!res.success || !res.data) {
                setLines([]);
                setMessage(res.message || "The transcript could not be loaded.");
            } else {
                setLines(res.data.lines);
                setMessage(res.data.lines.length ? null : res.data.reason ?? "Nothing was said on this call.");
            }
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [callId]);

    if (loading) {
        return (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(255, 255, 255, 0.5)", fontSize: "13px" }}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading the transcript…
            </div>
        );
    }

    if (!lines || lines.length === 0) {
        return (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(255, 255, 255, 0.5)", fontSize: "13px" }}>
                <MessageSquareOff size={14} /> {message}
            </div>
        );
    }

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                maxHeight: "360px",
                overflowY: "auto",
                paddingRight: "4px",
            }}
        >
            {lines.map((line, index) => {
                const agent = line.speaker === "agent";
                return (
                    <div
                        key={index}
                        style={{
                            display: "flex",
                            flexDirection: agent ? "row" : "row-reverse",
                            alignItems: "flex-start",
                            gap: "8px",
                        }}
                    >
                        <div
                            style={{
                                width: "26px",
                                height: "26px",
                                flexShrink: 0,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: agent ? "rgba(0, 200, 255, 0.15)" : "rgba(168, 85, 247, 0.15)",
                                color: agent ? "#00C8FF" : "#a855f7",
                            }}
                        >
                            {agent ? <Bot size={14} /> : <User size={14} />}
                        </div>
                        <div style={{ maxWidth: "78%" }}>
                            <div
                                style={{
                                    fontSize: "11px",
                                    color: "rgba(255, 255, 255, 0.4)",
                                    marginBottom: "3px",
                                    textAlign: agent ? "left" : "right",
                                }}
                            >
                                {agent ? "Agent" : customerName || "Customer"}
                                {line.startSec !== null && ` · ${formatOffset(line.startSec)}`}
                            </div>
                            <div
                                style={{
                                    padding: "8px 12px",
                                    borderRadius: agent ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                                    background: agent ? "rgba(0, 200, 255, 0.08)" : "rgba(168, 85, 247, 0.1)",
                                    border: `1px solid ${agent ? "rgba(0, 200, 255, 0.15)" : "rgba(168, 85, 247, 0.2)"}`,
                                    color: "rgba(255, 255, 255, 0.9)",
                                    fontSize: "13px",
                                    lineHeight: 1.5,
                                    whiteSpace: "pre-wrap",
                                    overflowWrap: "anywhere",
                                }}
                            >
                                {line.text}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
