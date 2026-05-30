"use client";

import { useChat } from "@ai-sdk/react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  ImagePlus,
  Maximize2,
  PlusCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useCreateConversation } from "@/hooks/mutations/ai/use-create-conversation";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import { createChatTransport, getMessageText } from "@/lib/ai-chat";
import { cn } from "@/lib/cn";
import { useAIStore } from "@/store/ai";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AssistantPanel() {
  const { isOpen, close, conversationId, setConversationId } = useAIStore();
  const { data: activeWorkspace } = useActiveWorkspace();
  const workspaceId = activeWorkspace?.id || "";
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [input, setInput] = useState("");
  const [images, setImages] = useState<{ id: string; src: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createConversationMutation = useCreateConversation(workspaceId);

  const transport = useMemo(() => createChatTransport(), []);
  const { messages, sendMessage, status, setMessages, error, stop } = useChat({
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // The full-page route (/ai) owns its own chat surface — never overlay the
  // floating panel on top of it.
  if (!isOpen || pathname === "/ai") return null;

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setImages([]);
  };

  const handlePickImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const picked = await Promise.all(
      Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .map(async (f) => ({
          id: crypto.randomUUID(),
          src: await readFileAsDataUrl(f),
        })),
    );
    setImages((prev) => [...prev, ...picked]);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((!input.trim() && images.length === 0) || !workspaceId || isLoading) {
      return;
    }

    const messageText = input.trim() || "Analyse cette image.";
    const outgoingImages = images.map((img) => img.src);
    setInput("");
    setImages([]);

    try {
      let activeId = conversationId;
      if (!activeId) {
        const title =
          messageText.slice(0, 50) + (messageText.length > 50 ? "..." : "");
        const conv = await createConversationMutation.mutateAsync({ title });
        activeId = conv.id;
        setConversationId(conv.id);
      }
      sendMessage(
        { text: messageText },
        {
          body: {
            workspaceId,
            conversationId: activeId,
            images: outgoingImages,
          },
        },
      );
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "w-[420px] h-[600px] max-w-[calc(100vw-2rem)]",
        "bg-popover border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden",
        "transition-all duration-300 ease-in-out",
        "before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">Assistant HyperFix IA</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleNewChat}
            className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground transition-colors"
            title="Nouvelle conversation"
            type="button"
          >
            <PlusCircle size={16} />
          </button>
          <button
            onClick={() => navigate({ to: "/ai" })}
            className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground transition-colors"
            title="Plein écran"
            type="button"
          >
            <Maximize2 size={16} />
          </button>
          <button
            onClick={close}
            className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground transition-colors"
            title="Fermer"
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Sparkles size={24} />
            </div>
            <h4 className="font-medium text-sm">
              Que puis-je faire pour vous ?
            </h4>
            <p className="text-xs text-muted-foreground max-w-[240px]">
              Je peux créer, modifier, déplacer et rechercher des tâches, gérer
              les labels et analyser vos images.
            </p>
          </div>
        )}
        {messages.map((m) => {
          const text = getMessageText(m);
          const isAssistant = m.role === "assistant";
          return (
            <div
              key={m.id}
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-primary-foreground ml-auto rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm border border-border",
              )}
            >
              {text ? (
                <div className="prose dark:prose-invert prose-sm max-w-none break-words">
                  <ReactMarkdown>{text}</ReactMarkdown>
                </div>
              ) : isAssistant && isLoading ? (
                <span className="inline-flex gap-1 items-center text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
                  <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
                  <span className="size-1.5 rounded-full bg-current animate-bounce" />
                </span>
              ) : null}
            </div>
          );
        })}
        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error.message || "Une erreur est survenue avec l'assistant."}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={onSubmit}
        className="p-3 bg-muted/20 border-t border-border space-y-2"
      >
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((img) => (
              <div key={img.id} className="relative">
                <img
                  src={img.src}
                  alt="pièce jointe"
                  className="h-12 w-12 rounded-lg object-cover border border-border"
                />
                <button
                  type="button"
                  onClick={() =>
                    setImages((prev) => prev.filter((x) => x.id !== img.id))
                  }
                  className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void handlePickImages(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title="Joindre une image"
          >
            <ImagePlus size={16} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Demander à l'IA..."
            className="flex-1 bg-transparent text-sm outline-none border-none py-1"
          />
          {isLoading ? (
            <button
              type="button"
              onClick={() => stop()}
              className="p-1.5 bg-muted text-foreground rounded-lg hover:opacity-90 transition-opacity"
              title="Arrêter"
            >
              <X size={15} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() && images.length === 0}
              className="p-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <Send size={15} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
