'use client';

import React, { useState } from 'react';
import { Card } from '../ui';
import { useAuth } from '../../lib/auth-context';
import { NOTEBOOK_TAGS, TAG_COLORS } from '../../lib/mission-data';
import type { NotebookEntry } from '../../lib/types';

export default function NotebookTab() {
  const { profile, canWrite } = useAuth();
  const [notes, setNotes] = useState<NotebookEntry[]>([]);
  const [noteText, setNoteText] = useState('');
  const [noteTag, setNoteTag] = useState<string>('observation');

  const addNote = () => {
    if (!noteText.trim()) return;
    const entry: NotebookEntry = {
      id: Date.now().toString(),
      time: new Date().toISOString(),
      text: noteText,
      tag: noteTag,
      author: profile?.displayName || 'Unknown',
      authorUid: profile?.uid || '',
    };
    setNotes(prev => [entry, ...prev]);
    setNoteText('');
  };

  return (
    <div className="flex flex-col gap-4">
      <Card title="DIRECTOR's Notebook — Add Your Observations" icon="&#x1F4DD;" accent="#10b981" full>
        {/* Input area - only for admin/analyst */}
        {canWrite && (
          <div className="mb-3">
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
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
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-md py-1.5 px-4 text-xs transition-all"
              >
                Add to Notebook
              </button>
              <span className="text-[10px] text-slate-500 ml-2">{notes.length} entries</span>
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
            className="animate-fadeIn p-2.5 px-3 bg-white/[.02] border border-white/[.04] rounded-lg mb-1.5"
            style={{ borderLeft: `3px solid ${TAG_COLORS[n.tag] || '#64748b'}` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold uppercase" style={{ color: TAG_COLORS[n.tag] }}>
                {n.tag}
              </span>
              <span className="font-mono text-[9px] text-slate-500">
                {new Date(n.time).toLocaleString()}
              </span>
              <span className="text-[10px] text-purple-400">{n.author}</span>
            </div>
            <div className="text-xs text-slate-400 leading-relaxed">{n.text}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
