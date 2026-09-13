"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, FileText, Info, MessageSquareText } from "lucide-react";
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

type Tab = "transcript" | "summary" | "details";

/**
 * Everything about one call, laid out to be read back in a side panel. The recording and the tabs
 * stay pinned along the top; below them, one thing at a time — the conversation (following the
 * recording as it plays, and taking you to any line you click), what it was about, or the facts of
 * how it went.
 */
export default function CallDetailPanel({
    call,
    autoPlay = false,
    scrollRoot,
}: {
    call: CallHistoryRecord;
    autoPlay?: boolean;
    /** The side panel's scrolling body, so the transcript can keep the spoken line in view */
    scrollRoot?: React.RefObject<HTMLElement | null>;
}) {
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

    const [tab, setTab] = useState<Tab>(connected ? "transcript" : "details");

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

    const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
        { id: "transcript", label: "Transcript", icon: <MessageSquareText size={14} />, count: lines.length || undefined },
        { id: "summary", label: "Summary", icon: <FileText size={14} /> },
        { id: "details", label: "Details", icon: <Info size={14} /> },
    ];

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

            <div className="cdp-sticky">
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

                <div
                    className="cdp-tabs"
                    role="tablist"
                    aria-label="About this call"
                    onKeyDown={(e) => {
                        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                        const at = tabs.findIndex((t) => t.id === tab);
                        const next = tabs[(at + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
                        setTab(next.id);
                        document.getElementById(`cdp-tab-${call._id}-${next.id}`)?.focus();
                        e.preventDefault();
                    }}
                >
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            id={`cdp-tab-${call._id}-${t.id}`}
                            type="button"
                            role="tab"
                            aria-selected={tab === t.id}
                            aria-controls={`cdp-panel-${call._id}`}
                            tabIndex={tab === t.id ? 0 : -1}
                            className={`cdp-tab${tab === t.id ? " cdp-tab-on" : ""}`}
                            onClick={() => setTab(t.id)}
                        >
                            {t.icon}
                            {t.label}
                            {t.count !== undefined && <span className="cdp-count">{t.count}</span>}
                        </button>
                    ))}
                </div>
            </div>

            <div className="cdp-content" id={`cdp-panel-${call._id}`} role="tabpanel" aria-labelledby={`cdp-tab-${call._id}-${tab}`}>
                {tab === "transcript" && (
                    <>
                        {(lines.length > 0 || (playerState === "ready" && lines.some((l) => l.startSec !== null))) && (
                            <div className="cdp-toolbar">
                                <span className="cdp-hint">
                                    {playerState === "ready" && lines.some((l) => l.startSec !== null) ? "Click a line to play the recording from there." : `${lines.length} lines`}
                                </span>
                                {lines.length > 0 && (
                                    <button type="button" className="cdp-ghost" onClick={() => copy("transcript", transcriptText)}>
                                        {copied === "transcript" ? <Check size={13} /> : <Copy size={13} />}
                                        {copied === "transcript" ? "Copied" : "Copy transcript"}
                                    </button>
                                )}
                            </div>
                        )}
                        <CallTranscript
                            lines={lines}
                            loading={transcriptLoading}
                            message={transcriptMessage}
                            activeIndex={activeIndex}
                            customerName={call.customerName}
                            onSeek={playerState === "ready" ? seek : undefined}
                            scrollRoot={scrollRoot}
                        />
                    </>
                )}

                {tab === "summary" &&
                    (hasSummary ? (
                        <div className="cdp-stack">
                            {call.shortSummary && (
                                <section className="cdp-card cdp-card-accent">
                                    <h4 className="cdp-heading">In short</h4>
                                    <p className="cdp-lead">{call.shortSummary}</p>
                                </section>
                            )}
                            {call.summary && call.summary !== call.shortSummary && (
                                <section className="cdp-card">
                                    <h4 className="cdp-heading">What happened</h4>
                                    <p className="cdp-body">{call.summary}</p>
                                </section>
                            )}
                        </div>
                    ) : (
                        <div className="ctx-empty">
                            <FileText size={20} />
                            <span>No summary for this call.</span>
                        </div>
                    ))}

                {tab === "details" && (
                    <dl className="cdp-facts">
                        <div className="cdp-fact">
                            <dt>Outcome</dt>
                            <dd>
                                <span className="cdp-pill" style={{ color: outcome.color, background: outcome.bg }}>
                                    {outcome.label}
                                </span>
                            </dd>
                        </div>
                        <div className="cdp-fact">
                            <dt>Duration</dt>
                            <dd className="cdp-mono">{formatDuration(call.durationSeconds)}</dd>
                        </div>
                        <div className="cdp-fact">
                            <dt>How it ended</dt>
                            <dd>{call.endReason ? endReasonLabel(call.endReason) : "—"}</dd>
                        </div>
                        <div className="cdp-fact">
                            <dt>Type</dt>
                            <dd>{CALL_TYPE[call.callType] ?? call.callType}</dd>
                        </div>
                        <div className="cdp-fact">
                            <dt>Number</dt>
                            <dd className="cdp-mono">{call.customerPhone || "—"}</dd>
                        </div>
                        <div className="cdp-fact">
                            <dt>Agent</dt>
                            <dd>{call.agentName || "—"}</dd>
                        </div>
                        <div className="cdp-fact">
                            <dt>When</dt>
                            <dd>{formatCallDate(getCallDisplayDate(call))}</dd>
                        </div>
                        <div className="cdp-fact">
                            <dt>Recording</dt>
                            <dd>{recordingOff ? "Switched off" : connected ? "On" : "—"}</dd>
                        </div>
                        <div className="cdp-fact cdp-fact-wide">
                            <dt>Call ID</dt>
                            <dd>
                                <button type="button" className="cdp-copy-id" onClick={() => copy("id", call._id)} title="Copy the call ID">
                                    <span className="cdp-mono">{call._id}</span>
                                    {copied === "id" ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                            </dd>
                        </div>
                    </dl>
                )}
            </div>
        </div>
    );
}

