import { Avatar, AvatarFallback } from "@phonemail/ui/components/avatar";
import { ScrollArea } from "@phonemail/ui/components/scroll-area";
import { formatTime } from "./conversation-sidebar";

type Message = { _id: string; senderId: string; body: string; subject?: string; createdAt: number; deletedAt?: number };

export function MessageList({ messages, currentUserId, senderNames }: { messages: Message[]; currentUserId: string; senderNames: Map<string, string> }) {
  return <ScrollArea className="min-h-0 flex-1"><div className="mx-auto flex max-w-3xl flex-col gap-5 px-5 py-7 sm:px-8">
    {messages.map((message) => {
      const own = message.senderId === currentUserId;
      const name = own ? "You" : senderNames.get(message.senderId) ?? "PhoneMail member";
      return <article key={message._id} className={`rounded-2xl border border-border/70 bg-white p-5 shadow-sm sm:p-6 ${own ? "ml-5 sm:ml-12" : "mr-5 sm:mr-12"}`}>
        <header className="mb-4 flex items-center gap-3"><Avatar className="size-9"><AvatarFallback className={own ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"}>{name.slice(0, 1)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{name}</p><p className="text-xs text-muted-foreground">{new Date(message.createdAt).toLocaleDateString()} · {formatTime(message.createdAt)}</p></div><button className="text-xs font-medium text-primary hover:underline" onClick={() => window.dispatchEvent(new CustomEvent("phonemail:reply", { detail: message }))}>Reply</button></header>
        {message.subject && <h3 className="mb-2 font-semibold">{message.subject}</h3>}
        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">{message.deletedAt ? "This message was deleted." : message.body}</p>
      </article>;
    })}
    {messages.length === 0 && <div className="grid flex-1 place-items-center py-20 text-center"><div><div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-accent text-2xl text-primary">✉</div><h2 className="font-semibold">A fresh conversation</h2><p className="mt-1 text-sm text-muted-foreground">Send a message to start the conversation.</p></div></div>}
  </div></ScrollArea>;
}
