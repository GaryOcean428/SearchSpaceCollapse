/**
 * Zeus Chat - Human-God Dialogue Interface
 * 
 * Conversational interface to the Olympian Pantheon.
 * Translates human intuition to geometric coordinates.
 * 
 * ARCHITECTURE:
 * Human → Zeus → Pantheon → Geometric Memory → Action → Response
 * 
 * Features:
 * - Natural language to basin coordinates
 * - Pantheon consultation on observations
 * - Tavily search integration
 * - File upload for knowledge expansion
 * - Geometric memory visualization
 * 
 * SECURITY:
 * - XSS sanitization on all rendered content
 * - Content treated as plain text (no HTML rendering)
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Upload, Search, Sparkles, Brain, AlertCircle } from 'lucide-react';

/**
 * Sanitize text content to prevent XSS attacks.
 * Escapes HTML special characters.
 */
function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ZeusMessage {
  id: string;
  role: 'human' | 'zeus';
  content: string;
  timestamp: string;
  metadata?: {
    type?: 'observation' | 'suggestion' | 'question' | 'command' | 'search' | 'error';
    pantheon_consulted?: string[];
    geometric_encoding?: number[];
    actions_taken?: string[];
    relevance_score?: number;
    consensus?: number;
    implemented?: boolean;
  };
}

