import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase';
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, doc, setDoc, getDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ChevronLeft, Send, Image, Check, CheckCheck, Clock, Paperclip, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const Support = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [agentOnline] = useState(true);

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatId = currentUser?.uid;

  // ── Load messages in real-time ──────────────────────────────────────
  useEffect(() => {
    if (!chatId) return;
    const q = query(
      collection(db, 'supportChats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [chatId]);

  // ── Auto scroll to bottom ────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Ensure chat room doc exists ──────────────────────────────────────
  useEffect(() => {
    if (!chatId) return;
    const chatRef = doc(db, 'supportChats', chatId);
    getDoc(chatRef).then(snap => {
      if (!snap.exists()) {
        setDoc(chatRef, {
          userId: chatId,
          userName: userData?.name || userData?.email || 'User',
          userEmail: userData?.email || '',
          createdAt: serverTimestamp(),
          lastMessage: '',
          lastMessageAt: serverTimestamp(),
          unreadAdmin: 0,
        });
      }
    });
  }, [chatId, userData]);

  // ── Handle image selection ───────────────────────────────────────────
  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Send message ─────────────────────────────────────────────────────
  async function sendMessage() {
    if ((!text.trim() && !imageFile) || sending) return;
    setSending(true);

    try {
      let imageUrl = null;

      // Upload image if present
      if (imageFile) {
        const storageRef = ref(storage, `support/${chatId}/${Date.now()}_${imageFile.name}`);
        const task = uploadBytesResumable(storageRef, imageFile);
        imageUrl = await new Promise((resolve, reject) => {
          task.on('state_changed',
            snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            reject,
            async () => {
              const url = await getDownloadURL(task.snapshot.ref);
              resolve(url);
            }
          );
        });
        setUploadProgress(null);
      }

      const msgData = {
        text: text.trim(),
        imageUrl,
        senderId: chatId,
        senderName: userData?.name || 'User',
        senderRole: 'user',
        createdAt: serverTimestamp(),
        status: 'sent',
      };

      await addDoc(collection(db, 'supportChats', chatId, 'messages'), msgData);

      // Update chat room last message
      await setDoc(doc(db, 'supportChats', chatId), {
        lastMessage: imageUrl ? '📷 Image' : text.trim(),
        lastMessageAt: serverTimestamp(),
        unreadAdmin: 1,
      }, { merge: true });

      setText('');
      clearImage();
    } catch (err) {
      console.error(err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── Group messages by date ───────────────────────────────────────────
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

  function formatTime(ts) {
    if (!ts?.toDate) return '';
    return ts.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // Group messages by date
  const grouped = messages.reduce((acc, msg) => {
    const dateKey = msg.createdAt?.toDate
      ? msg.createdAt.toDate().toDateString()
      : 'now';
    if (!acc[dateKey]) acc[dateKey] = { label: formatDate(msg.createdAt), msgs: [] };
    acc[dateKey].msgs.push(msg);
    return acc;
  }, {});

  const isMe = (msg) => msg.senderId === chatId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0a0e1a', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0d1117 0%, #161b27 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
        paddingTop: 'max(12px, env(safe-area-inset-top))',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Agent avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80"
            alt="Support Agent"
            style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
          />
          <span style={{ position: 'absolute', bottom: '1px', right: '1px', width: '11px', height: '11px', background: '#10b981', borderRadius: '50%', border: '2px solid #0d1117' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>QTX Support</div>
          <div style={{ fontSize: '12px', color: agentOnline ? '#10b981' : 'var(--text-muted)' }}>
            {agentOnline ? '● Online — typically replies instantly' : '● Away'}
          </div>
        </div>

        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px', padding: '4px 10px', fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
          24/7
        </div>
      </div>

      {/* ── Chat Background Pattern ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        background: `
          radial-gradient(circle at 20% 20%, rgba(16,185,129,0.03) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(99,102,241,0.03) 0%, transparent 50%),
          #0a0e1a
        `,
        WebkitOverflowScrolling: 'touch',
      }}>

        {/* Welcome bubble */}
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 20px', fontSize: '12px', color: 'var(--text-muted)', maxWidth: '280px' }}>
              🔒 Messages are end-to-end encrypted. Start your conversation with our support team below.
            </div>
          </motion.div>
        )}

        {/* Messages grouped by date */}
        {Object.values(grouped).map((group, gi) => (
          <div key={gi}>
            {/* Date separator */}
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '20px', padding: '3px 12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                {group.label}
              </span>
            </div>

            {group.msgs.map((msg, i) => {
              const mine = isMe(msg);
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: 'flex',
                    justifyContent: mine ? 'flex-end' : 'flex-start',
                    marginBottom: '4px',
                    alignItems: 'flex-end',
                    gap: '8px',
                  }}
                >
                  {/* Agent avatar for non-mine */}
                  {!mine && (
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=40&q=80"
                      alt=""
                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginBottom: '2px' }}
                    />
                  )}

                  <div style={{ maxWidth: '72%' }}>
                    {/* Image */}
                    {msg.imageUrl && (
                      <div style={{
                        background: mine ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.08)',
                        borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        overflow: 'hidden',
                        marginBottom: msg.text ? '2px' : '0',
                      }}>
                        <img
                          src={msg.imageUrl}
                          alt="sent"
                          style={{ width: '100%', maxWidth: '240px', display: 'block', cursor: 'pointer' }}
                          onClick={() => window.open(msg.imageUrl, '_blank')}
                        />
                      </div>
                    )}

                    {/* Text bubble */}
                    {msg.text && (
                      <div style={{
                        background: mine ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.08)',
                        color: mine ? '#fff' : 'var(--text-primary)',
                        padding: '10px 14px',
                        borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        fontSize: '14px',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        backdropFilter: !mine ? 'blur(10px)' : 'none',
                        border: !mine ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      }}>
                        {msg.text}
                      </div>
                    )}

                    {/* Time + status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: mine ? 'flex-end' : 'flex-start', marginTop: '3px', paddingRight: mine ? '4px' : '0' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {msg.createdAt ? formatTime(msg.createdAt) : 'sending...'}
                      </span>
                      {mine && (
                        msg.status === 'read'
                          ? <CheckCheck size={12} color="#10b981" />
                          : msg.createdAt
                          ? <CheckCheck size={12} color="rgba(255,255,255,0.4)" />
                          : <Clock size={11} color="rgba(255,255,255,0.3)" />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Image Preview Strip ── */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}
          >
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={imagePreview} alt="preview" style={{ height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
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

      {/* ── Input Bar ── */}
      <div style={{
        background: 'rgba(13,17,23,0.98)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
        flexShrink: 0,
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
      }}>
        {/* Image button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageSelect}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
        >
          <Image size={20} />
        </button>

        {/* Text input */}
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.07)', borderRadius: '22px', padding: '10px 16px', border: '1px solid rgba(255,255,255,0.08)', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '14px',
              width: '100%',
              resize: 'none',
              lineHeight: 1.5,
              maxHeight: '100px',
              overflowY: 'auto',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Send button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={sendMessage}
          disabled={sending || (!text.trim() && !imageFile)}
          style={{
            background: (text.trim() || imageFile) ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.07)',
            border: 'none',
            borderRadius: '50%',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: (text.trim() || imageFile) ? 'pointer' : 'default',
            color: '#fff',
            flexShrink: 0,
            transition: 'background 0.2s',
          }}
        >
          <Send size={18} style={{ marginLeft: '2px' }} />
        </motion.button>
      </div>
    </div>
  );
};
