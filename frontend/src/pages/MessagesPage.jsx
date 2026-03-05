import { useEffect, useRef, useState } from 'react';
import { conversationApi } from '../api';
import { useAuth } from '../context/AuthContext';

function MessagesPage() {
  const { user } = useAuth();
  const [convos, setConvos] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

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
      // Refresh thread
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
    if (!user) return 'Unknown';
    if (user.role === 'business') {
      return convo.influencer?.instagram_handle || convo.influencer_email || 'Influencer';
    }
    return convo.business?.company_name || convo.business_email || 'Business';
  };

  const getLastMessage = (convo) => {
    const msgs = convo.messages || [];
    return msgs.length > 0 ? msgs[msgs.length - 1].content : 'No messages yet';
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Loading conversations…
      </div>
    );
  }

  const activeConvo = convos.find((c) => c.id === selectedId);

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
              <header className="border-b border-slate-800 px-5 py-4">
                <p className="text-base font-semibold text-white">{getOtherParty(activeConvo)}</p>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {thread === null ? (
                  <p className="text-center text-sm text-slate-500">Loading…</p>
                ) : thread.messages?.length === 0 ? (
                  <p className="text-center text-sm text-slate-500">No messages yet. Say hello! 👋</p>
                ) : (
                  thread.messages?.map((msg, i) => {
                    const isMe = msg.sender_id === user?.id || msg.sender === user?.email;
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
    </section>
  );
}

export default MessagesPage;