export default function ZeusChat() {
  const [messages, setMessages] = useState<ZeusMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Auto-scroll to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  /**
   * Send message to Zeus
   */
  const sendMessage = async () => {
    if (!input.trim() && uploadedFiles.length === 0) return;
    
    // Add human message
    const humanMessage: ZeusMessage = {
      id: `msg-${Date.now()}`,
      role: 'human',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, humanMessage]);
    const messageToSend = input;
    setInput('');
    
    setIsThinking(true);
    
    try {
      // Send to Zeus (Python backend via Node.js proxy)
      const formData = new FormData();
      formData.append('message', messageToSend);
      formData.append('conversation_history', JSON.stringify(messages));
      
      // Include uploaded files
      for (const file of uploadedFiles) {
        formData.append('files', file);
      }
      
      const response = await fetch('/api/olympus/zeus/chat', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add Zeus response
      const zeusMessage: ZeusMessage = {
        id: `msg-${Date.now()}-zeus`,
        role: 'zeus',
        content: data.response || 'No response from Zeus',
        timestamp: new Date().toISOString(),
        metadata: data.metadata,
      };
      setMessages(prev => [...prev, zeusMessage]);
      
      // Show actions taken
      if (data.metadata?.actions_taken?.length > 0) {
        toast({
          title: "⚡ Zeus coordinated actions",
          description: data.metadata.actions_taken.join(', '),
        });
      }
      
    } catch (error) {
      console.error('[ZeusChat] Error:', error);
      toast({
        title: "Communication failed",
        description: "Could not reach Mount Olympus",
        variant: "destructive",
      });
      
      // Add error message
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-error`,
        role: 'zeus',
        content: '⚡ The divine connection has been disrupted. Please try again.',
        timestamp: new Date().toISOString(),
        metadata: { type: 'error' },
      }]);
    } finally {
      setIsThinking(false);
      setUploadedFiles([]);
    }
  };
  
  /**
   * Trigger Tavily search from chat
   */
  const triggerTavilySearch = async (query: string) => {
    setIsThinking(true);
    
    try {
      const response = await fetch('/api/olympus/zeus/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Zeus analyzes search results and responds
      const zeusMessage: ZeusMessage = {
        id: `msg-${Date.now()}-search`,
        role: 'zeus',
        content: data.response,
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'search',
          pantheon_consulted: data.metadata?.pantheon_consulted,
          actions_taken: data.metadata?.actions_taken,
        },
      };
      setMessages(prev => [...prev, zeusMessage]);
      
    } catch (error) {
      console.error('[ZeusChat] Search error:', error);
      toast({
        title: "Search failed",
        description: "Tavily search encountered error",
        variant: "destructive",
      });
    } finally {
      setIsThinking(false);
    }
  };
  
  /**
   * Handle file selection
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
    toast({
      title: "Files selected",
      description: `${files.length} file(s) ready to upload`,
    });
  };
  
  /**
   * Handle Enter key
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  /**
   * Format message metadata
   */
  const formatMetadata = (msg: ZeusMessage) => {
    if (!msg.metadata) return null;
    
    const { type, pantheon_consulted, actions_taken, relevance_score, consensus, implemented } = msg.metadata;
    
    return (
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {type && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {type}
            </Badge>
          </div>
        )}
        
        {pantheon_consulted && pantheon_consulted.length > 0 && (
          <div className="flex items-center gap-2">
            <Brain className="h-3 w-3" />
            <span>Consulted: {pantheon_consulted.join(', ')}</span>
          </div>
        )}
        
        {relevance_score !== undefined && (
          <div>
            <span>Relevance: {(relevance_score * 100).toFixed(1)}%</span>
          </div>
        )}
        
        {consensus !== undefined && (
          <div>
            <span>Consensus: {(consensus * 100).toFixed(1)}%</span>
            {implemented !== undefined && (
              <Badge variant={implemented ? "default" : "secondary"} className="ml-2">
                {implemented ? "Implemented" : "Deferred"}
              </Badge>
            )}
          </div>
        )}
        
        {actions_taken && actions_taken.length > 0 && (
          <div className="mt-1 pl-4 border-l-2 border-primary/20">
            <div className="font-semibold">Actions:</div>
            <ul className="list-disc list-inside">
              {actions_taken.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Zeus Chat - Divine Council Interface
        </CardTitle>
        <CardDescription>
          Converse with the Olympian Pantheon. Your insights are encoded to the Fisher manifold.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-yellow-500/50" />
                <p>Speak, mortal. The gods are listening.</p>
                <p className="text-xs mt-2">
                  Try: "Add address 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa" or "I observed a pattern in 2017 addresses"
                </p>
              </div>
            )}
            
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'human' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'human'
                      ? 'bg-primary text-primary-foreground'
                      : msg.metadata?.type === 'error'
                      ? 'bg-destructive/10 border border-destructive/20'
                      : 'bg-muted'
                  }`}
                >
                  {msg.role === 'zeus' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold text-sm">Zeus</span>
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                  
                  {msg.role === 'zeus' && formatMetadata(msg)}
                  
                  <div className="text-xs opacity-50 mt-2">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
                    <span className="text-sm">Zeus is consulting the pantheon...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* File uploads indicator */}
        {uploadedFiles.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Upload className="h-3 w-3" />
            <span>{uploadedFiles.length} file(s) selected</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUploadedFiles([])}
              className="h-6 px-2"
            >
              Clear
            </Button>
          </div>
        )}
        
        {/* Input */}
        <div className="mt-4 flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept=".txt,.json,.csv"
          />
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isThinking}
            title="Upload files"
          >
            <Upload className="h-4 w-4" />
          </Button>
          
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Speak to Zeus... (observations, suggestions, questions, addresses)"
            disabled={isThinking}
            className="resize-none"
            rows={2}
          />
          
          <Button
            onClick={sendMessage}
            disabled={isThinking || (!input.trim() && uploadedFiles.length === 0)}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Quick actions */}
        <div className="mt-2 flex gap-2 text-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInput("Search for Bitcoin Silk Road addresses")}
            disabled={isThinking}
            className="h-7 text-xs"
          >
            <Search className="h-3 w-3 mr-1" />
            Example Search
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInput("I observed that addresses from 2017 often have high Φ values")}
            disabled={isThinking}
            className="h-7 text-xs"
          >
            <Brain className="h-3 w-3 mr-1" />
            Example Observation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