const STYLES = `
.cdp { display: flex; flex-direction: column; min-height: 100%; }
.cdp-sticky { position: sticky; top: 0; z-index: 2; background: rgba(10, 14, 32, 0.94); backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0, 200, 255, 0.12); }
.cdp-player { padding: 14px 20px 12px; }
.cdp-tabs { display: flex; gap: 4px; padding: 0 14px; overflow-x: auto; scrollbar-width: none; }
.cdp-tabs::-webkit-scrollbar { display: none; }
.cdp-tab { position: relative; display: inline-flex; align-items: center; gap: 7px; padding: 11px 12px; border: none; background: none;
  color: rgba(255, 255, 255, 0.5); font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: color 0.15s ease; }
.cdp-tab:hover { color: rgba(255, 255, 255, 0.85); }
.cdp-tab-on { color: #fff; }
.cdp-tab-on::after { content: ""; position: absolute; left: 10px; right: 10px; bottom: -1px; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, #00C8FF, #a855f7); }
.cdp-tab:focus-visible { outline: 2px solid #00C8FF; outline-offset: -2px; border-radius: 8px; }
.cdp-content { padding: 18px 20px 32px; }
.cdp-stack { display: flex; flex-direction: column; gap: 12px; }
.cdp-card { padding: 16px; border-radius: 14px; background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.06); }
.cdp-card-accent { background: linear-gradient(135deg, rgba(0, 200, 255, 0.08), rgba(168, 85, 247, 0.06)); border-color: rgba(0, 200, 255, 0.18); }
.cdp-heading { margin: 0 0 8px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255, 255, 255, 0.45); }
.cdp-count { padding: 1px 7px; border-radius: 10px; background: rgba(0, 200, 255, 0.14); color: #00C8FF; font-size: 11px; font-weight: 600; }
.cdp-lead { margin: 0; color: rgba(255, 255, 255, 0.92); font-size: 15px; line-height: 1.55; font-weight: 500; }
.cdp-body { margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
.cdp-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.cdp-hint { color: rgba(255, 255, 255, 0.38); font-size: 12px; }
.cdp-facts { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.cdp-fact { padding: 12px 14px; border-radius: 12px; background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.06); min-width: 0; }
.cdp-fact-wide { grid-column: 1 / -1; }
.cdp-fact dt { font-size: 11px; color: rgba(255, 255, 255, 0.4); margin-bottom: 5px; }
.cdp-fact dd { margin: 0; font-size: 13.5px; color: rgba(255, 255, 255, 0.9); overflow-wrap: anywhere; }
.cdp-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; font-size: 12.5px; }
.cdp-pill { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.cdp-copy-id, .cdp-ghost { display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03); color: rgba(255, 255, 255, 0.72); border-radius: 8px; cursor: pointer; transition: all 0.15s ease; }
.cdp-copy-id { padding: 4px 9px; max-width: 100%; }
.cdp-copy-id .cdp-mono { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cdp-ghost { padding: 6px 10px; font-size: 12px; white-space: nowrap; }
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
  .cdp-player { padding: 12px 14px 10px; }
  .cdp-content { padding: 14px 14px 28px; }
  .cdp-tabs { padding: 0 6px; }
  .cdp-facts { grid-template-columns: 1fr; }
}

.ctx-list { display: flex; flex-direction: column; gap: 6px; max-height: 420px; overflow-y: auto; padding: 2px 6px 2px 2px;
  scrollbar-width: thin; scrollbar-color: rgba(0, 200, 255, 0.25) transparent; }
.ctx-list-flow { max-height: none; overflow: visible; padding: 0; }
.ctx-row { max-width: 86%; padding: 6px 8px; border-radius: 12px; border: 1px solid transparent; transition: background 0.15s ease, border-color 0.15s ease; }
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
