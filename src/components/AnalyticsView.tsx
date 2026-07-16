/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from "recharts";
import { 
  BarChart3, 
  TrendingUp, 
  Sparkles, 
  HardDrive,
  RefreshCw,
  FileText
} from "lucide-react";

interface AnalyticsSummary {
  totalDocs: number;
  totalChunks: number;
  totalUsers: number;
  totalStorage: number;
  monthlyUploads: Array<{ name: string; uploads: number; sizeKB: number }>;
  dailyQueries: Array<{ name: string; keyword: number; semantic: number }>;
  popularDocs: Array<{ name: string; queries: number; citations: number }>;
  userActivity: Array<{ name: string; actions: number; role: string }>;
}

interface AnalyticsViewProps {
  onLoadSummary: () => Promise<AnalyticsSummary>;
}

export default function AnalyticsView({ onLoadSummary }: AnalyticsViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const summary = await onLoadSummary();
      setData(summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading || !data) {
    return (
      <div className="p-6 space-y-6 flex flex-col items-center justify-center text-center h-full">
        <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Compiling database metrics...</span>
      </div>
    );
  }

  // Quota percentage
  const quotaBytes = 52428800; // 50MB
  const storagePercentage = Math.min(100, Math.round((data.totalStorage / quotaBytes) * 1000) / 10);

  return (
    <div id="view-analytics" className="p-6 space-y-6 font-sans overflow-y-auto h-full bg-slate-50/50 text-left">
      
      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-600 shrink-0" />
          <h3 className="font-bold text-sm text-slate-800">Operational SaaS Analytics</h3>
        </div>
        <button
          onClick={fetchSummary}
          className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-semibold hover:border-slate-300 rounded-lg flex items-center gap-1 text-slate-600 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Metrics
        </button>
      </div>

      {/* Grid summarizing stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4 text-left">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Monthly Token Growth</span>
            <span className="text-lg font-bold text-slate-800 tracking-tight">+{data.monthlyUploads.reduce((sum, d) => sum + d.uploads, 0)} Ingested</span>
            <p className="text-[9px] text-slate-400 mt-0.5 leading-normal">Total database growth: {data.totalChunks} vectors</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4 text-left">
          <div className="p-3.5 bg-teal-50 text-teal-600 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Total Query Allocations</span>
            <span className="text-lg font-bold text-slate-800 tracking-tight">
              {data.dailyQueries.reduce((sum, d) => sum + d.keyword + d.semantic, 0)} Queries / Week
            </span>
            <p className="text-[9px] text-slate-400 mt-0.5 leading-normal">
              Average semantic ratio: {Math.round((data.dailyQueries.reduce((sum, d) => sum + d.semantic, 0) / data.dailyQueries.reduce((sum, d) => sum + d.keyword + d.semantic, 0)) * 100)}%
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4 text-left">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-lg">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Storage Allocations Quota</span>
            <span className="text-lg font-bold text-slate-800 tracking-tight">{(data.totalStorage / 1024).toFixed(1)} KB Ingested</span>
            <p className="text-[9px] text-slate-400 mt-0.5 leading-normal">{storagePercentage}% of 50MB SLA limit</p>
          </div>
        </div>
      </div>

      {/* Recharts Grid (Area and Bar side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Knowledge ingestion growth over time */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h4 className="font-bold text-xs text-slate-800 mb-4 font-mono uppercase tracking-wider text-left">Ingested Assets Growth (KB)</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyUploads} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSize" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#e2e8f0" }} />
                <Area type="monotone" dataKey="sizeKB" name="Size (KB)" stroke="#10b981" fillOpacity={1} fill="url(#colorSize)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Query Distribution (Lexical vs Semantic) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h4 className="font-bold text-xs text-slate-800 mb-4 font-mono uppercase tracking-wider text-left">Query Distribution Volume</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailyQueries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#e2e8f0" }} />
                <Legend wrapperStyle={{ fontSize: 10, marginTop: 10 }} />
                <Bar dataKey="keyword" name="Keyword Search" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="semantic" name="Semantic Search" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Grid of Tables (Cited documents and active users) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Most Cited / Questioned Documents */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col text-left">
          <h4 className="font-bold text-xs text-slate-800 pb-3 border-b border-slate-100 font-mono uppercase tracking-wider mb-3">Popular Cited Assets</h4>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2 text-left">File Name</th>
                  <th className="py-2 text-center">Searched</th>
                  <th className="py-2 text-right">Cited Contexts</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-600 divide-y divide-slate-100">
                {data.popularDocs.map((doc, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 font-bold text-slate-700 flex items-center gap-1.5 min-w-[150px] truncate">
                      <FileText className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="truncate">{doc.name}</span>
                    </td>
                    <td className="py-3 text-center font-mono font-medium">{doc.queries} times</td>
                    <td className="py-3 text-right font-mono font-bold text-emerald-600">+{doc.citations} times</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Workspace Active Users actions log summary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col text-left">
          <h4 className="font-bold text-xs text-slate-800 pb-3 border-b border-slate-100 font-mono uppercase tracking-wider mb-3">Active Seats Activity Summary</h4>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2 text-left">Seat Holder</th>
                  <th className="py-2 text-center">System Role</th>
                  <th className="py-2 text-right">Telemetry Operations</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-600 divide-y divide-slate-100">
                {data.userActivity.map((user, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 font-bold text-slate-700 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-[10px]">
                        {user.name.charAt(0)}
                      </div>
                      <span>{user.name}</span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded uppercase">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-700">
                      {user.actions} actions
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
