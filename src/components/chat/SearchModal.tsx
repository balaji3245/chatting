import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMessage: (messageId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectMessage,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/messages/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error("[Search Error]", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Conversation" maxWidth="lg">
      <form onSubmit={handleSearch} className="space-y-4">
        <Input
          placeholder="Search message history..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
        />

        {/* Results List */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {isSearching ? (
            <div className="text-center py-6 text-xs text-slate-500">Searching messages...</div>
          ) : results.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              {query ? "No messages found" : "Type a keyword above to search"}
            </div>
          ) : (
            results.map((msg) => (
              <div
                key={msg.id}
                onClick={() => {
                  onSelectMessage(msg.id);
                  onClose();
                }}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-600">{msg.sender.displayName}</span>
                  <span className="text-[10px] text-slate-400" suppressHydrationWarning>
                    {new Date(msg.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-slate-800 line-clamp-2">{msg.content}</p>
              </div>
            ))
          )}
        </div>
      </form>
    </Modal>
  );
};
