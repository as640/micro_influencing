import { useEffect, useRef, useState, useCallback } from 'react';
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
  const pollingRef = useRef(null);

  // Contract proposal modal state
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractForm, setContractForm] = useState({ agreed_price: '', deliverables: '' });
  const [proposing, setProposing] = useState(false);
  const [contractSuccess, setContractSuccess] = useState(false);

  // Load conversation list
  const loadConvos = useCallback(() => {
    conversationApi.list()
      .then((data) => {
        setConvos(data);
        if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedId]);

  useEffect(() => {
    loadConvos();
  }, []);

  // Load thread + start live polling when conversation is selected
  const loadThread = useCallback((id) => {
    if (!id) return;
    conversationApi.detail(id)
      .then((data) => {
        setThread(data);
        conversationApi.markRead(id).catch(() => {});
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setThread(null);
    setContractSuccess(false);
    loadThread(selectedId);

    // Start live polling every 3 seconds
    pollingRef.current = setInterval(() => {
      loadThread(selectedId);
    }, 3000);

    return () => clearInterval(pollingRef.current);
  }, [selectedId]);

  // Auto-scroll to latest message whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await conversationApi.sendMsg(selectedId, draft.trim());
      setDraft('');
      loadThread(selectedId); // instantly refresh after sending
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // Handle Enter key to send (Shift+Enter for new line)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  // Determine the other party's display name in a conversation
  const getOtherParty = (convo) => {
    if (!convo || !user) return 'Unknown';
    if (user.role === 'business' || user.is_superuser) {
      return convo.influencer_handle ? `@${convo.influencer_handle}` : 'Influencer';
    }
    return convo.business_name || 'Business';
  };

  const getLastMessageText = (convo) => {
    // The list endpoint returns `last_message` as an object with `content`
    if (convo.last_message?.content) return convo.last_message.content;
    return 'No messages yet';
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
  const isBusiness = user?.role === 'business' || user?.is_superuser;

  return (
    // Use fixed height capped to the viewport so chat scrolls inside, not the page
    <section className="flex flex-col rounded-3xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-2xl shadow-2xl animate-fade-up overflow-hidden relative font-sans" style={{ height: 'calc(100vh - 8rem)', minHeight: '600px' }}>
      
      {/* Background Glows for Depth */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/10 blur-[100px] rounded-full pointer-events-none z-0"></div>
      
      <div className="grid h-full overflow-hidden md:grid-cols-[320px_1fr] relative z-10">
        {/* Sidebar */}
        <aside className="flex flex-col border-b border-slate-700/50 bg-slate-950/40 md:border-b-0 md:border-r md:border-slate-700/50 overflow-hidden">
          <div className="shrink-0 border-b border-slate-700/50 px-5 py-5 bg-slate-900/50 backdrop-blur-md">
            <h2 className="text-xl font-extrabold text-white font-display tracking-tight">Messages</h2>
            <p className="text-xs font-semibold text-indigo-400 mt-0.5 uppercase tracking-wider">{convos.length} active thread{convos.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {convos.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center mt-10">
                <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">💬</div>
                <p className="text-sm font-semibold text-slate-400">No conversations yet.</p>
              </div>
            ) : (
              convos.map((convo) => {
                const isActive = convo.id === selectedId;
                return (
                  <button key={convo.id} type="button" onClick={() => setSelectedId(convo.id)}
                    className={`w-full border-b border-slate-800/60 px-5 py-4 text-left transition-all duration-200 relative ${isActive ? 'bg-indigo-600/10' : 'hover:bg-slate-800/40'}`}
                  >
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-md"></div>}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full border border-slate-700 bg-slate-800 overflow-hidden shadow-inner">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${getOtherParty(convo)}`} alt="Avatar" className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <p className={`font-bold truncate ${isActive ? 'text-indigo-100' : 'text-slate-200'}`}>{getOtherParty(convo)}</p>
                          <p className={`mt-0.5 text-xs truncate max-w-[140px] ${isActive ? 'text-indigo-300/80 font-medium' : 'text-slate-500'}`}>{getLastMessageText(convo)}</p>
                        </div>
                      </div>
                      {convo.unread_count > 0 && (
                        <span className="shrink-0 rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                          {convo.unread_count}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Chat panel */}
        <div className="flex h-full flex-col overflow-hidden bg-slate-900/20">
          {activeConvo ? (
            <>
              {/* Chat Header */}
              <header className="shrink-0 flex flex-wrap items-center justify-between border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-md px-6 py-4 gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 shrink-0 rounded-full border-2 border-slate-700 bg-slate-800 overflow-hidden shadow-lg relative">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${getOtherParty(activeConvo)}`} alt="Avatar" className="h-full w-full object-cover" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border border-slate-900 rounded-full blur-[1px]"></div>
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-white font-display drop-shadow-sm">{getOtherParty(activeConvo)}</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live Chat
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Contract Success Badge */}
                  {contractSuccess && (
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)] flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      Proposal Sent
                    </span>
                  )}
                  {/* "Propose Contract" button — only for businesses + superadmin */}
                  {isBusiness && (
                    <button
                      onClick={() => setShowContractModal(true)}
                      className="rounded-xl border border-emerald-500/30 bg-emerald-600/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-400 transition-all hover:bg-emerald-600 hover:text-white glow-hover shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                    >
                      Propose Contract
                    </button>
                  )}
                  {/* Influencer: shortcut to view their pending orders */}
                  {!isBusiness && (
                    <button
                      onClick={() => navigate('/dashboard/pending-orders')}
                      className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 transition-all hover:bg-slate-700 shadow-sm"
                    >
                      View Contracts
                    </button>
                  )}
                </div>
              </header>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 custom-scrollbar">
                {thread === null ? (
                  <div className="flex flex-col h-full items-center justify-center">
                    <p className="text-sm font-semibold text-slate-500 animate-pulse-slow">Syncing thread…</p>
                  </div>
                ) : thread.messages?.length === 0 ? (
                  <div className="flex flex-col h-full items-center justify-center space-y-3">
                    <div className="p-4 rounded-full bg-indigo-500/10 mb-2 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                    <p className="text-base font-bold text-slate-300 font-display">No messages yet</p>
                    <p className="text-sm text-slate-500">Send a message to start the collaboration.</p>
                  </div>
                ) : (
                  thread.messages?.map((msg, i) => {
                    const isMe = msg.sender_email === user?.email;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        <div className={`max-w-[85%] md:max-w-[70%] group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`px-5 py-3 text-sm rounded-2xl ${isMe 
                            ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-tr-sm shadow-[0_5px_15px_rgba(99,102,241,0.2)]'
                            : 'border border-slate-700/50 bg-slate-800/80 backdrop-blur-sm text-slate-100 rounded-tl-sm shadow-sm'}`}>
                            <p className="leading-relaxed">{msg.content}</p>
                          </div>
                          <p className={`mt-1.5 text-[10px] font-semibold uppercase tracking-widest px-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'text-indigo-400/80' : 'text-slate-500'}`}>
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
              <form className="shrink-0 border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-xl p-5" onSubmit={handleSend}>
                <div className="flex items-end gap-3 rounded-2xl border border-slate-700/50 bg-slate-950/50 p-2 shadow-inner transition-all focus-within:border-indigo-500/50 focus-within:bg-slate-950/80 focus-within:ring-1 focus-within:ring-indigo-500/50">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message... (Enter to send)"
                    rows={1}
                    className="w-full resize-none bg-transparent px-4 py-3 text-sm text-slate-100 outline-none max-h-32 custom-scrollbar placeholder:text-slate-500"
                  />
                  <div className="pb-1 pr-1">
                    <button type="submit" disabled={sending || !draft.trim()}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:pointer-events-none glow-hover">
                      {sending ? '...' : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-0.5">
                          <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-col h-full items-center justify-center text-center p-8 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none"></div>
              <div className="h-16 w-16 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-5 rotate-12 shadow-xl backdrop-blur-sm z-10">
                <span className="text-3xl -rotate-12">💬</span>
              </div>
              <h3 className="text-xl font-extrabold text-white font-display z-10">Your Messages</h3>
              <p className="mt-2 text-sm text-slate-400 font-medium max-w-xs z-10">Select a conversation from the sidebar to view history or start chatting.</p>
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

              <div className="rounded-lg bg-indigo-600/10 border border-indigo-700/30 px-4 py-3 text-sm text-indigo-300">
                💡 After you submit, the influencer will see this offer in their <strong>Pending Orders</strong> page and can accept or decline.
              </div>

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
