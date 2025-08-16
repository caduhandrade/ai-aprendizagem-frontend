"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ResumeUpload from "./ResumeUpload";
import { Send, Bot, User } from "lucide-react";

// Types
interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
}
interface Session {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
}

export default function ChatBot() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_URL = "http://localhost:49152";

  // Get current session
  const currentSession = sessions.find((s) => s.id === currentSessionId);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, streamingMessage]);

  // Create new session
  const createNewSession = useCallback(
    (firstQuestion?: string) => {
      let title = `Conversa ${sessions.length + 1}`;
      if (firstQuestion) {
        // Pega as 3 primeiras palavras da pergunta do usuário
        const words = firstQuestion.trim().split(/\s+/).slice(0, 3).join(" ");
        if (words.length > 0) title = words;
      }
      const newSession: Session = {
        id: Date.now().toString(),
        name: title,
        messages: [],
        createdAt: new Date(),
      };
      setSessions((prev) => [...prev, newSession]);
      setCurrentSessionId(newSession.id);
      return newSession;
    },
    [sessions.length]
  );

  // Initialize first session
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    }
  }, [sessions.length, createNewSession]);

  // Send message
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    let session = currentSession;
    if (!session) {
      session = createNewSession(inputValue.trim());
    }
    // Guarda o id original da sessão para referência
    const originalSessionId = session ? session.id : "";

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    // Add user message
    setSessions((prev) =>
      prev.map((s) =>
        s.id === originalSessionId
          ? { ...s, messages: [...s.messages, userMessage] }
          : s
      )
    );

    const query = inputValue.trim();
    setInputValue("");
    setIsLoading(true);
    setStreamingMessage("");

    try {
      // Prepara o payload base
      const bodyPayload: any = { query };

      // Se a sessão já tem mensagens (não é a primeira pergunta), envia o session_id
      if (session && session.messages.length >= 2) {
        bodyPayload.session_id = originalSessionId;
      }

      // Se há arquivo selecionado, converte para base64
      if (selectedFile) {
        const reader = new FileReader();
        const fileBase64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedFile);
        });

        bodyPayload.file = {
          content: fileBase64,
          filename: selectedFile.name,
          type: selectedFile.type,
        };

        // Remove o arquivo após o envio
        setSelectedFile(null);
      }

      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedMessage = "";
      let capturedSessionId: string | null = null; // Armazena o session_id capturado

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              // Captura session_id no primeiro chunk que contém, mas não atualiza estado ainda
              if (parsed.session_id && !capturedSessionId) {
                capturedSessionId = parsed.session_id;
              }

              if (parsed.data) {
                accumulatedMessage += parsed.data;
                setStreamingMessage(accumulatedMessage);
              } else if (parsed.turn_complete) {
                // Agora sim atualiza o estado com o session_id capturado
                const finalSessionId = capturedSessionId || originalSessionId;
                if (finalSessionId !== originalSessionId) {
                  setCurrentSessionId(finalSessionId);
                }
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === originalSessionId
                      ? {
                          ...s,
                          id: finalSessionId,
                          messages: [
                            ...s.messages,
                            {
                              id: (Date.now() + 1).toString(),
                              content: accumulatedMessage.trim(),
                              sender: "bot",
                              timestamp: new Date(),
                            },
                          ],
                        }
                      : s
                  )
                );

                setStreamingMessage("");
                setIsLoading(false);
                return;
              }
            } catch {
              // Silently ignore JSON parse errors
            }
          }
        }
      }
    } catch (error) {
      debugger;
      setIsLoading(false);
      setStreamingMessage("");

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "Erro ao conectar com o servidor. Verifique se a API está rodando.",
        sender: "bot",
        timestamp: new Date(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === session!.id
            ? { ...s, messages: [...s.messages, errorMessage] }
            : s
        )
      );
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-[#181024]">
      {/* Sidebar */}
      <div className="w-64 bg-[#1e1333] border-r border-[#6c2bd7] flex flex-col">
        <div className="p-4 border-b border-[#6c2bd7]">
          <button
            onClick={() => createNewSession()}
            className="w-full bg-[#6c2bd7] text-white rounded-lg px-4 py-2 hover:bg-[#8f4fff] transition-colors"
          >
            Nova Conversa
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-3 cursor-pointer border-b border-[#2d1847] hover:bg-[#24143a] ${
                currentSessionId === session.id
                  ? "bg-[#6c2bd7] border-[#8f4fff] text-white"
                  : "text-[#cfc3f7]"
              }`}
              onClick={() => setCurrentSessionId(session.id)}
            >
              <div className="font-medium text-sm">{session.name}</div>
              <div className="text-xs mt-1">
                {session.messages.length} mensagens
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#181024]">
        {/* Header */}
        <div className="bg-[#1e1333] border-b border-[#6c2bd7] px-6 py-4">
          <div className="flex items-center">
            <Bot className="w-6 h-6 text-[#8f4fff] mr-3" />
            <h1 className="text-xl font-semibold text-[#cfc3f7]">
              Assistente de Aprendizagem
            </h1>
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {currentSession ? (
            <>
              {currentSession.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender === "user"
                        ? "bg-[#6c2bd7] text-white"
                        : "bg-[#24143a] border border-[#6c2bd7] text-[#cfc3f7]"
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.sender === "bot" && (
                        <Bot className="w-4 h-4 mt-0.5 text-[#8f4fff] flex-shrink-0" />
                      )}
                      {message.sender === "user" && (
                        <User className="w-4 h-4 mt-0.5 text-white flex-shrink-0" />
                      )}
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {/* Streaming message */}
              {streamingMessage && (
                <div className="flex justify-start">
                  <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-[#24143a] border border-[#6c2bd7] text-[#cfc3f7]">
                    <div className="flex items-start space-x-2">
                      <Bot className="w-4 h-4 mt-0.5 text-[#8f4fff] flex-shrink-0" />
                      <div className="whitespace-pre-wrap text-sm">
                        {streamingMessage}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Loading indicator */}
              {isLoading && !streamingMessage && (
                <div className="flex justify-start">
                  <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-[#24143a] border border-[#6c2bd7] text-[#cfc3f7]">
                    <div className="flex items-start space-x-2">
                      <Bot className="w-4 h-4 mt-0.5 text-[#8f4fff] flex-shrink-0" />
                      <div className="text-sm text-[#a48be7]">
                        <span className="animate-pulse">PENSANDO...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-[#a48be7] mt-8">
              Selecione uma conversa ou crie uma nova para começar
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Input Area + Upload */}
        <div className="bg-[#1e1333] border-t border-[#6c2bd7] p-4">
          {/* Exibe o nome do arquivo acima do input, se houver */}
          {selectedFile && (
            <div className="mb-2 text-[#cfc3f7] text-sm flex items-center">
              <span className="font-medium">Arquivo selecionado:</span>
              <span className="ml-2">{selectedFile.name}</span>
            </div>
          )}
          <div className="flex space-x-4 items-end">
            <ResumeUpload onFileSelect={setSelectedFile} />
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Digite sua pergunta..."
              className="flex-1 border border-[#6c2bd7] bg-[#24143a] text-[#cfc3f7] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#8f4fff] focus:border-transparent resize-none placeholder:text-[#a48be7]"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="bg-[#6c2bd7] text-white rounded-lg px-4 py-2 hover:bg-[#8f4fff] disabled:bg-[#3a235c] disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
