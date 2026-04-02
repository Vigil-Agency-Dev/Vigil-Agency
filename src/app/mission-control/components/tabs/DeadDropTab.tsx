'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';
import { formatAESTShort } from '../../lib/date-utils';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface FileEntry {
  name: string;
  size: number;
  modified: string;
}

interface Listing {
  folders: Record<string, FileEntry[]>;
  totalFiles: number;
  generated: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Simple markdown renderer for file preview
function renderMarkdown(raw: string) {
  return raw.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-1.5" />;
    if (t.startsWith('# ')) return <h2 key={i} className="text-base font-bold text-cyan-400 mt-3 mb-1.5">{t.slice(2)}</h2>;
    if (t.startsWith('## ')) return <h3 key={i} className="text-sm font-bold text-slate-200 mt-2 mb-1 border-b border-[#2a3550] pb-1">{t.slice(3)}</h3>;
    if (t.startsWith('### ')) return <h4 key={i} className="text-[13px] font-semibold text-purple-400 mt-2 mb-1">{t.slice(4)}</h4>;
    if (t.startsWith('- ') || t.startsWith('* ')) {
      return (
        <div key={i} className="flex items-start gap-2 text-[12px] text-slate-400 pl-2 py-0.5">
          <span className="text-slate-600 mt-0.5">{'\u25B8'}</span>
          <span>{t.slice(2)}</span>
        </div>
      );
    }
    if (t.startsWith('**') && t.endsWith('**')) return <div key={i} className="text-[12px] font-semibold text-slate-200 mt-1">{t.replace(/\*\*/g, '')}</div>;
    if (t.startsWith('---')) return <hr key={i} className="border-[#2a3550] my-2" />;
    const rendered = t.replace(/\*\*([^*]+)\*\*/g, '<b class="text-slate-200 font-semibold">$1</b>');
    return <div key={i} className="text-[12px] text-slate-400 leading-relaxed py-0.5" dangerouslySetInnerHTML={{ __html: rendered }} />;
  });
}

