"use client"

import { Bot, Loader2 } from "lucide-react"
import type { ChatMessage } from "@/lib/api/services/chatService"

interface ChatMessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
  getImageTypeLabel: (type: string | null) => string
  messagesEndRef: React.RefObject<HTMLDivElement | null>
}

export function ChatMessageList({ messages, isLoading, getImageTypeLabel, messagesEndRef }: ChatMessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 min-h-0">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
        >
          {message.role === 'assistant' && (
            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 border dark:border-slate-600 shadow-sm flex items-center justify-center shrink-0 mt-auto">
              <Bot className="w-5 h-5 text-primary dark:text-blue-300" />
            </div>
          )}
          <div
            className={`p-4 rounded-2xl shadow-sm border max-w-[85%] ${
              message.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-none'
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border-slate-100 dark:border-slate-700 rounded-bl-none'
            }`}
          >
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.metadata?.type === 'image_analysis' && message.metadata?.fullAnalysis ? (
                <div className="space-y-3">
                  <div className="font-semibold text-base mb-2">
                    📊 Análisis de {getImageTypeLabel(message.metadata.imageType)}
                  </div>

                  {message.metadata.topPrediction && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">🔍 Predicción Principal</div>
                      <div className="text-blue-700 dark:text-blue-300">{message.metadata.topPrediction}</div>
                      {message.metadata.confidence !== undefined && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Confianza: {(message.metadata.confidence * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  )}

                  {message.metadata.fullAnalysis?.labels?.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                      <div className="font-medium mb-2">Top Predicciones:</div>
                      {message.metadata.fullAnalysis.labels.slice(0, 3).map((label: string, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-1">
                          <span>{idx + 1}. {label}</span>
                          <span className="text-xs font-medium">
                            {((message.metadata.fullAnalysis.scores?.[idx] || 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {message.metadata.fullAnalysis?.analysis && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <div className="font-medium mb-2">Análisis Detallado:</div>
                      <div>{message.metadata.fullAnalysis.analysis}</div>
                    </div>
                  )}

                  {message.metadata.fullAnalysis?.recommendations?.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="font-medium text-green-900 dark:text-green-100 mb-2">💡 Recomendaciones:</div>
                      <ul className="list-disc list-inside space-y-1 text-green-800 dark:text-green-200">
                        {message.metadata.fullAnalysis.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="text-sm">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="text-xs text-yellow-800 dark:text-yellow-200">
                      ⚠️ <strong>Importante:</strong> Este análisis es una herramienta de apoyo. Siempre consulta con un profesional médico.
                    </div>
                  </div>
                </div>
              ) : (
                <p>{message.content}</p>
              )}
            </div>
            {message.timestamp && (
              <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {new Date(message.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 border dark:border-slate-600 shadow-sm flex items-center justify-center shrink-0 mt-auto">
            <Bot className="w-5 h-5 text-primary dark:text-blue-300" />
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none shadow-sm border border-slate-100 dark:border-slate-700">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}
