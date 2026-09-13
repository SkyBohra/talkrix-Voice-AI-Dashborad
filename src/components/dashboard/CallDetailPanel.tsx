"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, FileText, Info, ListChecks } from "lucide-react";
import {
    CallHistoryRecord,
    fetchCallRecording,
    fetchCallTranscript,
    formatCallDate,
    formatDuration,
    getCallDisplayDate,
    TranscriptLine,
} from "@/lib/callHistoryApi";
import { endReasonLabel } from "@/lib/campaignStatus";
import CallAudioPlayer, { PlayerState } from "./CallAudioPlayer";
import CallTranscript from "./CallTranscript";

const SPEEDS = [1, 1.25, 1.5, 2];

const OUTCOME: Record<string, { label: string; color: string; bg: string }> = {
    completed: { label: "Completed", color: "#22c55e", bg: "rgba(34, 197, 94, 0.12)" },
    "in-progress": { label: "In progress", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)" },
    initiated: { label: "Started", color: "#eab308", bg: "rgba(234, 179, 8, 0.12)" },
    missed: { label: "Missed", color: "#FF3C64", bg: "rgba(255, 60, 100, 0.12)" },
    failed: { label: "Failed", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" },
};

const CALL_TYPE: Record<string, string> = { test: "Test call", inbound: "Inbound", outbound: "Outbound" };

/**
 * Everything about one call, laid out to be read back: the recording along the top, what it was
 * about and how it ended on one side, and the conversation on the other — following the recording
 * as it plays, and taking you to any line you click.
 */
export default function CallDetailPanel({ call, autoPlay = false }: { call: CallHistoryRecord; autoPlay?: boolean }) {
    const connected = call.status === "completed" || call.status === "in-progress";
    const recordingOff = call.recordingEnabled === false;

    // ---- recording ----
    const audio = useRef<HTMLAudioElement>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [playerState, setPlayerState] = useState<PlayerState>(recordingOff || !connected ? "off" : "loading");
    const [playerMessage, setPlayerMessage] = useState<string | null>(
        recordingOff ? "Recording was switched off for this call." : !connected ? "This call never connected, so nothing was recorded." : null,
    );
    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);
    const [rate, setRate] = useState(1);

    useEffect(() => {
        if (recordingOff || !connected) return;
        let cancelled = false;
        let objectUrl: string | null = null;
        fetchCallRecording(call._id).then((result) => {
            if (cancelled) {
                if (result.ok) URL.revokeObjectURL(result.url);
                return;
            }
            if (result.ok) {
                objectUrl = result.url;
                setAudioUrl(result.url);
            } else {
                setPlayerState("error");
                setPlayerMessage(result.message);
            }
        });
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [call._id, connected, recordingOff]);

    const seek = useCallback((seconds: number) => {
        const el = audio.current;
        if (!el) return;
        // Play once the jump has landed, so the first thing heard is the line that was clicked
        const start = () => {
            if (el.paused) void el.play().catch(() => undefined);
        };
        el.currentTime = seconds;
        setCurrent(seconds);
        if (el.seeking) el.addEventListener("seeked", start, { once: true });
        else start();
    }, []);

    const toggle = useCallback(() => {
        const el = audio.current;
        if (!el) return;
        if (el.paused) void el.play().catch(() => undefined);
        else el.pause();
    }, []);

    const cycleRate = useCallback(() => {
        setRate((previous) => {
            const next = SPEEDS[(SPEEDS.indexOf(previous) + 1) % SPEEDS.length];
            if (audio.current) audio.current.playbackRate = next;
            return next;
        });
    }, []);

    // ---- transcript ----
    const [lines, setLines] = useState<TranscriptLine[]>([]);
    const [transcriptLoading, setTranscriptLoading] = useState(connected);
    const [transcriptMessage, setTranscriptMessage] = useState<string | null>(connected ? null : "This call never connected, so nothing was said.");
    const [copied, setCopied] = useState<"transcript" | "id" | null>(null);

    useEffect(() => {
        if (!connected) return;
        let cancelled = false;
        fetchCallTranscript(call._id).then((res) => {
            if (cancelled) return;
            if (res.success && res.data) {
                setLines(res.data.lines);
                setTranscriptMessage(res.data.lines.length ? null : (res.data.reason ?? "Nothing was said on this call."));
            } else {
                setTranscriptMessage(res.message || "The transcript could not be loaded.");
            }
            setTranscriptLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [call._id, connected]);

    // The line being spoken right now: the last one that has started
    const activeIndex = useMemo(() => {
        if (!playing && current === 0) return -1;
        let found = -1;
        lines.forEach((line, index) => {
            if (line.startSec !== null && line.startSec <= current + 0.05) found = index;
        });
        return found;
    }, [lines, current, playing]);

    const copy = async (what: "transcript" | "id", text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(what);
            setTimeout(() => setCopied(null), 1600);
        } catch {
            // The clipboard can be refused; nothing to undo
        }
    };

    const transcriptText = lines
        .map((line) => `[${line.startSec !== null ? line.startSec.toFixed(1) + "s" : "--"}] ${line.speaker === "agent" ? "Agent" : call.customerName || "Customer"}: ${line.text}`)
        .join("\n");

    const outcome = OUTCOME[call.status] ?? { label: call.status, color: "#00C8FF", bg: "rgba(0, 200, 255, 0.12)" };
    const hasSummary = Boolean(call.shortSummary || call.summary);

    return (
        <div className="cdp">
            <style>{STYLES}</style>

            {audioUrl && (
                <audio
                    ref={audio}
                    src={audioUrl}
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                        setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0);
                        setPlayerState("ready");
                        e.currentTarget.playbackRate = rate;
                        if (autoPlay) void e.currentTarget.play().catch(() => undefined);
                    }}
                    onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => setPlaying(false)}
                    onError={() => {
                        setPlayerState("error");
                        setPlayerMessage("The recording could not be played.");
                    }}
                />
            )}

            <div className="cdp-player">
                <CallAudioPlayer
                    state={playerState}
                    message={playerMessage}
                    playing={playing}
                    current={current}
                    duration={duration}
                    rate={rate}
                    downloadUrl={audioUrl}
                    fileName={`call-${call._id}.wav`}
                    onToggle={toggle}
                    onSeek={seek}
                    onRate={cycleRate}
                />
            </div>

            <div className="cdp-grid">
                <aside className="cdp-side">
                    <section>
                        <h4 className="cdp-heading">
                            <FileText size={13} /> Summary
                        </h4>
                        {hasSummary ? (
                            <>
                                {call.shortSummary && <p className="cdp-lead">{call.shortSummary}</p>}
                                {call.summary && call.summary !== call.shortSummary && <p className="cdp-body">{call.summary}</p>}
                            </>
                        ) : (
                            <p className="cdp-faint">No summary for this call.</p>
                        )}
                    </section>

                    <section>
                        <h4 className="cdp-heading">
                            <Info size={13} /> Details
                        </h4>
                        <dl className="cdp-facts">
                            <dt>Outcome</dt>
                            <dd>
                                <span className="cdp-pill" style={{ color: outcome.color, background: outcome.bg }}>
                                    {outcome.label}
                                </span>
                            </dd>
                            <dt>Duration</dt>
                            <dd className="cdp-mono">{formatDuration(call.durationSeconds)}</dd>
                            {call.endReason && (
                                <>
                                    <dt>Ended</dt>
                                    <dd>{endReasonLabel(call.endReason)}</dd>
                                </>
                            )}
                            <dt>Type</dt>
                            <dd>{CALL_TYPE[call.callType] ?? call.callType}</dd>
                            {call.customerPhone && (
                                <>
                                    <dt>Number</dt>
                                    <dd className="cdp-mono">{call.customerPhone}</dd>
                                </>
                            )}
                            <dt>When</dt>
                            <dd>{formatCallDate(getCallDisplayDate(call))}</dd>
                            <dt>Call ID</dt>
                            <dd>
                                <button type="button" className="cdp-copy-id" onClick={() => copy("id", call._id)} title="Copy the call ID">
                                    <span className="cdp-mono">{call._id.slice(0, 8)}…{call._id.slice(-4)}</span>
                                    {copied === "id" ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                            </dd>
                        </dl>
                    </section>
                </aside>

                <section className="cdp-main">
                    <div className="cdp-main-head">
                        <h4 className="cdp-heading">
                            <ListChecks size={13} /> Transcript
                            {lines.length > 0 && <span className="cdp-count">{lines.length}</span>}
                        </h4>
                        {lines.length > 0 && (
                            <button type="button" className="cdp-ghost" onClick={() => copy("transcript", transcriptText)}>
                                {copied === "transcript" ? <Check size={13} /> : <Copy size={13} />}
                                {copied === "transcript" ? "Copied" : "Copy"}
                            </button>
                        )}
                    </div>
                    {playerState === "ready" && lines.some((line) => line.startSec !== null) && (
                        <p className="cdp-hint">Click a line to play the recording from there.</p>
                    )}
                    <CallTranscript
                        lines={lines}
                        loading={transcriptLoading}
                        message={transcriptMessage}
                        activeIndex={activeIndex}
                        customerName={call.customerName}
                        onSeek={playerState === "ready" ? seek : undefined}
                    />
                </section>
            </div>
        </div>
    );
}

