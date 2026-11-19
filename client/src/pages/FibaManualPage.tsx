import { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, ExternalLink, Search } from 'lucide-react';
import { FibaDiagram } from '../components/fiba/FibaDiagrams';
import { FIBA_MANUAL_META, FIBA_RULES_SECTIONS } from '../data/fibaRules2026';

export function FibaManualPage() {
  const [selectedRuleId, setSelectedRuleId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    'art-1': true,
    'art-2': true,
    'art-29': true,
    'art-36': true,
    'art-37': true,
    'art-38': true,
    'app-b': true,
  });

  const q = search.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    return FIBA_RULES_SECTIONS.filter((sec) => selectedRuleId === 'all' || sec.id === selectedRuleId)
      .map((sec) => {
        if (!q) return sec;
        const matchingArticles = sec.articles.filter((art) => {
          const hay = `${art.code} ${art.title} ${art.summary} ${art.badge2026 || ''} ${art.clauses.join(' ')}`.toLowerCase();
          return hay.includes(q);
        });
        return { ...sec, articles: matchingArticles };
      })
      .filter((sec) => sec.articles.length > 0);
  }, [selectedRuleId, q]);

  const totalShown = useMemo(
    () => filteredSections.reduce((acc, s) => acc + s.articles.length, 0),
    [filteredSections],
  );

  const toggleArticle = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const setAllExpanded = (open: boolean) => {
    const next: Record<string, boolean> = {};
    for (const sec of filteredSections) {
      for (const art of sec.articles) {
        next[art.id] = open;
      }
    }
    setExpandedIds(next);
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2a501] text-black">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-white">{FIBA_MANUAL_META.title}</h1>
              <span className="rounded-full bg-[#16224d] px-2.5 py-0.5 text-[11px] font-extrabold text-[#f2a501]">
                {FIBA_MANUAL_META.version}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[#8c9bc4]">{FIBA_MANUAL_META.approved}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#8c9bc4]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles, fouls, clocks…"
              className="h-9 w-64 rounded-xl border border-[#3a4a8f] bg-[#0f1a44] pl-9 pr-3 text-xs text-white placeholder-[#94a5d4]"
            />
          </div>

          <button
            type="button"
            onClick={() => setAllExpanded(true)}
            className="h-9 rounded-xl border border-[#3a4a8f] bg-[#0f1a44] px-3 text-xs font-bold text-[#c7d2fe] hover:bg-[#192b6e]"
          >
            Expand All
          </button>

          <button
            type="button"
            onClick={() => setAllExpanded(false)}
            className="h-9 rounded-xl border border-[#3a4a8f] bg-[#0f1a44] px-3 text-xs font-bold text-[#c7d2fe] hover:bg-[#192b6e]"
          >
            Collapse All
          </button>

          <a
            href={FIBA_MANUAL_META.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#2a3f87] px-3.5 text-xs font-extrabold text-white hover:bg-[#354fa8]"
          >
            Official PDF <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[270px_1fr]">
        {/* Official Table of Contents Sidebar */}
        <aside className="h-fit rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-3 lg:sticky lg:top-16">
          <div className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-wider text-[#8c9bc4]">
            Table of Contents
          </div>

          <nav className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setSelectedRuleId('all')}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-extrabold transition ${
                selectedRuleId === 'all'
                  ? 'bg-[#2a3f87] text-white'
                  : 'text-[#c7d2fe] hover:bg-white/5'
              }`}
            >
              <span>All Rules &amp; Appendices</span>
              <span className="rounded bg-black/25 px-1.5 py-0.5 text-[10px]">57</span>
            </button>

            {FIBA_RULES_SECTIONS.map((sec) => {
              const active = selectedRuleId === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedRuleId(sec.id)}
                  className={`flex flex-col rounded-xl px-3 py-2 text-left transition ${
                    active ? 'bg-[#2a3f87] text-white' : 'text-[#c7d2fe] hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#f2a501]">
                      {sec.number}
                    </span>
                    <span className="text-[10px] opacity-75">{sec.articles.length}</span>
                  </div>
                  <span className="text-xs font-bold">{sec.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Rule Sections & Articles */}
        <main className="flex flex-col gap-4">
          {filteredSections.length === 0 ? (
            <div className="rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-8 text-center text-sm text-[#8c9bc4]">
              No FIBA rules or articles match &ldquo;<b className="text-white">{search}</b>&rdquo;.
            </div>
          ) : (
            filteredSections.map((sec) => (
              <section
                key={sec.id}
                className="overflow-hidden rounded-2xl border border-[#1a2d6b] bg-[#0a1530]"
              >
                <div className="border-b border-[#1a2d6b] bg-[#102052] px-4 py-3">
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#f2a501]">
                    {sec.number}
                  </div>
                  <h2 className="text-base font-extrabold text-white">{sec.title}</h2>
                  <p className="text-xs text-[#8c9bc4]">{sec.subtitle}</p>
                </div>

                <div className="divide-y divide-[#1a2d6b]/70">
                  {sec.articles.map((art) => {
                    const isOpen = Boolean(expandedIds[art.id] || q.length > 0);

                    return (
                      <div key={art.id} className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleArticle(art.id)}
                          className="flex w-full items-start justify-between gap-3 text-left"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded bg-[#16224d] px-2 py-0.5 font-mono text-[11px] font-extrabold text-[#f2a501]">
                                {art.code}
                              </span>
                              <h3 className="text-sm font-extrabold text-white">{art.title}</h3>
                              {art.badge2026 && (
                                <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-[#fde68a]">
                                  {art.badge2026}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-[#c7d2fe]">
                              {art.summary}
                            </p>
                          </div>

                          <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#16224d] text-[#c7d2fe]">
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                        </button>

                        {isOpen && (
                          <div className="mt-3 space-y-2 border-t border-[#1a2d6b]/60 pt-3">
                            {art.diagram && <FibaDiagram id={art.diagram} />}

                            <ul className="space-y-1.5 text-xs leading-relaxed text-[#eef2fb]">
                              {art.clauses.map((clause, i) => (
                                <li
                                  key={i}
                                  className="rounded-lg border border-[#1a2d6b]/50 bg-[#071233] px-3 py-2"
                                >
                                  {clause}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}

          <div className="text-right text-[11px] text-[#8c9bc4]">
            Showing {totalShown} articles &amp; appendices · Official FIBA Rules 2026 (v1.1)
          </div>
        </main>
      </div>
    </div>
  );
}