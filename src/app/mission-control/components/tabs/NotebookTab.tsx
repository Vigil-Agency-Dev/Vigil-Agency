'use client';

import React, { useState, useEffect } from 'react';
import { formatAESTShort } from '../../lib/date-utils';
import { Card, Dot } from '../ui';
import { useAuth } from '../../lib/auth-context';
import { NOTEBOOK_TAGS, TAG_COLORS } from '../../lib/mission-data';
import { db } from '../../lib/firebase-config';
import { collection, addDoc, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import type { NotebookEntry } from '../../lib/types';

const NOTEBOOK_COLLECTION = 'notebook-entries';

export default function NotebookTab() {
  const { profile, canWrite } = useAuth();
  const [notes, setNotes] = useState<NotebookEntry[]>([]);
  const [noteText, setNoteText] = useState('');
  const [noteTag, setNoteTag] = useState<string>('observation');
  const [synced, setSynced] = useState(false);
  const [saving, setSaving] = useState(false);

  // Real-time Firestore listener
  useEffect(() => {
    try {
      const q = query(collection(db, NOTEBOOK_COLLECTION), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const entries: NotebookEntry[] = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            time: data.createdAt?.toDate?.()?.toISOString?.() || data.time || new Date().toISOString(),
            text: data.text || '',
            tag: data.tag || 'observation',
            author: data.author || 'Unknown',
            authorUid: data.authorUid || '',
          };
        });
        setNotes(entries);
        setSynced(true);
      }, () => {
        // Firestore error — stay with local state
        setSynced(false);
      });
      return () => unsub();
    } catch {
      setSynced(false);
    }
  }, []);

  const addNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);

    const entry = {
      time: new Date().toISOString(),
      text: noteText.trim(),
      tag: noteTag,
      author: profile?.displayName || 'DIRECTOR',
      authorUid: profile?.uid || '',
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, NOTEBOOK_COLLECTION), entry);
      setNoteText('');
    } catch {
      // Fallback: add to local state only
      setNotes(prev => [{
        id: Date.now().toString(),
        ...entry,
        time: entry.time,
      }, ...prev]);
      setNoteText('');
    }
    setSaving(false);
  };

  const deleteNote = async (id: string) => {
    try {
      await deleteDoc(doc(db, NOTEBOOK_COLLECTION, id));
    } catch {
      setNotes(prev => prev.filter(n => n.id !== id));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <Dot color={synced ? '#10b981' : '#f59e0b'} pulse={synced} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: synced ? '#10b981' : '#f59e0b' }}>
          {synced ? `SYNCED — FIRESTORE · ${notes.length} ENTRIES` : 'LOCAL ONLY — FIRESTORE UNAVAILABLE'}
        </span>
      </div>

      <Card title="DIRECTOR's Notebook — Add Your Observations" icon="&#x1F4DD;" accent="#10b981" full>
        {/* Input area - only for admin/analyst */}
        {canWrite && (
          <div className="mb-3">
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }}
              placeholder="What are you seeing that the data might not capture? Connections, patterns, gut reads, questions for the team..."
              className="w-full bg-[#111827] border border-[#2a3550] rounded-md p-2 px-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y min-h-[80px] mb-2"
            />
            <div className="flex items-center gap-2">
              <select
                value={noteTag}
                onChange={e => setNoteTag(e.target.value)}
                className="bg-[#111827] border border-[#2a3550] rounded-md py-1.5 px-3 text-sm text-slate-200 outline-none w-auto"
              >
                {NOTEBOOK_TAGS.map(t => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}
                  </option>
                ))}
              </select>
              <button
                onClick={addNote}
                disabled={saving || !noteText.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-md py-1.5 px-4 text-xs transition-all"
              >
                {saving ? 'Saving...' : 'Add to Notebook'}
              </button>
              <span className="text-[10px] text-slate-500 ml-2">{notes.length} entries</span>
              <span className="text-[9px] text-slate-600 ml-1">Ctrl+Enter to save</span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {notes.length === 0 && (
          <div className="text-xs text-slate-500 text-center py-5">
            Your notebook is empty. Add observations, hypotheses, questions, or connections you spot across the intel.
            Your perspective is a force multiplier — you see things the data can&apos;t.
          </div>
        )}

        {/* Notes list */}
        {notes.map(n => (
          <div
            key={n.id}
            className="animate-fadeIn p-2.5 px-3 bg-white/[.02] border border-white/[.04] rounded-lg mb-1.5 group"
            style={{ borderLeft: `3px solid ${TAG_COLORS[n.tag] || '#64748b'}` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold uppercase" style={{ color: TAG_COLORS[n.tag] }}>
                {n.tag}
              </span>
              <span className="font-mono text-[9px] text-slate-500">
                {formatAESTShort(n.time)}
              </span>
              <span className="text-[10px] text-purple-400">{n.author}</span>
              {canWrite && (
                <button
                  onClick={() => deleteNote(n.id)}
                  className="ml-auto text-[9px] text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono"
                >
                  DELETE
                </button>
              )}
            </div>
            <div className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{n.text}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
