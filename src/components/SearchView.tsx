/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Search, 
  SlidersHorizontal, 
  Database, 
  FileText, 
  Calendar, 
  User, 
  AlertCircle,
  Cpu,
  Bookmark
} from "lucide-react";
import { Document } from "../types";

interface SearchResult {
  id: string;
  text: string;
  chunkIndex: number;
  pageNumber?: number;
  score: number;
  documentId: string;
  documentName: string;
  uploadedBy: string;
  uploadDate: string;
}

interface SearchViewProps {
  documents: Document[];
  onSearch: (query: string, filters: { author: string; documentId: string }) => Promise<SearchResult[]>;
}

export default function SearchView({
  documents,
  onSearch,
}: SearchViewProps) {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"hybrid" | "semantic" | "keyword">("hybrid");
  const [authorFilter, setAuthorFilter] = useState("");
  const [docFilter, setDocFilter] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearchTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const data = await onSearch(query, {
        author: authorFilter,
        documentId: docFilter
      });
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score > 0.85) return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (score > 0.6) return "bg-teal-50 text-teal-700 border-teal-100";
    return "bg-slate-50 text-slate-600 border-slate-150";
  };

  return (
    <div id="view-search" className="p-6 space-y-6 font-sans overflow-y-auto h-full bg-slate-50/50 text-left flex flex-col md:flex-row gap-6">
      
      {/* Left Column: Sliders / Filter Constraints */}
      <div className="w-full md:w-64 space-y-4 shrink-0">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <SlidersHorizontal className="w-4.5 h-4.5 text-emerald-600" />
            <h3 className="font-bold text-xs text-slate-800">Advanced Filters</h3>
          </div>

          <div className="space-y-4">
            {/* Search algorithm toggle */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5 font-mono">
                Retrieval Engine
              </label>
              <div className="grid grid-cols-1 gap-1 text-[11px] font-semibold text-slate-600">
                <button
                  onClick={() => setSearchType("hybrid")}
                  className={`px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between ${
                    searchType === "hybrid" 
                      ? "border-emerald-500 bg-emerald-50/15 text-emerald-700 font-bold" 
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span>Hybrid (Vector + BM25)</span>
                  <span className="text-[8px] px-1 bg-emerald-100 text-emerald-800 rounded font-mono font-bold uppercase">Best</span>
                </button>
                <button
                  onClick={() => setSearchType("semantic")}
                  className={`px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between ${
                    searchType === "semantic" 
                      ? "border-emerald-500 bg-emerald-50/15 text-emerald-700 font-bold" 
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span>Semantic Embeddings</span>
                </button>
                <button
                  onClick={() => setSearchType("keyword")}
                  className={`px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between ${
                    searchType === "keyword" 
                      ? "border-emerald-500 bg-emerald-50/15 text-emerald-700 font-bold" 
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span>Lexical Keyword</span>
                </button>
              </div>
            </div>

            {/* Ingested Author filter */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1 font-mono">
                Uploaded By
              </label>
              <input
                type="text"
                placeholder="e.g. Sarah Jenkins"
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Ingested Document filter */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1 font-mono">
                Pin to File
              </label>
              <select
                value={docFilter}
                onChange={(e) => setDocFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">All Documents</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Search bar and matching results */}
      <div className="flex-1 space-y-6 flex flex-col">
        {/* Search bar */}
        <form onSubmit={handleSearchTrigger} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative flex gap-2.5">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 shrink-0" />
              <input
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter search terms, concepts, or queries (e.g. 'Rollover vacation rule' or 'campaign voic taglines')..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
            <button
              type="submit"
              className="px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition shadow-md shadow-emerald-950/25 shrink-0 flex items-center gap-1"
            >
              <Cpu className="w-4 h-4 shrink-0" />
              Search
            </button>
          </div>
        </form>

        {/* Results Stream */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col min-h-[300px]">
          <div className="pb-3 border-b border-slate-100 mb-4 shrink-0 flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider font-mono">Matched Knowledge Snippets</h3>
            {searched && (
              <span className="text-[10px] text-slate-400 font-mono font-bold">
                {results.length} Nodes Found
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 max-h-[400px]">
            {loading ? (
              <div className="space-y-4">
                <div className="h-20 bg-slate-50 rounded-lg animate-pulse"></div>
                <div className="h-24 bg-slate-50 rounded-lg animate-pulse"></div>
                <div className="h-16 bg-slate-50 rounded-lg animate-pulse"></div>
              </div>
            ) : !searched ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 text-xs flex-1">
                <Database className="w-10 h-10 text-slate-200 mb-2.5" />
                <span>Search across document chunks.</span>
                <p className="text-[10px] mt-1 text-slate-400">
                  We run full-text matching and cosine similarity simulations to fetch relevant text blocks.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 text-xs flex-1">
                <AlertCircle className="w-10 h-10 text-slate-200 mb-2.5" />
                <span>No matching excerpts found in active database.</span>
                <p className="text-[10px] mt-1 text-slate-400">
                  Try uploading a document with relevant terms or broadening your search query words.
                </p>
              </div>
            ) : (
              results.map((res) => (
                <div
                  key={res.id}
                  className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl hover:border-slate-300 transition flex gap-4 items-start"
                >
                  {/* Score Indicator */}
                  <div className={`px-2.5 py-1 border rounded-lg shrink-0 text-center font-mono font-bold text-xs flex flex-col items-center ${getScoreColor(res.score)}`}>
                    <span>{Math.round(res.score * 100)}%</span>
                    <span className="text-[8px] font-semibold text-slate-400 block tracking-tighter mt-0.5">SCORE</span>
                  </div>

                  {/* snippet and document origin details */}
                  <div className="flex-1 space-y-2 text-xs min-w-0">
                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed select-all">
                      "{res.text}"
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 items-center text-[10px] text-slate-400 pt-2 border-t border-slate-150/60 font-mono">
                      <span className="font-bold text-slate-600 flex items-center gap-1 truncate max-w-[150px]">
                        <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        {res.documentName}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Bookmark className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        Chunk {res.chunkIndex} • Page {res.pageNumber || 1}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <User className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        Uploaded by: {res.uploadedBy}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        {new Date(res.uploadDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
