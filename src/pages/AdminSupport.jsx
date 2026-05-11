import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, doc, setDoc, serverTimestamp, updateDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  ChevronLeft, Send, Image, CheckCheck, Clock,
  Search, MessageSquare, Circle, X, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const AdminSupport = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [chats, setChats] = useState([]);          // list of all user chat rooms
  const [selectedChat, setSelectedChat] = useState(null); // { chatId, userName, userEmail }
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const msgUnsubRef = useRef(null);

  // Guard — admins only
  useEffect(() => {
    if (!isAdmin) { navigate('/'); }
  }, [isAdmin, navigate]);

  // ── Load all support chat rooms ──────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'supportChats'), orderBy('lastMessageAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setChats(snap.docs.map(d => ({ chatId: d.id, ...d.data() })));
    }, err => console.error('Chat list error:', err));
    return () => unsub();
  }, []);

  // ── Load messages for selected chat ─────────────────────────────────
  useEffect(() => {
    if (msgUnsubRef.current) { msgUnsubRef.current(); msgUnsubRef.current = null; }
    if (!selectedChat) { setMessages([]); return; }

    const q = query(
      collection(db, 'supportChats', selectedChat.chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    msgUnsubRef.current = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      // Mark as read
      setDoc(doc(db, 'supportChats', selectedChat.chatId), { unreadAdmin: 0 }, { merge: true });
    });
    return () => { if (msgUnsubRef.current) msgUnsubRef.current(); };
  }, [selectedChat]);

  // ── Auto scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ─────────────────────────────────────────────────────
  async function sendMessage() {
    if ((!text.trim() && !imageFile) || sending || !selectedChat) return;
    setSending(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        const storageRef = ref(storage, `support/admin/${Date.now()}_${imageFile.name}`);
        const task = uploadBytesResumable(storageRef, imageFile);
        imageUrl = await new Promise((resolve, reject) => {
          task.on('state_changed',
            snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            reject,
            async () => resolve(await getDownloadURL(task.snapshot.ref))
          );
        });
        setUploadProgress(null);
      }

      await addDoc(collection(db, 'supportChats', selectedChat.chatId, 'messages'), {
        text: text.trim(),
        imageUrl,
        senderId: 'admin',
        senderName: 'QTX Support',
        senderRole: 'agent',
        createdAt: serverTimestamp(),
        status: 'sent',
      });

      await setDoc(doc(db, 'supportChats', selectedChat.chatId), {
        lastMessage: imageUrl ? '📷 Image' : text.trim(),
        lastMessageAt: serverTimestamp(),
        unreadUser: 1,
      }, { merge: true });

      setText('');
      clearImage();
    } catch (err) {
      console.error(err);
      toast.error('Failed to send');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function formatTime(ts) {
    if (!ts?.toDate) return '';
    return ts.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function formatLastMsg(ts) {
    if (!ts?.toDate) return '';
    const d = ts.toDate();
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }

  function formatDate(ts) {
    if (!ts?.toDate) return '';
    const d = ts.toDate();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const filteredChats = chats.filter(c =>
    (c.userName || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.userEmail || '').toLowerCase().includes(search.toLowerCase())
  );

  // Group messages by date
  const grouped = messages.reduce((acc, msg) => {
    const key = msg.createdAt?.toDate ? msg.createdAt.toDate().toDateString() : 'now';
    if (!acc[key]) acc[key] = { label: formatDate(msg.createdAt), msgs: [] };
    acc[key].msgs.push(msg);
    return acc;
  }, {});

  const isMe = (msg) => msg.senderRole === 'agent';

  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#0a0e1a', overflow: 'hidden' }}>

      {/* ── Left Panel: Chat List ── */}
      <div style={{
        width: isMobile ? (selectedChat ? '0' : '100%') : '320px',
        minWidth: isMobile ? (selectedChat ? '0' : '100%') : '320px',
        maxWidth: isMobile ? '100%' : '320px',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d1117',
        overflow: 'hidden',
        transition: 'all 0.3s',
        flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <button onClick={() => navigate('/admin')} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={18} />
            </button>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px' }}>Support Inbox</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{chats.length} conversation{chats.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          {/* Search */}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '13px', flex: 1 }}
            />
          </div>
        </div>

        {/* Chat list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredChats.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '40px 20px' }}>
              <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div>No conversations yet</div>
            </div>
          )}
          {filteredChats.map(chat => (
            <div
              key={chat.chatId}
              onClick={() => setSelectedChat(chat)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: selectedChat?.chatId === chat.chatId ? 'rgba(16,185,129,0.08)' : 'transparent',
                borderLeft: selectedChat?.chatId === chat.chatId ? '3px solid #10b981' : '3px solid transparent',
                transition: 'background 0.15s',
              }}
            >
              {/* Avatar */}
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                <User size={20} color="#fff" />
                {chat.unreadAdmin > 0 && (
                  <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '16px', height: '16px', background: '#ef4444', borderRadius: '50%', border: '2px solid #0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#fff' }}>
                    {chat.unreadAdmin > 9 ? '9+' : chat.unreadAdmin}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {chat.userName || 'Unknown User'}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {formatLastMsg(chat.lastMessageAt)}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {chat.lastMessage || 'No messages yet'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel: Chat Window ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {!selectedChat ? (
          /* Empty state */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <MessageSquare size={52} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Select a conversation</div>
            <div style={{ fontSize: '13px' }}>Choose a user from the left to start chatting</div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '12px', background: '#0d1117', flexShrink: 0 }}>
              <button onClick={() => setSelectedChat(null)} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={18} />
              </button>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={18} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>{selectedChat.userName || 'User'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedChat.userEmail}</div>
              </div>
              <div style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '20px', fontWeight: 600 }}>
                Support Chat
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: `radial-gradient(circle at 20% 20%, rgba(16,185,129,0.03) 0%, transparent 50%), #0a0e1a`, WebkitOverflowScrolling: 'touch' }}>
              {Object.values(grouped).map((group, gi) => (
                <div key={gi}>
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '20px', padding: '3px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>{group.label}</span>
                  </div>
                  {group.msgs.map(msg => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ display: 'flex', justifyContent: isMe(msg) ? 'flex-end' : 'flex-start', marginBottom: '4px', alignItems: 'flex-end', gap: '8px' }}
                    >
                      {!isMe(msg) && (
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={14} color="#fff" />
                        </div>
                      )}
                      <div style={{ maxWidth: '70%' }}>
                        {msg.imageUrl && (
                          <div style={{ borderRadius: isMe(msg) ? '18px 18px 4px 18px' : '18px 18px 18px 4px', overflow: 'hidden', marginBottom: msg.text ? '2px' : 0, background: isMe(msg) ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.08)' }}>
                            <img src={msg.imageUrl} alt="img" style={{ width: '100%', maxWidth: '240px', display: 'block', cursor: 'pointer' }} onClick={() => window.open(msg.imageUrl, '_blank')} />
                          </div>
                        )}
                        {msg.text && (
                          <div style={{ background: isMe(msg) ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.08)', color: '#fff', padding: '10px 14px', borderRadius: isMe(msg) ? '18px 18px 4px 18px' : '18px 18px 18px 4px', fontSize: '14px', lineHeight: 1.5, wordBreak: 'break-word', border: !isMe(msg) ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                            {!isMe(msg) && <div style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>{msg.senderName || 'User'}</div>}
                            {msg.text}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: isMe(msg) ? 'flex-end' : 'flex-start', marginTop: '3px', paddingRight: isMe(msg) ? '4px' : '0' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{msg.createdAt ? formatTime(msg.createdAt) : '...'}</span>
                          {isMe(msg) && (msg.status === 'read' ? <CheckCheck size={12} color="#10b981" /> : <CheckCheck size={12} color="rgba(255,255,255,0.3)" />)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Image preview */}
            <AnimatePresence>
              {imagePreview && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  style={{ background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <img src={imagePreview} alt="preview" style={{ height: '56px', borderRadius: '8px', objectFit: 'cover' }} />
                    <button onClick={clearImage} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <X size={10} />
                    </button>
                  </div>
                  {uploadProgress !== null && (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Uploading... {uploadProgress}%</div>
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                        <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--primary)', borderRadius: '2px', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input bar */}
            <div style={{ background: 'rgba(13,17,23,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px 12px', display: 'flex', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
              <button onClick={() => fileInputRef.current?.click()} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Image size={18} />
              </button>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.07)', borderRadius: '22px', padding: '10px 16px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center' }}>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Reply as QTX Support..."
                  rows={1}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '14px', width: '100%', resize: 'none', lineHeight: 1.5, maxHeight: '100px', overflowY: 'auto', fontFamily: 'inherit' }}
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={sendMessage}
                disabled={sending || (!text.trim() && !imageFile)}
                style={{ background: (text.trim() || imageFile) ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (text.trim() || imageFile) ? 'pointer' : 'default', color: '#fff', flexShrink: 0, transition: 'background 0.2s' }}
              >
                <Send size={18} style={{ marginLeft: '2px' }} />
              </motion.button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
