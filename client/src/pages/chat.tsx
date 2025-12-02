import { useRef, useEffect, useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, Sparkles, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

const defaultSuggestedPrompts = [
  "Summarize today's emails",
  "Show urgent emails",
  "Find free time this week",
  "What meetings do I have today?",
  "Draft a professional reply",
];

const chatFormSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(5000, "Message is too long"),
});

type ChatFormValues = z.infer<typeof chatFormSchema>;

export default function Chat() {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>(defaultSuggestedPrompts);

  const form = useForm<ChatFormValues>({
    resolver: zodResolver(chatFormSchema),
    defaultValues: {
      content: "",
    },
  });

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages"],
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/chat/send", { content });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      }
      form.reset();
    },
  });

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (sendMessage.isPending) {
      setTimeout(scrollToBottom, 50);
    }
  }, [sendMessage.isPending, scrollToBottom]);

  const onSubmit = (data: ChatFormValues) => {
    if (!sendMessage.isPending) {
      sendMessage.mutate(data.content.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    form.setValue("content", prompt);
    form.setFocus("content");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Chat with Your Assistant
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ask questions about your inbox, calendar, and get intelligent insights
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-medium mb-2">Start a conversation</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Ask me anything about your emails, calendar, or request help with scheduling and organization
              </p>
              
              {/* Suggested prompts */}
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((prompt) => (
                  <Badge
                    key={prompt}
                    variant="outline"
                    className="cursor-pointer hover-elevate px-4 py-2 text-xs"
                    onClick={() => handleSuggestedPrompt(prompt)}
                    data-testid={`badge-prompt-${prompt.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {prompt}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`message-${message.role}-${message.id}`}
            >
              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-card-border"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}

          {sendMessage.isPending && (
            <div className="flex justify-start" data-testid="message-loading">
              <div className="max-w-2xl rounded-2xl px-5 py-4 bg-card border border-card-border shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                    <Bot className="h-5 w-5 text-primary" />
                    <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "1.5s" }} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-foreground">Assistant is thinking</span>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-primary animate-[pulse_1s_ease-in-out_infinite]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-primary animate-[pulse_1s_ease-in-out_infinite_200ms]" style={{ animationDelay: "200ms" }} />
                      <span className="h-2.5 w-2.5 rounded-full bg-primary animate-[pulse_1s_ease-in-out_infinite_400ms]" style={{ animationDelay: "400ms" }} />
                      <span className="ml-2 text-xs text-muted-foreground">Analyzing your request...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4 bg-background">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-3xl mx-auto">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Textarea
                        {...field}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message... (Shift+Enter for new line)"
                        className="min-h-12 pr-12 resize-none"
                        rows={1}
                        data-testid="input-chat-message"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!field.value.trim() || sendMessage.isPending}
                        className="absolute right-2 top-2"
                        data-testid="button-send-message"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </form>
        </Form>
      </div>
    </div>
  );
}
