import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { contractApi, conversationApi } from '../api';
import { useAuth } from '../context/AuthContext';

function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [convos, setConvos] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  // Contract proposal modal state
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractForm, setContractForm] = useState({ agreed_price: '', deliverables: '' });
  const [proposing, setProposing] = useState(false);
  const [contractSuccess, setContractSuccess] = useState(false);

  // Load conversation list
  useEffect(() => {
    conversationApi.list()
      .then((data) => {
        setConvos(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Load thread when selected conversation changes
  useEffect(() => {
    if (!selectedId) return;
    setThread(null);
    setContractSuccess(false);
    conversationApi.detail(selectedId)
      .then((data) => { setThread(data); conversationApi.markRead(selectedId).catch(() => { }); })
      .catch(console.error);
  }, [selectedId]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await conversationApi.sendMsg(selectedId, draft.trim());
      setDraft('');
      const updated = await conversationApi.detail(selectedId);
      setThread(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // Determine the other party's display name in a conversation
  const getOtherParty = (convo) => {
    if (!convo || !user) return 'Unknown';
    if (user.role === 'business') {
      return convo.influencer_handle ? `@${convo.influencer_handle}` : 'Influencer';
    }
    return convo.business_name || 'Business';
  };

  const getLastMessage = (convo) => {
    const msgs = convo.messages || [];
    return msgs.length > 0 ? msgs[msgs.length - 1].content : 'No messages yet';
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  // Propose a contract to the influencer from this conversation
  const handleProposeContract = async (e) => {
    e.preventDefault();
    if (!contractForm.agreed_price || !contractForm.deliverables.trim()) return;
    const activeConvo = convos.find((c) => c.id === selectedId);
    if (!activeConvo?.influencer_id) {
      alert('Could not find influencer in this conversation. Please try again.');
      return;
    }

    setProposing(true);
    try {
      await contractApi.create({
        influencer: activeConvo.influencer_id,
        agreed_price: contractForm.agreed_price,
        deliverables: contractForm.deliverables.trim(),
      });
      setShowContractModal(false);
      setContractForm({ agreed_price: '', deliverables: '' });
      setContractSuccess(true);
    } catch (err) {
      console.error('Failed to propose contract', err);
      alert('Could not send contract proposal. Please try again.');
    } finally {
      setProposing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Loading conversations…
      </div>
    );
  }

  const activeConvo = convos.find((c) => c.id === selectedId);
  const isBusiness = user?.role === 'business';

  return (
    <section className="h-[calc(100vh-9rem)] min-h-[560px] rounded-2xl border border-slate-800 bg-slate-900 shadow-sm animate-fade-up">
      <div className="grid h-full md:grid-cols-[290px_1fr]">
        {/* Sidebar */}
        <aside className="border-b border-slate-800 bg-slate-950/70 md:border-b-0 md:border-r md:border-slate-800">
          <div className="border-b border-slate-800 px-4 py-4">
            <h2 className="text-lg font-semibold text-white">Messages</h2>
            <p className="text-sm text-slate-400">{convos.length} active thread{convos.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="max-h-[260px] overflow-y-auto md:max-h-[calc(100vh-15rem)]">
            {convos.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">No conversations yet.</p>
            ) : (
              convos.map((convo) => {
                const isActive = convo.id === selectedId;
                return (
                  <button key={convo.id} type="button" onClick={() => setSelectedId(convo.id)}
                    className={`w-full border-b border-slate-800 px-4 py-3 text-left transition ${isActive ? 'bg-indigo-600/20' : 'hover:bg-slate-800/60'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-white">{getOtherParty(convo)}</p>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-400">{getLastMessage(convo)}</p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Chat panel */}
        <div className="flex h-full flex-col">
          {activeConvo ? (
            <>
              {/* Chat Header */}
              <header className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
                <div>
                  <p className="text-base font-semibold text-white">{getOtherParty(activeConvo)}</p>
                  <p className="text-xs text-slate-500">Conversation</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Contract Success Badge */}
                  {contractSuccess && (
                    <span className="rounded-full bg-emerald-900/50 px-3 py-1 text-xs font-semibold text-emerald-400">
                      ✓ Contract Proposed
                    </span>
                  )}
                  {/* "Propose Contract" button — only for businesses */}
                  {isBusiness && (
                    <button
                      onClick={() => setShowContractModal(true)}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                    >
                      📋 Propose Contract
                    </button>
                  )}
                  {/* Influencer: shortcut to view their pending orders */}
                  {!isBusiness && (
                    <button
                      onClick={() => navigate('/dashboard/pending-orders')}
                      className="rounded-lg border border-slateald-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                    >
                      View Contract Offers
                    </button>
                  )}
                </div>
              </header>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {thread === null ? (
                  <p className="text-center text-sm text-slate-500">Loading…</p>
                ) : thread.messages?.length === 0 ? (
                  <p className="text-center text-sm text-slate-500">No messages yet. Say hello! 👋</p>
                ) : (
                  thread.messages?.map((msg, i) => {
                    const isMe = msg.sender_email === user?.email;
                    return (
                      <div key={msg.id} className={`animate-fade-up flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        style={{ animationDelay: `${i * 40}ms` }}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm md:max-w-[70%] ${isMe ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                          : 'border border-slate-700 bg-slate-800 text-slate-100'}`}>
                          <p>{msg.content}</p>
                          <p className={`mt-1 text-[11px] ${isMe ? 'text-indigo-200' : 'text-slate-500'}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Message input */}
              <form className="border-t border-slate-800 p-4" onSubmit={handleSend}>
                <div className="flex gap-2">
                  <input value={draft} onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message…"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
                  />
                  <button type="submit" disabled={sending || !draft.trim()}
                    className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50">
                    {sending ? '…' : 'Send'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-slate-500">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>

      {/* ── Contract Proposal Modal ─────────────────────────────────── */}
      {showContractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md animate-fade-up rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">📋 Propose a Contract</h3>
                <p className="mt-0.5 text-sm text-slate-400">
                  with {getOtherParty(activeConvo)}
                </p>
              </div>
              <button onClick={() => setShowContractModal(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleProposeContract} className="space-y-4">
              {/* Agreed Price */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-400 uppercase tracking-wide">
                  Agreed Price (₹) <span className="text-red-400">*</span>
                </span>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 5000"
                  value={contractForm.agreed_price}
                  onChange={(e) => setContractForm(p => ({ ...p, agreed_price: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
              </label>

              {/* Deliverables */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-400 uppercase tracking-wide">
                  Deliverables <span className="text-red-400">*</span>
                </span>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. 1 Instagram Reel, 2 Stories, posted within 7 days..."
                  value={contractForm.deliverables}
                  onChange={(e) => setContractForm(p => ({ ...p, deliverables: e.target.value }))}
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
              </label>

              {/* Info note */}
              <div className="rounded-lg bg-indigo-600/10 border border-indigo-700/30 px-4 py-3 text-sm text-indigo-300">
                💡 After you submit, the influencer will see this offer in their <strong>Pending Orders</strong> page and can accept or decline.
              </div>

              {/* Actions */}
              <div className="flex gap-3 border-t border-slate-800 pt-4">
                <button type="button" onClick={() => setShowContractModal(false)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2.5 font-semibold text-slate-300 transition hover:bg-slate-700">
                  Cancel
                </button>
                <button type="submit" disabled={proposing}
                  className="flex-1 rounded-lg bg-emerald-600 py-2.5 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50">
                  {proposing ? 'Sending…' : 'Send Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default MessagesPage;
