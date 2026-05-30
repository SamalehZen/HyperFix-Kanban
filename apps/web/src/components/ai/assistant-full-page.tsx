"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import {
  ImagePlus,
  MessageSquare,
  PlusCircle,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useCreateConversation } from "@/hooks/mutations/ai/use-create-conversation";
import { useDeleteConversation } from "@/hooks/mutations/ai/use-delete-conversation";
import { useGetConversation } from "@/hooks/queries/ai/use-get-conversation";
import { useGetConversations } from "@/hooks/queries/ai/use-get-conversations";
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

export function AssistantFullPage() {
  const { conversationId, setConversationId } = useAIStore();
  const { data: activeWorkspace } = useActiveWorkspace();
  const workspaceId = activeWorkspace?.id || "";

  const [input, setInput] = useState("");
  const [images, setImages] = useState<{ id: string; src: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createConversationMutation = useCreateConversation(workspaceId);

  const { data: conversations, refetch: refetchConversations } =
    useGetConversations(workspaceId);
  const { data: loadedConversation, isLoading: isLoadingConversation } =
    useGetConversation(conversationId, workspaceId);
  const deleteConversationMutation = useDeleteConversation(workspaceId);

  const transport = useMemo(() => createChatTransport(), []);
  const { messages, sendMessage, status, setMessages, error, stop } = useChat({
    transport,
    onFinish: () => {
      void refetchConversations();
    },
  });

  const isLoading = status === "streaming" || status === "submitted";
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Tracks which conversation's history has been loaded into useChat so a DB
  // refetch never overwrites a message that is actively streaming.
  const hydratedRef = useRef<string | null>(null);

  // Synchronise loaded DB history with useChat, guarded against clobbering.
  useEffect(() => {
    if (!conversationId) {
      if (hydratedRef.current !== null) {
        setMessages([]);
        hydratedRef.current = null;
      }
      return;
    }
    if (status === "streaming" || status === "submitted") return;
    if (
      loadedConversation?.id === conversationId &&
      hydratedRef.current !== conversationId
    ) {
      setMessages(
        (loadedConversation.messages ?? []) as unknown as UIMessage[],
      );
      hydratedRef.current = conversationId;
    }
  }, [conversationId, loadedConversation, status, setMessages]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = () => {
    hydratedRef.current = null;
    setConversationId(null);
    setMessages([]);
    setImages([]);
  };

  const handleSelectConversation = (id: string) => {
    if (id === conversationId) return;
    setMessages([]);
    setConversationId(id);
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
        // Mark as hydrated BEFORE switching so the history fetch for the new
        // conversation cannot clobber the streaming messages.
        hydratedRef.current = conv.id;
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

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversationMutation.mutate(id, {
      onSuccess: () => {
        if (conversationId === id) {
          handleNewChat();
        }
        void refetchConversations();
      },
    });
  };

  return (
    <div className="flex h-[calc(100vh-var(--header-height)-12px)] overflow-hidden bg-background rounded-b-xl border border-t-0 border-border/80">
      {/* Sidebar - Liste des conversations */}
      <div className="w-80 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <button
            onClick={handleNewChat}
            type="button"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-95 transition-opacity text-sm"
          >
            <PlusCircle size={16} />
            Nouvelle conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations && conversations.length > 0 ? (
            conversations.map((conv: { id: string; title: string }) => (
              <div
                key={conv.id}
                className={cn(
                  "flex items-center justify-between rounded-xl cursor-pointer transition-colors group text-sm w-full",
                  conversationId === conv.id
                    ? "bg-accent text-accent-foreground font-medium"
                    : "hover:bg-accent/40 text-muted-foreground hover:text-foreground",
                )}
              >
                <button
                  onClick={() => handleSelectConversation(conv.id)}
                  type="button"
                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left px-3 py-2.5 w-full bg-transparent border-none outline-none cursor-pointer"
                >
                  <MessageSquare size={16} className="shrink-0" />
                  <span className="truncate pr-1">{conv.title}</span>
                </button>
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  disabled={deleteConversationMutation.isPending}
                  type="button"
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all text-muted-foreground shrink-0 mr-2 cursor-pointer border-none bg-transparent"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center p-6 text-xs text-muted-foreground">
              Aucune discussion enregistrée
            </div>
          )}
        </div>
      </div>

      {/* Zone principale - Chat active */}
      <div className="flex-1 flex flex-col bg-background/20 relative">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoadingConversation && messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Sparkles size={32} />
              </div>
              <h2 className="text-xl font-bold tracking-tight">
                Comment puis-je vous aider aujourd'hui ?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Je suis votre assistant IA de gestion de projet. Je peux créer,
                modifier, déplacer et supprimer des tâches, gérer priorités,
                labels, échéances et assignations, faire des recherches et
                analyser vos images — dans la limite de vos permissions.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((m) => {
                const text = getMessageText(m);
                const isAssistant = m.role === "assistant";
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex gap-4 p-4 rounded-2xl border border-border/40",
                      m.role === "user"
                        ? "bg-accent/40 border-accent/20"
                        : "bg-muted/40",
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold select-none",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground border border-border",
                      )}
                    >
                      {m.role === "user" ? "U" : <Sparkles size={14} />}
                    </div>
                    <div className="flex-1 min-w-0 leading-relaxed text-sm">
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
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {error && (
          <div className="mx-auto mb-2 max-w-3xl w-full px-4">
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error.message || "Une erreur est survenue avec l'assistant."}
            </div>
          </div>
        )}

        {/* Formulaire de saisie */}
        <div className="p-4 border-t border-border bg-card/50">
          <form onSubmit={onSubmit} className="max-w-3xl mx-auto space-y-2">
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((img) => (
                  <div key={img.id} className="relative">
                    <img
                      src={img.src}
                      alt="pièce jointe"
                      className="h-14 w-14 rounded-lg object-cover border border-border"
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
            <div className="flex items-center gap-2.5 bg-background border border-border rounded-2xl px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/20">
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
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                title="Joindre une image"
              >
                <ImagePlus size={18} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Discutez avec l'assistant IA..."
                className="flex-1 bg-transparent text-sm outline-none border-none py-1.5"
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="p-2 bg-muted text-foreground rounded-xl hover:opacity-90 transition-opacity"
                  title="Arrêter"
                >
                  <X size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={
                    (!input.trim() && images.length === 0) ||
                    isLoadingConversation
                  }
                  className="p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  <Send size={16} />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
