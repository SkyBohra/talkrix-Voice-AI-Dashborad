"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Braces, Check, ChevronDown, Info, Loader2, Phone, RotateCcw, Sparkles } from "lucide-react";
import { AgentVariable, AgentVariables, fetchAgentVariables } from "@/lib/agentApi";

/**
 * Before a test call: the values the agent's prompt asks for — {{customer_name}}, {{loan_amount}} —
 * typed in by whoever is testing, so the agent is heard the way a customer will hear it rather than
 * with its blanks left empty. What was typed is remembered per agent, in this browser only.
 */

const MAX_CHARS = 200; // what the server keeps of one value
const STORAGE_PREFIX = "talkrix:test-call-values:";

// Read once per agent while the page is open, and refreshed quietly each time the setup opens
const described = new Map<string, AgentVariables>();

export interface TestCallRequest {
    customerName?: string;
    customerPhone?: string;
    metadata?: Record<string, string>;
}

/** One value as the agent was given it, shown while the call runs. */
export interface SentValue {
    name: string;
    label: string;
    value: string;
}

export interface TestCallStart {
    request: TestCallRequest;
    sent: SentValue[];
}

const LABELS: Record<string, string> = {
    customer_name: "Customer name",
    customer_phone: "Customer phone",
    campaign_name: "Campaign name",
    agent_name: "Agent name",
    call_type: "Call type",
    call_id: "Call ID",
};

const ACRONYMS = new Set(["id", "emi", "otp", "url", "kyc", "gst", "pan", "upi", "ifsc", "dob", "sms", "crm", "vin", "rc"]);

/** "loan_amount" → "Loan amount", "emi_due" → "EMI due" */
export function variableLabel(name: string): string {
    if (LABELS[name]) return LABELS[name];
    const text = name
        .split("_")
        .filter(Boolean)
        .map((word) => (ACRONYMS.has(word) ? word.toUpperCase() : word))
        .join(" ");
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/** An example in the box, guessed from the name — a hint of the shape, never a value that is sent. */
function exampleFor(name: string): string {
    if (name === "customer_name") return "e.g. Ravi Kumar";
    if (name === "campaign_name") return "e.g. Diwali offers";
    if (/(^|_)(date|dob|day|deadline)(_|$)/.test(name)) return "e.g. 30 Sep 2026";
    if (/(^|_)(time|slot)(_|$)/.test(name)) return "e.g. 4:30 PM";
    if (/phone|mobile|whatsapp/.test(name)) return "e.g. +91 98123 45678";
    if (/email/.test(name)) return "e.g. ravi@example.com";
    if (/(^|_)(id|number|no|ref|reference|code)(_|$)/.test(name)) return "e.g. LN-20931";
    if (/amount|price|emi|balance|fee|cost|total|due|outstanding|salary|limit|premium/.test(name)) return "e.g. 45000";
    if (/city|branch|location|area|address|state/.test(name)) return "e.g. Andheri, Mumbai";
    if (/company|business|brand|store|shop|dealer/.test(name)) return "e.g. Sharma Motors";
    return "Type a value";
}

function automaticValue(name: string, agentName: string): string {
    if (name === "agent_name") return agentName;
    if (name === "call_type") return "test";
    if (name === "call_id") return "given when the call starts";
    return "";
}

// Who the call is to first, then the prompt's own values, then the campaign
const ORDER: Record<AgentVariable["source"], number> = { customer: 0, custom: 1, campaign: 2, automatic: 3 };

function savedValues(agentId: string): Record<string, string> {
    try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_PREFIX + agentId) ?? "null");
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
        return Object.fromEntries(
            Object.entries(parsed as Record<string, unknown>).filter(
                (entry): entry is [string, string] => typeof entry[1] === "string",
            ),
        );
    } catch {
        return {};
    }
}

function saveValues(agentId: string, values: Record<string, string>) {
    try {
        const kept = Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim()));
        if (Object.keys(kept).length) window.localStorage.setItem(STORAGE_PREFIX + agentId, JSON.stringify(kept));
        else window.localStorage.removeItem(STORAGE_PREFIX + agentId);
    } catch {
        // Storage is blocked: the values just aren't remembered next time
    }
}