export default function DeadDropTab() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch listing
  useEffect(() => {
    if (!API_KEY) return;
    async function load() {
      try {
        const res = await fetch(`${VPS_API}/api/dead-drop/listing`, { headers: { 'x-api-key': API_KEY } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setListing(data);
        setIsLive(true);
        setLastUpdated(new Date().toISOString());
      } catch { setIsLive(false); }
    }
    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  // Fetch file content
  async function loadFile(folder: string, filename: string) {
    const path = folder === '_root' ? filename : `${folder}/${filename}`;
    setActiveFile(path);
    setFileContent(null);
    setLoadingFile(true);
    try {
      const res = await fetch(`${VPS_API}/api/dead-drop/file?path=${encodeURIComponent(path)}`, {
        headers: { 'x-api-key': API_KEY },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const text = await res.text();
      setFileContent(text);
    } catch (err) {
      setFileContent(`Error loading file: ${err}`);
    }
    setLoadingFile(false);
  }

  const folders = listing?.folders || {};
  const folderNames = Object.keys(folders).sort((a, b) => {
    if (a === '_root') return 1;
    if (b === '_root') return -1;
    return a.localeCompare(b);
  });

  // Search filter
  const filteredFolders = search
    ? folderNames.filter(f => {
        if (f.toLowerCase().includes(search.toLowerCase())) return true;
        return folders[f]?.some(file => file.name.toLowerCase().includes(search.toLowerCase()));
      })
    : folderNames;

  const isJson = activeFile?.endsWith('.json');

  return (
    <div className="flex flex-col gap-4">
      {/* Status */}
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `LIVE — ${listing?.totalFiles || 0} FILES · ${folderNames.length} FOLDERS` : 'CONNECTING...'}
        </span>
        {lastUpdated && <span className="font-mono text-[9px] text-slate-600 ml-2">Updated {timeAgo(lastUpdated)}</span>}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search files and folders..."
          className="flex-1 bg-[#111827] border border-[#2a3550] rounded-md py-2 px-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none font-mono"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-[10px] font-mono text-slate-500 hover:text-slate-300">CLEAR</button>
        )}
      </div>

      <div className="flex gap-4" style={{ minHeight: '600px' }}>
        {/* Left: Folder/File Navigator */}
        <div className="w-72 flex-shrink-0 rounded-xl border border-[#2a3550] overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-[#111827] border-b border-[#2a3550]">
            <span className="text-[12px] font-bold tracking-wider text-cyan-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              DEAD DROP
            </span>
          </div>
          <div className="flex-1 overflow-y-auto bg-[#0a0e17]">
            {!isLive ? (
              <div className="text-center py-10 text-[11px] text-slate-600">Connecting to VPS...</div>
            ) : (
              filteredFolders.map(folder => {
                const files = folders[folder] || [];
                const isActive = activeFolder === folder;
                const displayName = folder === '_root' ? 'Root Files' : folder;
                const filteredFiles = search
                  ? files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || folder.toLowerCase().includes(search.toLowerCase()))
                  : files;

                return (
                  <div key={folder}>
                    <button
                      onClick={() => setActiveFolder(isActive ? null : folder)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left transition-all border-b border-white/[.02] ${
                        isActive ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-300 hover:bg-white/[.02]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs">{isActive ? '\uD83D\uDCC2' : '\uD83D\uDCC1'}</span>
                        <span className="text-[11px] font-mono truncate">{displayName}</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 flex-shrink-0">{filteredFiles.length}</span>
                    </button>
                    {isActive && (
                      <div className="bg-[#060a12]">
                        {filteredFiles.map(file => {
                          const filePath = folder === '_root' ? file.name : `${folder}/${file.name}`;
                          const isFileActive = activeFile === filePath;
                          return (
                            <button
                              key={file.name}
                              onClick={() => loadFile(folder, file.name)}
                              className={`w-full flex items-center gap-2 px-5 py-1.5 text-left transition-all ${
                                isFileActive ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:bg-white/[.02] hover:text-slate-200'
                              }`}
                            >
                              <span className="text-[10px]">{file.name.endsWith('.json') ? '\uD83D\uDCC4' : '\uD83D\uDCDD'}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-mono truncate">{file.name}</div>
                                <div className="text-[8px] text-slate-600">
                                  {formatSize(file.size)} · {timeAgo(file.modified)}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: File Preview */}
        <div className="flex-1 rounded-xl border border-[#2a3550] overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-[#111827] border-b border-[#2a3550] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold tracking-wider text-slate-300" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {activeFile || 'No file selected'}
              </span>
            </div>
            {activeFile && fileContent && (
              <button
                onClick={() => {
                  const blob = new Blob([fileContent], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = activeFile.split('/').pop() || 'file';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 px-2 py-1 border border-cyan-500/20 rounded hover:bg-cyan-500/10 transition-all"
              >
                DOWNLOAD
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-5 bg-[#0a0e17]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {!activeFile ? (
              <div className="text-center py-20">
                <div className="text-2xl mb-3 opacity-30">{'\uD83D\uDCC2'}</div>
                <div className="text-[12px] text-slate-600">Select a file from the navigator to preview its contents</div>
              </div>
            ) : loadingFile ? (
              <div className="text-center py-20">
                <div className="text-[12px] text-slate-500 animate-pulse">Loading file...</div>
              </div>
            ) : fileContent === null ? (
              <div className="text-center py-20 text-[12px] text-slate-600">No content</div>
            ) : isJson ? (
              <pre className="text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                {(() => {
                  try { return JSON.stringify(JSON.parse(fileContent), null, 2); }
                  catch { return fileContent; }
                })()}
              </pre>
            ) : (
              <div>{renderMarkdown(fileContent)}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
