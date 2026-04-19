import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { communityApi } from '../api';

const RISK_BADGE = {
    low:    'bg-emerald-900/40 text-emerald-300 border-emerald-700',
    medium: 'bg-amber-900/40 text-amber-300 border-amber-700',
    high:   'bg-red-900/40 text-red-300 border-red-700',
};

function SentimentBar({ sentiment }) {
    if (!sentiment) return <div className="h-2 bg-slate-800 rounded" />;
    const { positive = 0, negative = 0, neutral = 0 } = sentiment;
    return (
        <div className="flex h-2 w-full overflow-hidden rounded bg-slate-800">
            <div className="bg-emerald-500" style={{ width: `${positive}%` }} title={`Positive ${positive}%`} />
            <div className="bg-slate-500" style={{ width: `${neutral}%` }} title={`Neutral ${neutral}%`} />
            <div className="bg-red-500" style={{ width: `${negative}%` }} title={`Negative ${negative}%`} />
        </div>
    );
}

function TopicCard({ topic, onOpen }) {
    return (
        <button
            onClick={() => onOpen(topic)}
            className="w-full text-left rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-indigo-700 transition"
        >
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-white">{topic.title}</h3>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${RISK_BADGE[topic.risk_level] || RISK_BADGE.low}`}>
                    {topic.risk_level} risk
                </span>
            </div>

            <p className="mt-2 text-sm text-slate-400 line-clamp-3">{topic.summary}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
                {(topic.categories || []).slice(0, 4).map(c => (
                    <span key={c} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{c}</span>
                ))}
                {topic.needs_verification && (
                    <span className="rounded-full bg-yellow-900/40 px-2 py-0.5 text-xs text-yellow-300 border border-yellow-700">
                        Needs verification
                    </span>
                )}
            </div>

            <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Sentiment</p>
                <SentimentBar sentiment={topic.sentiment} />
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>Impact {Math.round(topic.public_impact_score)} · Velocity {Math.round(topic.growth_velocity)}</span>
                <span>{topic.sources_count} source{topic.sources_count === 1 ? '' : 's'}</span>
            </div>
        </button>
    );
}

function TopicDrawer({ topicId, onClose }) {
    const [detail, setDetail] = useState(null);
    const [err, setErr] = useState('');

    useEffect(() => {
        if (!topicId) return;
        setDetail(null);
        setErr('');
        communityApi.topicDetail(topicId)
            .then(setDetail)
            .catch(e => setErr(e.detail || 'Failed to load'));
    }, [topicId]);

    if (!topicId) return null;
    return (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/60" onClick={onClose}>
            <div
                className="h-full w-full max-w-2xl overflow-y-auto bg-slate-950 border-l border-slate-800 p-6"
                onClick={(e) => e.stopPropagation()}
            >
                {!detail && !err && <p className="text-slate-400">Loading…</p>}
                {err && <p className="text-red-400">{err}</p>}
                {detail && (
                    <>
                        <button onClick={onClose} className="mb-4 text-sm text-slate-400 hover:text-white">← Close</button>
                        <h2 className="text-2xl font-bold text-white">{detail.title}</h2>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {(detail.categories || []).map(c => (
                                <span key={c} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{c}</span>
                            ))}
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${RISK_BADGE[detail.risk_level] || RISK_BADGE.low}`}>
                                {detail.risk_level} risk
                            </span>
                        </div>

                        <p className="mt-4 text-slate-300">{detail.summary}</p>

                        {detail.suggested_angle && (
                            <div className="mt-5 rounded-lg border border-indigo-900 bg-indigo-950/40 p-4">
                                <p className="text-xs uppercase text-indigo-300">Suggested angle</p>
                                <p className="mt-1 text-slate-200">{detail.suggested_angle}</p>
                            </div>
                        )}

                        {detail.stakeholders?.length > 0 && (
                            <div className="mt-5">
                                <p className="text-xs uppercase text-slate-500">Stakeholders</p>
                                <p className="mt-1 text-sm text-slate-300">{detail.stakeholders.join(', ')}</p>
                            </div>
                        )}

                        <div className="mt-5">
                            <p className="text-xs uppercase text-slate-500 mb-2">Sentiment</p>
                            <SentimentBar sentiment={detail.sentiment} />
                            {detail.sentiment && (
                                <p className="mt-1 text-xs text-slate-500">
                                    +{detail.sentiment.positive}% · ={detail.sentiment.neutral}% · −{detail.sentiment.negative}% (n={detail.sentiment.sample_size})
                                </p>
                            )}
                        </div>

                        {detail.advocacy_actions?.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-lg font-semibold text-white mb-2">Suggested actions</h3>
                                <div className="space-y-3">
                                    {detail.advocacy_actions.map(a => (
                                        <div key={a.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium text-white">{a.headline}</p>
                                                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{a.kind.replace('_', ' ')}</span>
                                            </div>
                                            <p className="mt-2 text-sm text-slate-300 whitespace-pre-line">{a.body}</p>
                                            {a.safety_notes && (
                                                <p className="mt-2 text-xs text-amber-400">⚠ {a.safety_notes}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {detail.sources?.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-lg font-semibold text-white mb-2">Sources</h3>
                                <ul className="space-y-2">
                                    {detail.sources.map(s => (
                                        <li key={s.id} className="text-sm">
                                            <a href={s.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
                                                [{s.platform}] {s.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function CommunityHubPage() {
    const [data, setData] = useState({ categories: [], topics: [] });
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [openTopicId, setOpenTopicId] = useState(null);

    useEffect(() => {
        communityApi.trends()
            .then(d => setData(d))
            .catch(e => setErr(e.detail || 'Failed to load trends'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-6">
            <header className="flex items-end justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-white">Community Intelligence</h1>
                    <p className="text-slate-400 mt-1">
                        Trending public-interest topics matched to your categories
                        {data.categories.length > 0 && (
                            <>: <span className="text-indigo-400">{data.categories.join(' · ')}</span></>
                        )}
                    </p>
                </div>
                <Link
                    to="/dashboard/community-campaigns"
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                    📣 Community Campaigns →
                </Link>
            </header>

            {loading && <p className="text-slate-400">Loading trends…</p>}
            {err && <p className="text-red-400">{err}</p>}
            {!loading && !err && data.topics.length === 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
                    <p className="text-slate-300">No trends yet.</p>
                    <p className="text-sm text-slate-500 mt-1">
                        Ask a superadmin to run <code className="text-indigo-400">python manage.py refresh_trends</code>.
                    </p>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                {data.topics.map(t => (
                    <TopicCard key={t.id} topic={t} onOpen={() => setOpenTopicId(t.id)} />
                ))}
            </div>

            <TopicDrawer topicId={openTopicId} onClose={() => setOpenTopicId(null)} />
        </div>
    );
}
