import { ChatMessage as ChatMsg } from "@/types";

export default function ChatMessage({ message }: { message: ChatMsg }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-xs lg:max-w-md flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className="px-4 py-3 text-sm leading-relaxed"
          style={{
            background:   isUser ? "#E8590A" : "#F5F5F5",
            color:        isUser ? "white"   : "#1A1A1A",
            borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          }}
        >
          {message.content}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.sources.map((s, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-md font-mono cursor-pointer"
                style={{ background: "#E6F1FB", color: "#0C447C" }}
                title={s.chunkText}
              >
                src · {(s.score * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}