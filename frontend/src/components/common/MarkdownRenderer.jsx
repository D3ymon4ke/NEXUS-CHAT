import React from 'react';

/**
 * Renderizador seguro e performático de Markdown customizado para o Nexus Chat
 * Suporta: **negrito**, *itálico*, ~~riscado~~, `código inline`, # títulos, - listas, links [texto](url)
 */
export function MarkdownRenderer({ content = '', className = '' }) {
  if (!content || typeof content !== 'string') return null;

  // Quebra o texto em linhas e blocos estruturados
  const lines = content.split('\n');

  const renderInline = (text) => {
    if (!text) return null;

    // Tokens regex para markdown inline
    // 1. Links: [texto](url)
    // 2. Bold: **texto** ou __texto__
    // 3. Italic: *texto* ou _texto_
    // 4. Strikethrough: ~~texto~~
    // 5. Inline Code: `texto`

    const tokens = [];
    let remaining = text;
    let key = 0;

    while (remaining) {
      // 1. Link [text](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      if (linkMatch) {
        tokens.push(
          <a
            key={`link-${key++}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-medium transition-colors"
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // 2. Bold **text** ou __text__
      const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
      if (boldMatch) {
        tokens.push(
          <strong key={`bold-${key++}`} className="font-extrabold text-white tracking-wide">
            {renderInline(boldMatch[2])}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // 3. Strikethrough ~~text~~
      const strikeMatch = remaining.match(/^~~(.*?)~~/);
      if (strikeMatch) {
        tokens.push(
          <del key={`strike-${key++}`} className="line-through text-slate-400/80">
            {renderInline(strikeMatch[1])}
          </del>
        );
        remaining = remaining.slice(strikeMatch[0].length);
        continue;
      }

      // 4. Inline code `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        tokens.push(
          <code
            key={`code-${key++}`}
            className="px-1.5 py-0.5 rounded-md bg-slate-950/80 border border-slate-700/80 text-cyan-300 font-mono text-[10px] sm:text-[11px] shadow-inner"
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // 5. Italic *text* ou _text_
      const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
      if (italicMatch) {
        tokens.push(
          <em key={`italic-${key++}`} className="italic text-slate-200">
            {renderInline(italicMatch[2])}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Texto plano até o próximo caractere especial (*, _, ~, `, [)
      const plainMatch = remaining.match(/^[^*_~`[]+/);
      if (plainMatch) {
        tokens.push(plainMatch[0]);
        remaining = remaining.slice(plainMatch[0].length);
      } else {
        // Caractere literal solto
        tokens.push(remaining[0]);
        remaining = remaining.slice(1);
      }
    }

    return tokens;
  };

  return (
    <div className={`space-y-1.5 leading-relaxed break-words ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Linha vazia
        if (!trimmed) {
          return <div key={`empty-${idx}`} className="h-1" />;
        }

        // Título H1: # Título
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={`h1-${idx}`} className="text-sm sm:text-base font-black text-white mt-2 mb-1 flex items-center gap-1.5 border-b border-slate-800/80 pb-1">
              {renderInline(trimmed.replace(/^#\s+/, ''))}
            </h2>
          );
        }

        // Título H2: ## Título
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={`h2-${idx}`} className="text-xs sm:text-sm font-extrabold text-amber-300 mt-2 mb-0.5">
              {renderInline(trimmed.replace(/^##\s+/, ''))}
            </h3>
          );
        }

        // Título H3: ### Título
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={`h3-${idx}`} className="text-xs font-bold text-cyan-300 mt-1.5 mb-0.5">
              {renderInline(trimmed.replace(/^###\s+/, ''))}
            </h4>
          );
        }

        // Lista com marcadores: - item, * item, • item
        if (/^[-*•]\s+/.test(trimmed)) {
          const itemText = trimmed.replace(/^[-*•]\s+/, '');
          return (
            <div key={`li-${idx}`} className="flex items-start gap-2 pl-1.5 my-0.5">
              <span className="text-amber-400 font-black text-xs leading-none select-none mt-1">•</span>
              <div className="flex-1 text-[11px] sm:text-xs text-slate-300">
                {renderInline(itemText)}
              </div>
            </div>
          );
        }

        // Parágrafo normal
        return (
          <p key={`p-${idx}`} className="text-[11px] sm:text-xs text-slate-300">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

export default MarkdownRenderer;
