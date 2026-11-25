import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Check, CheckCheck, CircleDashed, MessageCircle,
  MoreVertical, Paperclip, Phone, Plus, Search, Send, Smile, Video,
  Wifi, WifiOff, X,
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { Conversation, MessageRow } from './types'

const formatTime = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

const formatDay = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Hari ini'
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Kemarin'
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

const initials = (name: string) => name.trim().slice(0, 1).toUpperCase() || '?'

function App() {
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    if (!supabase) return
    const { data, error: queryError } = await supabase
      .from('trx_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1000)
    if (queryError) {
      setError(queryError.message)
      setLoading(false)
      return
    }
    setMessages((data ?? []) as MessageRow[])
    setError('')
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    void loadMessages()
    const channel = supabase
      .channel('trx-messages-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trx_messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const next = payload.new as MessageRow
          setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, next])
        } else if (payload.eventType === 'UPDATE') {
          const next = payload.new as MessageRow
          setMessages((current) => current.map((item) => item.id === next.id ? next : item))
        }
      })
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))
    return () => { void supabase?.removeChannel(channel) }
  }, [loadMessages])

  const conversations = useMemo<Conversation[]>(() => {
    const grouped = new Map<string, MessageRow[]>()
    for (const message of messages) {
      const phone = message.direction === 'inbound' ? message.from_phone : (message.recipient_phone || message.from_phone)
      if (!phone) continue
      grouped.set(phone, [...(grouped.get(phone) ?? []), message])
    }
    return [...grouped.entries()].map(([phone, items]) => {
      const ordered = [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      const lastMessage = ordered[ordered.length - 1]
      const named = [...ordered].reverse().find((item) => item.profile_name)?.profile_name
      return { phone, name: named || phone, lastMessage, messages: ordered, unread: 0 }
    }).sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime())
  }, [messages])

  const filtered = conversations.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) || item.phone.includes(search),
  )
  const active = conversations.find((item) => item.phone === selectedPhone) ?? null

  useEffect(() => {
    if (!selectedPhone && conversations.length) setSelectedPhone(conversations[0].phone)
  }, [conversations, selectedPhone])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages.length])

  const sendMessage = async () => {
    const message = draft.trim()
    if (!message || !active || !supabase || sending) return
    setSending(true)
    setError('')
    const { data, error: sendError } = await supabase.functions.invoke('trx-send-messages', {
      body: { to: active.phone, message },
    })
    if (sendError || !data?.success) {
      setError(sendError?.message || data?.error || 'Pesan gagal dikirim. Periksa konfigurasi Edge Function.')
    } else {
      setDraft('')
      if (data.saved === false) setError('Meta menerima pesan, tetapi pesan belum tersimpan di database.')
      await loadMessages()
    }
    setSending(false)
  }

  const openConversation = (phone: string) => {
    setSelectedPhone(phone)
    setShowChat(true)
  }

  if (!isSupabaseConfigured) {
    return <main className="setup-screen">
      <div className="setup-card">
        <div className="brand-mark"><MessageCircle size={30} /></div>
        <h1>WhatsApp Inbox</h1>
        <p>Hubungkan aplikasi ke project Supabase untuk mulai mengelola pesan.</p>
        <code>VITE_SUPABASE_URL</code>
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>
        <span>Tambahkan kedua environment variable tersebut di file .env.local atau GitHub Actions Variables.</span>
      </div>
    </main>
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${showChat ? 'sidebar-hidden' : ''}`}>
        <header className="sidebar-header">
          <div className="profile-avatar">A</div>
          <div className="header-actions">
            <button aria-label="Status" title="Status"><CircleDashed /></button>
            <button aria-label="Chat baru" title="Chat baru"><MessageCircle /></button>
            <button aria-label="Menu" title="Menu"><MoreVertical /></button>
          </div>
        </header>
        <div className="sidebar-title">
          <div><h1>Chats</h1><span>Apple The Exchange TRX</span></div>
          <button className="new-chat" aria-label="Buat chat"><Plus size={20} /></button>
        </div>
        <div className="search-wrap">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari atau mulai chat baru" />
          {search && <button onClick={() => setSearch('')} aria-label="Hapus pencarian"><X size={15} /></button>}
        </div>
        <div className="filter-row"><button className="filter-active">Semua</button><button>Belum dibaca</button><button>Favorit</button></div>
        <div className="conversation-list">
          {loading && <div className="empty-state">Memuat percakapan…</div>}
          {!loading && filtered.length === 0 && <div className="empty-state"><MessageCircle size={26} /><b>Belum ada percakapan</b><span>Pesan WhatsApp yang masuk akan muncul di sini.</span></div>}
          {filtered.map((conversation) => (
            <button key={conversation.phone} className={`conversation ${selectedPhone === conversation.phone ? 'conversation-active' : ''}`} onClick={() => openConversation(conversation.phone)}>
              <div className="contact-avatar">{initials(conversation.name)}</div>
              <div className="conversation-copy">
                <div className="conversation-top"><strong>{conversation.name}</strong><time>{formatTime(conversation.lastMessage.message_timestamp || conversation.lastMessage.created_at)}</time></div>
                <div className="conversation-bottom"><span>{conversation.lastMessage.direction === 'outbound' ? 'Anda: ' : ''}{conversation.lastMessage.text_body || `[${conversation.lastMessage.message_type || 'Pesan'}]`}</span>{conversation.lastMessage.direction === 'outbound' && <CheckCheck size={15} className="read-check" />}</div>
              </div>
            </button>
          ))}
        </div>
        <footer className="sidebar-footer"><span className={`connection-dot ${connected ? 'online' : ''}`} />{connected ? 'Terhubung ke realtime' : 'Menghubungkan…'}</footer>
      </aside>

      <section className={`chat-panel ${showChat ? 'chat-visible' : ''}`}>
        {active ? <>
          <header className="chat-header">
            <button className="back-button" onClick={() => setShowChat(false)} aria-label="Kembali"><ArrowLeft /></button>
            <div className="contact-avatar small">{initials(active.name)}</div>
            <div className="chat-contact"><strong>{active.name}</strong><span>{active.phone}</span></div>
            <div className="chat-actions"><button aria-label="Cari"><Search /></button><button aria-label="Telepon"><Phone /></button><button aria-label="Video"><Video /></button><button aria-label="Menu"><MoreVertical /></button></div>
          </header>
          <div className="messages-area">
            <div className="encryption-note"><span>🔒</span> Pesan dan panggilan dilindungi dengan enkripsi end-to-end WhatsApp.</div>
            {active.messages.map((message, index) => {
              const previous = active.messages[index - 1]
              const currentDay = formatDay(message.message_timestamp || message.created_at)
              const previousDay = previous ? formatDay(previous.message_timestamp || previous.created_at) : ''
              return <div key={message.id}>
                {currentDay !== previousDay && <div className="date-divider"><span>{currentDay}</span></div>}
                <div className={`message-row ${message.direction === 'outbound' ? 'message-out' : 'message-in'}`}>
                  <div className="message-bubble">
                    <p>{message.text_body || `Pesan ${message.message_type || 'non-teks'}`}</p>
                    <div className="message-meta"><time>{formatTime(message.message_timestamp || message.created_at)}</time>{message.direction === 'outbound' && (message.status === 'read' ? <CheckCheck className="status-read" size={15} /> : message.status === 'delivered' ? <CheckCheck size={15} /> : <Check size={15} />)}</div>
                    {message.direction === 'outbound' && message.status && <span className="message-status">{message.status}</span>}
                  </div>
                </div>
              </div>
            })}
            <div ref={bottomRef} />
          </div>
          {error && <div className="inline-error"><span>{error}</span><button onClick={() => setError('')}><X size={15} /></button></div>}
          <form className="composer" onSubmit={(event) => { event.preventDefault(); void sendMessage() }}>
            <button type="button" aria-label="Emoji"><Smile /></button>
            <button type="button" aria-label="Lampiran"><Paperclip /></button>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ketik pesan" />
            <button type="submit" className="send-button" disabled={!draft.trim() || sending} aria-label="Kirim pesan">{sending ? <CircleDashed className="spin" /> : <Send size={19} />}</button>
          </form>
        </> : <div className="welcome-panel">
          <div className="welcome-illustration"><MessageCircle size={76} strokeWidth={1.1} /></div>
          <h2>WhatsApp Web</h2>
          <p>Pilih percakapan untuk mulai mengirim dan menerima pesan.</p>
          <div className="welcome-status">{connected ? <Wifi size={15} /> : <WifiOff size={15} />}{connected ? 'Realtime aktif' : 'Menunggu koneksi realtime'}</div>
        </div>}
      </section>
    </main>
  )
}

export default App
