import type { CampaignContact, CampaignRetry, CampaignStatus, RetryOutcome } from './campaignApi';

export const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; color: string }> = {
    draft: { label: 'Draft', color: '#9CA3AF' },
    scheduled: { label: 'Scheduled', color: '#F59E0B' },
    active: { label: 'Active', color: '#10B981' },
    paused: { label: 'Paused', color: '#EF4444' },
    'paused-time-window': { label: 'Outside calling hours', color: '#A78BFA' },
    completed: { label: 'Completed', color: '#6B7280' },
};

export function campaignStatusLabel(status: string): string {
    return CAMPAIGN_STATUS[status as CampaignStatus]?.label ?? status;
}

export function campaignStatusColor(status: string): string {
    return CAMPAIGN_STATUS[status as CampaignStatus]?.color ?? '#6B7280';
}

export const CONTACT_STATUS_LABELS: Record<CampaignContact['callStatus'], string> = {
    pending: 'Pending',
    'in-progress': 'On a call',
    completed: 'Completed',
    failed: 'Failed',
    'no-answer': 'No answer',
};

const REASONS: Record<string, string> = {
    do_not_call: 'On the do-not-call list',
    invalid_number: "Number can't be dialed",
    no_answer: 'No answer',
    'no-answer': 'No answer',
    busy: 'Line busy',
    canceled: 'Canceled',
    failed: 'Call failed',
    dial_failed: 'Call could not be placed',
    telephony_not_ready: 'Phone number not set up',
    agent_not_found: 'Agent was deleted',
    never_dialed: 'Waited too long to be placed',
    lost_before_dial: 'Never placed',
    no_end_event: 'Ended without a report',
    unjoined: 'Not picked up',
    hangup: 'Contact hung up',
    agent_hangup: 'Agent ended the call',
    timeout: 'Reached the time limit',
    connection_error: 'Connection problem',
    system_error: 'System error',
};

/** Why a call ended, in words. */
export function endReasonLabel(reason?: string | null): string | null {
    if (!reason) return null;
    if (REASONS[reason]) return REASONS[reason];
    const words = reason.replace(/[_-]+/g, ' ').trim();
    return words ? words[0].toUpperCase() + words.slice(1) : null;
}

export const RETRY_OUTCOME_LABELS: Record<RetryOutcome, string> = {
    no_answer: 'no answer',
    busy: 'busy',
    failed: 'failed',
};

export const DEFAULT_RETRY: CampaignRetry = { maxAttempts: 2, retryAfterMinutes: 60, retryOn: ['no_answer', 'busy'] };

/** "Up to 3 calls per contact, 60 min apart, on no answer or busy" */
export function retrySummary(retry?: CampaignRetry | null): string {
    if (!retry || retry.maxAttempts <= 1 || retry.retryOn.length === 0) return 'Each contact is called once';
    const outcomes = retry.retryOn.map((r) => RETRY_OUTCOME_LABELS[r]);
    const when = outcomes.length > 1 ? `${outcomes.slice(0, -1).join(', ')} or ${outcomes[outcomes.length - 1]}` : outcomes[0];
    const gap = retry.retryAfterMinutes >= 60 && retry.retryAfterMinutes % 60 === 0
        ? `${retry.retryAfterMinutes / 60} h`
        : `${retry.retryAfterMinutes} min`;
    return `Up to ${retry.maxAttempts} calls per contact, ${gap} apart, on ${when}`;
}

/** What a paused campaign's reason means for the person looking at it. */
export function pausedReasonText(status: CampaignStatus, reason?: string | null): string | null {
    if (status === 'paused-time-window') return "Paused at the end of today's calling hours.";
    if (status !== 'paused' || !reason || reason === 'manual') return null;
    return reason;
}
