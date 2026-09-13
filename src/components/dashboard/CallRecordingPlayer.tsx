"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, MicOff } from "lucide-react";
import { fetchCallRecording } from "@/lib/callHistoryApi";

/**
 * Plays one call's recording. The audio is only downloaded when this is shown, and the local copy
 * is released when it goes away, so a long call history never holds every recording in memory.
 */
export default function CallRecordingPlayer({ callId, autoPlay = false }: { callId: string; autoPlay?: boolean }) {
    const [url, setUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const audio = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        let cancelled = false;
        let objectUrl: string | null = null;
        setLoading(true);
        setError(null);
        setUrl(null);
        fetchCallRecording(callId).then((result) => {
            if (cancelled) {
                if (result.ok) URL.revokeObjectURL(result.url);
                return;
            }
            if (result.ok) {
                objectUrl = result.url;
                setUrl(result.url);
            } else {
                setError(result.message);
            }
            setLoading(false);
        });
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [callId]);

    useEffect(() => {
        if (url && autoPlay) audio.current?.play().catch(() => undefined);
    }, [url, autoPlay]);

    if (loading) {
        return (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(255, 255, 255, 0.5)", fontSize: "13px" }}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading the recording…
            </div>
        );
    }

    if (error || !url) {
        return (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(255, 255, 255, 0.5)", fontSize: "13px" }}>
                <MicOff size={14} /> {error ?? "No recording for this call."}
            </div>
        );
    }

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <audio ref={audio} controls src={url} preload="metadata" style={{ flex: "1 1 280px", minWidth: 0, height: "36px" }} />
            <a
                href={url}
                download={`call-${callId}.wav`}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(0, 200, 255, 0.3)",
                    color: "#00C8FF",
                    fontSize: "12px",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                }}
            >
                <Download size={14} /> Download
            </a>
        </div>
    );
}
