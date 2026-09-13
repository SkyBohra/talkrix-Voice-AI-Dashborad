"use client";

import { useRef } from "react";
import { Download, Loader2, MicOff, Pause, Play } from "lucide-react";
import { formatOffset } from "@/lib/callHistoryApi";

export type PlayerState = "loading" | "ready" | "off" | "error";

interface Props {
    state: PlayerState;
    message?: string | null;
    playing: boolean;
    current: number;
    duration: number;
    rate: number;
    downloadUrl?: string | null;
    fileName: string;
    onToggle: () => void;
    onSeek: (seconds: number) => void;
    onRate: () => void;
}

const SEEK_STEP = 5;

/** A player that belongs to the dashboard: dark, gradient, and able to seek by click, drag or key. */
export default function CallAudioPlayer({ state, message, playing, current, duration, rate, downloadUrl, fileName, onToggle, onSeek, onRate }: Props) {
    const track = useRef<HTMLDivElement>(null);
    const progress = duration > 0 ? Math.min(current / duration, 1) : 0;

    const seekFromPointer = (clientX: number) => {
        const box = track.current?.getBoundingClientRect();
        if (!box || duration <= 0) return;
        onSeek(Math.max(0, Math.min((clientX - box.left) / box.width, 1)) * duration);
    };

    if (state === "off" || state === "error") {
        return (
            <div className="cap-bar cap-muted">
                <div className="cap-icon-muted">
                    <MicOff size={16} />
                </div>
                <span>{message}</span>
            </div>
        );
    }

    const ready = state === "ready";
    return (
        <div className="cap-bar">
            <button type="button" className="cap-play" onClick={onToggle} disabled={!ready} aria-label={playing ? "Pause the recording" : "Play the recording"}>
                {!ready ? <Loader2 size={18} className="cap-spin" /> : playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
            </button>

            <span className="cap-time">{formatOffset(current) || "0:00"}</span>

            <div
                ref={track}
                className={`cap-track${ready ? "" : " cap-track-loading"}`}
                role="slider"
                tabIndex={ready ? 0 : -1}
                aria-label="Position in the recording"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(current)}
                aria-valuetext={`${formatOffset(current) || "0:00"} of ${formatOffset(duration) || "0:00"}`}
                onPointerDown={(e) => {
                    if (!ready) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    seekFromPointer(e.clientX);
                }}
                onPointerMove={(e) => {
                    if (ready && e.currentTarget.hasPointerCapture(e.pointerId)) seekFromPointer(e.clientX);
                }}
                onKeyDown={(e) => {
                    if (!ready) return;
                    if (e.key === "ArrowRight") onSeek(Math.min(current + SEEK_STEP, duration));
                    else if (e.key === "ArrowLeft") onSeek(Math.max(current - SEEK_STEP, 0));
                    else if (e.key === " " || e.key === "Enter") onToggle();
                    else return;
                    e.preventDefault();
                }}
            >
                <div className="cap-fill" style={{ width: `${progress * 100}%` }} />
                {ready && <div className="cap-thumb" style={{ left: `${progress * 100}%` }} />}
            </div>

            <span className="cap-time cap-time-total">{ready ? formatOffset(duration) || "0:00" : "--:--"}</span>

            <button type="button" className="cap-chip" onClick={onRate} disabled={!ready} aria-label={`Playback speed ${rate} times, change`}>
                {rate}×
            </button>

            {downloadUrl ? (
                <a className="cap-icon-btn" href={downloadUrl} download={fileName} aria-label="Download the recording" title="Download">
                    <Download size={16} />
                </a>
            ) : (
                <span className="cap-icon-btn cap-disabled" aria-hidden>
                    <Download size={16} />
                </span>
            )}
        </div>
    );
}
