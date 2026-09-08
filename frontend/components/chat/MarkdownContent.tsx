"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="chat-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => <h1 className="text-[1.5em] font-extrabold mt-6 mb-3.5 text-white first:mt-0 tracking-tight" {...props} />,
          h2: (props) => (
            <h2 className="text-[1.28em] font-extrabold mt-6 mb-3 text-white first:mt-0 tracking-tight pb-2 border-b border-white/10" {...props} />
          ),
          h3: (props) => <h3 className="text-[1.12em] font-bold mt-5 mb-2.5 text-white first:mt-0" {...props} />,
          p: (props) => <p className="leading-7 mb-3.5 text-[#E0E0E0] last:mb-0" {...props} />,
          ul: (props) => <ul className="list-disc pl-5 mb-3.5 space-y-2 marker:text-white/40" {...props} />,
          ol: (props) => <ol className="list-decimal pl-5 mb-3.5 space-y-2 marker:text-white/40" {...props} />,
          li: (props) => <li className="leading-7 text-[#E0E0E0] pl-1" {...props} />,
          strong: (props) => <strong className="font-bold text-white" {...props} />,
          em: (props) => <em className="italic text-[#E0E0E0]" {...props} />,
          a: (props) => (
            <a className="underline decoration-white/30 hover:decoration-white text-white" target="_blank" rel="noreferrer" {...props} />
          ),
          blockquote: (props) => (
            <blockquote className="border-l-[3px] border-white/25 bg-white/[0.03] rounded-r-lg pl-4 pr-3 py-2.5 my-3.5 text-[#C8C8C8] italic" {...props} />
          ),
          hr: () => <hr className="my-6 border-white/15" />,
          table: (props) => (
            <div className="overflow-x-auto mb-3.5 rounded-lg border border-white/10">
              <table className="w-full text-sm border-collapse" {...props} />
            </div>
          ),
          thead: (props) => <thead className="bg-white/[0.04]" {...props} />,
          th: (props) => <th className="text-left font-semibold text-white px-3 py-2 border-b border-white/10" {...props} />,
          td: (props) => <td className="px-3 py-2 border-b border-white/5 text-[#E0E0E0] align-top" {...props} />,
          code: ({ className, children, ...rest }) => {
            const isBlock = /language-/.test(className || "");
            if (isBlock) {
              return (
                <code className={`block overflow-x-auto font-mono text-[0.85em] leading-6 ${className || ""}`} {...rest}>
                  {children}
                </code>
              );
            }
            return (
              <code className="font-mono text-[0.85em] bg-white/[0.08] text-[#F0B37E] px-1.5 py-0.5 rounded" {...rest}>
                {children}
              </code>
            );
          },
          pre: (props) => (
            <pre className="bg-[#0C0C0C] border border-white/10 rounded-xl p-4 mb-3.5 overflow-x-auto" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