const STYLES = `
.cdp { border: 1px solid rgba(0, 200, 255, 0.14); border-radius: 16px; overflow: hidden;
  background: linear-gradient(180deg, rgba(0, 200, 255, 0.045) 0%, rgba(120, 0, 255, 0.03) 100%); }
.cdp-player { padding: 14px 18px; border-bottom: 1px solid rgba(0, 200, 255, 0.1); background: rgba(8, 12, 28, 0.55); }
.cdp-grid { display: grid; grid-template-columns: minmax(250px, 320px) minmax(0, 1fr); }
@media (max-width: 900px) { .cdp-grid { grid-template-columns: 1fr; } .cdp-side { border-right: none !important; border-bottom: 1px solid rgba(255, 255, 255, 0.06); } }
.cdp-side { padding: 18px; display: flex; flex-direction: column; gap: 22px; border-right: 1px solid rgba(255, 255, 255, 0.06); }
.cdp-main { padding: 18px; min-width: 0; display: flex; flex-direction: column; }
.cdp-main-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.cdp-heading { margin: 0 0 10px; display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255, 255, 255, 0.45); }
.cdp-count { margin-left: 2px; padding: 1px 7px; border-radius: 10px; background: rgba(0, 200, 255, 0.12); color: #00C8FF;
  font-size: 10px; letter-spacing: 0; }
.cdp-lead { margin: 0 0 8px; color: rgba(255, 255, 255, 0.92); font-size: 14px; line-height: 1.55; font-weight: 500; }
.cdp-body { margin: 0; color: rgba(255, 255, 255, 0.62); font-size: 13px; line-height: 1.65; }
.cdp-faint { margin: 0; color: rgba(255, 255, 255, 0.4); font-size: 13px; }
.cdp-hint { margin: -4px 0 10px; color: rgba(255, 255, 255, 0.35); font-size: 12px; }
.cdp-facts { margin: 0; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 9px 14px; font-size: 13px; }
.cdp-facts dt { color: rgba(255, 255, 255, 0.4); }
.cdp-facts dd { margin: 0; color: rgba(255, 255, 255, 0.85); min-width: 0; overflow-wrap: anywhere; }
.cdp-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; font-size: 12.5px; }
.cdp-pill { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.cdp-copy-id, .cdp-ghost { display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03); color: rgba(255, 255, 255, 0.7); border-radius: 8px; cursor: pointer; transition: all 0.15s ease; }
.cdp-copy-id { padding: 3px 8px; }
.cdp-ghost { padding: 5px 10px; font-size: 12px; }
.cdp-copy-id:hover, .cdp-ghost:hover { border-color: rgba(0, 200, 255, 0.4); color: #00C8FF; }

.cap-bar { display: flex; align-items: center; gap: 12px; min-height: 44px; }
.cap-muted { color: rgba(255, 255, 255, 0.5); font-size: 13px; }
.cap-icon-muted { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.45); flex-shrink: 0; }
.cap-play { width: 42px; height: 42px; border-radius: 50%; border: none; flex-shrink: 0; cursor: pointer; color: #fff;
  display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #00C8FF 0%, #7800FF 100%);
  box-shadow: 0 6px 18px rgba(0, 200, 255, 0.25); transition: transform 0.12s ease, box-shadow 0.12s ease; }
.cap-play:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 8px 22px rgba(0, 200, 255, 0.35); }
.cap-play:disabled { cursor: default; opacity: 0.7; }
.cap-play:focus-visible, .cap-track:focus-visible, .cap-chip:focus-visible, .cap-icon-btn:focus-visible { outline: 2px solid #00C8FF; outline-offset: 2px; }
.cap-spin { animation: cap-spin 1s linear infinite; }
@keyframes cap-spin { to { transform: rotate(360deg); } }
.cap-time { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; font-size: 12px;
  color: rgba(255, 255, 255, 0.75); min-width: 36px; }
.cap-time-total { color: rgba(255, 255, 255, 0.4); text-align: right; }
.cap-track { position: relative; flex: 1; height: 6px; border-radius: 6px; background: rgba(255, 255, 255, 0.08); cursor: pointer;
  touch-action: none; }
.cap-track::before { content: ""; position: absolute; inset: -10px 0; }
.cap-track-loading { cursor: default; background: linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.05) 100%);
  background-size: 200% 100%; animation: cap-shimmer 1.4s ease-in-out infinite; }
@keyframes cap-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.cap-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 6px; background: linear-gradient(90deg, #00C8FF, #a855f7); }
.cap-thumb { position: absolute; top: 50%; width: 14px; height: 14px; border-radius: 50%; background: #fff; transform: translate(-50%, -50%);
  box-shadow: 0 0 0 4px rgba(0, 200, 255, 0.25); transition: box-shadow 0.12s ease; }
.cap-track:hover .cap-thumb { box-shadow: 0 0 0 6px rgba(0, 200, 255, 0.3); }
.cap-chip { min-width: 44px; padding: 5px 8px; border-radius: 8px; border: 1px solid rgba(0, 200, 255, 0.25); background: rgba(0, 200, 255, 0.06);
  color: #00C8FF; font-size: 12px; font-weight: 600; cursor: pointer; font-variant-numeric: tabular-nums; }
.cap-chip:disabled { opacity: 0.5; cursor: default; }
.cap-icon-btn { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.7); transition: all 0.15s ease; }
.cap-icon-btn:hover { border-color: rgba(0, 200, 255, 0.4); color: #00C8FF; }
.cap-disabled { opacity: 0.35; }
/* A narrow panel gives the seek bar a line of its own, under the buttons, instead of squeezing it to nothing */
@media (max-width: 640px) {
  .cap-bar { flex-wrap: wrap; row-gap: 12px; }
  .cap-track { order: 10; flex: 1 1 100%; }
  .cap-time-total { margin-right: auto; text-align: left; }
  .cdp-player { padding: 14px; }
  .cdp-side, .cdp-main { padding: 16px 14px; }
}

.ctx-list { display: flex; flex-direction: column; gap: 6px; max-height: 420px; overflow-y: auto; padding: 2px 6px 2px 2px;
  scrollbar-width: thin; scrollbar-color: rgba(0, 200, 255, 0.25) transparent; }
.ctx-row { max-width: 82%; padding: 6px 8px; border-radius: 12px; border: 1px solid transparent; transition: background 0.15s ease, border-color 0.15s ease; }
.ctx-agent { align-self: flex-start; }
.ctx-customer { align-self: flex-end; text-align: right; }
.ctx-seekable { cursor: pointer; }
.ctx-seekable:hover { background: rgba(255, 255, 255, 0.03); }
.ctx-seekable:focus-visible { outline: 2px solid #00C8FF; outline-offset: 1px; }
.ctx-active { background: rgba(0, 200, 255, 0.07); border-color: rgba(0, 200, 255, 0.3); }
.ctx-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-size: 11px; color: rgba(255, 255, 255, 0.45); }
.ctx-customer .ctx-meta { justify-content: flex-end; }
.ctx-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.ctx-dot-agent { background: #00C8FF; box-shadow: 0 0 8px rgba(0, 200, 255, 0.6); }
.ctx-dot-customer { background: #a855f7; box-shadow: 0 0 8px rgba(168, 85, 247, 0.6); }
.ctx-customer .ctx-dot { order: 3; }
.ctx-who { font-weight: 600; color: rgba(255, 255, 255, 0.65); }
.ctx-at { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; }
.ctx-bubble { display: inline-block; text-align: left; padding: 9px 13px; font-size: 13.5px; line-height: 1.55; color: rgba(255, 255, 255, 0.9);
  white-space: pre-wrap; overflow-wrap: anywhere; }
.ctx-agent .ctx-bubble { border-radius: 4px 14px 14px 14px; background: rgba(0, 200, 255, 0.08); border: 1px solid rgba(0, 200, 255, 0.14); }
.ctx-customer .ctx-bubble { border-radius: 14px 4px 14px 14px; background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.2); }
.ctx-active .ctx-bubble { border-color: rgba(0, 200, 255, 0.45); }
.ctx-skeleton { height: 34px; border-radius: 12px; background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 100%);
  background-size: 200% 100%; animation: cap-shimmer 1.4s ease-in-out infinite; }
.ctx-row .ctx-skeleton { display: inline-block; min-width: 160px; }
.ctx-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 140px; padding: 20px;
  border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 12px; color: rgba(255, 255, 255, 0.45); font-size: 13px; text-align: center; }
@media (prefers-reduced-motion: reduce) { .cap-spin, .cap-track-loading, .ctx-skeleton { animation: none; } }
`;
