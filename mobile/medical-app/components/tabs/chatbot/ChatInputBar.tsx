"use client"

import { Mic, ImageIcon, Send, Loader2 } from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import type { Translation } from "@/lib/translations"

interface ChatInputBarProps {
  inputValue: string
  setInputValue: (v: string) => void
  isLoading: boolean
  sessionId: string | null
  isRecording: boolean
  isAnalyzingImage: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  t: Translation
  onSend: () => void
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onSuggestionClick: (s: string) => void
  onOpenVoice: () => void
  onOpenImage: () => void
  showSuggestions: boolean
}

export function ChatInputBar({
  inputValue,
  setInputValue,
  isLoading,
  sessionId,
  isRecording,
  isAnalyzingImage,
  inputRef,
  t,
  onSend,
  onKeyPress,
  onSuggestionClick,
  onOpenVoice,
  onOpenImage,
  showSuggestions,
}: ChatInputBarProps) {
  return (
    <div className="flex-shrink-0 p-4 bg-white dark:bg-[#1e293b] border-t border-border/50 dark:border-slate-700 rounded-t-[2rem] shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] space-y-4">
      {showSuggestions && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {t.chat.suggestions.map((sug, i) => (
            <button
              key={i}
              onClick={() => onSuggestionClick(sug)}
              disabled={isLoading}
              className="px-4 py-2 rounded-full bg-secondary dark:bg-slate-700 text-secondary-foreground dark:text-white text-xs font-medium whitespace-nowrap hover:bg-secondary/80 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 bg-muted/50 dark:bg-[#0f172a] rounded-[1.5rem] p-1 flex items-center relative transition-all focus-within:ring-2 ring-primary/20 focus-within:bg-background dark:focus-within:bg-black">
          <ModernButton
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
            disabled={isLoading || !sessionId || isRecording}
            onClick={onOpenVoice}
          >
            <Mic className="w-5 h-5" />
          </ModernButton>

          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={onKeyPress}
            disabled={isLoading || !sessionId}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm px-2 h-10 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-foreground dark:text-white disabled:opacity-50"
            placeholder={t.chat.placeholder}
          />

          <ModernButton
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
            disabled={isLoading || !sessionId || isAnalyzingImage}
            onClick={onOpenImage}
          >
            <ImageIcon className="w-5 h-5" />
          </ModernButton>
        </div>

        <ModernButton
          size="icon"
          onClick={() => onSend()}
          disabled={!inputValue.trim() || isLoading || !sessionId}
          className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Send className="w-5 h-5 text-white" />
          )}
        </ModernButton>
      </div>
    </div>
  )
}