interface Props {
    agentId: string;
    agentName: string;
    onStart: (start: TestCallStart) => void;
}

export default function TestCallSetup({ agentId, agentName, onStart }: Props) {
    const [known, setKnown] = useState<AgentVariables | null>(() => described.get(agentId) ?? null);
    const [status, setStatus] = useState<"loading" | "ready" | "error">(() => (described.has(agentId) ? "ready" : "loading"));
    const [values, setValues] = useState<Record<string, string>>(() => savedValues(agentId));
    const [attempt, setAttempt] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        fetchAgentVariables(agentId).then((res) => {
            if (cancelled) return;
            if (res.success && res.data) {
                const next = { variables: res.data.variables ?? [], unusable: res.data.unusable ?? [] };
                described.set(agentId, next);
                setKnown(next);
                setStatus("ready");
            } else if (!described.has(agentId)) {
                // A refresh that fails keeps what was read before; with nothing read, say so
                setStatus("error");
            }
        });
        return () => {
            cancelled = true;
        };
    }, [agentId, attempt]);

    const { fields, automatic } = useMemo(() => {
        const list = [...(known?.variables ?? [])].sort(
            (a, b) =>
                ORDER[a.source] - ORDER[b.source] ||
                // customer_name before customer_phone; everything else keeps the prompt's order
                (a.source === "customer" ? a.name.localeCompare(b.name) : 0),
        );
        return {
            fields: list.filter((v) => v.source !== "automatic"),
            automatic: list.filter((v) => v.source === "automatic"),
        };
    }, [known]);
    const unusable = known?.unusable ?? [];
    const blank = fields.filter((v) => !(values[v.name] ?? "").trim());
    const hasFields = fields.length > 0;
    const anyTyped = fields.some((v) => (values[v.name] ?? "").trim());

    // Straight into the first empty box, where there is a keyboard to type with
    useEffect(() => {
        if (!hasFields || !window.matchMedia?.("(pointer: fine)").matches) return;
        const root = rootRef.current;
        (root?.querySelector<HTMLInputElement>('input[data-blank="true"]') ?? root?.querySelector("input"))?.focus();
    }, [hasFields]);

    const setValue = (name: string, value: string) => {
        const next = { ...values, [name]: value };
        setValues(next);
        // Only what the prompt still asks for is remembered
        saveValues(agentId, Object.fromEntries(fields.map((v) => [v.name, next[v.name] ?? ""])));
    };

    const clear = () => {
        setValues({});
        saveValues(agentId, {});
        rootRef.current?.querySelector("input")?.focus();
    };

    const retry = () => {
        setStatus("loading");
        setAttempt((n) => n + 1);
    };

    const start = () => {
        const request: TestCallRequest = {};
        const metadata: Record<string, string> = {};
        const sent: SentValue[] = [];
        for (const v of fields) {
            const value = (values[v.name] ?? "").trim();
            sent.push({ name: v.name, label: variableLabel(v.name), value });
            if (!value) continue;
            if (v.name === "customer_name") request.customerName = value;
            else if (v.name === "customer_phone") request.customerPhone = value;
            else metadata[v.name] = value;
        }
        if (Object.keys(metadata).length) request.metadata = metadata;
        onStart({ request, sent });
    };

    const loading = status === "loading" && !known;

    const automaticBlock = automatic.length > 0 && (
        <div className="tcs-auto">
            <p className="tcs-auto-title">
                <Sparkles size={12} aria-hidden /> Filled in by Talkrix
            </p>
            <ul className="tcs-chips">
                {automatic.map((v) => (
                    <li key={v.name} className="tcs-chip">
                        <code>{`{{${v.placeholders[0]}}}`}</code>
                        <span>{automaticValue(v.name, agentName)}</span>
                    </li>
                ))}
            </ul>
        </div>
    );

    const alerts = (
        <>
            {status === "error" && (
                <div className="tcs-alert" role="alert">
                    <AlertTriangle size={14} aria-hidden />
                    <span>Couldn&apos;t read this agent&apos;s prompt values. You can still call — anything it asks for will be blank.</span>
                    <button type="button" className="tcs-alert-action" onClick={retry}>
                        Try again
                    </button>
                </div>
            )}
            {unusable.length > 0 && (
                <div className="tcs-alert" role="note">
                    <AlertTriangle size={14} aria-hidden />
                    <span>
                        {unusable.map((p) => `{{${p}}}`).join(", ")} can&apos;t be filled — a placeholder&apos;s name has to start
                        with a letter. Rename {unusable.length === 1 ? "it" : "them"} in the agent&apos;s prompt.
                    </span>
                </div>
            )}
        </>
    );

    if (!hasFields) {
        return (
            <div className="tcs-simple" ref={rootRef}>
                <style>{STYLES}</style>
                <div className="tcs-orb">
                    <Phone size={40} color="#00C8FF" />
                </div>
                <p className="tcs-simple-text">
                    Start a voice call to test your agent.
                    <br />
                    Make sure your microphone is enabled.
                </p>
                {alerts}
                {automaticBlock}
                <button type="button" className="tcs-start" onClick={start} disabled={loading}>
                    {loading ? <Loader2 size={20} className="tcs-spin" aria-hidden /> : <Phone size={20} aria-hidden />}
                    {loading ? "Getting ready…" : "Start Call"}
                </button>
            </div>
        );
    }

    return (
        <div className="tcs" ref={rootRef}>
            <style>{STYLES}</style>
            <div className="tcs-intro">
                <div className="tcs-intro-icon" aria-hidden>
                    <Braces size={16} />
                </div>
                <div className="tcs-intro-text">
                    <h3>Test values</h3>
                    <p>
                        This agent&apos;s prompt uses {fields.length === 1 ? "1 value" : `${fields.length} values`}. Fill{" "}
                        {fields.length === 1 ? "it" : "them"} in to hear the call the way a customer would.
                    </p>
                </div>
                {anyTyped && (
                    <button type="button" className="tcs-ghost" onClick={clear}>
                        <RotateCcw size={13} aria-hidden /> Clear
                    </button>
                )}
            </div>

            <div className="tcs-fields">
                {fields.map((v) => {
                    const id = `tcs-${v.name}`;
                    const value = values[v.name] ?? "";
                    const phone = v.name === "customer_phone";
                    const others = v.placeholders.length - 1;
                    return (
                        <div className="tcs-field" key={v.name}>
                            <div className="tcs-label-row">
                                <label htmlFor={id}>{variableLabel(v.name)}</label>
                                <code className="tcs-code" title={v.placeholders.map((p) => `{{${p}}}`).join("  ")}>
                                    {`{{${v.placeholders[0]}}}`}
                                    {others > 0 ? ` +${others}` : ""}
                                </code>
                            </div>
                            <input
                                id={id}
                                className="tcs-input"
                                type={phone ? "tel" : "text"}
                                inputMode={phone ? "tel" : undefined}
                                value={value}
                                maxLength={MAX_CHARS}
                                placeholder={phone ? "e.g. +91 98123 45678" : exampleFor(v.name)}
                                autoComplete="off"
                                spellCheck={false}
                                data-blank={!value.trim()}
                                aria-describedby={v.source === "campaign" ? `${id}-note` : undefined}
                                onChange={(e) => setValue(v.name, e.target.value)}
                            />
                            {v.source === "campaign" && (
                                <p id={`${id}-note`} className="tcs-note">
                                    A test call isn&apos;t part of a campaign, so this is blank unless you name one.
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {automaticBlock}
            {alerts}

            <div className="tcs-footer">
                <p className={`tcs-status${blank.length === 0 ? " tcs-status-ok" : ""}`} aria-live="polite">
                    {blank.length === 0 ? (
                        <>
                            <Check size={14} aria-hidden /> {fields.length === 1 ? "Filled in" : `All ${fields.length} filled in`}
                        </>
                    ) : (
                        <>
                            <Info size={14} aria-hidden />
                            {blank.length === fields.length
                                ? "Nothing filled in yet — the agent will hear blanks"
                                : `${blank.length} left blank — the agent will hear nothing there`}
                        </>
                    )}
                </p>
                <button type="button" className="tcs-start" onClick={start}>
                    <Phone size={18} aria-hidden /> Start test call
                </button>
                <p className="tcs-mic">Make sure your microphone is enabled.</p>
            </div>
        </div>
    );
}

/** What the agent was given, folded away above the live transcript. */
export function TestValuesSent({ values }: { values: SentValue[] }) {
    const [open, setOpen] = useState(false);
    if (values.length === 0) return null;
    const filled = values.filter((v) => v.value).length;
    return (
        <div className="tcs-sent">
            <style>{STYLES}</style>
            <button type="button" className="tcs-sent-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
                <Braces size={13} aria-hidden />
                <span>Test values</span>
                <span className="tcs-count">
                    {filled}/{values.length}
                </span>
                <ChevronDown size={14} className={`tcs-chev${open ? " tcs-chev-open" : ""}`} aria-hidden />
            </button>
            {open && (
                <dl className="tcs-sent-list">
                    {values.map((v) => (
                        <div key={v.name} className="tcs-sent-row">
                            <dt>{v.label}</dt>
                            <dd className={v.value ? undefined : "tcs-blank-value"}>{v.value || "Left blank"}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </div>
    );
}

const STYLES = `
.tcs { display: flex; flex-direction: column; gap: 18px; }
.tcs-intro { display: flex; align-items: flex-start; gap: 12px; }
.tcs-intro-icon { width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(0, 200, 255, 0.16), rgba(120, 0, 255, 0.16)); border: 1px solid rgba(0, 200, 255, 0.25); color: #00C8FF; }
.tcs-intro-text { flex: 1; min-width: 0; }
.tcs-intro-text h3 { margin: 0; font-size: 14px; font-weight: 600; color: #fff; }
.tcs-intro-text p { margin: 3px 0 0; font-size: 12.5px; line-height: 1.5; color: rgba(255, 255, 255, 0.5); }
.tcs-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 8px; font-size: 12px; white-space: nowrap;
  cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.03); color: rgba(255, 255, 255, 0.7);
  transition: all 0.15s ease; }
.tcs-ghost:hover { border-color: rgba(0, 200, 255, 0.4); color: #00C8FF; }
.tcs-fields { display: flex; flex-direction: column; gap: 14px; }
.tcs-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.tcs-label-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; min-width: 0; }
.tcs-label-row label { font-size: 13px; font-weight: 500; color: rgba(255, 255, 255, 0.85); }
.tcs-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: rgba(0, 200, 255, 0.85);
  background: rgba(0, 200, 255, 0.07); border: 1px solid rgba(0, 200, 255, 0.14); padding: 1px 6px; border-radius: 6px;
  max-width: 55%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tcs-input { width: 100%; box-sizing: border-box; padding: 11px 13px; border-radius: 10px; font-size: 14px; color: #fff; outline: none;
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1);
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease; }
.tcs-input::placeholder { color: rgba(255, 255, 255, 0.25); }
.tcs-input:hover { border-color: rgba(255, 255, 255, 0.18); }
.tcs-input:focus { border-color: rgba(0, 200, 255, 0.6); background: rgba(0, 200, 255, 0.04); box-shadow: 0 0 0 3px rgba(0, 200, 255, 0.12); }
.tcs-note { margin: 0; font-size: 11.5px; line-height: 1.45; color: rgba(255, 255, 255, 0.38); }
.tcs-auto { padding: 12px 14px; border-radius: 12px; background: rgba(255, 255, 255, 0.025); border: 1px dashed rgba(255, 255, 255, 0.1); text-align: left; }
.tcs-auto-title { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
  text-transform: uppercase; color: rgba(255, 255, 255, 0.45); }
.tcs-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.tcs-chip { display: inline-flex; align-items: center; gap: 6px; max-width: 100%; padding: 4px 10px; border-radius: 999px; font-size: 12px;
  color: rgba(255, 255, 255, 0.75); background: rgba(255, 255, 255, 0.05); }
.tcs-chip code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: rgba(0, 200, 255, 0.75); }
.tcs-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tcs-alert { display: flex; gap: 10px; align-items: flex-start; padding: 11px 13px; border-radius: 10px; font-size: 12.5px; line-height: 1.5;
  background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.22); color: #fbbf24; text-align: left; }
.tcs-alert svg { flex-shrink: 0; margin-top: 2px; }
.tcs-alert-action { margin-left: auto; padding: 0; border: none; background: none; color: #fbbf24; font-size: 12.5px; font-weight: 600;
  text-decoration: underline; white-space: nowrap; cursor: pointer; }
.tcs-footer { position: sticky; bottom: -24px; z-index: 1; margin: -4px -24px -24px; padding: 16px 24px 22px; display: flex;
  flex-direction: column; gap: 10px; background: linear-gradient(180deg, rgba(7, 11, 23, 0) 0%, rgba(7, 11, 23, 0.97) 24%); }
.tcs-status { margin: 0; display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: rgba(255, 255, 255, 0.5); }
.tcs-status svg { flex-shrink: 0; }
.tcs-status-ok { color: #4ade80; }
.tcs-start { display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 24px; border-radius: 14px; border: none;
  cursor: pointer; background: linear-gradient(135deg, #00C8FF 0%, #7800FF 100%); color: #fff; font-size: 15px; font-weight: 600;
  box-shadow: 0 4px 24px rgba(0, 200, 255, 0.3); transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease; }
.tcs-start:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0, 200, 255, 0.4); }
.tcs-start:disabled { opacity: 0.6; cursor: default; }
.tcs-start:focus-visible, .tcs-ghost:focus-visible, .tcs-sent-toggle:focus-visible, .tcs-alert-action:focus-visible {
  outline: 2px solid #00C8FF; outline-offset: 2px; }
.tcs-mic { margin: 0; text-align: center; font-size: 12px; color: rgba(255, 255, 255, 0.35); }
.tcs-simple { text-align: center; padding: 20px 0; display: flex; flex-direction: column; align-items: center; }
.tcs-simple > .tcs-auto, .tcs-simple > .tcs-alert { align-self: stretch; margin-bottom: 20px; }
.tcs-orb { width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;
  background: rgba(0, 200, 255, 0.08); border: 2px solid rgba(0, 200, 255, 0.15); }
.tcs-simple-text { margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: rgba(255, 255, 255, 0.5); }
.tcs-simple .tcs-start { padding: 16px 40px; font-size: 16px; }
.tcs-spin { animation: tcs-spin 1s linear infinite; }
@keyframes tcs-spin { to { transform: rotate(360deg); } }

.tcs-sent { margin-bottom: 14px; border-radius: 12px; background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.06); }
.tcs-sent-toggle { width: 100%; display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: none; border-radius: 12px;
  background: none; color: rgba(255, 255, 255, 0.7); font-size: 13px; font-weight: 500; cursor: pointer; }
.tcs-sent-toggle:hover { color: #fff; }
.tcs-count { padding: 1px 7px; border-radius: 10px; background: rgba(0, 200, 255, 0.14); color: #00C8FF; font-size: 11px; font-weight: 600; }
.tcs-chev { margin-left: auto; transition: transform 0.2s ease; }
.tcs-chev-open { transform: rotate(180deg); }
.tcs-sent-list { margin: 0; padding: 0 14px 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.tcs-sent-row { min-width: 0; padding: 8px 10px; border-radius: 9px; background: rgba(255, 255, 255, 0.03); }
.tcs-sent-row dt { margin-bottom: 3px; font-size: 11px; color: rgba(255, 255, 255, 0.4); }
.tcs-sent-row dd { margin: 0; font-size: 13px; color: rgba(255, 255, 255, 0.9); overflow-wrap: anywhere; }
.tcs-sent-row dd.tcs-blank-value { color: rgba(255, 255, 255, 0.3); font-style: italic; }
@media (max-width: 520px) {
  .tcs-sent-list { grid-template-columns: 1fr; }
  .tcs-code { max-width: 50%; }
}
`;
