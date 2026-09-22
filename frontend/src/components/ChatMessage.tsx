import React from 'react';
import { Bot, User, AlertCircle } from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import { ChatMessage as ChatMessageType } from '../types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

const markdownComponents: Components = {
  h1: ({ children, node, ...props }) => (
    <h1 className="text-lg sm:text-xl font-bold text-gray-900 mt-4 mb-2 first:mt-0" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, node, ...props }) => (
    <h2 className="text-base sm:text-lg font-bold text-gray-900 mt-3.5 mb-2 first:mt-0" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, node, ...props }) => (
    <h3 className="text-sm sm:text-base font-semibold text-gray-900 mt-3 mb-1.5 first:mt-0" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, node, ...props }) => (
    <h4 className="text-sm font-semibold text-gray-900 mt-2.5 mb-1 first:mt-0" {...props}>
      {children}
    </h4>
  ),
  p: ({ children, node, ...props }) => (
    <p className="mb-2.5 last:mb-0 leading-relaxed" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, node, ...props }) => (
    <ul className="list-disc list-outside pl-5 my-2.5 space-y-1" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, node, ...props }) => (
    <ol className="list-decimal list-outside pl-5 my-2.5 space-y-1" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, node, ...props }) => (
    <li className="leading-relaxed pl-0.5" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, node, ...props }) => (
    <strong className="font-semibold text-gray-900" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, node, ...props }) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  blockquote: ({ children, node, ...props }) => (
    <blockquote
      className="border-l-4 border-bank-400 pl-3.5 py-1.5 my-2.5 bg-bank-50/70 rounded-r text-gray-700 italic"
      {...props}
    >
      {children}
    </blockquote>
  ),
  a: ({ children, href, node, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-bank-600 hover:text-bank-800 underline font-medium break-words transition-colors"
      {...props}
    >
      {children}
    </a>
  ),
  hr: ({ node, ...props }) => (
    <hr className="my-3 border-t border-gray-200" {...props} />
  ),
  pre: ({ children, node, ...props }) => (
    <pre
      className="bg-slate-900 text-slate-100 rounded-xl p-3.5 my-2.5 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed shadow-sm"
      {...props}
    >
      {children}
    </pre>
  ),
  code: ({ children, className, node, ...props }) => {
    const isBlock = className?.includes('language-') || (typeof children === 'string' && children.includes('\n'));
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="bg-slate-100 text-bank-800 font-mono text-xs sm:text-[0.85em] px-1.5 py-0.5 rounded border border-slate-200 font-medium"
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ children, node, ...props }) => (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full text-xs sm:text-sm border border-gray-200 divide-y divide-gray-200 rounded-lg overflow-hidden" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, node, ...props }) => (
    <thead className="bg-gray-50 text-gray-700 font-semibold" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, node, ...props }) => (
    <th className="px-3 py-2 text-left font-semibold border-b border-gray-200" {...props}>
      {children}
    </th>
  ),
  td: ({ children, node, ...props }) => (
    <td className="px-3 py-2 border-b border-gray-100 text-gray-800" {...props}>
      {children}
    </td>
  ),
  tr: ({ children, node, ...props }) => (
    <tr className="even:bg-gray-50/50 hover:bg-gray-50 transition-colors" {...props}>
      {children}
    </tr>
  ),
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.isError;
  const isStreaming = message.isStreaming;

  return (
    <div
      className={`flex items-start gap-3 w-full my-2.5 transition-all duration-200 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar indicator */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm text-sm ${
          isUser
            ? 'bg-bank-700 text-white'
            : isError
            ? 'bg-amber-100 text-amber-800 border border-amber-300'
            : 'bg-bank-100 text-bank-700 border border-bank-200'
        }`}
        aria-hidden="true"
      >
        {isUser ? <User size={16} /> : isError ? <AlertCircle size={16} /> : <Bot size={18} />}
      </div>

      {/* Message bubble */}
      <div
        className={`relative max-w-[85%] sm:max-w-[78%] md:max-w-[70%] px-4 py-3 rounded-2xl shadow-sm text-sm sm:text-base leading-relaxed break-words ${
          isUser
            ? 'bg-bank-600 text-white rounded-tr-sm ml-auto'
            : isError
            ? 'bg-amber-50 text-gray-900 border border-amber-200 rounded-tl-sm mr-auto'
            : 'bg-white text-gray-800 border border-gray-200/80 rounded-tl-sm mr-auto'
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap font-normal">
            {message.content}
          </div>
        ) : !message.content && isStreaming ? (
          /* Empty assistant message while waiting for the first streaming chunk */
          <div className="flex items-center gap-1.5 py-1.5 px-1" aria-label="Assistant is thinking">
            <span className="w-2 h-2 rounded-full bg-bank-500 animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2 h-2 rounded-full bg-bank-500 animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2 h-2 rounded-full bg-bank-500 animate-bounce"></span>
          </div>
        ) : (
          <div className="font-normal relative">
            <ReactMarkdown components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
            {isStreaming && (
              <span
                className="inline-block w-1.5 h-4 ml-1 bg-bank-600 animate-pulse align-middle rounded-sm"
                aria-hidden="true"
                title="Streaming..."
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
