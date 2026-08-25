import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

/**
 * Componente para renderizar blocos de código com botão de cópia
 */
function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 rounded-xl overflow-hidden bg-black/40 border border-white/10 text-xs font-mono select-text">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/5 text-[11px] text-slate-400">
        <span className="font-semibold uppercase tracking-wider">{language || 'código'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-slate-200 leading-relaxed scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Renderizador de Texto com suporte completo a Markdown & Estilos (WhatsApp/Telegram/Discord)
 */
export function FormattedText({ text = '', isOwn = false }) {
  if (!text) return null;

  // 1. Separar blocos de código ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    parts.push({
      type: 'codeblock',
      language: match[1] || '',
      content: match[2].trim()
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return (
    <div className="space-y-1 select-text">
      {parts.map((part, pIdx) => {
        if (part.type === 'codeblock') {
          return <CodeBlock key={pIdx} language={part.language} code={part.content} />;
        }

        // Processar linhas normais
        const lines = part.content.split('\n');

        return (
          <div key={pIdx} className="space-y-0.5">
            {lines.map((line, lIdx) => {
              // Citação (> texto)
              if (line.startsWith('&gt; ') || line.startsWith('> ')) {
                const quoteText = line.replace(/^(&gt;|>)\s?/, '');
                return (
                  <blockquote
                    key={lIdx}
                    className={`pl-2.5 my-1 py-0.5 border-l-2 text-xs italic ${
                      isOwn
                        ? 'border-white/60 bg-white/10 rounded-r'
                        : 'border-brand-500 bg-brand-500/10 rounded-r text-slate-200'
                    }`}
                  >
                    {renderInlineFormatting(quoteText, isOwn)}
                  </blockquote>
                );
              }

              // Lista com marcadores (- item ou * item)
              if (/^[-*]\s+/.test(line)) {
                const itemText = line.replace(/^[-*]\s+/, '');
                return (
                  <div key={lIdx} className="flex items-start gap-2 text-sm pl-1">
                    <span className="text-brand-400 font-bold">•</span>
                    <span>{renderInlineFormatting(itemText, isOwn)}</span>
                  </div>
                );
              }

              // Linha normal
              return (
                <p key={lIdx} className="text-sm leading-relaxed break-words">
                  {renderInlineFormatting(line, isOwn)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Função para processar formatações inline:
 * - **Negrito** ou *Negrito*
 * - _Itálico_ ou *Itálico*
 * - ~~Riscado~~ ou ~Riscado~
 * - `Código inline`
 * - ||Spoiler||
 * - Links (http://, https://)
 * - Menções (@usuario)
 */
function renderInlineFormatting(content, isOwn) {
  if (!content) return '';

  // Regex composta para tokens inline
  const inlineRegex = /(\*\*([^*]+)\*\*|__([^_]+)__|(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_)|~~([^~]+)~~|~([^~]+)~|`([^`]+)`|\|\|([^|]+)\|\||https?:\/\/[^\s]+|@[a-zA-Z0-9_.-]+)/g;

  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = inlineRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      elements.push(content.substring(lastIndex, match.index));
    }

    const token = match[0];

    // **Negrito** ou __Negrito__
    if (token.startsWith('**') && token.endsWith('**')) {
      elements.push(
        <strong key={match.index} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('__') && token.endsWith('__')) {
      elements.push(
        <strong key={match.index} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    // `Código inline`
    else if (token.startsWith('`') && token.endsWith('`')) {
      elements.push(
        <code
          key={match.index}
          className={`px-1.5 py-0.5 rounded text-xs font-mono border ${
            isOwn
              ? 'bg-black/30 text-amber-200 border-white/10'
              : 'bg-background-dark text-amber-300 border-slate-700'
          }`}
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    // ~~Riscado~~ ou ~Riscado~
    else if ((token.startsWith('~~') && token.endsWith('~~')) || (token.startsWith('~') && token.endsWith('~'))) {
      const striked = token.replace(/^~+|~+$/g, '');
      elements.push(
        <span key={match.index} className="line-through opacity-75">
          {striked}
        </span>
      );
    }
    // ||Spoiler||
    else if (token.startsWith('||') && token.endsWith('||')) {
      elements.push(
        <SpoilerText key={match.index} text={token.slice(2, -2)} />
      );
    }
    // *Itálico* ou _Itálico_
    else if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      elements.push(
        <em key={match.index} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    // Links (URL)
    else if (token.startsWith('http://') || token.startsWith('https://')) {
      elements.push(
        <a
          key={match.index}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`underline underline-offset-2 font-medium hover:opacity-80 inline-flex items-center gap-0.5 ${
            isOwn ? 'text-white' : 'text-sky-400'
          }`}
        >
          <span>{token}</span>
          <ExternalLink className="w-3 h-3 inline" />
        </a>
      );
    }
    // Menções (@usuario)
    else if (token.startsWith('@')) {
      elements.push(
        <span
          key={match.index}
          className="font-semibold text-brand-300 bg-brand-500/20 px-1 py-0.2 rounded hover:underline cursor-pointer"
        >
          {token}
        </span>
      );
    } else {
      elements.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < content.length) {
    elements.push(content.substring(lastIndex));
  }

  return elements.length > 0 ? elements : content;
}

/**
 * Texto tipo Spoiler com clique para revelar (estilo Telegram/Discord)
 */
function SpoilerText({ text }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setRevealed(!revealed);
      }}
      className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
        revealed
          ? 'bg-slate-700/60 text-slate-200'
          : 'bg-slate-800 text-slate-800 hover:bg-slate-700 select-none'
      }`}
      title={revealed ? 'Ocultar spoiler' : 'Clique para ver o spoiler'}
    >
      {text}
    </span>
  );
}
