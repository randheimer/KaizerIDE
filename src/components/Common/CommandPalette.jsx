import React, { useEffect, useRef, useState, useMemo } from 'react';
import './CommandPalette.css';

/**
 * Simple fuzzy subsequence matcher.
 * Returns a score (higher = better), or -1 if not a match.
 */
function fuzzyScore(haystack, needle) {
  if (!needle) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  let score = 0;
  let hi = 0;
  let lastMatchIdx = -1;
  for (let ni = 0; ni < n.length; ni++) {
    const ch = n[ni];
    const found = h.indexOf(ch, hi);
    if (found === -1) return -1;
    // Bonuses: consecutive chars, word boundaries, case-matches
    if (lastMatchIdx !== -1 && found === lastMatchIdx + 1) score += 5;
    if (found === 0 || /[\s_\-./\\]/.test(h[found - 1])) score += 3;
    if (haystack[found] === needle[ni]) score += 1;
    score += 1;
    lastMatchIdx = found;
    hi = found + 1;
  }
  // Prefer shorter haystacks (more relevant)
  score -= haystack.length * 0.01;
  return score;
}

/**
 * Command Palette — keyboard-driven global action launcher.
 *
 * Props:
 *   open:     boolean — whether palette is visible
 *   onClose:  () => void
 *   commands: Array<{ id: string, title: string, group?: string, shortcut?: string, run: () => void }>
 */
function CommandPalette({ open, onClose, commands }) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      // Defer focus to after paint
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const scored = commands
      .map((cmd) => {
        const title = cmd.title || '';
        const group = cmd.group || '';
        const score = Math.max(
          fuzzyScore(title, query),
          fuzzyScore(`${group} ${title}`, query)
        );
        return { cmd, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score);
    return scored.map((x) => x.cmd);
  }, [commands, query]);

  useEffect(() => {
    // Clamp selection when filter changes
    setSelectedIdx((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  useEffect(() => {
    // Scroll selected into view
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector(`[data-idx="${selectedIdx}"]`);
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  if (!open) return null;

  const run = (cmd) => {
    try {
      cmd.run();
    } finally {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[selectedIdx];
      if (cmd) run(cmd);
    }
  };

  return (
    <div
      className="command-palette-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div className="command-palette" role="dialog" aria-label="Command Palette">
        <input
          ref={inputRef}
          className="command-palette-input"
          type="text"
          placeholder="Type a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
        />
        <div className="command-palette-list" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="command-palette-empty">No matching commands</div>
          ) : (
            filtered.map((cmd, idx) => (
              <div
                key={cmd.id}
                data-idx={idx}
                className={`command-palette-item${idx === selectedIdx ? ' active' : ''}`}
                onMouseEnter={() => setSelectedIdx(idx)}
                onClick={() => run(cmd)}
              >
                <div className="command-palette-item-main">
                  {cmd.group && <span className="command-palette-group">{cmd.group}</span>}
                  <span className="command-palette-title">{cmd.title}</span>
                </div>
                {cmd.shortcut && (
                  <span className="command-palette-shortcut">{cmd.shortcut}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
