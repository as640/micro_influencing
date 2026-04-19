import { useEffect, useState } from 'react';
import { communityApi } from '../api';

const RISK_BADGE = {
    low:    'bg-emerald-900/40 text-emerald-300 border-emerald-700',
    medium: 'bg-amber-900/40 text-amber-300 border-amber-700',
    high:   'bg-red-900/40 text-red-300 border-red-700',
};

const STATUS_BADGE = {
    draft:    'bg-slate-800 text-slate-300',
    active:   'bg-indigo-900/40 text-indigo-300 border-indigo-700',
    archived: 'bg-slate-900 text-slate-500',
};

function CampaignCard({ campaign, onEndorse, onUnendorse }) {
    const [busy, setBusy] = useState(false);
    const handle = async () => {
        setBusy(true);
        try {
            if (campaign.is_endorsed_by_me) {
                await onUnendorse(campaign.id);
            } else {
                await onEndorse(campaign.id);
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-white">{campaign.title}</h3>
                <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[campaign.status] || STATUS_BADGE.draft}`}>
                        {campaign.status}
                    </span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs ${RISK_BADGE[campaign.risk_level] || RISK_BADGE.low}`}>
                        {campaign.risk_level} risk
                    </span>
                </div>
            </div>

            <p className="mt-2 text-sm text-slate-300">{campaign.description}</p>

            {campaign.call_to_action && (
                <div className="mt-3 rounded-lg border border-indigo-900 bg-indigo-950/40 px-3 py-2">
                    <p className="text-xs uppercase text-indigo-300">Call to action</p>
                    <p className="text-sm text-slate-200 mt-0.5">{campaign.call_to_action}</p>
                </div>
            )}

            <div className="mt-3 flex flex-wrap gap-1.5">
                {(campaign.categories || []).map(c => (
                    <span key={c} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{c}</span>
                ))}
                {campaign.needs_verification && (
                    <span className="rounded-full bg-yellow-900/40 px-2 py-0.5 text-xs text-yellow-300 border border-yellow-700">
                        Needs verification
                    </span>
                )}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>{campaign.endorsement_count} endorsement{campaign.endorsement_count === 1 ? '' : 's'}</span>
                <span>by {campaign.suggested_by_email || 'system'}</span>
            </div>

            {campaign.status === 'active' && (
                <button
                    onClick={handle}
                    disabled={busy}
                    className={`mt-4 w-full rounded-lg px-3 py-2 text-sm font-medium transition ${
                        campaign.is_endorsed_by_me
                            ? 'border border-slate-700 text-slate-300 hover:border-red-700 hover:text-red-300'
                            : 'bg-indigo-600 text-white hover:bg-indigo-500'
                    } disabled:opacity-50`}
                >
                    {campaign.is_endorsed_by_me ? '✓ Endorsed — click to remove' : '+ Endorse this campaign'}
                </button>
            )}
        </div>
    );
}

function SuggestForm({ onCreated }) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', call_to_action: '' });
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setMsg('');
        try {
            await communityApi.suggestCampaign(form);
            setForm({ title: '', description: '', call_to_action: '' });
            setMsg('Submitted for review. It will appear once a moderator approves it.');
            onCreated();
        } catch (err) {
            setMsg(err.detail || 'Submission failed');
        } finally {
            setBusy(false);
        }
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="w-full rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-5 text-slate-400 hover:border-indigo-700 hover:text-indigo-300"
            >
                + Suggest a community campaign
            </button>
        );
    }

    return (
        <form onSubmit={submit} className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
            <h3 className="text-lg font-semibold text-white">Suggest a campaign</h3>
            <p className="text-xs text-slate-500">
                Submissions are auto-screened by the safety layer (no personal targeting,
                no legal accusations, no harassment). They go to a moderator queue first.
            </p>
            <input
                required
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Title (e.g. Remove harmful tags from XYZ)"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500"
            />
            <textarea
                required
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What is the issue and why does it matter?"
                rows={4}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500"
            />
            <input
                value={form.call_to_action}
                onChange={(e) => setForm(f => ({ ...f, call_to_action: e.target.value }))}
                placeholder="Specific action (e.g. Sign petition, share #removeunw)"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500"
            />
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={busy}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                    {busy ? 'Submitting…' : 'Submit for review'}
                </button>
                <button
                    type="button"
                    onClick={() => { setOpen(false); setMsg(''); }}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
                >
                    Cancel
                </button>
            </div>
            {msg && <p className="text-sm text-slate-300">{msg}</p>}
        </form>
    );
}

export default function CommunityCampaignsPage() {
    const [campaigns, setCampaigns] = useState([]);
    const [statusFilter, setStatusFilter] = useState('active');
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');

    const load = () => {
        setLoading(true);
        communityApi.listCampaigns(statusFilter)
            .then(d => setCampaigns(Array.isArray(d) ? d : (d.results || [])))
            .catch(e => setErr(e.detail || 'Failed to load'))
            .finally(() => setLoading(false));
    };

    useEffect(load, [statusFilter]);

    const endorse = async (id) => {
        await communityApi.endorse(id);
        load();
    };
    const unendorse = async (id) => {
        await communityApi.unendorse(id);
        load();
    };

    return (
        <div className="space-y-6">
            <header className="flex items-end justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-white">Community Campaigns</h1>
                    <p className="text-slate-400 mt-1">
                        Soft-launch advocacy initiatives. Endorse what resonates — your
                        endorsement signals support to other influencers.
                    </p>
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                >
                    <option value="active">Active</option>
                    <option value="draft">Pending review</option>
                    <option value="archived">Archived</option>
                    <option value="">All</option>
                </select>
            </header>

            <SuggestForm onCreated={load} />

            {loading && <p className="text-slate-400">Loading…</p>}
            {err && <p className="text-red-400">{err}</p>}
            {!loading && campaigns.length === 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
                    <p className="text-slate-300">No campaigns in this view.</p>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                {campaigns.map(c => (
                    <CampaignCard
                        key={c.id}
                        campaign={c}
                        onEndorse={endorse}
                        onUnendorse={unendorse}
                    />
                ))}
            </div>
        </div>
    );
}
