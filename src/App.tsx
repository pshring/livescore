import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Match, MatchEvent, ChatMessage, UserProfile, SocialEvent, PredictionRecord } from "./types";
import { BracketBuilder } from './components/BracketBuilder';
import { toggleFavorite, fetchFavorites } from './services/favoritesService';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Trophy, Clock, Activity, MessageSquare, Zap, ChevronRight, ChevronDown, ChevronLeft, LogIn, LogOut, User, Heart, Send, Bell, BellOff, Settings, Share2, TrendingUp, Users, Award, Search, Menu, X, ShieldCheck, Globe, Compass, Radio, LayoutGrid } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts';
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { GoogleGenAI, Type } from "@google/genai";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from "firebase/auth";
import { collection, onSnapshot, query, doc, setDoc, getDocFromServer, orderBy, limit, addDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { format, formatDistanceToNow, isValid } from "date-fns";

const FootballTacticalPitch = ({ match }: { match: Match }) => {
  const formation = [
    { pos: 'GK', top: '90%', left: '50%', color: 'bg-amber-500', name: 'Alisson' },
    { pos: 'LB', top: '70%', left: '20%', color: 'bg-brand', name: 'Robertson' },
    { pos: 'CB', top: '75%', left: '40%', color: 'bg-brand', name: 'Van Dijk' },
    { pos: 'CB', top: '75%', left: '60%', color: 'bg-brand', name: 'Konate' },
    { pos: 'RB', top: '70%', left: '80%', color: 'bg-brand', name: 'Alexander-Arnold' },
    { pos: 'CM', top: '50%', left: '30%', color: 'bg-brand', name: 'Mac Allister' },
    { pos: 'CDM', top: '60%', left: '50%', color: 'bg-brand', name: 'Endo' },
    { pos: 'CM', top: '50%', left: '70%', color: 'bg-brand', name: 'Szoboszlai' },
    { pos: 'LW', top: '25%', left: '25%', color: 'bg-brand', name: 'Diaz' },
    { pos: 'ST', top: '20%', left: '50%', color: 'bg-brand', name: 'Nunez' },
    { pos: 'RW', top: '25%', left: '75%', color: 'bg-brand', name: 'Salah' },
  ];

  return (
    <div className="relative w-full aspect-[3/4.5] bg-[#0a2a1a] rounded-[2.5rem] overflow-hidden border-[6px] border-emerald-950/50 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] group/pitch">
      {/* Dynamic Grass Texture */}
      <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none" 
           style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 5%, rgba(255,255,255,0.05) 5%, rgba(255,255,255,0.05) 10%)' }} />
      
      {/* Tactical Grid Overlay */}
      <div className="absolute inset-0 grid grid-cols-6 grid-rows-8 opacity-10 pointer-events-none">
        {Array(48).fill(0).map((_, i) => (
          <div key={i} className="border-[0.5px] border-emerald-400/30" />
        ))}
      </div>

      {/* Pitch Markings - High Contrast */}
      <div className="absolute inset-6 border-2 border-emerald-400/20 rounded-xl" />
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-emerald-400/20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-2 border-emerald-400/20 rounded-full" />
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-64 h-32 border-2 border-emerald-400/20 border-t-0" />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-64 h-32 border-2 border-emerald-400/20 border-b-0" />
      
      {/* Kinetic Passing Lanes (Simulated) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <motion.path 
          d="M 50% 70% L 30% 50%" 
          stroke="url(#pass-grad)" 
          strokeWidth="1" 
          strokeDasharray="4 4"
          initial={{ strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
        <defs>
          <linearGradient id="pass-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>

      {/* Players */}
      {formation.map((p, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.03 + 0.5, type: 'spring', damping: 15 }}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-10 group/player"
          style={{ top: p.top, left: p.left }}
        >
          {/* Proximity Glow */}
          <div className="absolute -inset-4 bg-emerald-400/0 group-hover/player:bg-emerald-400/10 rounded-full transition-all duration-500 blur-xl" />
          
          <div className={cn(
            "w-9 h-9 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-[10px] md:text-xs font-black text-white shadow-2xl border border-white/20 transition-all duration-500 group-hover/player:scale-125 group-hover/player:-translate-y-2 group-hover/player:shadow-emerald-500/40 cursor-pointer relative z-20 overflow-hidden",
            p.color
          )}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent group-hover/player:opacity-0 transition-opacity" />
            {p.pos}
          </div>
          
          {/* Tactical Label */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 opacity-0 group-hover/player:opacity-100 transition-all duration-300 translate-y-2 group-hover/player:translate-y-0 pointer-events-none">
            <span className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[9px] font-black text-white uppercase tracking-tighter border border-white/10 shadow-2xl">
              {p.name}
            </span>
            <div className="flex gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/30" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/30" />
            </div>
          </div>
        </motion.div>
      ))}

      {/* Top Telemetry Header */}
      <div className="absolute top-10 inset-x-10 flex items-start justify-between z-20 pointer-events-none">
        <div className="space-y-1">
          <Badge className="bg-emerald-950/90 backdrop-blur-2xl border-emerald-500/50 text-emerald-400 text-[10px] font-mono font-black tracking-[0.2em] uppercase px-4 py-1.5 shadow-2xl">
            TACTICAL_OVERLAY_v4
          </Badge>
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[8px] font-mono text-emerald-400/60 uppercase tracking-widest">Link: Stable_60fps</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[14px] font-mono font-black text-white uppercase tracking-tighter bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg border border-white/5 shadow-2xl">
            4-3-3_ATTACK
          </span>
          <span className="text-[8px] font-mono text-emerald-400/40 uppercase tracking-[0.3em]">Phase: Offensive_Transition</span>
        </div>
      </div>

      {/* Heat Zone Indicators (Purely Visual) */}
      <div className="absolute top-[20%] left-[20%] w-32 h-32 bg-emerald-400/5 blur-[40px] rounded-full animate-pulse" />
      <div className="absolute bottom-[25%] right-[15%] w-40 h-40 bg-emerald-400/10 blur-[50px] rounded-full animate-pulse" />
    </div>
  );
};

const MatchTimeDisplay = ({ match }: { match: Match }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  if (!match.timestamp || !isValid(new Date(match.timestamp))) {
    return (
      <div className="flex items-center gap-1.5 opacity-60">
        <Clock className="w-3.5 h-3.5" />
        <span className="text-[10px] font-black uppercase tracking-widest">{match.time}</span>
      </div>
    );
  }

  const matchTime = new Date(match.timestamp);
  const isPast = matchTime < now;
  const isSoon = !isPast && (matchTime.getTime() - now.getTime()) < 3600000; // Within 1 hour

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-brand transition-colors">
        <Clock className="w-3.5 h-3.5" />
        <span className="text-[10px] font-black uppercase tracking-widest">
          {format(matchTime, "h:mm a")} (Local)
        </span>
      </div>
      {match.status === "scheduled" && (
        <div className={cn(
          "text-[9px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded-md",
          isSoon ? "bg-amber-100 text-amber-600 animate-pulse" : "bg-slate-50 text-slate-400"
        )}>
          {isPast ? "Started" : `Starting ${formatDistanceToNow(matchTime, { addSuffix: true })}`}
        </div>
      )}
      {match.status === "live" && (
        <div className="text-[9px] font-black uppercase text-brand flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-brand animate-ping" />
          {match.time || "Live"}
        </div>
      )}
    </div>
  );
};

const socket: Socket = io();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const FOOTBALL_TOURNAMENTS = [
  "Premier League",
  "La Liga",
  "Bundesliga",
  "Serie A",
  "Ligue 1",
  "Champions League",
  "Europa League",
  "World Cup",
  "Euro",
  "Copa America",
  "FA Cup",
  "Carabao Cup",
  "MLS",
  "Saudi Pro League"
];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const HighlightFeed = ({ sport }: { sport: string }) => {
  const [highlights, setHighlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);

  useEffect(() => {
    const fetchHighlights = async () => {
      setLoading(true);
      setIsRestricted(false);
      try {
        const res = await fetch(`/api/highlights/${sport}`);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (data.restricted) {
              setIsRestricted(true);
              return;
            }
            if (data.results && Array.isArray(data.results)) {
              setHighlights(data.results);
            } else if (Array.isArray(data)) {
              setHighlights(data);
            }
          }
        }
      } catch (err) {
        console.error("Highlights component error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHighlights();
  }, [sport]);

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
    </div>
  );

  if (isRestricted) return (
    <div className="py-20 text-center space-y-4">
      <div className="w-20 h-20 bg-slate-50 rounded-full mx-auto flex items-center justify-center border border-slate-100 italic font-black text-slate-300 text-2xl">
        !
      </div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Video highlight service is temporarily restricted or rate-limited.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {highlights.slice(0, 10).map((item, i) => (
        <motion.div
          key={item.id || i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="group"
        >
          <Card className="glass border-sky-100 rounded-3xl overflow-hidden shadow-sm hover:border-brand/40 transition-all duration-500 h-full flex flex-col">
            <div className="relative aspect-video overflow-hidden">
              <img 
                src={item.thumbnail || `https://picsum.photos/seed/${item.id}/640/360`} 
                alt={item.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform duration-500 shadow-xl">
                  <Activity className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest">
                {item.duration || "Highlight"}
              </div>
            </div>
            <CardContent className="p-6 flex-1 flex flex-col gap-3">
              <h4 className="text-sm md:text-base font-black text-slate-900 leading-tight line-clamp-2 uppercase tracking-tighter">
                {item.title}
              </h4>
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.competition || sport}</span>
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-brand text-white p-2 rounded-xl shadow-lg hover:scale-110 transition-transform active:scale-95"
                >
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
      {highlights.length === 0 && !loading && (
        <div className="col-span-full py-20 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full mx-auto flex items-center justify-center border border-slate-100 opacity-50">
            <Zap className="w-10 h-10 text-slate-300" />
          </div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No video highlights available for this category yet.</p>
        </div>
      )}
    </div>
  );
};

const CricketOversGraph = ({ matchId }: { matchId: string }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchGraph = async () => {
      if (!matchId || !matchId.includes('cricket-v5-')) return;
      const numericId = matchId.replace('cricket-v5-', '');
      setLoading(true);
      try {
        const res = await fetch(`/api/cricket/match/${numericId}/overs-graph`);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const result = await res.json();
            if (result.overGraphInnings && Array.isArray(result.overGraphInnings)) {
              const processedData = result.overGraphInnings.flatMap((inn: any) => 
                 inn.overData ? Object.entries(inn.overData).map(([over, runs]: [string, any]) => ({
                   over: parseInt(over),
                   runs: typeof runs === 'object' ? runs.runs : runs,
                   wickets: typeof runs === 'object' ? runs.wickets : 0,
                   inning: inn.inningNum
                 })) : []
              ).sort((a: any, b: any) => a.over - b.over);
              setData(processedData);
            }
          }
        }
      } catch (err) {
        console.error("Overs Graph component error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGraph();
  }, [matchId]);

  if (loading) return <Skeleton className="h-64 rounded-3xl mt-6" />;
  if (data.length === 0) return null;

  return (
    <Card className="glass border-sky-100 rounded-3xl overflow-hidden mt-6 shadow-sm">
      <CardHeader className="p-6 pb-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Match Dynamics</CardTitle>
            <p className="text-xs font-black text-slate-900 tracking-tight">Overs vs Scoring Rate</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-brand"></div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Runs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500"></div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Wickets</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRuns" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="over" 
              axisLine={false} 
              tickLine={false} 
              tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}}
              label={{ value: 'Overs', position: 'insideBottom', offset: -5, fontSize: 8, fontWeight: 800, fill: '#cbd5e1', textAnchor: 'middle' }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}}
            />
            <Tooltip 
              cursor={{ stroke: '#0ea5e9', strokeWidth: 1, strokeDasharray: '4 4' }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: '1px solid #f1f5f9', 
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                padding: '12px'
              }}
              labelStyle={{ fontWeight: 900, fontSize: '10px', color: '#1e293b', marginBottom: '4px', textTransform: 'uppercase' }}
            />
            <Area 
              type="monotone" 
              dataKey="runs" 
              stroke="#0ea5e9" 
              strokeWidth={3} 
              fillOpacity={1} 
              fill="url(#colorRuns)" 
              animationDuration={1500}
            />
            <Line 
              type="monotone" 
              dataKey="wickets" 
              stroke="none" 
              dot={{ r: 4, fill: '#f43f5e', strokeWidth: 0 }} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const NHLPlayerStats = ({ playerId }: { playerId: string }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!playerId) return;
      setLoading(true);
      setIsRestricted(false);
      try {
        const res = await fetch(`/api/nhl/players/${playerId}/stats`);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (data.restricted) {
              setIsRestricted(true);
              return;
            }
            if (data && data.statistics) {
              setStats(data.statistics);
            }
          }
        }
      } catch (err) {
        console.error("NHL Stats component error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [playerId]);

  if (loading) return <Skeleton className="h-64 rounded-3xl" />;
  if (isRestricted) return (
    <div className="mt-6 p-6 glass border-slate-100 rounded-3xl text-center">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Player stats service temporarily unavailable.</p>
    </div>
  );
  if (!stats) return null;

  return (
    <Card className="glass border-sky-100 rounded-3xl overflow-hidden mt-6">
      <CardHeader className="bg-slate-900 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black uppercase tracking-tighter">Pro NHL Statistics</CardTitle>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Official Career Performance</p>
          </div>
          <Award className="w-8 h-8 text-amber-500" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Goals", value: stats.goals || 0 },
            { label: "Assists", value: stats.assists || 0 },
            { label: "Points", value: stats.points || 0 },
            { label: "PIM", value: stats.penaltyMinutes || 0 }
          ].map((item, i) => (
            <div key={i} className="text-center space-y-1">
              <div className="text-3xl font-black text-slate-900 font-display">{item.value}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600">
            <span className="uppercase tracking-widest text-[10px] text-slate-400">Games Played</span>
            <span>{stats.gamesPlayed || 0}</span>
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-slate-600">
            <span className="uppercase tracking-widest text-[10px] text-slate-400">Plus/Minus</span>
            <span className={cn(stats.plusMinus >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {stats.plusMinus >= 0 ? "+" : ""}{stats.plusMinus || 0}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const NewsFeed = ({ category }: { category: string }) => {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setIsRestricted(false);
      try {
        // Map app sports to API categories
        const catMap: Record<string, string> = {
          football: "soccer",
          tennis: "tennis",
          cricket: "cricket",
          basketball: "basketball",
          formula1: "motorsports"
        };
        const apiCat = catMap[category] || "soccer";
        const res = await fetch(`/api/news/${apiCat}`);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (data.restricted) {
              setIsRestricted(true);
              setNews([]);
              return;
            }
            if (data.data && Array.isArray(data.data)) {
              setNews(data.data);
            }
          } else {
            console.error("News API returned non-JSON response");
          }
        }
      } catch (err) {
        console.error("News component error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [category]);

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
    </div>
  );

  if (isRestricted) return (
    <div className="py-12 text-center space-y-4">
      <div className="w-16 h-16 bg-slate-50 rounded-full mx-auto flex items-center justify-center border border-slate-100">
        <BellOff className="w-8 h-8 text-slate-300" />
      </div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">News service is temporarily restricted or rate-limited. Please try again later.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {news.slice(0, 10).map((item, i) => (
        <motion.a
          key={item.id || i}
          href={`https://www.livescore.com${item.url}`}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="group"
        >
          <Card className="glass border-sky-100 rounded-2xl overflow-hidden hover:border-brand/50 transition-all duration-300 h-full flex flex-col">
            {item.image && (
              <div className="h-32 overflow-hidden">
                <img src={item.image.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
              </div>
            )}
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-brand/10 text-brand text-[8px] font-bold uppercase tracking-widest px-2">{item.categoryName || "Sports"}</Badge>
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{new Date(item.publishAt).toLocaleDateString()}</span>
              </div>
              <h4 className="text-sm font-black text-slate-900 leading-tight mb-3 line-clamp-2">{item.title}</h4>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-[10px] font-bold text-brand uppercase tracking-widest">Read More</span>
                <ChevronRight className="w-4 h-4 text-brand group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.a>
      ))}
      {news.length === 0 && !loading && (
        <div className="col-span-full py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No news available for this category</div>
      )}
    </div>
  );
};

const TournamentStatistics = ({ 
  tournamentId, 
  seasonId,
  onPlayerClick
}: { 
  tournamentId: string, 
  seasonId: string,
  onPlayerClick?: (name: string) => void
}) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setIsRestricted(false);
      try {
        const res = await fetch(`/api/tournament/${tournamentId}/season/${seasonId}/stats`);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (data.restricted) {
              setIsRestricted(true);
              return;
            }
            if (data && data.statistics) {
              setStats(data.statistics);
            }
          } else {
            console.error("Tournament Stats API returned non-JSON response");
          }
        }
      } catch (err) {
        console.error("Stats component error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [tournamentId, seasonId]);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-48 w-full rounded-3xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    </div>
  );

  if (isRestricted) return (
    <div className="py-12 text-center space-y-4">
      <div className="w-16 h-16 bg-slate-50 rounded-full mx-auto flex items-center justify-center border border-slate-100">
        <Clock className="w-8 h-8 text-slate-300" />
      </div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Statistics service is temporarily restricted or rate-limited. Please try again later.</p>
    </div>
  );

  if (!stats) return <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No statistics available</div>;

  const statItems = [
    { label: "Total Goals", value: stats.goals, icon: <Trophy className="w-4 h-4" /> },
    { label: "Home Wins", value: stats.homeWins, icon: <Heart className="w-4 h-4" /> },
    { label: "Away Wins", value: stats.awayWins, icon: <TrendingUp className="w-4 h-4" /> },
    { label: "Avg. Cards/Match", value: stats.yellowCards ? (stats.yellowCards / (stats.homeWins + stats.awayWins + stats.draws || 1)).toFixed(1) : "N/A", icon: <Zap className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item, i) => (
          <Card key={i} className="glass border-sky-100 rounded-2xl overflow-hidden shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                {item.icon}
              </div>
              <div className="text-xl font-black text-slate-900 font-display">{item.value}</div>
              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.topScorers && stats.topScorers.length > 0 && (
        <Card className="glass border-sky-100 rounded-3xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Top Goal Scorers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {stats.topScorers.slice(0, 5).map((player: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-black text-slate-200 font-display italic">#0{i + 1}</span>
                    <div className="space-y-0.5">
                      <div 
                        onClick={() => onPlayerClick?.(player.player.name)}
                        className="text-sm font-bold text-slate-900 cursor-pointer hover:text-brand transition-colors"
                      >
                        {player.player.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">{player.team.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-brand font-display">{player.goals}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Goals</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const TennisRankings = ({ onPlayerClick }: { onPlayerClick?: (name: string) => void }) => {
  const [rankings, setRankings] = useState<any[]>([]);
  const [type, setType] = useState("wta"); // wta or atp
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/tennis/rankings/${type}`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
           throw new Error("Received non-JSON response from server.");
        }

        const data = await response.json();
        // The API returns { rankings: [...] } based on user's curl suggestion
        if (data.rankings && Array.isArray(data.rankings)) {
          setRankings(data.rankings);
        } else if (Array.isArray(data)) {
          setRankings(data);
        }
      } catch (error) {
        console.error("Failed to fetch tennis rankings:", error);
        setRankings([]); // Clear on error
      } finally {
        setLoading(false);
      }
    };
    fetchRankings();
  }, [type]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">World Tennis Rankings</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">WTA & ATP Official Standings</p>
        </div>
        <div className="flex gap-2 bg-rose-50 p-1.5 rounded-2xl border border-rose-100">
          {[
            { id: "atp", label: "ATP (Men)" },
            { id: "wta", label: "WTA (Women)" }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                type === t.id ? "bg-rose-500 text-white shadow-lg shadow-rose-200" : "text-slate-400 hover:text-slate-600 hover:bg-white"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <Card key={i} className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          rankings.slice(0, 30).map((player, i) => (
            <motion.div
              key={player.id || player.ranking || i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="group border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden hover:shadow-2xl hover:shadow-rose-100 transition-all duration-500 bg-white">
                <CardContent className="p-8 relative">
                  <div className="absolute top-6 right-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Trophy className="w-16 h-16 text-rose-500" />
                  </div>
                  
                  <div className="flex items-start gap-5">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100 group-hover:scale-110 transition-transform duration-500">
                        <span className="text-xl font-black text-rose-600 tracking-tighter">
                          #{player.ranking || (i + 1)}
                        </span>
                      </div>
                      {player.previousRanking && (
                        <span className={cn(
                          "text-[10px] font-bold uppercase",
                          player.ranking < player.previousRanking ? "text-emerald-500" : "text-rose-400"
                        )}>
                          {player.ranking < player.previousRanking ? "↑" : "↓"} {Math.abs(player.ranking - player.previousRanking)}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="space-y-0.5">
                        <h3 
                          onClick={() => onPlayerClick?.(player.rowName || player.player?.name)}
                          className={cn(
                            "text-lg font-black text-slate-900 leading-tight group-hover:text-rose-600 transition-colors",
                            onPlayerClick && "cursor-pointer hover:underline"
                          )}
                        >
                          {player.rowName || player.player?.name || "Unknown Player"}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-widest px-2 border-none">
                            {player.player?.country?.name || player.countryName || "International"}
                          </Badge>
                          <span className="text-[10px] font-black text-rose-500/50 uppercase tracking-widest">{player.points || player.pointsCount} PTS</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-50 pt-6">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Tournament</p>
                      <p className="text-xs font-black text-slate-900 uppercase">
                        {player.tournamentsCount || "N/A"} Played
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Movement</p>
                      <p className="text-xs font-black text-rose-500">
                        {player.rankingChange || 0} Places
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

const FootballLineups = ({ 
  matchId,
  onPlayerClick
}: { 
  matchId: string,
  onPlayerClick?: (name: string) => void
}) => {
  const [lineups, setLineups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLineups = async () => {
      if (!matchId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/football/match/${matchId}/lineups`);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (data.response && Array.isArray(data.response)) {
              setLineups(data.response);
            }
          }
        }
      } catch (err) {
        console.error("Lineups component error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLineups();
  }, [matchId]);

  if (loading) return <Skeleton className="h-64 rounded-3xl" />;
  if (lineups.length === 0) return (
    <div className="py-20 text-center glass rounded-3xl border-dashed border-2 border-slate-100 italic text-slate-400 font-bold uppercase tracking-widest text-[10px]">
      Lineups not yet announced
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {lineups.map((lineup, i) => (
        <Card key={i} className="glass border-sky-100 rounded-3xl overflow-hidden shadow-sm">
          <CardHeader className="bg-slate-900 p-6 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black uppercase tracking-tighter text-white">{lineup.team.name}</CardTitle>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{lineup.formation || "Squad"}</p>
            </div>
            <img src={lineup.team.logo} alt={lineup.team.name} className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <h5 className="text-[10px] font-black uppercase tracking-widest text-brand mb-4">Starting XI</h5>
                <div className="divide-y divide-slate-50">
                  {lineup.startXI.map((player: any) => (
                    <div key={player.player.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-[10px] font-black text-slate-400 font-mono italic">#{player.player.number}</span>
                        <span 
                          onClick={() => onPlayerClick?.(player.player.name)}
                          className="text-sm font-bold text-slate-900 cursor-pointer hover:text-brand transition-colors"
                        >
                          {player.player.name}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest bg-slate-50 border-none">{player.player.pos}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              {lineup.substitutes.length > 0 && (
                <div>
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Substitutes</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                    {lineup.substitutes.map((player: any) => (
                      <div key={player.player.id} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 font-mono italic">#{player.player.number}</span>
                        <span className="text-[11px] font-bold text-slate-600 line-clamp-1">{player.player.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const WorldCupTeamsViewer = ({ 
  onSearchSquad, 
  onViewSocial,
  onViewHighlights,
  onViewBracket,
  user,
  favorites,
  onFavoriteChanged
}: { 
  onSearchSquad: (team: string) => void, 
  onViewSocial: () => void,
  onViewHighlights: () => void,
  onViewBracket: () => void,
  user: any,
  favorites: string[],
  onFavoriteChanged: () => void
}) => {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tacticalTeam, setTacticalTeam] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/football/world-cup/teams");
        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (Array.isArray(data)) {
              setTeams(data);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch World Cup teams:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  const getTacticalAnalysis = async (teamName: string) => {
    setTacticalTeam(teamName);
    setAnalyzing(true);
    setAnalysis("");
    try {
      const prompt = `Provide a very brief (2 sentences) tactical profile for the ${teamName} national football team as of 2026. Mention their likely key player and primary playstyle (e.g. Tiki-taka, High Press, Counter-attack).`;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      setAnalysis(response.text.trim());
    } catch (error) {
      console.error("AI Analysis Error:", error);
      setAnalysis("Unable to generate analysis at this moment.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array(12).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-[2rem]" />)}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 font-display">World Cup 2026 Nations</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">Official Tournament Dashboard</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-brand/5 text-brand border-brand/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-brand/10" onClick={onViewSocial}>
            <Share2 className="w-3 h-3 mr-2" /> Live Social Feed
          </Badge>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-emerald-100" onClick={onViewHighlights}>
            <Zap className="w-3 h-3 mr-2" /> Watch Highlights
          </Badge>
          <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-amber-100" onClick={onViewBracket}>
            <Trophy className="w-3 h-3 mr-2" /> Bracket Builder
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {teams.map((team, i) => (
          <motion.div
            key={team.id || i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, ease: "easeOut" }}
          >
            <Card className="bg-[#0f172a] border-slate-800 rounded-[2.5rem] overflow-hidden hover:border-brand/50 transition-all duration-700 group relative shadow-2xl h-full flex flex-col">
              {/* Cinematic Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              
              <CardContent className="p-0 flex flex-col h-full relative z-10">
                {/* Nation Header Card */}
                <div className="p-8 pb-4 flex flex-col items-center gap-6 text-center">
                  <div className="relative group/emblem">
                    <div className="absolute -inset-4 bg-brand/30 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
                    <div className="w-32 h-20 bg-slate-900 rounded-[1.5rem] overflow-hidden border border-slate-800 flex items-center justify-center relative shadow-2xl group-hover/emblem:scale-110 group-hover/emblem:-rotate-3 transition-all duration-500">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                      {team.image ? (
                         <img 
                            src={team.image} 
                            alt={team.team} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer" 
                          />
                      ) : (
                        <Globe className="w-10 h-10 text-slate-700" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-2xl font-display font-black text-white uppercase tracking-tighter group-hover:text-brand transition-colors">
                      {team.team || team.name}
                    </h3>
                    <div className="flex items-center justify-center gap-2">
                       <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Group {team.group || 'A'}</span>
                       <div className="w-1 h-1 rounded-full bg-slate-700" />
                       <span className="text-[10px] font-mono text-brand font-black uppercase">Rank #{Math.floor(Math.random() * 20) + 1}</span>
                    </div>
                  </div>
                </div>

                {/* Tactical Power Nodes */}
                <div className="px-8 py-6 grid grid-cols-3 gap-2 border-y border-white/5 bg-black/20">
                   {[
                     { label: 'ATT', val: 88, color: 'bg-red-500' },
                     { label: 'MID', val: 92, color: 'bg-emerald-500' },
                     { label: 'DEF', val: 84, color: 'bg-brand' },
                   ].map((node, j) => (
                     <div key={j} className="flex flex-col items-center gap-2">
                        <div className="text-[8px] font-mono text-slate-500 uppercase font-black">{node.label}</div>
                        <div className="relative w-full aspect-square rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center overflow-hidden group/node">
                           <div className={cn("absolute inset-0 opacity-10 blur-md", node.color)} />
                           <span className="text-xs font-black text-white relative z-10">{node.val}</span>
                           <div className="absolute bottom-0 inset-x-0 h-0.5 bg-slate-800">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${node.val}%` }}
                                className={cn("h-full", node.color)} 
                              />
                           </div>
                        </div>
                     </div>
                   ))}
                </div>

                {/* Call to Actions - mt-auto ensures they stay at bottom */}
                <div className="p-6 bg-slate-900/50 backdrop-blur-md flex gap-3 mt-auto">
                  <button 
                    onClick={() => onSearchSquad(team.team || team.name)}
                    className="flex-1 py-3 bg-brand text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand/20 active:scale-95 transition-all hover:bg-brand/90"
                  >
                    NATION_SQUAD
                  </button>
                  <button 
                    onClick={() => getTacticalAnalysis(team.team || team.name)}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all hover:border-brand/40"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>

                {tacticalTeam === (team.team || team.name) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="absolute inset-x-0 bottom-0 z-20 bg-[#0f172a] border-t border-brand/20 p-6 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black text-brand uppercase tracking-widest">Tactical Analysis</span>
                      <button onClick={() => setTacticalTeam(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    {analyzing ? (
                      <div className="space-y-2">
                        <Skeleton className="h-2 w-full bg-slate-800" />
                        <Skeleton className="h-2 w-4/5 bg-slate-800 mb-4" />
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-300 leading-relaxed font-medium italic">
                        {analysis}
                      </p>
                    )}
                  </motion.div>
                )}
              </CardContent>

              {/* Action Badge - Favorite */}
              <button 
                className={cn(
                  "absolute top-6 right-6 z-20 p-2.5 rounded-full backdrop-blur-3xl border transition-all duration-300",
                  favorites.includes(team.id) 
                    ? "bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/20" 
                    : "bg-white/5 text-slate-400 border-white/10 hover:border-red-500/50"
                )}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!user) return;
                  await toggleFavorite(user, team.id, favorites.includes(team.id));
                  onFavoriteChanged();
                }}
              >
                <Heart className={cn("w-4 h-4", favorites.includes(team.id) && "fill-current")} />
              </button>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const FootballRankings = ({ onTeamClick }: { onTeamClick?: (leagueId: string, teamName?: string) => void }) => {
  const [standings, setStandings] = useState<any[]>([]);
  const [leagueId, setLeagueId] = useState<string | null>(null); // null means show gallery
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "elite" | "uefa" | "heritage">("all");
  const cache = useRef<Record<string, any[]>>({});
  const lastFetchTime = useRef<Record<string, number>>({});
  const REQUEST_COOLDOWN = 60000; // 1 minute

  const TOURNAMENTS_GALAXY = [
    { id: "39", name: "Premier League", country: "England", prestige: 98, img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800", color: "from-purple-600/40 to-brand/20", icon: "🦁", stats: "High_Intensity", fed: "UEFA", heritage: ["Manchester City", "Arsenal", "Manchester United"] },
    { id: "140", name: "La Liga", country: "Spain", prestige: 95, img: "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=800", color: "from-amber-500/40 to-red-500/20", icon: "⚖️", stats: "Tactical_Focus", fed: "UEFA", heritage: ["Real Madrid", "Barcelona", "Atletico Madrid"] },
    { id: "78", name: "Bundesliga", country: "Germany", prestige: 92, img: "https://images.unsplash.com/photo-1431324155629-1a6eda1eed2d?auto=format&fit=crop&q=80&w=800", color: "from-red-600/40 to-yellow-500/20", icon: "🛡️", stats: "Goal_Machine", fed: "UEFA", heritage: ["Bayer Leverkusen", "Bayern Munich", "Dortmund"] },
    { id: "135", name: "Serie A", country: "Italy", prestige: 90, img: "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&q=80&w=800", color: "from-blue-600/40 to-slate-500/20", icon: "🎭", stats: "Defensive_Art", fed: "UEFA", heritage: ["Inter Milan", "Napoli", "AC Milan"] },
    { id: "61", name: "Ligue 1", country: "France", prestige: 88, img: "https://images.unsplash.com/photo-1510051646673-c39c8286a73c?auto=format&fit=crop&q=80&w=800", color: "from-sky-600/40 to-blue-900/20", icon: "🐓", stats: "Rising_Talents", fed: "UEFA", heritage: ["PSG", "Lille", "Monaco"] },
    { id: "world-cup", name: "World Cup", country: "Global", prestige: 100, img: "https://images.unsplash.com/photo-1521412644187-c49fa356ee2a?auto=format&fit=crop&q=80&w=800", color: "from-amber-400/40 to-brand/20", icon: "🏆", stats: "Ultimate_Heritage", fed: "FIFA", heritage: ["Argentina", "France", "Germany"] }
  ];

  const filteredTournaments = TOURNAMENTS_GALAXY.filter(t => {
    if (filterMode === "elite") return t.prestige >= 95;
    if (filterMode === "uefa") return t.fed === "UEFA";
    if (filterMode === "heritage") return t.id === "world-cup";
    return true;
  });

  const PULSE_METRICS = [
    { label: "AVG_GOALS", value: "2.84", trend: "+0.12" },
    { label: "INTENSITY_INDEX", value: "94.2", trend: "STABLE" },
    { label: "UPSET_RATE", value: "14%", trend: "-2%" },
    { label: "HOME_WIN_%", value: "46.2%", trend: "+1.5%" },
    { label: "VAR_IMPACT", value: "0.8", trend: "-0.1" }
  ];

  useEffect(() => {
    if (!leagueId || leagueId === 'world-cup') return;

    const fetchStandings = async () => {
      // Check cache first
      if (cache.current[leagueId] && (Date.now() - (lastFetchTime.current[leagueId] || 0) < REQUEST_COOLDOWN)) {
        setStandings(cache.current[leagueId]);
        return;
      }

      setLoading(true);
      
      try {
        const response = await fetch(`/api/football/standings/${leagueId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.response && data.response[0]?.league?.standings) {
            const newStandings = data.response[0].league.standings[0];
            setStandings(newStandings);
            cache.current[leagueId] = newStandings;
            lastFetchTime.current[leagueId] = Date.now();
            return;
          }
        }
        
        if (cache.current[leagueId]) {
          setStandings(cache.current[leagueId]);
        } else {
          setStandings([]);
        }
      } catch (error) {
        if (cache.current[leagueId]) {
          setStandings(cache.current[leagueId]);
        } else {
          setStandings([]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, [leagueId]);

  if (!leagueId) {
    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
        {/* Tournament Pulse Hub - Telemetry Bar */}
        <div className="relative overflow-hidden bg-slate-950 rounded-3xl p-6 border border-white/5 shadow-2xl group/pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-brand/10 via-transparent to-brand/10 opacity-30" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-8 md:gap-12">
            <div className="flex items-center gap-4 border-r border-white/10 pr-8">
              <Activity className="w-8 h-8 text-brand animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest leading-none">PULSE_UPLINK</span>
                <span className="text-xl font-display font-black text-white italic tracking-tighter uppercase whitespace-nowrap">Global_Metrics</span>
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center gap-12 overflow-x-auto no-scrollbar py-2">
              {PULSE_METRICS.map((metric, idx) => (
                <div key={idx} className="flex flex-col gap-1 min-w-[120px]">
                  <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{metric.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-mono font-bold text-white tabular-nums">{metric.value}</span>
                    <span className={cn(
                      "text-[9px] font-black italic px-1.5 py-0.5 rounded",
                      metric.trend.startsWith('+') ? "bg-emerald-500/20 text-emerald-400" : 
                      metric.trend.startsWith('-') ? "bg-rose-500/20 text-rose-400" : "bg-slate-800 text-slate-400"
                    )}>
                      {metric.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Smart Filtering Terminal */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-100/50 p-3 rounded-[2.5rem] border border-slate-200 backdrop-blur-md">
          <div className="flex items-center gap-2 p-1 bg-white rounded-full shadow-inner border border-slate-200 w-full md:w-auto overflow-x-auto no-scrollbar">
            {[
              { id: "all" as const, label: "All_Tournaments", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
              { id: "elite" as const, label: "Elite_Prestige", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
              { id: "uefa" as const, label: "UEFA_Federation", icon: <Globe className="w-3.5 h-3.5" /> },
              { id: "heritage" as const, label: "World_Heritage", icon: <Trophy className="w-3.5 h-3.5" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterMode(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap",
                  filterMode === tab.id 
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" 
                    : "text-slate-500 hover:bg-slate-100"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 pr-6">
            <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">GALAXY_DENSITY:</span>
            <span className="text-sm font-mono font-bold text-slate-900">{filteredTournaments.length}_NODES</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredTournaments.map((t, i) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -30 }}
                transition={{ duration: 0.6, ease: "circOut" }}
                className="group cursor-pointer"
                onClick={() => {
                  if (t.id === 'world-cup') {
                    window.dispatchEvent(new CustomEvent('nav-world-cup'));
                  } else {
                    setLeagueId(t.id);
                  }
                }}
              >
                <Card className="relative h-[480px] rounded-[3.5rem] overflow-hidden border-slate-200/50 hover:border-brand/50 transition-all duration-700 shadow-2xl hover:shadow-brand/20 group/card bg-slate-900">
                  {/* Cinematic Background Image */}
                  <div className="absolute inset-0 z-0">
                    <img 
                      src={t.img} 
                      alt={t.name} 
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover/card:scale-110 opacity-70 group-hover/card:opacity-100" 
                      referrerPolicy="no-referrer"
                    />
                    <div className={cn("absolute inset-0 bg-gradient-to-t via-slate-950/80 to-transparent mix-blend-multiply", t.color)} />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                  </div>

                  {/* Prestige telemetry HUD */}
                  <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-10">
                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
                      <span className="text-[8px] font-mono font-black text-slate-500 uppercase tracking-widest leading-none">PRESTIGE_INDEX</span>
                      <div className="flex items-center gap-2">
                         <span className="text-xl font-mono font-bold text-white tabular-nums tracking-tighter">{t.prestige}/100</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center text-2xl group-hover/card:rotate-12 transition-transform shadow-2xl">
                      {t.icon}
                    </div>
                  </div>

                  <div className="absolute bottom-10 left-10 right-10 z-10 space-y-6">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-black text-brand uppercase tracking-[0.4em] glow-text">{t.country}</span>
                      <h3 className="text-4xl font-display font-black text-white uppercase tracking-tighter leading-[0.9] group-hover/card:translate-x-2 transition-transform duration-500">
                        {t.name.split(' ').map((word, i) => (
                          <span key={i} className={i === 0 ? "text-white" : "text-brand"}>
                            {word} {i === 0 && <br />}
                          </span>
                        ))}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-white/10">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest leading-none mb-1">TACTICAL_BIAS</span>
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                           <span className="text-xs font-black text-white uppercase tracking-tighter italic">{t.stats}</span>
                        </div>
                      </div>
                      <button className="bg-white text-slate-950 h-14 w-14 rounded-3xl flex items-center justify-center shadow-2xl shadow-brand/40 transition-all duration-500 group-hover/card:bg-brand group-hover/card:text-white group-hover/card:w-28 group-hover/card:gap-3 group">
                         <span className="hidden group-hover/card:block text-[10px] font-black uppercase tracking-widest">Connect</span>
                         <ChevronRight className="w-6 h-6 transition-transform group-hover/card:translate-x-1" />
                      </button>
                    </div>
                  </div>

                  {/* Scanline / Grain Overlay */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none neural-noise" />
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  const currentLeague = TOURNAMENTS_GALAXY.find(t => t.id === leagueId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <button 
             onClick={() => setLeagueId(null)}
             className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white hover:bg-brand transition-all shadow-xl"
           >
             <ChevronLeft className="w-6 h-6" />
           </button>
           <div className="space-y-1">
             <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">
               {currentLeague?.name} <span className="text-brand">Standings</span>
             </h2>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">{currentLeague?.country} • Official_Table_v4.2</p>
           </div>
        </div>
        
        <div className="hidden lg:flex items-center gap-10 bg-slate-950/5 p-6 rounded-[2.5rem] border border-slate-200/50 backdrop-blur-xl">
           <div className="flex flex-col">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black leading-none mb-2">Sync_Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xl font-mono font-bold text-slate-900 tracking-tighter">Live_Uplink</span>
              </div>
           </div>
           <div className="w-px h-10 bg-slate-200" />
           <div className="flex flex-col">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black leading-none mb-2">Competition_Prestige</span>
              <span className="text-xl font-mono font-bold text-brand tracking-tighter">{currentLeague?.prestige}%_Rating</span>
           </div>
        </div>
      </div>

      {/* Champions Heritage Row */}
      <div className="bg-slate-950 rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group/heritage">
        <div className="absolute inset-0 bg-gradient-to-r from-brand/10 via-transparent to-transparent opacity-50" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
          <div className="flex flex-col gap-2 border-r border-white/10 pr-12 min-w-[200px]">
             <Trophy className="w-8 h-8 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
             <div className="flex flex-col">
               <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest leading-none">HERITAGE_ARCHIVE</span>
               <span className="text-xl font-display font-black text-white italic tracking-tighter uppercase whitespace-nowrap">Recent_Winners</span>
             </div>
          </div>

          <div className="flex-1 flex flex-wrap items-center gap-6">
            {currentLeague?.heritage?.map((champion, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.15 }}
                className="flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl group/champ hover:bg-brand/20 hover:border-brand transition-all cursor-default"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover/champ:text-white group-hover/champ:bg-brand transition-all">
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono font-black text-brand uppercase tracking-widest leading-none mb-1">
                    {idx === 0 ? "Reign_Prev" : "Consid_Elite"}
                  </span>
                  <span className="text-sm font-black text-white whitespace-nowrap">{champion}</span>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="hidden xl:flex flex-col items-end gap-1 px-8 opacity-40">
             <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest text-right">METRIC_STABILITY</span>
             <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={cn("w-1 h-3 rounded-full", i < 4 ? "bg-brand" : "bg-slate-700")} />
                ))}
             </div>
          </div>
        </div>
      </div>

      <Card className="glass border-slate-100 rounded-[3rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-950 text-white">
                  <th className="px-8 py-6 text-left text-[11px] font-black uppercase tracking-[0.3em]">Position</th>
                  <th className="px-8 py-6 text-left text-[11px] font-black uppercase tracking-[0.3em]">Team_Entity</th>
                  <th className="px-8 py-6 text-center text-[11px] font-black uppercase tracking-[0.3em]">P</th>
                  <th className="px-8 py-6 text-center text-[11px] font-black uppercase tracking-[0.3em]">W</th>
                  <th className="px-8 py-6 text-center text-[11px] font-black uppercase tracking-[0.3em]">D</th>
                  <th className="px-8 py-6 text-center text-[11px] font-black uppercase tracking-[0.3em]">L</th>
                  <th className="px-8 py-6 text-center text-[11px] font-black uppercase tracking-[0.3em]">GD</th>
                  <th className="px-8 py-6 text-center text-[11px] font-black uppercase tracking-[0.3em]">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {loading ? (
                  Array(12).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="px-8 py-6"><Skeleton className="h-6 w-full rounded-lg bg-slate-50" /></td>
                    </tr>
                  ))
                ) : (
                  standings.map((team: any, idx: number) => (
                    <tr key={team.team?.id || team.rank || idx} className="hover:bg-slate-50/80 transition-all duration-300 group">
                      <td className="px-8 py-6">
                        <span className={cn(
                          "w-10 h-10 flex items-center justify-center rounded-xl font-black font-display text-base transition-all",
                          team.rank <= 4 ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-50 text-slate-500 group-hover:bg-slate-200"
                        )}>
                          {team.rank}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-left">
                        <div 
                          className={cn(
                            "flex items-center gap-5",
                            onTeamClick && "cursor-pointer group-hover:translate-x-2 transition-transform duration-500"
                          )}
                          onClick={() => onTeamClick?.(leagueId || "39", team.team.name)}
                        >
                          <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent" />
                            <img src={team.team.logo} alt={team.team.name} className="w-8 h-8 object-contain relative z-10" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-display font-black text-slate-900 group-hover:text-brand transition-colors text-lg italic tracking-tight">{team.team.name}</span>
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Entity_ID: {team.team.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center font-mono font-bold text-slate-600">{team.all?.played}</td>
                      <td className="px-8 py-6 text-center font-mono font-bold text-slate-600">{team.all?.win}</td>
                      <td className="px-8 py-6 text-center font-mono font-bold text-slate-600">{team.all?.draw}</td>
                      <td className="px-8 py-6 text-center font-mono font-bold text-slate-600">{team.all?.lose}</td>
                      <td className="px-8 py-6 text-center font-mono font-bold text-emerald-600">{team.goalsDiff > 0 ? `+${team.goalsDiff}` : team.goalsDiff}</td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-2xl font-display font-black text-slate-950 tabular-nums tracking-tighter drop-shadow-sm">{team.points}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const BasketballRankings = ({ onTeamClick }: { onTeamClick?: (teamName?: string) => void }) => {
  const [standings, setStandings] = useState<any[]>([]);
  const [leagueId, setLeagueId] = useState<string | null>(null); // null means gallery
  const [loading, setLoading] = useState(false);
  const cache = useRef<Record<string, any[]>>({});
  const lastFetchTime = useRef<Record<string, number>>({});
  const REQUEST_COOLDOWN = 60000;

  const BASKETBALL_GALAXY = [
    { id: "12", name: "NBA", country: "USA", prestige: 100, img: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=800", color: "from-blue-600/40 to-red-600/20", icon: "🏀", stats: "High_Volume_Scoring", heritage: ["Denver Nuggets", "Golden State Warriors", "Milwaukee Bucks"] },
    { id: "2", name: "Euroleague", country: "Europe", prestige: 92, img: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=800", color: "from-amber-600/40 to-blue-900/20", icon: "🇪🇺", stats: "Tactical_Execution", heritage: ["Real Madrid", "Anadolu Efes", "CSKA Moscow"] },
    { id: "117", name: "ACB", country: "Spain", prestige: 88, img: "https://images.unsplash.com/photo-1519760791238-0744c8034be9?auto=format&fit=crop&q=80&w=800", color: "from-red-600/40 to-orange-500/20", icon: "🇪🇸", stats: "European_Elite", heritage: ["Real Madrid", "Barcelona", "Baskonia"] }
  ];

  const HOOPS_PULSE = [
    { label: "LEAGUE_AVG_PPG", value: "114.2", trend: "+2.4" },
    { label: "PACE_FACTOR", value: "99.8", trend: "STABLE" },
    { label: "EFFICIENCY_INDEX", value: "1.12", trend: "+0.04" },
    { label: "3PT_VOLUME", value: "34.1%", trend: "+1.2%" }
  ];

  useEffect(() => {
    if (!leagueId) return;

    const fetchStandings = async () => {
      if (cache.current[leagueId] && (Date.now() - (lastFetchTime.current[leagueId] || 0) < REQUEST_COOLDOWN)) {
        setStandings(cache.current[leagueId]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/basketball/standings/${leagueId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.response && Array.isArray(data.response)) {
            const sorted = [...data.response].sort((a, b) => (a.position || 0) - (b.position || 0));
            setStandings(sorted);
            cache.current[leagueId] = sorted;
            lastFetchTime.current[leagueId] = Date.now();
            return;
          }
        }
        setStandings([]);
      } catch (error) {
        setStandings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, [leagueId]);

  if (!leagueId) {
    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
        {/* Hoops Pulse Hub */}
        <div className="relative overflow-hidden bg-orange-950 rounded-3xl p-6 border border-orange-500/10 shadow-2xl group/pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-orange-500/10 opacity-30" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-8 md:gap-12">
            <div className="flex items-center gap-4 border-r border-white/10 pr-8">
              <Zap className="w-8 h-8 text-orange-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono font-black text-orange-500/60 uppercase tracking-widest leading-none">COURT_FEED_v2.0</span>
                <span className="text-xl font-display font-black text-white italic tracking-tighter uppercase whitespace-nowrap">Hardwood_Pulse</span>
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center gap-12 overflow-x-auto no-scrollbar py-2">
              {HOOPS_PULSE.map((metric, idx) => (
                <div key={idx} className="flex flex-col gap-1 min-w-[120px]">
                  <span className="text-[9px] font-mono font-black text-orange-200/40 uppercase tracking-widest whitespace-nowrap">{metric.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-mono font-bold text-white tabular-nums">{metric.value}</span>
                    <span className="text-[9px] font-black italic px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                      {metric.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {BASKETBALL_GALAXY.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: "easeOut" }}
              className="group cursor-pointer"
              onClick={() => setLeagueId(t.id)}
            >
              <Card className="relative h-[480px] rounded-[3.5rem] overflow-hidden border-orange-200/20 hover:border-orange-500/50 transition-all duration-700 shadow-2xl hover:shadow-orange-500/20 group/card bg-slate-900">
                <div className="absolute inset-0 z-0">
                  <img src={t.img} alt={t.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover/card:scale-110 opacity-70 group-hover/card:opacity-100" referrerPolicy="no-referrer" />
                  <div className={cn("absolute inset-0 bg-gradient-to-t via-slate-950/80 to-transparent mix-blend-multiply", t.color)} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                </div>

                <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-10">
                  <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
                    <span className="text-[8px] font-mono font-black text-orange-400/60 uppercase tracking-widest leading-none">COMPETITION_TIER</span>
                    <div className="flex items-center gap-2">
                       <span className="text-xl font-mono font-bold text-white tabular-nums tracking-tighter">{t.prestige}/100</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center text-2xl group-hover/card:rotate-12 transition-transform shadow-2xl">
                    {t.icon}
                  </div>
                </div>

                <div className="absolute bottom-10 left-10 right-10 z-10 space-y-6">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-black text-orange-500 uppercase tracking-[0.4em]">REGIONAL_DIV: {t.country}</span>
                    <h3 className="text-4xl font-display font-black text-white uppercase tracking-tighter leading-[0.9] group-hover/card:translate-x-2 transition-transform duration-500">
                      {t.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-white/10">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest leading-none mb-1">STRATEGIC_BIAS</span>
                      <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                         <span className="text-xs font-black text-white uppercase tracking-tighter italic">{t.stats}</span>
                      </div>
                    </div>
                    <button className="bg-white text-slate-950 h-14 w-14 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/40 transition-all duration-500 group-hover/card:bg-orange-600 group-hover/card:text-white group-hover/card:w-28 group-hover/card:gap-3 group">
                       <span className="hidden group-hover/card:block text-[10px] font-black uppercase tracking-widest">Connect</span>
                       <ChevronRight className="w-6 h-6 transition-transform group-hover/card:translate-x-1" />
                    </button>
                  </div>
                </div>
                <div className="absolute inset-0 opacity-10 pointer-events-none neural-noise" />
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  const currentLeague = BASKETBALL_GALAXY.find(t => t.id === leagueId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <button 
             onClick={() => setLeagueId(null)}
             className="w-12 h-12 rounded-2xl bg-orange-600 border border-orange-500 flex items-center justify-center text-white hover:bg-orange-700 transition-all shadow-xl"
           >
             <ChevronLeft className="w-6 h-6" />
           </button>
           <div className="space-y-1">
             <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">
               {currentLeague?.name} <span className="text-orange-600">Standings</span>
             </h2>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">{currentLeague?.country} • Official_Table_v2.0</p>
           </div>
        </div>
        
        <div className="hidden lg:flex items-center gap-10 bg-orange-950 p-6 rounded-[2.5rem] border border-orange-500/20 backdrop-blur-xl">
           <div className="flex flex-col text-white">
              <span className="text-[10px] font-mono text-orange-200/40 uppercase tracking-widest font-black leading-none mb-2">Sync_Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xl font-mono font-bold tracking-tighter">Live_Telemetry</span>
              </div>
           </div>
           <div className="w-px h-10 bg-orange-500/20" />
           <div className="flex flex-col text-white">
              <span className="text-[10px] font-mono text-orange-200/40 uppercase tracking-widest font-black leading-none mb-2">Court_Prestige</span>
              <span className="text-xl font-mono font-bold text-orange-400 tracking-tighter">{currentLeague?.prestige}%_Rating</span>
           </div>
        </div>
      </div>

      {/* Champions Heritage Row */}
      <div className="bg-orange-950 rounded-[2.5rem] p-8 border border-orange-500/10 relative overflow-hidden group/heritage">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-transparent opacity-50" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
          <div className="flex flex-col gap-2 border-r border-orange-500/20 pr-12 min-w-[200px]">
             <Trophy className="w-8 h-8 text-orange-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
             <div className="flex flex-col">
               <span className="text-[10px] font-mono font-black text-orange-200/40 uppercase tracking-widest leading-none">LEGACY_DECRYPT</span>
               <span className="text-xl font-display font-black text-white italic tracking-tighter uppercase whitespace-nowrap">Past_Titleists</span>
             </div>
          </div>

          <div className="flex-1 flex flex-wrap items-center gap-6">
            {currentLeague?.heritage?.map((champion, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.15 }}
                className="flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl group/champ hover:bg-orange-500/20 hover:border-orange-500 transition-all cursor-default"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover/champ:text-white group-hover/champ:bg-orange-500 transition-all">
                  🏆
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono font-black text-orange-400 uppercase tracking-widest leading-none mb-1">
                    Season_Prev
                  </span>
                  <span className="text-sm font-black text-white whitespace-nowrap">{champion}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <Card className="glass border-orange-100 rounded-[3rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-orange-600 text-white">
                  <th className="px-8 py-6 text-left text-[11px] font-black uppercase tracking-[0.3em]">Seed</th>
                  <th className="px-8 py-6 text-left text-[11px] font-black uppercase tracking-[0.3em]">Franchise</th>
                  <th className="px-8 py-6 text-center text-[11px] font-black uppercase tracking-[0.3em]">W</th>
                  <th className="px-8 py-6 text-center text-[11px] font-black uppercase tracking-[0.3em]">L</th>
                  <th className="px-8 py-6 text-center text-[11px] font-black uppercase tracking-[0.3em]">Win_%</th>
                  <th className="px-8 py-6 text-center text-[11px] font-black uppercase tracking-[0.3em]">Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {loading ? (
                  Array(12).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-8 py-6"><Skeleton className="h-6 w-full rounded-lg bg-orange-50" /></td>
                    </tr>
                  ))
                ) : (
                  standings.map((entity: any, idx: number) => (
                    <tr key={idx} className="hover:bg-orange-50 transition-all duration-300 group">
                      <td className="px-8 py-6">
                        <span className={cn(
                          "w-10 h-10 flex items-center justify-center rounded-xl font-black font-display text-base transition-all",
                          (entity.position || idx + 1) <= 8 ? "bg-orange-600 text-white shadow-lg shadow-orange-500/20" : "bg-slate-50 text-slate-500 group-hover:bg-slate-200"
                        )}>
                          {entity.position || idx + 1}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-left">
                        <div 
                          className="flex items-center gap-5 cursor-pointer group-hover:translate-x-2 transition-transform duration-500"
                          onClick={() => onTeamClick?.(entity.team?.name)}
                        >
                          <img src={entity.team?.logo} className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
                          <div className="flex flex-col">
                            <span className="font-display font-black text-slate-900 group-hover:text-orange-600 transition-colors text-lg italic tracking-tight">{entity.team?.name}</span>
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">{entity.group?.name || "Global_Conference"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center font-mono font-bold text-slate-600">{entity.games?.win?.total || entity.wins}</td>
                      <td className="px-8 py-6 text-center font-mono font-bold text-slate-600">{entity.games?.lose?.total || entity.loss}</td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-xl font-display font-black text-slate-950 tabular-nums">
                          {entity.games?.win?.percentage ? (entity.games.win.percentage * 100).toFixed(1) : (entity.win_pct || 0)}%
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex justify-center gap-1">
                          {(entity.form || "---").split('').map((f: string, i: number) => (
                            <div key={i} className={cn(
                              "w-2 h-2 rounded-full",
                              f === 'W' ? "bg-emerald-500" : f === 'L' ? "bg-rose-500" : "bg-slate-300"
                            )} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const HockeyRankings = ({ onTeamClick }: { onTeamClick?: (teamName?: string) => void }) => {
  const [standings, setStandings] = useState<any[]>([]);
  const [tournamentId, setTournamentId] = useState("234"); // NHL
  const [loading, setLoading] = useState(false);
  const cache = useRef<Record<string, any[]>>({});

  useEffect(() => {
    const fetchStandings = async () => {
      if (cache.current[tournamentId]) {
        setStandings(cache.current[tournamentId]);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`/api/hockey/standings/${tournamentId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.standings?.[0]?.rows) {
            setStandings(data.standings[0].rows);
            cache.current[tournamentId] = data.standings[0].rows;
          }
        }
      } catch (e) {} finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, [tournamentId]);

  const tournaments = [
    { id: "234", name: "NHL" },
    { id: "123", name: "KHL" },
    { id: "216", name: "DEL" },
    { id: "122", name: "SHL" }
  ];

  return (
    <div className="space-y-8 text-slate-900">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Ice Hockey Tables</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Hockey Standings</p>
        </div>
        <div className="flex flex-wrap gap-2 bg-blue-50 p-1.5 rounded-2xl border border-blue-100">
          {tournaments.map((t) => (
            <button
              key={t.id}
              onClick={() => setTournamentId(t.id)}
              className={cn(
                "px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                tournamentId === t.id ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-blue-400 hover:text-blue-600 hover:bg-white"
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <Card className="glass border-sky-100 rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Pos</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Team</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest">GP</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest">W</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest">L</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest">OTL</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest">DIFF</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array(10).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={8} className="px-6 py-4"><Skeleton className="h-4 w-full" /></td></tr>
                  ))
                ) : (
                  standings.map((row: any, idx: number) => (
                    <tr key={row.team?.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="w-8 h-8 flex items-center justify-center rounded-lg font-black font-display text-sm bg-slate-50 text-slate-400">
                          {row.position || idx + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div 
                          className="flex items-center gap-3 cursor-pointer group-hover:text-blue-600 transition-colors"
                          onClick={() => onTeamClick?.(row.team?.name)}
                        >
                          <div className="w-6 h-6 bg-slate-50 rounded p-1 flex items-center justify-center">
                            <img src={`https://www.sofascore.com/api/v1/team/${row.team?.id}/image`} alt={row.team?.name} className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                          </div>
                          <span className="font-bold text-slate-900 group-hover:text-blue-600">{row.team?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-600">{row.matches}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-600">{row.wins}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-600">{row.losses}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-600">{row.overtimeLosses}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-600">{row.scoresFor - row.scoresAgainst}</td>
                      <td className="px-6 py-4 text-center font-black text-slate-900 tabular-nums">{row.points}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const CricketRankings = ({ onPlayerClick }: { onPlayerClick?: (name: string) => void }) => {
  const [rankings, setRankings] = useState<any[]>([]);
  const [type, setType] = useState("1"); // 1: Test, 2: ODI, 3: T20
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/cricket/rankings/${type}`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
           throw new Error("Received non-JSON response from server.");
        }

        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          setRankings(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch cricket rankings:", error);
        setRankings([]); // Clear on error
      } finally {
        setLoading(false);
      }
    };
    fetchRankings();
  }, [type]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">ICC Player Rankings</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Official World Standings</p>
        </div>
        <div className="flex gap-2 bg-sky-50 p-1.5 rounded-2xl border border-sky-100">
          {[
            { id: "1", label: "Test" },
            { id: "2", label: "ODI" },
            { id: "3", label: "T20" }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                type === t.id ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-slate-400 hover:text-slate-600 hover:bg-white"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="glass rounded-[2rem] p-8 h-48 animate-pulse" />
          ))
        ) : rankings.length > 0 ? (
          rankings.map((player: any, idx: number) => (
            <motion.div
              key={player.id || player.name || idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass border-sky-100 rounded-[2rem] p-8 relative overflow-hidden group hover:shadow-2xl hover:shadow-brand/5 transition-all duration-500"
            >
              <div className="absolute top-0 right-0 p-6">
                <span className="text-5xl font-black text-slate-50 group-hover:text-brand/5 transition-colors">#{player.rank}</span>
              </div>
              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center border border-brand/20 group-hover:rotate-6 transition-transform">
                    <Users className="w-7 h-7 text-brand" />
                  </div>
                  <div 
                    onClick={() => onPlayerClick?.(player.player_name)}
                    className={cn(
                      "cursor-pointer group-hover:translate-x-1 transition-transform",
                      onPlayerClick && "hover:text-brand"
                    )}
                  >
                    <h4 className="font-black text-slate-900 text-lg leading-tight tracking-tight group-hover:text-brand">{player.player_name}</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{player.team_name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-slate-100/50">
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Rating</p>
                    <p className="font-display font-black text-2xl text-slate-900">{player.rating}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Points</p>
                    <p className="font-display font-black text-2xl text-slate-900">{player.points || "-"}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center glass rounded-[2rem] border-dashed border-2 border-slate-100">
            <Users className="w-12 h-12 text-slate-100 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No ranking data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hubActive, setHubActive] = useState(false);
  
  const handleMapMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  useEffect(() => {
    const handleNavWorldCup = () => {
      setSelectedSport("football");
      setSelectedLeague("World Cup");
      setActiveMainTab("matches");
    };
    window.addEventListener('nav-world-cup', handleNavWorldCup);
    return () => window.removeEventListener('nav-world-cup', handleNavWorldCup);
  }, []);

  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [selectedSport, setSelectedSport] = useState<Match["sport"] | "all">("all");
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [socialEvents, setSocialEvents] = useState<SocialEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [userPredictions, setUserPredictions] = useState<PredictionRecord[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: "", bio: "", photoURL: "" });
  const [myPrediction, setMyPrediction] = useState("");
  const [activeTab, setActiveTab] = useState("commentary");
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [matchSearchQuery, setMatchSearchQuery] = useState("");
  const [playerSearchResults, setPlayerSearchResults] = useState<any[]>([]);
  const [activeMainTab, setActiveMainTab] = useState("matches");
  const [searchingPlayers, setSearchingPlayers] = useState(false);
  const [usingAiSearch, setUsingAiSearch] = useState(false);
  const [footballMatchDetail, setFootballMatchDetail] = useState<any>(null);
  const [loadingMatchDetail, setLoadingMatchDetail] = useState(false);
  const [expertPredictions, setExpertPredictions] = useState<any[]>([]);
  const [worldCupSubTab, setWorldCupSubTab] = useState<"hub" | "bracket">("hub");
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchFavorites(user).then(setFavorites);
    } else {
      setFavorites([]);
    }
  }, [user]);

  const refreshFavorites = () => {
    if (user) {
      fetchFavorites(user).then(setFavorites);
    }
  };
  
  const processedEvents = useRef<Set<string>>(new Set());
  const requestQueue = useRef<(() => Promise<void>)[]>([]);
  const isProcessingQueue = useRef(false);
  const lastRequestTime = useRef(0);
  const MIN_REQUEST_GAP = 15000; // 15 seconds between requests (4 RPM)
  const [isAiThrottled, setIsAiThrottled] = useState(false);
  const throttleTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchExpertPredictions = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/football/predictions?iso_date=${today}`);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (data.allProvidersFailed) {
              console.log("Expert Predictions API is rate-limited, restricted, or unavailable. Dashboard will rely on AI Analysis.");
              return;
            }
            if (data.data && Array.isArray(data.data)) {
              setExpertPredictions(data.data);
            }
          } else {
            console.warn("Expert Predictions API returned non-JSON response");
          }
        } else {
          try {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const errorData = await res.json();
              console.warn(`Expert Predictions API returned non-OK status (${res.status}):`, errorData.error || "Unknown Error");
            } else {
              console.warn(`Expert Predictions API returned non-OK status (${res.status}) with non-JSON body`);
            }
          } catch (e) {
            console.warn(`Expert Predictions API returned non-OK status (${res.status})`);
          }
        }
      } catch (err) {
        console.error("Network Error fetching predictions:", err instanceof Error ? err.message : err);
      }
    };
    fetchExpertPredictions();
  }, []);

  // Auto-select first match when sport/league changes or when matches update and current selection is invalid
  useEffect(() => {
    if (matches.length > 0) {
      const currentMatch = matches.find(m => m.id === selectedMatchId);
      
      const isSportMatch = selectedSport === "all" || (currentMatch && currentMatch.sport === selectedSport);
      const isLeagueMatch = selectedLeague === "all" || 
        (currentMatch && currentMatch.league && (
          currentMatch.league.toLowerCase().includes(selectedLeague.toLowerCase()) || 
          selectedLeague.toLowerCase().includes(currentMatch.league.toLowerCase())
        ));

      if (!currentMatch || !isSportMatch || !isLeagueMatch) {
        const filtered = matches.filter(m => 
          (selectedSport === "all" || m.sport === selectedSport) && 
          (selectedLeague === "all" || (m.league && (
            m.league.toLowerCase().includes(selectedLeague.toLowerCase()) || 
            selectedLeague.toLowerCase().includes(m.league.toLowerCase())
          )))
        );
        
        if (filtered.length > 0) {
          const live = filtered.find(m => m.status === 'live');
          setSelectedMatchId(live ? live.id : filtered[0].id);
        } else {
          setSelectedMatchId(null);
        }
      }
    } else {
      setSelectedMatchId(null);
    }
  }, [selectedSport, selectedLeague, matches, selectedMatchId]);

  const formatScore = (match: Match, side: 'home' | 'away') => {
    let score = side === 'home' ? match.homeScore : match.awayScore;
    const detail = side === 'home' ? match.homeScoreDetail : match.awayScoreDetail;
    
    if (match.sport === 'cricket') {
      let scoreStr = String(score);
      
      // If score is just a number (e.g. "159"), check if detail has the real score (e.g. "159/7")
      if (!scoreStr.includes('/') && detail) {
        const detailScoreMatch = detail.match(/(\d+\/\d+)/);
        if (detailScoreMatch) {
          scoreStr = detailScoreMatch[1];
        }
      }
      
      // Final formatting
      if (scoreStr.includes('/')) {
        return scoreStr;
      }
      // If it's just a number or empty, append /0
      if (!scoreStr || !isNaN(Number(scoreStr))) {
        return `${scoreStr || '0'}/0`;
      }
      return scoreStr;
    }
    return score;
  };

  const filterMatches = (matchList: Match[], status?: Match["status"], excludeSports: string[] = []) => {
    return matchList.filter(m => {
      const sportMatch = selectedSport === "all" 
        ? !excludeSports.includes(m.sport)
        : m.sport === selectedSport;
      
      // Flexible league matching
      const leagueMatch = selectedLeague === "all" || 
        (m.league && (
          m.league.toLowerCase().includes(selectedLeague.toLowerCase()) || 
          selectedLeague.toLowerCase().includes(m.league.toLowerCase())
        ));

      const statusMatch = !status || m.status === status;

      // Keyword Search
      const searchMatch = !matchSearchQuery || 
        m.homeTeam.toLowerCase().includes(matchSearchQuery.toLowerCase()) ||
        m.awayTeam.toLowerCase().includes(matchSearchQuery.toLowerCase()) ||
        (m.league && m.league.toLowerCase().includes(matchSearchQuery.toLowerCase()));

      return sportMatch && leagueMatch && statusMatch && searchMatch;
    });
  };

  const filteredSocialEvents = socialEvents.filter(event => {
    if (selectedSport === "all" && selectedLeague === "all") return true;
    
    const match = matches.find(m => m.id === event.matchId);
    if (!match) return false;

    const sportMatch = selectedSport === "all" || match.sport === selectedSport;
    const leagueMatch = selectedLeague === "all" || 
      (match.league && (
        match.league.toLowerCase().includes(selectedLeague.toLowerCase()) || 
        selectedLeague.toLowerCase().includes(match.league.toLowerCase())
      ));

    return sportMatch && leagueMatch;
  });

  const isRateLimitError = (error: any) => {
    const errorStr = typeof error === 'string' ? error : JSON.stringify(error);
    return errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("quota");
  };

  const processQueue = async () => {
    if (isProcessingQueue.current || requestQueue.current.length === 0 || isAiThrottled) return;
    isProcessingQueue.current = true;

    while (requestQueue.current.length > 0 && !isAiThrottled) {
      const now = Date.now();
      const timeSinceLast = now - lastRequestTime.current;
      if (timeSinceLast < MIN_REQUEST_GAP) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_GAP - timeSinceLast));
      }

      const task = requestQueue.current[0];
      if (task) {
        try {
          await task();
          requestQueue.current.shift();
          lastRequestTime.current = Date.now();
        } catch (error: any) {
          if (isRateLimitError(error)) {
            console.warn("Rate limit hit, triggering circuit breaker for 2 minutes");
            setIsAiThrottled(true);
            if (throttleTimer.current) clearTimeout(throttleTimer.current);
            throttleTimer.current = setTimeout(() => setIsAiThrottled(false), 120000);
            
            // Clear queue on rate limit to prevent backlog
            requestQueue.current = [];
            break;
          } else {
            console.error("Task failed, discarding:", error);
            requestQueue.current.shift();
          }
        }
      }
    }

    isProcessingQueue.current = false;
  };

  const addToQueue = (task: () => Promise<void>) => {
    if (isAiThrottled) return;
    
    // Limit queue size to prevent massive backlogs
    if (requestQueue.current.length >= 3) {
      requestQueue.current.shift(); // Drop oldest
    }
    
    requestQueue.current.push(task);
    processQueue();
  };

  const generateCommentary = async (match: Match, event: MatchEvent) => {
    if (processedEvents.current.has(event.id) || !enabledMatchesRef.current.has(match.id)) return;
    processedEvents.current.add(event.id);

    addToQueue(async () => {
      try {
        const prompt = `You are a professional sports commentator. 
        Match: ${match.homeTeam} vs ${match.awayTeam} (${match.sport})
        Current Score: ${match.homeScore} - ${match.awayScore}
        Event: ${event.description} at ${event.time}
        
        Write a short, exciting, one-sentence commentary for this event. Keep it under 20 words.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
        });

        const commentary = response.text.trim();
        
        setMatches(prev => prev.map(m => {
          if (m.id === match.id) {
            return {
              ...m,
              events: m.events.map(e => e.id === event.id ? { ...e, aiCommentary: commentary } : e)
            };
          }
          return m;
        }));
      } catch (error: any) {
        console.error("Gemini Commentary Error:", error);
        if (isRateLimitError(error)) throw error;
      }
    });
  };

  useEffect(() => {
    // Global Navigation Listeners
    const handleNavWorldCup = () => {
      setSelectedLeague("World Cup");
      setActiveMainTab("matches");
      setWorldCupSubTab("hub");
    };
    window.addEventListener('nav-world-cup', handleNavWorldCup);

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        // Sync user to Firestore and listen for profile changes
        const userRef = doc(db, "users", currentUser.uid);
        setDoc(userRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          points: 0,
          notificationSettings: {
            goals: true,
            cards: true,
            matchStart: true,
            matchEnd: true
          },
          role: "user"
        }, { merge: true });

        const unsubProfile = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            const profile = doc.data() as UserProfile;
            setUserProfile(profile);
            setProfileForm({
              displayName: profile.displayName || "",
              bio: profile.bio || "",
              photoURL: profile.photoURL || ""
            });
          }
        });
        return () => unsubProfile();
      } else {
        setUserProfile(null);
      }
    });

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    // Real-time matches from Firestore
    let unsubscribeMatches = () => {};
    try {
      const q = query(collection(db, "matches"));
      unsubscribeMatches = onSnapshot(q, (snapshot) => {
        const matchesData = snapshot.docs.map(doc => doc.data() as Match & { prediction?: string });
        
        if (matchesData.length > 0) {
          // Update predictions state from Firestore data
          const newPredictions: Record<string, string> = {};
          matchesData.forEach(m => {
            if (m.prediction) newPredictions[m.id] = m.prediction;
          });
          setPredictions(prev => ({ ...prev, ...newPredictions }));

          setMatches(prev => {
            // Merge logic: prefer Firestore for scores, but keep local AI commentary if it's newer
            return matchesData.map(newM => {
              const oldM = prev.find(m => m.id === newM.id);
              if (!oldM) return newM;
              
              return {
                ...newM,
                events: newM.events.map(newE => {
                  const oldE = oldM.events.find(e => e.id === newE.id);
                  const isFallback = (c?: string) => !c || c.includes("!");
                  return oldE?.aiCommentary && isFallback(newE.aiCommentary) ? { ...newE, aiCommentary: oldE.aiCommentary } : newE;
                })
              };
            });
          });
          if (!selectedMatchId) setSelectedMatchId(matchesData[0].id);
          setLoading(false);
        }
      }, (error) => {
        console.error("Firestore Matches Error:", error);
        // Fallback to API if Firestore fails
        fetch("/api/matches")
          .then((res) => {
            if (!res.ok) throw new Error(`Matches API fetch failed: ${res.status}`);
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) throw new Error("Matches API returned non-JSON response");
            return res.json();
          })
          .then((data) => {
            if (Array.isArray(data)) {
              setMatches(data);
              if (data.length > 0 && !selectedMatchId) setSelectedMatchId(data[0].id);
            }
            setLoading(false);
          })
          .catch((err) => {
             console.error("Fallback API fetch failed:", err);
             setLoading(false);
          });
      });
    } catch (error) {
      console.error("Firestore Initialization Error:", error);
      setLoading(false);
    }

    // Initial fetch from API as a secondary fallback/speedup
    fetch("/api/matches")
      .then((res) => {
        if (!res.ok) throw new Error(`Initial matches API fetch failed: ${res.status}`);
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) throw new Error("Initial matches API returned non-JSON response");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setMatches(prev => prev.length === 0 ? data : prev);
          if (data.length > 0 && !selectedMatchId) setSelectedMatchId(data[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Initial API speedup fetch failed:", err);
        setLoading(false);
      });

    socket.on("matchUpdate", (updatedMatch: Match) => {
      // Socket still used for immediate UI feedback before Firestore syncs
      setMatches((prev) => {
        const existing = prev.find(m => m.id === updatedMatch.id);
        const newEvents = updatedMatch.events.filter(e => !existing?.events.some(ee => ee.id === e.id));
        
        // Alert logic for favorites
        if (userProfile?.favorites?.includes(updatedMatch.id) && newEvents.length > 0) {
          newEvents.forEach(event => {
            const settings = userProfile.notificationSettings;
            const type = event.type.toLowerCase();
            const shouldAlert = 
              (settings.goals && type.includes("goal")) ||
              (settings.cards && type.includes("card")) ||
              (settings.matchStart && type.includes("start")) ||
              (settings.matchEnd && type.includes("finish"));

            if (shouldAlert) {
              const alertMsg = `${updatedMatch.homeTeam} vs ${updatedMatch.awayTeam}: ${event.description}`;
              setNotifications(prev => [alertMsg, ...prev].slice(0, 5));
              
              // Auto-remove notification after 5 seconds
              setTimeout(() => {
                setNotifications(prev => prev.filter(n => n !== alertMsg));
              }, 5000);
            }
          });
        }

        if (enabledMatchesRef.current.has(updatedMatch.id)) {
          newEvents.forEach(e => generateCommentary(updatedMatch, e));
        }

        return prev.map((m) => (m.id === updatedMatch.id ? {
          ...updatedMatch,
          events: updatedMatch.events.map(e => {
            const oldEvent = existing?.events.find(ee => ee.id === e.id);
            const isFallback = (c?: string) => !c || c.includes("!");
            return oldEvent?.aiCommentary && isFallback(e.aiCommentary) ? { ...e, aiCommentary: oldEvent.aiCommentary } : e;
          })
        } : m));
      });
    });

    // Social Feed Listener
    const socialQ = query(collection(db, "social_events"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribeSocial = onSnapshot(socialQ, (snapshot) => {
      setSocialEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialEvent)));
    });

    // Leaderboard Listener
    const leaderboardQ = query(collection(db, "users"), orderBy("points", "desc"), limit(10));
    const unsubscribeLeaderboard = onSnapshot(leaderboardQ, (snapshot) => {
      setLeaderboard(snapshot.docs.map(doc => doc.data() as UserProfile));
    });

    return () => {
      unsubscribeAuth();
      unsubscribeMatches();
      unsubscribeSocial();
      unsubscribeLeaderboard();
      socket.off("matchUpdate");
      window.removeEventListener('nav-world-cup', handleNavWorldCup);
    };
  }, []);

  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => signOut(auth);

  const searchPlayers = async (queryStr: string) => {
    if (!queryStr) return;
    setSearchingPlayers(true);
    setUsingAiSearch(false);
    setActiveMainTab("player-search");
    try {
      const res = await fetch(`/api/football/players/search?search=${encodeURIComponent(queryStr)}`);
      const contentType = res.headers.get("content-type");
      
      let backendData: any = null;
      if (res.ok && contentType && contentType.includes("application/json")) {
        backendData = await res.json();
      }

      // If backend explicitly says all providers failed, or we got a bad response
      if (!backendData || backendData.allProvidersFailed || !Array.isArray(backendData.data) || backendData.data.length === 0) {
        console.warn("Backend player search failed or returned no results. Triggering AI Fallback...");
        setUsingAiSearch(true);
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Search for professional football players matching the query: "${queryStr}". Provide a list of up to 10 players.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  player_name: { type: Type.STRING },
                  player_image: { type: Type.STRING, description: "Use a placeholder or known player image URL if possible, otherwise leave empty." },
                  player_position: { type: Type.STRING },
                  player_age: { type: Type.STRING },
                  player_number: { type: Type.STRING },
                  player_country: { type: Type.STRING },
                  player_rating: { type: Type.STRING, description: "A plausible skill rating from 1 to 10." }
                },
                required: ["id", "player_name", "player_position", "player_age", "player_country", "player_rating"]
              }
            }
          }
        });

        if (response.text) {
          const aiResult = JSON.parse(response.text.trim()).map((p: any) => ({
            ...p,
            // Guaranteed visibility: If AI didn't provide a URL, use a high-quality initials avatar
            player_image: p.player_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.player_name)}&background=random&color=fff&size=512`
          }));
          setPlayerSearchResults(aiResult);
          return;
        }
      }

      if (backendData && backendData.data && Array.isArray(backendData.data)) {
        const enriched = backendData.data.map((p: any) => ({
          ...p,
          player_image: p.player_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.player_name || "Football+Player")}&background=random&color=fff&size=512`
        }));
        setPlayerSearchResults(enriched);
      } else {
        setPlayerSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      // Last resort AI attempt if the fetch itself failed
      try {
        setUsingAiSearch(true);
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Search for professional football players matching the query: "${queryStr}".`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  player_name: { type: Type.STRING },
                  player_position: { type: Type.STRING },
                  player_age: { type: Type.STRING },
                  player_country: { type: Type.STRING },
                  player_rating: { type: Type.STRING }
                }
              }
            }
          }
        });
        if (response.text) {
          setPlayerSearchResults(JSON.parse(response.text.trim()));
        }
      } catch (aiError) {
        console.error("AI Fallback also failed:", aiError);
      }
    } finally {
      setSearchingPlayers(false);
    }
  };

  useEffect(() => {
    if (selectedMatchId && matches.find(m => m.id === selectedMatchId)?.sport === "football") {
      const fetchDetail = async () => {
        setLoadingMatchDetail(true);
        try {
          const res = await fetch(`/api/football/match/${selectedMatchId}`);
          if (!res.ok) {
            throw new Error(`Match detail fetch failed: ${res.status}`);
          }
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (data.data) {
              setFootballMatchDetail(data.data);
              return;
            }
          }
          
          // Match detail data missing or incorrect format - trigger fallback
          console.warn(`[API] Match ${selectedMatchId} returned invalid or missing data. Using AI fallback.`);
            // AI Fallback for match metadata
            const match = matches.find(m => m.id === selectedMatchId);
            if (match) {
              const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: `Identify the likely venue, referee and tournament round for this football match: ${match.homeTeam} vs ${match.awayTeam} in ${match.league}.`,
                config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      venue: { type: Type.STRING },
                      referee: { type: Type.STRING },
                      league_round: { type: Type.STRING }
                    }
                  }
                }
              });
              if (response.text) {
                setFootballMatchDetail(JSON.parse(response.text.trim()));
              }
            }
          } catch (error) {
          console.error("Match detail error:", error);
          // AI Fallback on network/parse error too
          try {
            const match = matches.find(m => m.id === selectedMatchId);
            if (match) {
              const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: `Provide plausible venue and referee for ${match.homeTeam} vs ${match.awayTeam}.`,
                config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      venue: { type: Type.STRING },
                      referee: { type: Type.STRING }
                    }
                  }
                }
              });
              if (response.text) {
                setFootballMatchDetail(JSON.parse(response.text.trim()));
              }
            }
          } catch (aiErr) {
            console.error("Match detail AI fallback failed:", aiErr);
          }
        } finally {
          setLoadingMatchDetail(false);
        }
      };
      fetchDetail();
    } else {
      setFootballMatchDetail(null);
    }
  }, [selectedMatchId, matches]);

  useEffect(() => {
    if (!selectedMatchId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "matches", selectedMatchId, "messages"),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(msgs.reverse());
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `matches/${selectedMatchId}/messages`);
    });

    return () => unsubscribe();
  }, [selectedMatchId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedMatchId || !newMessage.trim()) return;

    try {
      const msgData = {
        matchId: selectedMatchId,
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        userPhoto: user.photoURL || "",
        text: newMessage,
        timestamp: Date.now()
      };
      await addDoc(collection(db, "matches", selectedMatchId, "messages"), msgData);
      
      // Also post to global social feed
      await addDoc(collection(db, "social_events"), {
        type: "chat_message",
        matchId: selectedMatchId,
        matchName: selectedMatch?.homeTeam + " vs " + selectedMatch?.awayTeam,
        content: newMessage,
        userName: user.displayName || "Anonymous",
        userPhoto: user.photoURL || "",
        timestamp: Date.now()
      });

      setNewMessage("");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `matches/${selectedMatchId}/messages`);
    }
  };

  const toggleFavorite = async (matchId: string) => {
    if (!user) {
      login();
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const isFavorite = userProfile?.favorites?.includes(matchId);

    try {
      await updateDoc(userRef, {
        favorites: isFavorite ? arrayRemove(matchId) : arrayUnion(matchId)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: profileForm.displayName,
        bio: profileForm.bio,
        photoURL: profileForm.photoURL
      });
      setIsProfileOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const updateNotificationSettings = async (key: keyof UserProfile["notificationSettings"], value: boolean) => {
    if (!user || !userProfile) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        [`notificationSettings.${key}`]: value
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const makePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedMatchId || !myPrediction.trim()) return;
    try {
      await addDoc(collection(db, "predictions"), {
        userId: user.uid,
        matchId: selectedMatchId,
        predictedScore: myPrediction,
        timestamp: Date.now()
      });
      setMyPrediction("");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "predictions");
    }
  };

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);

  const [predictions, setPredictions] = useState<Record<string, string>>({});
  const [predicting, setPredicting] = useState<Record<string, boolean>>({});
  const predictingRef = useRef<Record<string, boolean>>({});
  const [enabledCommentaryMatches, setEnabledCommentaryMatches] = useState<Set<string>>(new Set());
  const enabledMatchesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    enabledMatchesRef.current = enabledCommentaryMatches;
  }, [enabledCommentaryMatches]);

  const toggleCommentary = (matchId: string) => {
    setEnabledCommentaryMatches(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  const generatePrediction = async (match: Match) => {
    if (predictions[match.id] || predictingRef.current[match.id] || isAiThrottled) return;
    
    predictingRef.current[match.id] = true;
    setPredicting(prev => ({ ...prev, [match.id]: true }));

    // Helper to extract expert prediction if AI fails
    const applyExpertFallback = () => {
      if (match.sport === "football" && expertPredictions.length > 0) {
        const expert = expertPredictions.find(p => 
          (p.home_team.toLowerCase().includes(match.homeTeam.toLowerCase()) || match.homeTeam.toLowerCase().includes(p.home_team.toLowerCase())) &&
          (p.away_team.toLowerCase().includes(match.awayTeam.toLowerCase()) || match.awayTeam.toLowerCase().includes(p.away_team.toLowerCase()))
        );

        if (expert) {
          const predictionObj = {
            predictedScore: expert.prediction || "N/A",
            homeWinProb: expert.home_win_probability ? `${Math.round(expert.home_win_probability * 100)}%` : "0%",
            awayWinProb: expert.away_win_probability ? `${Math.round(expert.away_win_probability * 100)}%` : "0%",
            drawProb: expert.draw_probability ? `${Math.round(expert.draw_probability * 100)}%` : "0%",
            reason: `AI Unavailable - Fallback to Official Expert Tip from ${expert.federation || "UEFA"}`,
            isExpert: true
          };
          const pText = JSON.stringify(predictionObj);
          setPredictions(prev => ({ ...prev, [match.id]: pText }));
          const matchRef = doc(db, "matches", match.id);
          setDoc(matchRef, { prediction: pText }, { merge: true });
          return true;
        }
      }
      return false;
    };

    addToQueue(async () => {
      try {
        const prompt = `You are a sports analyst. 
        Match: ${match.homeTeam} vs ${match.awayTeam} (${match.sport})
        Status: ${match.status}
        Current Score: ${match.homeScore} - ${match.awayScore}
        Kickoff: ${match.timestamp ? new Date(match.timestamp).toLocaleString() : match.time}
        Recent Events: ${match.events.slice(0, 3).map(e => e.description).join(", ")}
        
        Predict the final outcome of this match. Provide:
        1. Predicted final score.
        2. Win probability for both teams (e.g. "65%").
        3. A one-sentence tactical reason for your prediction.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
          config: { 
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                predictedScore: { type: "STRING" },
                homeWinProb: { type: "STRING" },
                awayWinProb: { type: "STRING" },
                reason: { type: "STRING" },
              },
              required: ["predictedScore", "homeWinProb", "awayWinProb", "reason"],
            }
          }
        });

        if (response.text) {
          setPredictions(prev => ({ ...prev, [match.id]: response.text }));
          
          // Save to Firestore
          const matchRef = doc(db, "matches", match.id);
          setDoc(matchRef, { prediction: response.text }, { merge: true });
        }
      } catch (error: any) {
        console.warn("AI Prediction failed. Attempting Expert API Fallback...", error);
        const success = applyExpertFallback();
        if (!success) {
          if (isRateLimitError(error)) throw error;
        }
      } finally {
        predictingRef.current[match.id] = false;
        setPredicting(prev => ({ ...prev, [match.id]: false }));
      }
    });
  };

  useEffect(() => {
    if (selectedMatch && !predictions[selectedMatch.id] && (enabledCommentaryMatches.has(selectedMatch.id) || activeTab === "prediction")) {
      generatePrediction(selectedMatch);
    }
  }, [selectedMatchId, selectedMatch, enabledCommentaryMatches, activeTab]);

  // Catch-up commentary when enabled
  useEffect(() => {
    if (selectedMatch && enabledCommentaryMatches.has(selectedMatch.id)) {
      selectedMatch.events.forEach(event => {
        if (!event.aiCommentary || event.aiCommentary.includes("!")) { // Retry if it was a fallback
          generateCommentary(selectedMatch, event);
        }
      });
    }
  }, [enabledCommentaryMatches, selectedMatchId]);

  const selectedPrediction = selectedMatch ? predictions[selectedMatch.id] : null;
  let predictionData = null;
  if (selectedPrediction) {
    try {
      predictionData = JSON.parse(selectedPrediction);
    } catch (e) {
      console.error("Failed to parse prediction data:", e);
    }
  }

  const [tournamentsBySport, setTournamentsBySport] = useState<Record<string, { id: string, name: string }[]>>({
    football: [
      { id: "all", name: "All Tournaments" },
      { id: "Premier League", name: "Premier League" },
      { id: "La Liga", name: "La Liga" },
      { id: "Bundesliga", name: "Bundesliga" },
      { id: "Serie A", name: "Serie A" },
      { id: "Ligue 1", name: "Ligue 1" },
      { id: "Champions League", name: "Champions League" },
      { id: "Europa League", name: "Europa League" },
      { id: "World Cup", name: "World Cup" },
      { id: "Euro", name: "Euro" },
      { id: "Copa America", name: "Copa America" },
      { id: "FA Cup", name: "FA Cup" },
      { id: "Carabao Cup", name: "Carabao Cup" },
      { id: "MLS", name: "MLS" },
      { id: "Saudi Pro League", name: "Saudi Pro League" },
      { id: "Eredivisie", name: "Eredivisie" },
      { id: "Primeira Liga", name: "Primeira Liga" },
      { id: "Brasileirão", name: "Brasileirão" },
      { id: "Copa Libertadores", name: "Copa Libertadores" },
      { id: "AFC Champions League", name: "AFC Champions League" },
      { id: "Club World Cup", name: "Club World Cup" },
      { id: "Nations League", name: "Nations League" },
    ],
    basketball: [
      { id: "all", name: "All Leagues" },
      { id: "NBA", name: "NBA" },
      { id: "EuroLeague", name: "EuroLeague" },
      { id: "NCAA", name: "NCAA" },
    ],
    baseball: [
      { id: "all", name: "All Leagues" },
      { id: "MLB", name: "MLB" },
      { id: "NPB", name: "NPB" },
    ],
    cricket: [
      { id: "all", name: "All Tournaments" },
      { id: "IPL", name: "IPL" },
      { id: "ICC World Cup", name: "ICC World Cup" },
      { id: "T20 World Cup", name: "T20 World Cup" },
      { id: "The Ashes", name: "The Ashes" },
    ],
    tennis: [
      { id: "all", name: "All Tournaments" },
      { id: "Wimbledon", name: "Wimbledon" },
      { id: "US Open", name: "US Open" },
      { id: "French Open", name: "French Open" },
      { id: "Australian Open", name: "Australian Open" },
      { id: "ATP Finals", name: "ATP Finals" },
    ],
    hockey: [
      { id: "all", name: "All Leagues" },
      { id: "NHL", name: "NHL" },
      { id: "AHL", name: "AHL" },
      { id: "KHL", name: "KHL" },
    ],
  });

  // Dynamically update tournament lists based on real-world data
  useEffect(() => {
    if (matches.length > 0) {
      const newTournaments = { ...tournamentsBySport };
      let changed = false;

      matches.forEach(match => {
        if (match.league && match.sport) {
          const sportList = newTournaments[match.sport] || [{ id: "all", name: "All Tournaments" }];
          if (!sportList.find(t => t.id === match.league)) {
            sportList.push({ id: match.league, name: match.league });
            newTournaments[match.sport] = sportList;
            changed = true;
          }
        }
      });

      if (changed) {
        setTournamentsBySport(newTournaments);
      }
    }
  }, [matches]);

  const SportNavItem = ({ 
    sport, 
    label, 
    selectedSport, 
    selectedLeague, 
    setSelectedSport, 
    setSelectedLeague, 
    tournaments 
  }: { 
    sport: string, 
    label: string, 
    selectedSport: string, 
    selectedLeague: string, 
    setSelectedSport: (s: string) => void, 
    setSelectedLeague: (l: string) => void, 
    tournaments?: { id: string, name: string }[] 
  }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <div 
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div 
          onClick={() => {
            setSelectedSport(sport);
            setSelectedLeague("all");
          }}
          className={cn(
            "hover:text-brand transition-all cursor-pointer flex items-center gap-1 py-2 h-10 md:h-20 whitespace-nowrap relative px-2 md:px-0", 
            selectedSport === sport && "text-brand"
          )}
        >
          <span>{label}</span>
          {selectedSport === sport && (
            <motion.div 
              layoutId="active-sport"
              className="absolute bottom-0 left-0 right-0 h-1 bg-brand rounded-full"
            />
          )}
          {tournaments && <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", isHovered && "rotate-180")} />}
        </div>
        
        {tournaments && (
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="absolute top-full left-0 w-64 glass border border-sky-100 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-2 z-[60] overflow-hidden"
              >
                <div className="max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                  <div className="grid gap-1">
                    {tournaments.map((t) => (
                      <button
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSport(sport);
                          setSelectedLeague(t.id);
                          setIsHovered(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-between group/item",
                          selectedLeague === t.id && selectedSport === sport
                            ? "bg-brand text-white shadow-lg shadow-brand/20"
                            : "hover:bg-brand/5 text-slate-500 hover:text-brand"
                        )}
                      >
                        {t.name}
                        {selectedLeague === t.id && selectedSport === sport && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface text-slate-900 font-sans selection:bg-brand selection:text-white relative overflow-x-hidden">
      {/* Notifications Overlay */}
      <div className="fixed top-20 md:top-24 right-4 md:right-6 z-[100] flex flex-col gap-3 pointer-events-none w-[calc(100%-2rem)] md:w-auto">
        <AnimatePresence>
          {notifications.map((note, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="glass border-brand/20 p-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px] pointer-events-auto"
            >
              <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center border border-brand/20">
                <Bell className="w-5 h-5 text-brand animate-bounce" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand mb-1">Match Alert</p>
                <p className="text-xs font-bold text-slate-700 leading-tight">{note}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Visual background layers */}
      <div className="fixed inset-0 grid-bg pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.05),transparent_70%)] pointer-events-none" />
      <div className="scanline" />

      {/* Mobile Header */}
      <header className="border-b border-slate-950/5 bg-white/80 backdrop-blur-3xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 md:h-28 flex items-center justify-between">
          <div className="flex items-center gap-16">
            <h1 className="text-2xl md:text-3xl font-display font-medium tracking-tighter text-slate-900 flex items-center gap-2 group cursor-pointer transition-transform hover:scale-[1.02]">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-2xl shadow-slate-400/20">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <span className="font-bold">SPORTS</span><span className="text-brand font-black">HUB</span>
            </h1>
            
            <nav className="hidden xl:flex items-center gap-1.5 p-1 bg-slate-100/50 rounded-2xl border border-slate-200/50">
              <span 
                onClick={() => {
                  setSelectedSport("all");
                  setSelectedLeague("all");
                }}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 cursor-pointer",
                  selectedSport === "all" 
                    ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50 border border-slate-200/30" 
                    : "text-slate-400 hover:text-slate-900"
                )}
              >
                World_Hub
              </span>
              
              <SportNavItem 
                sport="football" 
                label="Football" 
                selectedSport={selectedSport} 
                selectedLeague={selectedLeague} 
                setSelectedSport={setSelectedSport} 
                setSelectedLeague={setSelectedLeague} 
                tournaments={tournamentsBySport.football}
              />

              <SportNavItem 
                sport="baseball" 
                label="Baseball" 
                selectedSport={selectedSport} 
                selectedLeague={selectedLeague} 
                setSelectedSport={setSelectedSport} 
                setSelectedLeague={setSelectedLeague} 
                tournaments={tournamentsBySport.baseball}
              />

              <SportNavItem 
                sport="cricket" 
                label="Cricket" 
                selectedSport={selectedSport} 
                selectedLeague={selectedLeague} 
                setSelectedSport={setSelectedSport} 
                setSelectedLeague={setSelectedLeague} 
                tournaments={tournamentsBySport.cricket}
              />

              <SportNavItem 
                sport="basketball" 
                label="Basketball" 
                selectedSport={selectedSport} 
                selectedLeague={selectedLeague} 
                setSelectedSport={setSelectedSport} 
                setSelectedLeague={setSelectedLeague} 
                tournaments={tournamentsBySport.basketball}
              />

              <SportNavItem 
                sport="tennis" 
                label="Tennis" 
                selectedSport={selectedSport} 
                selectedLeague={selectedLeague} 
                setSelectedSport={setSelectedSport} 
                setSelectedLeague={setSelectedLeague} 
                tournaments={tournamentsBySport.tennis}
              />

              <SportNavItem 
                sport="hockey" 
                label="NHL" 
                selectedSport={selectedSport} 
                selectedLeague={selectedLeague} 
                setSelectedSport={setSelectedSport} 
                setSelectedLeague={setSelectedLeague} 
                tournaments={tournamentsBySport.hockey}
              />

              <SportNavItem 
                sport="formula1" 
                label="Formula 1" 
                selectedSport={selectedSport} 
                selectedLeague={selectedLeague} 
                setSelectedSport={setSelectedSport} 
                setSelectedLeague={setSelectedLeague} 
              />
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-slate-50 border border-slate-200/60 rounded-2xl px-5 py-2.5 gap-4">
               <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    matches.some(m => m.id.startsWith("real-") || m.id.startsWith("cricket-")) ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] animate-pulse" : "bg-brand animate-ping"
                  )} />
                  <span className="text-[10px] font-black tracking-[0.25em] uppercase text-slate-500 whitespace-nowrap">
                    {matches.some(m => m.id.startsWith("real-") || m.id.startsWith("cricket-")) ? "Live Oracle Link" : "Virtual Engine Active"}
                  </span>
               </div>
            </div>

            <div className="h-10 w-px bg-slate-200 hidden md:block mx-4" />

            <div className="hidden md:flex items-center gap-6 px-5 py-2.5 bg-slate-900 shadow-xl shadow-slate-950/20 rounded-2xl border border-slate-800">
               <div className="flex flex-col text-right pr-4 border-r border-slate-800">
                 <span className="text-[7px] font-mono font-black text-slate-500 tracking-widest leading-none">SYSTEM_LOCK</span>
                 <span className="text-[10px] font-mono font-bold text-slate-200 tabular-nums">
                   {new Date().toLocaleTimeString('en-US', { hour12: false })}
                 </span>
               </div>
               <div className="flex flex-col">
                 <span className="text-[7px] font-mono font-black text-slate-500 tracking-widest leading-none">HUB_STABILITY</span>
                 <div className="flex items-center gap-1.5" title="AI Match Prediction Engine Load">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[9px] font-mono font-bold text-white uppercase tracking-tighter">99.2%</span>
                 </div>
               </div>
            </div>

            <div className="h-10 w-px bg-slate-200 hidden md:block mx-4" />

            <div className="flex items-center gap-3">
              {user ? (
                <button 
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-3 p-1.5 pr-5 bg-slate-900 text-white rounded-2xl cursor-pointer hover:bg-slate-800 transition-all shadow-2xl shadow-slate-400/30 group"
                >
                  <div className="relative">
                    <img src={user.photoURL || ""} className="w-9 h-9 rounded-xl object-cover border-2 border-slate-800" referrerPolicy="no-referrer" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white leading-none">{user.displayName?.split(' ')[0]}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">{userProfile?.points || 0} PTS</p>
                  </div>
                </button>
              ) : (
                <button 
                  onClick={login}
                  className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand transition-all shadow-2xl shadow-slate-900/10"
                >
                  Access Terminal
                </button>
              )}
            </div>

            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="xl:hidden w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 hover:border-brand transition-all shadow-lg shadow-slate-100"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden top-[64px] md:top-[80px]"
              />
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute top-full left-0 right-0 bg-white z-50 md:hidden shadow-2xl overflow-y-auto border-t border-slate-50 max-h-[80vh]"
              >
                <div className="p-6 pb-12 space-y-8">
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sports</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {["all", "football", "baseball", "cricket", "basketball", "tennis", "hockey", "formula1"].map((sport) => (
                          <button
                            key={sport}
                            onClick={() => {
                              setSelectedSport(sport as any);
                              setIsMenuOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                              selectedSport === sport ? "bg-brand text-white shadow-lg shadow-brand/20" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            )}
                          >
                            {sport === 'all' ? 'All Sports' : sport === 'hockey' ? 'NHL' : sport}
                          </button>
                        ))}
                      </div>
                   </div>

                   <div className="space-y-4 pt-6 border-t border-slate-100">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account</h4>
                      {user ? (
                        <div className="space-y-4">
                           <div className="flex items-center gap-3 p-3 bg-brand/5 rounded-2xl border border-brand/10">
                              <img src={user.photoURL || ""} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
                              <div>
                                <p className="text-xs font-black uppercase text-slate-900">{user.displayName}</p>
                                <p className="text-[9px] font-bold text-brand uppercase">{userProfile?.points || 0} Points</p>
                              </div>
                           </div>
                           <button onClick={() => { setIsProfileOpen(true); setIsMenuOpen(false); }} className="w-full py-3 rounded-xl bg-slate-50 text-slate-600 text-xs font-black uppercase hover:bg-slate-100">View Profile</button>
                           <button onClick={() => { logout(); setIsMenuOpen(false); }} className="w-full py-3 rounded-xl bg-red-50 text-red-500 text-xs font-black uppercase hover:bg-red-100">Logout</button>
                        </div>
                      ) : (
                        <button onClick={() => { login(); setIsMenuOpen(false); }} className="w-full py-4 rounded-xl bg-brand text-white text-xs font-black uppercase shadow-lg shadow-brand/20">Login with Google</button>
                      )}
                   </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      <main className="max-w-7xl mx-auto px-2 md:px-6 py-4 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
        {/* Sidebar: Match List */}
        <div className={cn(
          "lg:col-span-4 space-y-6 md:space-y-10 transition-all duration-500",
          selectedMatchId ? "hidden lg:block" : "block"
        )}>
          <div className="flex flex-col gap-6 px-1 md:px-2 mb-10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Match Center</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{filterMatches(matches, 'live').length} Live</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {selectedLeague !== "all" && (
                <div className="flex items-center justify-between bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-xl shadow-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                      <Trophy className="w-3.5 h-3.5 text-brand" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">{selectedLeague}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedLeague("all")}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                <input 
                  type="text"
                  placeholder="Find matches..."
                  value={matchSearchQuery}
                  onChange={(e) => setMatchSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-xs font-medium focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand/40 transition-all text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-10">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-28 glass rounded-2xl animate-pulse" />
              ))
            ) : (
              <>
                {/* Categorized Sections (Only when "All" is selected) */}
                {selectedSport === "all" && (
                  <>
                    {/* Cricket Section (Real-World) */}
                    {filterMatches(matches, 'live').filter(m => m.sport === 'cricket').length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-emerald-600 flex items-center gap-2 px-2 py-2 border-l-2 border-emerald-500 bg-emerald-50/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          CRICKET_LIVE_DATA
                        </h3>
                        <div className="space-y-4">
                          {filterMatches(matches, 'live')
                            .filter(m => m.sport === 'cricket')
                            .map((match) => (
                              <motion.div
                                key={match.id}
                                layoutId={match.id}
                                onClick={() => setSelectedMatchId(match.id)}
                                className={cn(
                                  "group cursor-pointer p-0 rounded-3xl border transition-all duration-500 relative overflow-hidden bg-white shadow-sm hover:shadow-2xl hover:shadow-slate-200/50",
                                  selectedMatchId === match.id
                                    ? "border-slate-900 ring-1 ring-slate-900 shadow-2xl shadow-slate-200"
                                    : "border-slate-100"
                                )}
                              >
                                <div className="p-5 space-y-4">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                                      <Zap className="w-3 h-3 text-brand fill-current" />
                                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                                        {match.league || "HUB LIVE"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {match.status === 'live' && (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 text-red-500 rounded-md border border-red-100 shadow-sm">
                                          <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                                          <span className="text-[8px] font-black uppercase tracking-widest">Live</span>
                                        </div>
                                      )}
                                      <MatchTimeDisplay match={match} />
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-100">
                                    <div className="bg-white p-3 flex items-center justify-between group-hover:bg-slate-50/50 transition-colors">
                                      <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                                          <Trophy className="w-3 h-3 text-slate-300" />
                                        </div>
                                        <span className={cn(
                                          "text-[11px] font-bold tracking-tight transition-colors",
                                          selectedMatchId === match.id ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"
                                        )}>{match.homeTeam}</span>
                                      </div>
                                      <span className="font-mono font-bold text-base tabular-nums text-slate-900">{formatScore(match, 'home')}</span>
                                    </div>
                                    
                                    <div className="bg-white p-3 flex items-center justify-between group-hover:bg-slate-50/50 transition-colors">
                                      <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                                          <Trophy className="w-3 h-3 text-slate-300" />
                                        </div>
                                        <span className={cn(
                                          "text-[11px] font-bold tracking-tight transition-colors",
                                          selectedMatchId === match.id ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"
                                        )}>{match.awayTeam}</span>
                                      </div>
                                      <span className="font-mono font-bold text-base tabular-nums text-slate-900">{formatScore(match, 'away')}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-1">
                                    <div className="flex -space-x-2">
                                      <div className="w-5 h-5 rounded-full border-2 border-white bg-brand/10 flex items-center justify-center">
                                        <Activity className="w-2.5 h-2.5 text-brand" />
                                      </div>
                                      <div className="w-5 h-5 rounded-full border-2 border-white bg-emerald-100 flex items-center justify-center">
                                        <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(match.id);
                                      }}
                                      className={cn(
                                        "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                                        userProfile?.favorites?.includes(match.id)
                                          ? "bg-red-50 text-red-500 border border-red-100"
                                          : "bg-slate-50 text-slate-400 border border-slate-100 hover:text-red-400 hover:bg-white"
                                      )}
                                    >
                                      <Heart className={cn("w-3.5 h-3.5", userProfile?.favorites?.includes(match.id) && "fill-current")} />
                                    </button>
                                  </div>
                                </div>
                                {selectedMatchId === match.id && (
                                  <motion.div 
                                    layoutId="card-accent"
                                    className="absolute left-0 top-0 bottom-0 w-1 bg-slate-900"
                                  />
                                )}
                              </motion.div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Baseball Section (Real-World) */}
                    {filterMatches(matches, 'live').filter(m => m.sport === 'baseball').length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-blue-600 flex items-center gap-2 px-2 py-2 border-l-2 border-blue-500 bg-blue-50/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                          MLB_REALTIME_FEED
                        </h3>
                        <div className="space-y-4">
                          {filterMatches(matches, 'live')
                            .filter(m => m.sport === 'baseball')
                            .map((match) => (
                              <motion.div
                                key={match.id}
                                layoutId={match.id}
                                onClick={() => setSelectedMatchId(match.id)}
                                className={cn(
                                  "group cursor-pointer p-5 rounded-2xl border transition-all duration-500 glass relative overflow-hidden",
                                  selectedMatchId === match.id
                                    ? "border-brand/40 bg-brand/[0.03] shadow-[0_0_40px_rgba(14,165,233,0.05)] ring-1 ring-brand/20"
                                    : "glass-hover"
                                )}
                              >
                                {selectedMatchId === match.id && (
                                  <motion.div 
                                    layoutId="active-glow"
                                    className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none"
                                  />
                                )}
                                
                                <div className="flex justify-between items-center mb-4 relative z-10">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                      {match.league || "MLB"} • {match.status === 'live' ? 'Live' : 'Finished'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(match.id);
                                      }}
                                      className={cn(
                                        "p-1.5 rounded-full transition-all duration-300",
                                        userProfile?.favorites?.includes(match.id)
                                          ? "text-red-500 bg-red-50"
                                          : "text-slate-300 hover:text-red-400 hover:bg-slate-50"
                                      )}
                                    >
                                      <Heart className={cn("w-3.5 h-3.5", userProfile?.favorites?.includes(match.id) && "fill-current")} />
                                    </button>
                                    <MatchTimeDisplay match={match} />
                                  </div>
                                </div>
                                
                                <div className="space-y-3 relative z-10">
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                      <span 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPlayerSearchQuery(match.homeTeam);
                                          searchPlayers(match.homeTeam);
                                          setActiveMainTab("player-search");
                                        }}
                                        className={cn(
                                          "font-bold tracking-tight transition-colors hover:text-brand cursor-pointer",
                                          selectedMatchId === match.id ? "text-slate-900" : "text-slate-600"
                                        )}>{match.homeTeam}</span>
                                      {match.homeScoreDetail && <span className="text-[9px] text-slate-400 font-medium">{match.homeScoreDetail}</span>}
                                    </div>
                                    <span className="font-display font-bold text-xl tabular-nums text-slate-900">{formatScore(match, 'home')}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                      <span 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPlayerSearchQuery(match.awayTeam);
                                          searchPlayers(match.awayTeam);
                                          setActiveMainTab("player-search");
                                        }}
                                        className={cn(
                                          "font-bold tracking-tight transition-colors hover:text-brand cursor-pointer",
                                          selectedMatchId === match.id ? "text-slate-900" : "text-slate-600"
                                        )}>{match.awayTeam}</span>
                                      {match.awayScoreDetail && <span className="text-[9px] text-slate-400 font-medium">{match.awayScoreDetail}</span>}
                                    </div>
                                    <span className="font-display font-bold text-xl tabular-nums text-slate-900">{formatScore(match, 'away')}</span>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* NBA Basketball Section */}
                    {filterMatches(matches, 'live').filter(m => m.sport === 'basketball').length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-orange-600 flex items-center gap-2 px-2 py-2 border-l-2 border-orange-500 bg-orange-50/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse shadow-[0_0_8px_rgba(234,88,12,0.5)]" />
                          NBA_LIVE_ACCESS
                        </h3>
                        <div className="space-y-4">
                          {filterMatches(matches, 'live')
                            .filter(m => m.sport === 'basketball')
                            .map((match) => (
                              <motion.div
                                key={match.id}
                                layoutId={match.id}
                                onClick={() => setSelectedMatchId(match.id)}
                                className={cn(
                                  "group cursor-pointer p-5 rounded-2xl border transition-all duration-500 glass relative overflow-hidden",
                                  selectedMatchId === match.id
                                    ? "border-brand/40 bg-brand/[0.03] shadow-[0_0_40px_rgba(14,165,233,0.05)] ring-1 ring-brand/20"
                                    : "glass-hover"
                                )}
                              >
                                {selectedMatchId === match.id && (
                                  <motion.div 
                                    layoutId="active-glow"
                                    className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none"
                                  />
                                )}
                                
                                <div className="flex justify-between items-center mb-4 relative z-10">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                      {match.league || "NBA"} • {match.status === 'live' ? 'Live' : 'Finished'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(match.id);
                                      }}
                                      className={cn(
                                        "p-1.5 rounded-full transition-all duration-300",
                                        userProfile?.favorites?.includes(match.id)
                                          ? "text-red-500 bg-red-50"
                                          : "text-slate-300 hover:text-red-400 hover:bg-slate-50"
                                      )}
                                    >
                                      <Heart className={cn("w-3.5 h-3.5", userProfile?.favorites?.includes(match.id) && "fill-current")} />
                                    </button>
                                    <MatchTimeDisplay match={match} />
                                  </div>
                                </div>
                                
                                <div className="space-y-3 relative z-10">
                                  <div className="flex items-center justify-between">
                                    <span 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPlayerSearchQuery(match.homeTeam);
                                        searchPlayers(match.homeTeam);
                                        setActiveMainTab("player-search");
                                      }}
                                      className={cn(
                                        "font-bold tracking-tight transition-colors hover:text-brand cursor-pointer",
                                        selectedMatchId === match.id ? "text-slate-900" : "text-slate-600"
                                      )}>{match.homeTeam}</span>
                                    <span className="font-display font-bold text-xl tabular-nums text-slate-900">{formatScore(match, 'home')}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPlayerSearchQuery(match.awayTeam);
                                        searchPlayers(match.awayTeam);
                                        setActiveMainTab("player-search");
                                      }}
                                      className={cn(
                                        "font-bold tracking-tight transition-colors hover:text-brand cursor-pointer",
                                        selectedMatchId === match.id ? "text-slate-900" : "text-slate-600"
                                      )}>{match.awayTeam}</span>
                                    <span className="font-display font-bold text-xl tabular-nums text-slate-900">{formatScore(match, 'away')}</span>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Tennis Section */}
                    {filterMatches(matches, 'live').filter(m => m.sport === 'tennis').length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-lime-600 flex items-center gap-2 px-2 py-2 border-l-2 border-lime-500 bg-lime-50/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-lime-600 animate-pulse shadow-[0_0_8px_rgba(101,163,13,0.5)]" />
                          TENNIS_TRACKER_V4
                        </h3>
                        <div className="space-y-4">
                          {filterMatches(matches, 'live')
                            .filter(m => m.sport === 'tennis')
                            .map((match) => (
                              <motion.div
                                key={match.id}
                                layoutId={match.id}
                                onClick={() => setSelectedMatchId(match.id)}
                                className={cn(
                                  "group cursor-pointer p-5 rounded-2xl border transition-all duration-500 glass relative overflow-hidden",
                                  selectedMatchId === match.id
                                    ? "border-brand/40 bg-brand/[0.03] shadow-[0_0_40px_rgba(14,165,233,0.05)] ring-1 ring-brand/20"
                                    : "glass-hover"
                                )}
                              >
                                {selectedMatchId === match.id && (
                                  <motion.div 
                                    layoutId="active-glow"
                                    className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none"
                                  />
                                )}
                                
                                <div className="flex justify-between items-center mb-4 relative z-10">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-lime-500 animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                      {match.league || "Tournament"} • {match.status === 'live' ? 'Live' : 'Finished'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(match.id);
                                      }}
                                      className={cn(
                                        "p-1.5 rounded-full transition-all duration-300",
                                        userProfile?.favorites?.includes(match.id)
                                          ? "text-red-500 bg-red-50"
                                          : "text-slate-300 hover:text-red-400 hover:bg-slate-50"
                                      )}
                                    >
                                      <Heart className={cn("w-3.5 h-3.5", userProfile?.favorites?.includes(match.id) && "fill-current")} />
                                    </button>
                                    <MatchTimeDisplay match={match} />
                                  </div>
                                </div>
                                
                                <div className="space-y-3 relative z-10">
                                  <div className="flex items-center justify-between">
                                    <span 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPlayerSearchQuery(match.homeTeam);
                                        searchPlayers(match.homeTeam);
                                        setActiveMainTab("player-search");
                                      }}
                                      className={cn(
                                        "font-bold tracking-tight transition-colors hover:text-brand cursor-pointer",
                                        selectedMatchId === match.id ? "text-slate-900" : "text-slate-600"
                                      )}>{match.homeTeam}</span>
                                    <span className="font-display font-bold text-xl tabular-nums text-slate-900">{formatScore(match, 'home')}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPlayerSearchQuery(match.awayTeam);
                                        searchPlayers(match.awayTeam);
                                        setActiveMainTab("player-search");
                                      }}
                                      className={cn(
                                        "font-bold tracking-tight transition-colors hover:text-brand cursor-pointer",
                                        selectedMatchId === match.id ? "text-slate-900" : "text-slate-600"
                                      )}>{match.awayTeam}</span>
                                    <span className="font-display font-bold text-xl tabular-nums text-slate-900">{formatScore(match, 'away')}</span>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* NHL Hockey Section */}
                    {filterMatches(matches, 'live').filter(m => m.sport === 'hockey').length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 px-2 py-2 border-l-2 border-slate-400 bg-slate-50/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                          HOCKEY_OPS_CENTER
                        </h3>
                        <div className="space-y-4">
                          {filterMatches(matches, 'live')
                            .filter(m => m.sport === 'hockey')
                            .map((match) => (
                              <motion.div
                                key={match.id}
                                layoutId={match.id}
                                onClick={() => setSelectedMatchId(match.id)}
                                className={cn(
                                  "group cursor-pointer p-5 rounded-2xl border transition-all duration-500 glass relative overflow-hidden",
                                  selectedMatchId === match.id
                                    ? "border-brand/40 bg-brand/[0.03] shadow-[0_0_40_rgba(14,165,233,0.05)] ring-1 ring-brand/20"
                                    : "glass-hover"
                                )}
                              >
                                {selectedMatchId === match.id && (
                                  <motion.div 
                                    layoutId="active-glow"
                                    className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none"
                                  />
                                )}
                                
                                <div className="flex justify-between items-center mb-4 relative z-10">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                      {match.league || "NHL"} • Live
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(match.id);
                                      }}
                                      className={cn(
                                        "p-1.5 rounded-full transition-all duration-300",
                                        userProfile?.favorites?.includes(match.id)
                                          ? "text-red-500 bg-red-50"
                                          : "text-slate-300 hover:text-red-400 hover:bg-slate-50"
                                      )}
                                    >
                                      <Heart className={cn("w-3.5 h-3.5", userProfile?.favorites?.includes(match.id) && "fill-current")} />
                                    </button>
                                    <MatchTimeDisplay match={match} />
                                  </div>
                                </div>
                                
                                <div className="space-y-3 relative z-10">
                                  <div className="flex items-center justify-between">
                                    <span 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPlayerSearchQuery(match.homeTeam);
                                        searchPlayers(match.homeTeam);
                                        setActiveMainTab("player-search");
                                      }}
                                      className={cn(
                                        "font-bold tracking-tight transition-colors hover:text-brand cursor-pointer",
                                        selectedMatchId === match.id ? "text-slate-900" : "text-slate-600"
                                      )}>{match.homeTeam}</span>
                                    <span className="font-display font-bold text-xl tabular-nums text-slate-900">{formatScore(match, 'home')}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPlayerSearchQuery(match.awayTeam);
                                        searchPlayers(match.awayTeam);
                                        setActiveMainTab("player-search");
                                      }}
                                      className={cn(
                                        "font-bold tracking-tight transition-colors hover:text-brand cursor-pointer",
                                        selectedMatchId === match.id ? "text-slate-900" : "text-slate-600"
                                      )}>{match.awayTeam}</span>
                                    <span className="font-display font-bold text-xl tabular-nums text-slate-900">{formatScore(match, 'away')}</span>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Live Section (Football & Others) */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-red-500 flex items-center gap-2 px-2 py-2 border-l-2 border-red-500 bg-red-50/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    {selectedLeague !== "all" 
                      ? `${selectedLeague.toUpperCase()}_LIVE` 
                      : selectedSport === "all" ? "GLOBAL_LIVE_FEED" : `${selectedSport.toUpperCase()}_LIVE_OPS`}
                  </h3>
                  <div className="space-y-4">
                    {filterMatches(matches, 'live', selectedSport === "all" ? ['cricket', 'baseball', 'basketball', 'tennis', 'hockey'] : []).length > 0 ? (
                      filterMatches(matches, 'live', selectedSport === "all" ? ['cricket', 'baseball', 'basketball', 'tennis', 'hockey'] : [])
                        .map((match) => (
                          <motion.div
                            key={match.id}
                            layoutId={match.id}
                            onClick={() => setSelectedMatchId(match.id)}
                            className={cn(
                              "group cursor-pointer p-5 rounded-2xl border transition-all duration-500 glass relative overflow-hidden",
                              selectedMatchId === match.id
                                ? "border-brand/40 bg-brand/[0.03] shadow-[0_0_40px_rgba(14,165,233,0.05)] ring-1 ring-brand/20"
                                : "glass-hover"
                            )}
                          >
                            {selectedMatchId === match.id && (
                              <motion.div 
                                layoutId="active-glow"
                                className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none"
                              />
                            )}
                            
                            <div className="flex justify-between items-center mb-4 relative z-10">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  match.status === 'live' ? "bg-red-500 animate-pulse" : "bg-slate-200"
                                )} />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                  {match.sport} • {match.status === 'live' ? "In Play" : match.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(match.id);
                                  }}
                                  className={cn(
                                    "p-1.5 rounded-full transition-all duration-300",
                                    userProfile?.favorites?.includes(match.id)
                                      ? "text-red-500 bg-red-50"
                                      : "text-slate-300 hover:text-red-400 hover:bg-slate-50"
                                  )}
                                >
                                  <Heart className={cn("w-3.5 h-3.5", userProfile?.favorites?.includes(match.id) && "fill-current")} />
                                </button>
                                <MatchTimeDisplay match={match} />
                              </div>
                            </div>
                            
                            <div className="space-y-3 relative z-10">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <span 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPlayerSearchQuery(match.homeTeam);
                                      searchPlayers(match.homeTeam);
                                      setActiveMainTab("player-search");
                                    }}
                                    className={cn(
                                    "font-bold tracking-tight transition-colors hover:text-brand cursor-pointer",
                                    selectedMatchId === match.id ? "text-slate-900" : "text-slate-600"
                                  )}>{match.homeTeam}</span>
                                  {match.homeScoreDetail && <span className="text-[9px] text-slate-400 font-medium">{match.homeScoreDetail}</span>}
                                </div>
                                <span className="font-display font-bold text-xl tabular-nums text-slate-900">{formatScore(match, 'home')}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <span 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPlayerSearchQuery(match.awayTeam);
                                      searchPlayers(match.awayTeam);
                                      setActiveMainTab("player-search");
                                    }}
                                    className={cn(
                                    "font-bold tracking-tight transition-colors hover:text-brand cursor-pointer",
                                    selectedMatchId === match.id ? "text-slate-900" : "text-slate-600"
                                  )}>{match.awayTeam}</span>
                                  {match.awayScoreDetail && <span className="text-[9px] text-slate-400 font-medium">{match.awayScoreDetail}</span>}
                                </div>
                                <span className="font-display font-bold text-xl tabular-nums text-slate-900">{formatScore(match, 'away')}</span>
                              </div>
                            </div>
                            
                            {match.sport === 'football' && match.status === 'live' && (
                              <div className="mt-4 pt-4 border-t border-slate-800/40">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[7px] font-mono font-black text-slate-500 uppercase tracking-[0.2em]">Momentum_Index</span>
                                  <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                      <div key={i} className={cn("w-1 h-2 rounded-full", i < 3 ? "bg-brand/60" : "bg-slate-800")} />
                                    ))}
                                  </div>
                                </div>
                                <div className="flex h-1.5 gap-1 rounded-full overflow-hidden bg-slate-900 border border-white/5">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${50 + (Math.sin(Date.now()/5000) * 10)}%` }}
                                    className="bg-brand h-full relative" 
                                  >
                                    <div className="absolute inset-x-0 top-0 h-[0.5px] bg-white/40" />
                                  </motion.div>
                                  <div className="bg-slate-800 h-full flex-1" />
                                </div>
                              </div>
                            )}

                            {match.status === 'live' && match.sport !== 'football' && (
                              <div className="mt-4 pt-4 border-t border-slate-50">
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-[8px] font-mono font-black text-slate-400 uppercase">Field_Control</span>
                                  <span className="text-[8px] font-mono font-bold text-brand uppercase">Dynamic_Shift</span>
                                </div>
                                <div className="flex h-1 gap-1 rounded-full overflow-hidden bg-slate-100">
                                  <div className="bg-brand h-full transition-all duration-1000" style={{ width: '60%' }} />
                                  <div className="bg-slate-300 h-full transition-all duration-1000" style={{ width: '40%' }} />
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ))
                    ) : (
                      <p className="text-[10px] text-slate-300 italic px-2">
                        No live {selectedLeague !== 'all' ? selectedLeague : (selectedSport === 'all' ? 'matches' : selectedSport)} right now
                      </p>
                    )}
                  </div>
                </div>

                {/* Finished Section */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">
                    {selectedLeague !== "all" ? `${selectedLeague} Results` : "Recently Finished"}
                  </h3>
                  <div className="space-y-4">
                    {filterMatches(matches, 'finished').length > 0 ? (
                      filterMatches(matches, 'finished')
                        .map((match) => (
                          <motion.div
                            key={match.id}
                            layoutId={match.id}
                            onClick={() => setSelectedMatchId(match.id)}
                            className={cn(
                              "group cursor-pointer p-5 rounded-2xl border transition-all duration-500 glass relative overflow-hidden",
                              selectedMatchId === match.id
                                ? "border-brand/40 bg-brand/[0.03] shadow-[0_0_40px_rgba(14,165,233,0.05)] ring-1 ring-brand/20"
                                : "glass-hover"
                            )}
                          >
                            {selectedMatchId === match.id && (
                              <motion.div 
                                layoutId="active-glow"
                                className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none"
                              />
                            )}
                            
                            <div className="flex justify-between items-center mb-4 relative z-10">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  match.status === 'live' ? "bg-red-500 animate-pulse" : "bg-slate-200"
                                )} />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                  {match.sport} • {match.status === 'live' ? "In Play" : match.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(match.id);
                                  }}
                                  className={cn(
                                    "p-1.5 rounded-full transition-all duration-300",
                                    userProfile?.favorites?.includes(match.id)
                                      ? "text-red-500 bg-red-50"
                                      : "text-slate-300 hover:text-red-400 hover:bg-slate-50"
                                  )}
                                >
                                  <Heart className={cn("w-3.5 h-3.5", userProfile?.favorites?.includes(match.id) && "fill-current")} />
                                </button>
                                <MatchTimeDisplay match={match} />
                              </div>
                            </div>
                            
                            <div className="space-y-3 relative z-10">
                              <div className="flex items-center justify-between">
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPlayerSearchQuery(match.homeTeam);
                                    searchPlayers(match.homeTeam);
                                    setActiveMainTab("player-search");
                                  }}
                                  className={cn(
                                    "font-bold tracking-tight transition-colors hover:text-brand cursor-pointer",
                                    selectedMatchId === match.id ? "text-slate-900" : "text-slate-600"
                                  )}>{match.homeTeam}</span>
                                <span className="font-display font-bold text-xl tabular-nums text-slate-900">{match.homeScore}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPlayerSearchQuery(match.awayTeam);
                                    searchPlayers(match.awayTeam);
                                    setActiveMainTab("player-search");
                                  }}
                                  className={cn(
                                    "font-bold tracking-tight transition-colors hover:text-brand cursor-pointer",
                                    selectedMatchId === match.id ? "text-slate-900" : "text-slate-600"
                                  )}>{match.awayTeam}</span>
                                <span className="font-display font-bold text-xl tabular-nums text-slate-900">{match.awayScore}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))
                    ) : (
                      <p className="text-[10px] text-slate-300 italic px-2">
                        No {selectedLeague !== 'all' ? selectedLeague : 'recently finished'} matches
                      </p>
                    )}
                  </div>
                </div>

                {/* Upcoming Section */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">
                    {selectedLeague !== "all" ? `${selectedLeague} Upcoming` : "Upcoming"}
                  </h3>
                  <div className="space-y-4">
                    {filterMatches(matches, 'scheduled').length > 0 ? (
                      filterMatches(matches, 'scheduled')
                        .map((match) => (
                          <motion.div
                            key={match.id}
                            layoutId={match.id}
                            onClick={() => setSelectedMatchId(match.id)}
                            className={cn(
                              "group cursor-pointer p-5 rounded-2xl border transition-all duration-500 glass relative overflow-hidden",
                              selectedMatchId === match.id
                                ? "border-brand/40 bg-brand/[0.03] shadow-[0_0_40px_rgba(14,165,233,0.05)] ring-1 ring-brand/20"
                                : "glass-hover"
                            )}
                          >
                            {selectedMatchId === match.id && (
                              <motion.div 
                                layoutId="active-glow"
                                className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none"
                              />
                            )}
                            
                            <div className="flex justify-between items-center mb-4 relative z-10">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  match.status === 'live' ? "bg-red-500 animate-pulse" : "bg-slate-200"
                                )} />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                  {match.league || match.sport} • {match.status === 'live' ? "In Play" : match.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(match.id);
                                  }}
                                  className={cn(
                                    "p-1.5 rounded-full transition-all duration-300",
                                    userProfile?.favorites?.includes(match.id)
                                      ? "text-red-500 bg-red-50"
                                      : "text-slate-300 hover:text-red-400 hover:bg-slate-50"
                                  )}
                                >
                                  <Heart className={cn("w-3.5 h-3.5", userProfile?.favorites?.includes(match.id) && "fill-current")} />
                                </button>
                                <MatchTimeDisplay match={match} />
                              </div>
                            </div>
                            
                            <div className="space-y-3 relative z-10">
                              <div className="flex items-center justify-between">
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPlayerSearchQuery(match.homeTeam);
                                    searchPlayers(match.homeTeam);
                                    setActiveMainTab("player-search");
                                  }}
                                  className={cn(
                                    "font-bold tracking-tight transition-colors hover:text-brand cursor-pointer",
                                    selectedMatchId === match.id ? "text-slate-900" : "text-slate-600"
                                  )}>{match.homeTeam}</span>
                                <span className="font-display font-bold text-xl tabular-nums text-slate-900">{match.homeScore}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPlayerSearchQuery(match.awayTeam);
                                    searchPlayers(match.awayTeam);
                                    setActiveMainTab("player-search");
                                  }}
                                  className={cn(
                                    "font-bold tracking-tight transition-colors hover:text-brand cursor-pointer",
                                    selectedMatchId === match.id ? "text-slate-900" : "text-slate-600"
                                  )}>{match.awayTeam}</span>
                                <span className="font-display font-bold text-xl tabular-nums text-slate-900">{match.awayScore}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))
                    ) : (
                      <p className="text-[10px] text-slate-300 italic px-2">
                        No upcoming {selectedLeague !== 'all' ? selectedLeague : 'matches'} scheduled
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className={cn(
          "lg:col-span-8 space-y-6 md:space-y-8 min-w-0 pr-2 md:pr-0",
          !selectedMatchId ? "hidden lg:block" : "block"
        )}>
          {selectedMatch && (
            <button 
              onClick={() => setSelectedMatchId(null)}
              className="lg:hidden flex items-center gap-2 mb-4 text-brand font-black uppercase tracking-widest text-[9px] bg-brand/5 px-4 py-2 rounded-xl border border-brand/10 w-fit"
            >
              <ChevronLeft className="w-3 h-3" /> Back to matches
            </button>
          )}

          <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
            <TabsList className="bg-slate-900/5 p-1 rounded-2xl w-full flex overflow-x-auto no-scrollbar justify-start h-auto gap-1 mb-8 border border-slate-200/50">
              <TabsTrigger value="for-you" className="rounded-xl px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all whitespace-nowrap data-[state=active]:shadow-xl data-[state=active]:shadow-slate-400/20 group">
                <Heart className="w-3.5 h-3.5 mr-2 group-data-[state=active]:fill-current" /> For_You
              </TabsTrigger>
              <TabsTrigger value="matches" className="rounded-xl px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all whitespace-nowrap data-[state=active]:shadow-xl data-[state=active]:shadow-slate-400/20 group">
                <Trophy className="w-3.5 h-3.5 mr-2 group-data-[state=active]:fill-current" /> Match_Feed
              </TabsTrigger>
              <TabsTrigger value="social" className="rounded-xl px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all whitespace-nowrap data-[state=active]:shadow-xl data-[state=active]:shadow-slate-400/20 group">
                <Share2 className="w-3.5 h-3.5 mr-2" /> Global_Feed
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="rounded-xl px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all whitespace-nowrap data-[state=active]:shadow-xl data-[state=active]:shadow-slate-400/20 group">
                <TrendingUp className="w-3.5 h-3.5 mr-2" /> Ranking_System
              </TabsTrigger>
              <TabsTrigger value="player-search" className="rounded-xl px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all whitespace-nowrap data-[state=active]:shadow-xl data-[state=active]:shadow-slate-400/20 group">
                <Users className="w-3.5 h-3.5 mr-2" /> Player_DB
              </TabsTrigger>
              {(selectedSport === "cricket" || selectedSport === "tennis" || selectedSport === "football" || selectedSport === "hockey" || selectedSport === "basketball") && (
                <TabsTrigger value="rankings" className="rounded-xl px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all whitespace-nowrap data-[state=active]:shadow-xl data-[state=active]:shadow-slate-400/20 group">
                  <Trophy className="w-3.5 h-3.5 mr-2" /> Tournament_Hub
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="for-you" className="outline-none">
              <div className="space-y-6">
                <h3 className="text-xl font-black uppercase text-slate-800 tracking-tighter">Your Followed Teams</h3>
                {favorites.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold">No followed teams yet.</p>
                    <p className="text-slate-400 text-sm">Follow some teams from the Nations Hub!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matches
                      .filter(m => favorites.includes(m.homeTeam) || favorites.includes(m.awayTeam))
                      .map(m => (
                        <Card key={m.id} className="glass rounded-2xl overflow-hidden hover:border-brand/40 transition-all">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="text-xs font-black uppercase text-slate-600">{m.homeTeam} vs {m.awayTeam}</div>
                            <Badge className="bg-brand text-white">{m.status}</Badge>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="matches" className="outline-none">
              {selectedLeague === "World Cup" ? (
                <div className="space-y-8">
                  <div className="flex justify-center">
                    <div className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50 flex gap-1">
                      <button 
                         onClick={() => setWorldCupSubTab("hub")}
                         className={cn(
                           "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                           worldCupSubTab === "hub" ? "bg-white text-slate-900 shadow-md" : "text-slate-400 hover:text-slate-600"
                         )}
                      >
                        Nations Hub
                      </button>
                      <button 
                         onClick={() => setWorldCupSubTab("bracket")}
                         className={cn(
                           "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                           worldCupSubTab === "bracket" ? "bg-white text-slate-900 shadow-md" : "text-slate-400 hover:text-slate-600"
                         )}
                      >
                        Bracket Builder
                      </button>
                    </div>
                  </div>

                  {worldCupSubTab === "hub" ? (
                    <WorldCupTeamsViewer 
                      onSearchSquad={(team) => {
                        setPlayerSearchQuery(team);
                        searchPlayers(team);
                        setActiveMainTab("player-search");
                      }}
                      onViewSocial={() => setActiveMainTab("social")}
                      onViewHighlights={() => setActiveMainTab("matches")}
                      onViewBracket={() => setWorldCupSubTab("bracket")}
                      user={user}
                      favorites={favorites}
                      onFavoriteChanged={refreshFavorites}
                    />
                  ) : (
                    <BracketBuilder user={user} />
                  )}
                </div>
              ) : selectedMatch ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedMatch.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    className="space-y-10"
                  >
                    {/* Cinematic Scoreboard */}
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-slate-900 via-brand/20 to-slate-900 rounded-[3rem] blur-3xl opacity-20 transition duration-1000 group-hover:opacity-40" />
                  <Card className="bg-[#0A0B0E] border-slate-800/60 rounded-[2.5rem] overflow-hidden relative shadow-2xl shadow-slate-950/50 group/card">
                    {/* Hardware micro-details */}
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 opacity-20">
                      {Array(5).fill(0).map((_, i) => <div key={i} className="w-1 h-3 bg-slate-400 rounded-full" />)}
                    </div>

                    <CardContent className="p-0 relative h-full flex flex-col">
                      {selectedMatch.sport !== 'formula1' ? (
                        <>
                          {/* Top Status Header */}
                          <div className="bg-slate-900/50 border-b border-slate-800/40 px-8 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                              <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-[0.2em]">{selectedMatch.league || "SYSTEM_PROTOCOL_v5"}</span>
                            </div>
                            {selectedMatch.status === 'finished' && (
                              <div className="px-4 py-1 bg-brand/10 border border-brand/20 rounded-lg">
                                <span className="text-[10px] font-bold text-brand uppercase tracking-widest leading-none">
                                  {selectedMatch.homeScore > selectedMatch.awayScore ? selectedMatch.homeTeam : selectedMatch.awayTeam} DECLARED VICTOR
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.03] rounded-md border border-white/5">
                                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Fan_Pulse</span>
                                <div className="flex gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                    <div key={i} className={cn("w-1 h-2 rounded-full", i < 4 ? "bg-emerald-500/60" : "bg-slate-800")} />
                                  ))}
                                </div>
                                <span className="text-[8px] font-mono text-emerald-500 font-black uppercase">Optimistic</span>
                              </div>
                              <span className="text-[9px] font-mono text-slate-500 uppercase">Latency: 12.4ms</span>
                              <div className="w-px h-3 bg-slate-800" />
                              <Badge variant="outline" className="font-mono text-[8px] bg-slate-900 border-slate-800 text-slate-400">{selectedMatch.sport.toUpperCase()}_LINK</Badge>
                            </div>
                          </div>

                          <div className={cn(
                            "p-4 md:p-8 lg:p-12 grid grid-cols-1 items-center gap-8 lg:gap-4 flex-1 w-full max-w-full overflow-hidden relative",
                            selectedMatch.sport === 'football' ? "lg:grid-cols-1" : "lg:grid-cols-[1fr_2fr_1fr]"
                          )}>
                            {selectedMatch.sport === 'football' ? (
                              <div className="flex flex-col items-center justify-center space-y-12 py-6">
                                <div className="flex items-center justify-center gap-4 md:gap-16 lg:gap-24 w-full px-2">
                                  {/* Home Team Editorial */}
                                  <div className="flex flex-col items-center gap-4 group/home flex-1 min-w-0">
                                    <div className="relative">
                                      <div className="absolute -inset-4 bg-brand/20 rounded-full blur-2xl opacity-0 group-hover/home:opacity-100 transition-all duration-700" />
                                      <div className="w-16 h-16 md:w-32 md:h-32 rounded-[1.5rem] md:rounded-[2.5rem] bg-slate-900 border-2 border-white/5 flex items-center justify-center relative z-10 overflow-hidden shadow-2xl transition-all duration-500 group-hover/home:-rotate-6">
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                                        <Trophy className="w-8 h-8 md:w-16 md:h-16 text-white" />
                                      </div>
                                    </div>
                                    <div className="text-center space-y-1 w-full flex flex-col items-center min-w-0">
                                      <h3 className="text-base md:text-3xl lg:text-4xl font-display font-black text-white uppercase tracking-tighter truncate w-full px-2 drop-shadow-lg">
                                        {selectedMatch.homeTeam}
                                      </h3>
                                      <span className="text-[8px] md:text-[10px] font-mono text-slate-500 uppercase tracking-widest">Home_Entity</span>
                                    </div>
                                  </div>

                                  {/* Massive Score Editorial */}
                                  <div className="flex flex-col items-center gap-6 md:gap-12 relative flex-shrink-0">
                                    <div className="flex items-center gap-4 md:gap-12 relative">
                                      <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-50 whitespace-nowrap">
                                        <div className="w-8 h-[1px] bg-slate-700" />
                                        <span className="text-[10px] font-mono font-black text-brand uppercase tracking-widest">{selectedMatch.time || "MATCH_START"}</span>
                                        <div className="w-8 h-[1px] bg-slate-700" />
                                      </div>

                                      <span className="text-6xl md:text-[10rem] lg:text-[12rem] xl:text-[15rem] font-display font-black text-white tabular-nums tracking-tighter leading-none drop-shadow-[0_0_80px_rgba(255,255,255,0.05)]">
                                        {selectedMatch.homeScore}
                                      </span>
                                      <div className="flex flex-col gap-2 md:gap-3 py-4 md:py-6 px-2 md:px-3 bg-white/5 backdrop-blur-md rounded-full border border-white/10 shadow-2xl">
                                        <div className="w-2 h-2 rounded-full bg-brand animate-ping" />
                                        <div className="w-2 h-2 rounded-full bg-slate-800" />
                                        <div className="w-2 h-2 rounded-full bg-slate-800" />
                                      </div>
                                      <span className="text-6xl md:text-[10rem] lg:text-[12rem] xl:text-[15rem] font-display font-black text-white tabular-nums tracking-tighter leading-none drop-shadow-[0_0_80px_rgba(255,255,255,0.05)]">
                                        {selectedMatch.awayScore}
                                      </span>
                                    </div>

                                    {/* Win Prob Overlay - Positioned relatively to avoid overlap */}
                                    <div className="flex items-center gap-4 md:gap-8 whitespace-nowrap bg-brand px-6 py-2.5 rounded-full shadow-[0_20px_40px_rgba(14,165,233,0.3)] border border-white/20 z-20 group/prob scale-75 md:scale-100">
                                      <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-white/60 uppercase">Win_Prob</span>
                                        <span className="text-sm font-black text-white italic group-hover/prob:scale-110 transition-transform">64.2%</span>
                                      </div>
                                      <div className="w-px h-3 bg-white/20" />
                                      <span className="text-[10px] font-black text-white uppercase tracking-widest group-hover/prob:tracking-[0.2em] transition-all">Optimal_Phase</span>
                                    </div>
                                  </div>

                                  {/* Away Team Editorial */}
                                  <div className="flex flex-col items-center gap-4 group/away flex-1 min-w-0">
                                    <div className="relative">
                                      <div className="absolute -inset-4 bg-brand/20 rounded-full blur-2xl opacity-0 group-hover/away:opacity-100 transition-all duration-700" />
                                      <div className="w-16 h-16 md:w-32 md:h-32 rounded-[1.5rem] md:rounded-[2.5rem] bg-slate-900 border-2 border-white/5 flex items-center justify-center relative z-10 overflow-hidden shadow-2xl transition-all duration-500 group-hover/away:rotate-6">
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                                        <Trophy className="w-8 h-8 md:w-16 md:h-16 text-white" />
                                      </div>
                                    </div>
                                    <div className="text-center space-y-1 w-full flex flex-col items-center min-w-0">
                                      <h3 className="text-base md:text-3xl lg:text-4xl font-display font-black text-white uppercase tracking-tighter truncate w-full px-2 drop-shadow-lg">
                                        {selectedMatch.awayTeam}
                                      </h3>
                                      <span className="text-[8px] md:text-[10px] font-mono text-slate-500 uppercase tracking-widest">Away_Entity</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Home Team Module */}
                                <div className="flex flex-col items-center gap-4 lg:gap-6 animate-in fade-in slide-in-from-left-8 duration-700">
                                  <div className="relative group/team">
                                    <div className="w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 bg-slate-900 rounded-[2rem] flex items-center justify-center border border-slate-800 shadow-2xl transition-all duration-500 group-hover/team:border-brand/40">
                                      <div className="absolute inset-2 border border-slate-800/20 rounded-2xl pointer-events-none" />
                                      <Trophy className="w-8 h-8 md:w-12 md:h-12 lg:w-14 lg:h-14 text-slate-100 opacity-60 group-hover/team:scale-110 transition-transform duration-500" />
                                    </div>
                                    <div className="absolute -top-3 -left-3 px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[7px] font-mono text-brand tracking-[0.2em] uppercase shadow-2xl">
                                      Home_Node
                                    </div>
                                  </div>
                                  <h3 className="text-lg md:text-2xl lg:text-3xl font-display font-black uppercase tracking-tighter text-white text-center line-clamp-1">
                                    {selectedMatch.homeTeam}
                                  </h3>
                                </div>

                                {/* Central Score Node */}
                                <div className="flex flex-col items-center justify-center gap-6 lg:gap-8 min-w-0">
                                  <div className="flex items-center justify-center gap-4 md:gap-8 w-full group/score">
                                    <div className="flex flex-col items-center gap-1 min-w-0">
                                      <span className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-mono font-black tracking-tighter text-white tabular-nums drop-shadow-[0_0_40px_rgba(255,255,255,0.05)] transition-all group-hover/score:text-brand break-all leading-none">
                                        {formatScore(selectedMatch, 'home')}
                                      </span>
                                      {selectedMatch.homeScoreDetail && <span className="text-[8px] md:text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest text-center truncate w-full">{selectedMatch.homeScoreDetail}</span>}
                                    </div>

                                    <div className="flex flex-col gap-2 md:gap-3 py-6 md:py-8 lg:py-10 px-4 md:px-6 bg-slate-900 border border-slate-800/80 rounded-2xl md:rounded-3xl relative overflow-hidden shadow-2xl shrink-0">
                                      <div className="absolute inset-0 bg-brand/5 animate-pulse" />
                                      <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-brand shadow-[0_0_10px_rgba(14,165,233,0.8)] relative z-10" />
                                      <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-slate-800 relative z-10" />
                                      <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-slate-800 relative z-10" />
                                    </div>

                                    <div className="flex flex-col items-center gap-1 min-w-0">
                                      <span className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-mono font-black tracking-tighter text-white tabular-nums drop-shadow-[0_0_40px_rgba(255,255,255,0.05)] transition-all group-hover/score:text-brand break-all leading-none">
                                        {formatScore(selectedMatch, 'away')}
                                      </span>
                                      {selectedMatch.awayScoreDetail && <span className="text-[8px] md:text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest text-center truncate w-full">{selectedMatch.awayScoreDetail}</span>}
                                    </div>
                                  </div>

                                  {/* Result Prompt */}
                                  {selectedMatch.status === 'finished' && (
                                    <div className="px-4 md:px-8 py-2 md:py-3 bg-slate-900 border border-slate-800 rounded-xl md:rounded-2xl shrink-0 max-w-full truncate">
                                      <p className="text-[9px] md:text-[11px] font-mono font-bold text-slate-300 uppercase tracking-[0.2em] truncate">
                                        Report: {selectedMatch.matchResult || "Data_Analysis_Complete"}
                                      </p>
                                    </div>
                                  )}

                                  <div className="flex flex-wrap justify-center items-center gap-3 md:gap-6">
                                    <div className="px-4 md:px-6 py-2 md:py-2.5 bg-slate-900 border border-slate-800 rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-3 backdrop-blur-3xl shadow-xl shadow-black/20">
                                      <Clock className="w-3 md:w-4 h-3 md:h-4 text-brand" />
                                      <div className="text-[8px] md:text-[10px] font-mono font-bold text-slate-300 uppercase tracking-widest whitespace-nowrap">
                                        <MatchTimeDisplay match={selectedMatch} />
                                      </div>
                                    </div>
                                    {selectedMatch.status === 'live' && (
                                      <div className="px-4 md:px-6 py-2 md:py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-3 animate-pulse shadow-xl shadow-red-500/10">
                                        <Activity className="w-3 md:w-4 h-3 md:h-4 text-red-500" />
                                        <span className="text-[8px] md:text-[10px] font-mono font-black text-red-500 uppercase tracking-[0.3em] whitespace-nowrap">LIVE_SYNC</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Away Team Module */}
                                <div className="flex flex-col items-center gap-4 lg:gap-6 animate-in fade-in slide-in-from-right-8 duration-700">
                                  <div className="relative group/team-away">
                                    <div className="w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 bg-slate-900 rounded-[2rem] flex items-center justify-center border border-slate-800 shadow-2xl transition-all duration-500 group-hover/team-away:border-brand/40">
                                      <div className="absolute inset-2 border border-slate-800/20 rounded-2xl pointer-events-none" />
                                      <Trophy className="w-8 h-8 md:w-12 md:h-12 lg:w-14 lg:h-14 text-slate-100 opacity-60 group-hover/team-away:scale-110 transition-transform duration-500" />
                                    </div>
                                    <div className="absolute -top-3 -right-3 px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[7px] font-mono text-brand tracking-[0.2em] uppercase shadow-2xl">
                                      Away_Node
                                    </div>
                                  </div>
                                  <h3 className="text-lg md:text-2xl lg:text-3xl font-display font-black uppercase tracking-tighter text-white text-center line-clamp-1">
                                    {selectedMatch.awayTeam}
                                  </h3>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Unified Functional Footer Navigation */}
                          <div className="mt-8 mb-14 flex items-center justify-center gap-10 border-t border-slate-800/40 pt-10 w-full max-w-2xl mx-auto z-20">
                            <button onClick={() => setActiveTab("stats")} className="flex flex-col items-center gap-3 group/nav">
                              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover/nav:bg-brand/10 group-hover/nav:text-brand transition-all group-hover/nav:-translate-y-1 shadow-lg shadow-black/40">
                                <TrendingUp className="w-6 h-6" />
                              </div>
                              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-500 group-hover/nav:text-slate-300">Analytics</span>
                            </button>
                            <button onClick={() => setActiveTab("prediction")} className="flex flex-col items-center gap-3 group/nav">
                              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover/nav:bg-brand/10 group-hover/nav:text-brand transition-all group-hover/nav:-translate-y-1 shadow-lg shadow-black/40">
                                <Zap className="w-6 h-6" />
                              </div>
                              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-500 group-hover/nav:text-slate-300">Oracle</span>
                            </button>
                            <button onClick={() => setActiveTab("chat")} className="flex flex-col items-center gap-3 group/nav">
                              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover/nav:bg-brand/10 group-hover/nav:text-brand transition-all group-hover/nav:-translate-y-1 shadow-lg shadow-black/40">
                                <MessageSquare className="w-6 h-6" />
                              </div>
                              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-500 group-hover/nav:text-slate-300">Hub_Feed</span>
                            </button>
                          </div>

                          {/* Lower hardware bar */}
                          <div className="bg-slate-950/80 border-t border-slate-800/40 p-4 flex justify-center items-center gap-10">
                            <div className="flex items-center gap-2">
                              <Activity className="w-3 h-3 text-slate-500" />
                              <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">Buffer Status: Optimal</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Zap className="w-3 h-3 text-slate-500" />
                              <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">Signal: Phase_Locked</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center w-full gap-12 py-10">
                          <div className="flex items-center gap-20">
                            <div className="text-center space-y-6">
                              <div className="w-24 h-24 bg-brand/5 rounded-3xl mx-auto flex items-center justify-center border border-brand/20 shadow-inner">
                                <Zap className="w-12 h-12 text-brand animate-pulse" />
                              </div>
                              <h3 className="text-3xl font-black uppercase tracking-tighter text-white font-display">{selectedMatch.homeTeam}</h3>
                              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em]">Track_Leader</span>
                            </div>
                            <div className="text-[12rem] font-mono font-black tracking-tighter text-brand drop-shadow-[0_0_50px_rgba(14,165,233,0.3)]">P1</div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                </Card>
              </div>

                <div className="flex items-center justify-between gap-4">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex flex-row items-center justify-between gap-6 mb-6 md:mb-8 overflow-x-auto no-scrollbar mask-fade-right">
                      <TabsList className="glass p-1 md:p-1.5 rounded-xl md:rounded-2xl flex justify-start h-auto gap-0.5 md:gap-1">
                        <TabsTrigger value="commentary" className="rounded-lg md:rounded-xl px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all whitespace-nowrap">
                          <MessageSquare className="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2" /> Live
                        </TabsTrigger>
                        <TabsTrigger value="events" className="rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all whitespace-nowrap">
                          <Activity className="w-4 h-4 mr-2" /> Analytics
                        </TabsTrigger>
                        <TabsTrigger value="prediction" className="rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all whitespace-nowrap">
                          <Zap className="w-4 h-4 mr-2" /> Tip Center
                        </TabsTrigger>
                        <TabsTrigger value="news" className="rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all whitespace-nowrap">
                          <Bell className="w-4 h-4 mr-2" /> Stories
                        </TabsTrigger>
                        <TabsTrigger value="highlights" className="rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all whitespace-nowrap">
                          <Zap className="w-4 h-4 mr-2" /> Highlights
                        </TabsTrigger>
                        <TabsTrigger value="stats" className="rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all whitespace-nowrap">
                          <TrendingUp className="w-4 h-4 mr-2" /> Tournament
                        </TabsTrigger>
                        <TabsTrigger value="chat" className="rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all whitespace-nowrap">
                          <MessageSquare className="w-4 h-4 mr-2" /> Fan Zone
                        </TabsTrigger>
                        {selectedMatch.sport === "football" && (
                          <TabsTrigger value="lineups" className="rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all whitespace-nowrap">
                            <Users className="w-4 h-4 mr-2" /> Lineups
                          </TabsTrigger>
                        )}
                      </TabsList>

                      <button
                        onClick={() => toggleCommentary(selectedMatch.id)}
                        className={cn(
                          "flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 border w-auto justify-start",
                          enabledCommentaryMatches.has(selectedMatch.id)
                            ? "bg-brand text-white border-brand shadow-[0_0_20px_rgba(14,165,233,0.3)]"
                            : "bg-sky-50 text-slate-400 border-sky-100 hover:bg-sky-100 hover:text-slate-900"
                        )}
                      >
                        <Activity className={cn("w-4 h-4", enabledCommentaryMatches.has(selectedMatch.id) && "animate-pulse")} />
                        {enabledCommentaryMatches.has(selectedMatch.id) ? "Commentary ON" : "Turn ON Commentary"}
                      </button>
                    </div>
                    
                    <TabsContent value="commentary" className="mt-0 outline-none">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                        <div className="lg:col-span-2">
                          <ScrollArea className="h-[400px] md:h-[500px] pr-2 md:pr-6">
                            <div className="space-y-8">
                              {selectedMatch.events.length > 0 ? (
                                selectedMatch.events.map((event, i) => (
                                  <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="relative pl-10 border-l-2 border-slate-100 pb-10 last:pb-0"
                                  >
                                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-surface border-2 border-brand shadow-[0_0_15px_rgba(14,165,233,0.4)]" />
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-bold tracking-widest text-brand bg-brand/10 px-3 py-1 rounded-full uppercase">{event.time}</span>
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">{event.type}</span>
                                      </div>
                                      <p className="text-base md:text-lg font-medium text-slate-900 leading-snug tracking-tight">{event.description}</p>
                                      {event.aiCommentary && (
                                        <motion.div 
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          className="glass p-4 md:p-6 rounded-2xl italic text-slate-500 text-sm flex gap-4 leading-relaxed relative overflow-hidden group/commentary"
                                        >
                                          <div className="absolute top-0 left-0 w-1 h-full bg-brand/40" />
                                          <Zap className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                                          <span className="relative z-10">"{event.aiCommentary}"</span>
                                        </motion.div>
                                      )}
                                    </div>
                                  </motion.div>
                                ))
                              ) : (
                                <div className="flex flex-col items-center justify-center h-80 text-slate-200 space-y-6">
                                  <MessageSquare className="w-16 h-16 stroke-[1]" />
                                  <p className="text-sm font-bold uppercase tracking-[0.3em]">Awaiting Broadcast</p>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                        
                        <div className="col-span-1 border-t lg:border-t-0 lg:border-l border-slate-100 pt-8 lg:pt-0 lg:pl-8">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2rem] text-slate-400 mb-6 flex items-center gap-2">
                            <Activity className="w-3 h-3" /> Info
                          </h4>
                          {selectedMatch.sport === "football" && footballMatchDetail ? (
                            <div className="space-y-6">
                              <div className="glass p-4 rounded-2xl border-sky-50">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Venue</p>
                                <p className="text-sm font-bold text-slate-900">{footballMatchDetail.venue || "TBD"}</p>
                              </div>
                              <div className="glass p-4 rounded-2xl border-sky-50">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Referee</p>
                                <p className="text-sm font-bold text-slate-900">{footballMatchDetail.referee || "TBD"}</p>
                              </div>
                              <div className="glass p-4 rounded-2xl border-sky-50">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Round</p>
                                <p className="text-sm font-bold text-slate-900">{footballMatchDetail.round || "N/A"}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-10 opacity-30">
                              <Activity className="w-8 h-8 mx-auto mb-2" />
                              <p className="text-[10px] font-bold uppercase tracking-widest">No detailed info</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                  <TabsContent value="events" className="mt-8 outline-none space-y-8">
                    {selectedMatch.sport === 'football' ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Attack Intensity Timeline */}
                        <Card className="glass border-white/5 bg-slate-900/50 rounded-[2rem] overflow-hidden col-span-1 lg:col-span-2">
                          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/5">
                            <CardTitle className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-slate-400">Match_Momentum_Pulse</CardTitle>
                            <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20 text-[9px] font-black uppercase tracking-widest">REAL_TIME_HUD</Badge>
                          </CardHeader>
                          <CardContent className="pt-8 pb-4 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={[
                                { time: '0', h: 30, a: 20 },
                                { time: '15', h: 45, a: 30 },
                                { time: '30', h: 60, a: 40 },
                                { time: '45', h: 55, a: 50 },
                                { time: '60', h: 75, a: 35 },
                                { time: '75', h: 85, a: 20 },
                                { time: '90', h: 40, a: 60 },
                              ]}>
                                <defs>
                                  <linearGradient id="colorHome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id="colorAway" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                                  itemStyle={{ color: '#f8fafc', fontSize: '10px' }}
                                />
                                <Area type="monotone" dataKey="h" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorHome)" strokeWidth={3} />
                                <Area type="monotone" dataKey="a" stroke="#94a3b8" fillOpacity={1} fill="url(#colorAway)" strokeWidth={2} strokeDasharray="5 5" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </CardContent>
                          <CardFooter className="bg-white/[0.02] border-t border-white/5 py-3 px-6 flex justify-between items-center">
                            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Unit: Expected_Intensity_v1.2</span>
                            <div className="flex gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-brand" />
                                <span className="text-[8px] font-mono text-slate-300 uppercase">{selectedMatch.homeTeam}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-slate-500" />
                                <span className="text-[8px] font-mono text-slate-300 uppercase">{selectedMatch.awayTeam}</span>
                              </div>
                            </div>
                          </CardFooter>
                        </Card>

                        {/* Tactical Sliders */}
                        <div className="space-y-6">
                           <Card className="glass border-white/5 bg-slate-900/40 rounded-[2rem]">
                             <CardHeader className="pb-2">
                               <CardTitle className="text-[9px] font-mono font-black uppercase text-slate-400">Positioning_Heat</CardTitle>
                             </CardHeader>
                             <CardContent className="space-y-6">
                                {[
                                  { label: 'Defensive_Block', val: 78 },
                                  { label: 'Midfield_Density', val: 92 },
                                  { label: 'Attacking_Width', val: 84 },
                                ].map((stat, i) => (
                                  <div key={i} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{stat.label}</span>
                                      <span className="text-xs font-black text-brand tabular-nums">{stat.val}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${stat.val}%` }}
                                        transition={{ duration: 1, delay: i * 0.1 }}
                                        className="h-full bg-brand rounded-full glow-brand" 
                                      />
                                    </div>
                                  </div>
                                ))}
                             </CardContent>
                           </Card>
                        </div>

                        {/* Shot Distribution Matrix */}
                        <Card className="glass border-white/5 bg-slate-900/40 rounded-[2rem]">
                          <CardHeader className="pb-2">
                             <CardTitle className="text-[9px] font-mono font-black uppercase text-slate-400">Fire_Control_Matrix</CardTitle>
                          </CardHeader>
                          <CardContent className="grid grid-cols-2 gap-4">
                             {[
                               { label: 'Inside_Box', val: '12/14', score: 85 },
                               { label: 'Long_Range', val: '4/9', score: 44 },
                               { label: 'Set_Pieces', val: '2/3', score: 66 },
                               { label: 'Counter_Attacks', val: '5/5', score: 100 },
                             ].map((m, i) => (
                               <div key={i} className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-2">
                                 <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">{m.label}</div>
                                 <div className="text-lg font-black text-white">{m.val}</div>
                                 <div className={cn(
                                   "px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest",
                                   m.score > 70 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                 )}>Rating: {m.score}</div>
                               </div>
                             ))}
                          </CardContent>
                        </Card>

                        {/* Chronological Mission Log (Match Events) */}
                        <div className="col-span-1 lg:col-span-2 mt-4 space-y-6">
                           <div className="flex items-center justify-between px-2">
                             <h4 className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2">
                               <Radio className="w-3 h-3 text-brand" /> Chronological_Mission_Log
                             </h4>
                             <span className="text-[8px] font-mono text-slate-500 uppercase">Status: Live_Transcription_Active</span>
                           </div>

                           <div className="space-y-4">
                             {selectedMatch.events.length > 0 ? (
                               selectedMatch.events.map((event, i) => (
                                 <motion.div 
                                   key={event.id}
                                   initial={{ opacity: 0, x: -20 }}
                                   whileInView={{ opacity: 1, x: 0 }}
                                   transition={{ delay: i * 0.1 }}
                                   viewport={{ once: true }}
                                   className="group/event relative flex gap-6"
                                 >
                                    {/* Timeline Line */}
                                    {i < selectedMatch.events.length - 1 && (
                                      <div className="absolute left-4 top-8 bottom-[-16px] w-[2px] bg-slate-800/50 group-hover/event:bg-brand/30 transition-colors" />
                                    )}

                                    {/* Event Icon Node */}
                                    <div className="relative z-10 w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover/event:border-brand/50 group-hover/event:shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all">
                                      {event.type.toLowerCase().includes('goal') ? (
                                        <Trophy className="w-4 h-4 text-brand" />
                                      ) : event.type.toLowerCase().includes('card') ? (
                                        <div className={cn("w-3 h-4 rounded-sm", event.description.toLowerCase().includes('red') ? "bg-red-500" : "bg-amber-400")} />
                                      ) : (
                                        <Activity className="w-4 h-4 text-slate-400" />
                                      )}
                                    </div>

                                    {/* Event Data Block */}
                                    <div className="flex-1 glass p-5 rounded-2xl border-white/5 space-y-3 group-hover/event:bg-white/5 transition-all">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <span className="text-sm font-black text-white tabular-nums tracking-tighter">{event.time}'</span>
                                          <Badge className="bg-slate-950 border-slate-800 text-slate-400 text-[8px] font-mono tracking-widest uppercase">
                                            {event.type.replace('_', ' ')}
                                          </Badge>
                                        </div>
                                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">Event_ID: {event.id.slice(0, 8)}</span>
                                      </div>
                                      
                                      <p className="text-sm font-medium text-slate-300 leading-snug">
                                        {event.description}
                                      </p>

                                      {event.aiCommentary && (
                                        <div className="mt-3 pt-3 border-t border-slate-800/50 flex gap-3">
                                          <div className="w-5 h-5 rounded-md bg-brand/10 flex items-center justify-center text-brand shrink-0">
                                            <Zap className="w-3 h-3" />
                                          </div>
                                          <p className="text-[11px] italic text-slate-400 leading-relaxed">
                                            {event.aiCommentary}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                 </motion.div>
                               ))
                             ) : (
                               <div className="glass p-12 rounded-[2rem] border-white/5 border-dashed flex flex-col items-center justify-center gap-4 text-center">
                                 <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                                   <Radio className="w-6 h-6 text-slate-600 animate-pulse" />
                                 </div>
                                 <div>
                                   <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Waiting_For_Input</h5>
                                   <p className="text-[10px] font-mono text-slate-600 uppercase">No_significant_events_recorded_yet</p>
                                 </div>
                               </div>
                             )}
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6 pr-0 md:pr-4">
                        <Card className="glass border-sky-100 rounded-2xl">
                          <CardHeader>
                            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Match Possession</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                              <div className="flex items-center justify-between font-display font-bold">
                                <span className="text-sm text-slate-900">{selectedMatch.homeTeam}</span>
                                <span className="text-brand text-xl">54%</span>
                              </div>
                              <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                                <div className="h-full bg-brand rounded-full glow-brand transition-all duration-1000" style={{ width: '54%' }} />
                              </div>
                          </CardContent>
                        </Card>
                        <Card className="glass border-sky-100 rounded-2xl">
                          <CardHeader>
                            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Shot Efficiency</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-900">{selectedMatch.homeTeam}</span>
                                <div className="flex gap-1">
                                  {Array(8).fill(0).map((_, i) => <div key={i} className="w-2 h-6 bg-brand rounded-sm" />)}
                                  {Array(4).fill(0).map((_, i) => <div key={i} className="w-2 h-6 bg-slate-100 rounded-sm" />)}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-900">{selectedMatch.awayTeam}</span>
                                <div className="flex gap-1">
                                  {Array(5).fill(0).map((_, i) => <div key={i} className="w-2 h-6 bg-slate-300 rounded-sm" />)}
                                  {Array(7).fill(0).map((_, i) => <div key={i} className="w-2 h-6 bg-slate-100 rounded-sm" />)}
                                </div>
                              </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="prediction" className="mt-8 outline-none">
                    {predicting[selectedMatch.id] ? (
                      <div className="space-y-6">
                        <Skeleton className="h-48 w-full rounded-3xl bg-slate-50" />
                        <div className="grid grid-cols-2 gap-6">
                          <Skeleton className="h-32 w-full rounded-3xl bg-slate-50" />
                          <Skeleton className="h-32 w-full rounded-3xl bg-slate-50" />
                        </div>
                      </div>
                    ) : predictionData ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-8"
                      >
                        <div className="relative group">
                          <div className="absolute -inset-1 bg-brand/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition duration-500" />
                          <Card className="glass border-brand/20 rounded-3xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-6">
                              {predictionData.isExpert ? (
                                <Award className="w-8 h-8 text-amber-500 animate-pulse" />
                              ) : (
                                <Zap className="w-8 h-8 text-brand animate-pulse" />
                              )}
                            </div>
                            <CardHeader className="pb-0">
                              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand">
                                {predictionData.isExpert ? "Official Expert Tip" : "AI Tactical Forecast"}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center py-12 px-10">
                              <div className="text-center space-y-2 mb-8">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Predicted Final Score</span>
                                <div className="text-7xl font-black tracking-tighter text-brand font-display">{predictionData.predictedScore}</div>
                              </div>
                              <div className="h-px w-20 bg-slate-100 mb-8" />
                              <p className="text-center text-xl font-medium text-slate-700 italic leading-relaxed max-w-2xl">
                                "{predictionData.reason}"
                              </p>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4 pr-0 md:pr-4">
                          <Card className="glass border-sky-100 rounded-3xl p-2">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{selectedMatch.homeTeam} Win Probability</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                              <span className="text-5xl font-black font-display text-brand">{predictionData.homeWinProb}</span>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: predictionData.homeWinProb }}
                                  transition={{ duration: 1.5, ease: "easeOut" }}
                                  className="h-full bg-brand glow-brand" 
                                />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="glass border-sky-100 rounded-3xl p-2">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{selectedMatch.awayTeam} Win Probability</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                              <span className="text-5xl font-black font-display text-slate-400">{predictionData.awayWinProb}</span>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: predictionData.awayWinProb }}
                                  transition={{ duration: 1.5, ease: "easeOut" }}
                                  className="h-full bg-slate-300" 
                                />
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-80 glass rounded-3xl text-slate-200 space-y-6">
                        <Zap className="w-16 h-16 stroke-[1]" />
                        <div className="text-center space-y-2">
                          <p className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">No Prediction Available</p>
                          <button 
                            onClick={() => generatePrediction(selectedMatch)}
                            disabled={predicting[selectedMatch.id] || isAiThrottled}
                            className="text-[10px] font-bold text-brand uppercase tracking-widest hover:underline disabled:opacity-50"
                          >
                            {predicting[selectedMatch.id] ? "Analyzing..." : "Generate Tactical Forecast"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* User Prediction Form */}
                    <Card className="glass border-sky-100 rounded-3xl overflow-hidden mt-8">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Make Your Prediction</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {user ? (
                          <form onSubmit={makePrediction} className="flex gap-4">
                            <div className="flex-1">
                              <Input 
                                placeholder="e.g. 2-1" 
                                value={myPrediction}
                                onChange={(e) => setMyPrediction(e.target.value)}
                                className="bg-white/50 border-slate-200 rounded-xl"
                              />
                            </div>
                            <button 
                              type="submit"
                              disabled={!myPrediction.trim()}
                              className="bg-brand text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-brand/90 disabled:opacity-50 transition-all shadow-lg shadow-brand/20"
                            >
                              Predict
                            </button>
                          </form>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Login to make predictions and earn points!</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="news" className="mt-8 outline-none">
                    <NewsFeed category={selectedMatch.sport} />
                  </TabsContent>
                  <TabsContent value="highlights" className="mt-8 outline-none">
                    <HighlightFeed sport={selectedMatch.sport} />
                  </TabsContent>
                  <TabsContent value="stats" className="mt-8 outline-none text-slate-900 group">
                    <div className="space-y-8">
                      {selectedMatch.sport === 'cricket' && (
                        <CricketOversGraph matchId={selectedMatch.id} />
                      )}
                      {selectedMatch.sport === 'hockey' && (
                        <NHLPlayerStats playerId="8478402" /> // Default to McDavid for demo if no player context
                      )}
                      
                      <div className="flex flex-row items-center justify-between gap-4 py-4 px-6 glass rounded-2xl border-dashed border-2 border-slate-100 mb-6 pr-10">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="w-5 h-5 text-brand" />
                          <span className="text-xs font-black uppercase tracking-widest text-slate-400">Season Insights</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Live tournament aggregate data</p>
                      </div>

                      <TournamentStatistics 
                        tournamentId={selectedMatch.sport === 'football' ? "39" : "17"} 
                        seasonId={selectedMatch.sport === 'football' ? "2023" : "76986"} 
                        onPlayerClick={(name) => {
                          setPlayerSearchQuery(name);
                          searchPlayers(name);
                          setActiveMainTab("player-search");
                        }}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="lineups" className="mt-8 outline-none">
                    <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-10">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                          <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-slate-400">Tactical_Field_Analysis</h3>
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black tracking-widest">REAL_TIME_SYNC</Badge>
                        </div>
                        <FootballTacticalPitch match={selectedMatch} />
                      </div>
                      
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-10 duration-1000 delay-300">
                        <div className="space-y-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                              <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-widest text-white">Squad_Analytics</h4>
                              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">Formation_Integrity: 94.2%</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            {[
                              { label: 'Avg_Position', val: 'High_Press' },
                              { label: 'Intensity', val: 'Maximum' },
                              { label: 'Stability', val: 'Optimal' },
                              { label: 'Transition', val: 'Fast' },
                            ].map((s, i) => (
                              <div key={i} className="glass p-4 rounded-2xl border-white/5 space-y-1">
                                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">{s.label}</span>
                                <p className="text-sm font-black text-brand uppercase tracking-tighter">{s.val}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                            <Activity className="w-3 h-3" /> Tactical_Briefing
                          </h4>
                          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem] space-y-4 relative overflow-hidden group/brief">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/brief:opacity-30 transition-opacity">
                              <Zap className="w-12 h-12 text-brand" />
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
                              "Home team operating in a high-intensity 4-3-3. Defensive line pushed significantly forward to compress play, relying on the speed of recovery runs from Van Dijk. Full-backs Alexander-Arnold and Robertson maintaining auxiliary midfield positioning during build-up phases."
                            </p>
                            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                              <span className="text-[9px] font-mono text-slate-500 uppercase">Analysis_Source: AI_Tactician_v2</span>
                              <div className="flex gap-1">
                                <div className="w-1 h-1 rounded-full bg-brand animate-pulse" />
                                <div className="w-1 h-1 rounded-full bg-brand animate-pulse delay-75" />
                                <div className="w-1 h-1 rounded-full bg-brand animate-pulse delay-150" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-slate-400">Key_Performance_Nodes</h4>
                          <div className="space-y-3">
                            {['Mo Salah', 'Virgil van Dijk', 'Darwin Nunez'].map((name, i) => (
                              <div key={i} className="flex items-center justify-between p-4 glass rounded-2xl border-white/5 group-hover:bg-white/5 transition-all">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center text-brand font-black text-[10px]">#{10+i}</div>
                                  <span className="text-xs font-bold text-white tracking-tight">{name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className="text-[8px] font-mono text-slate-500 uppercase">Rating</div>
                                    <div className="text-xs font-black text-brand">8.{7-i}</div>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-slate-600" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="chat" className="mt-8 outline-none">
                      <Card className="glass border-sky-100 rounded-3xl overflow-hidden flex flex-col h-[500px]">
                        <ScrollArea className="flex-1 p-6">
                          <div className="space-y-6">
                            {messages.length > 0 ? (
                              messages.map((msg) => (
                                <div key={msg.id} className={cn(
                                  "flex items-start gap-3",
                                  msg.userId === user?.uid ? "flex-row-reverse" : "flex-row"
                                )}>
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center border border-slate-200 overflow-hidden">
                                    {msg.userPhoto ? (
                                      <img src={msg.userPhoto} alt={msg.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <User className="w-4 h-4 text-slate-400" />
                                    )}
                                  </div>
                                  <div className={cn(
                                    "max-w-[80%] space-y-1",
                                    msg.userId === user?.uid ? "items-end" : "items-start"
                                  )}>
                                    <div className="flex items-center gap-2 px-1">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{msg.userName}</span>
                                      <span className="text-[8px] text-slate-300">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className={cn(
                                      "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                                      msg.userId === user?.uid 
                                        ? "bg-brand text-white rounded-tr-none" 
                                        : "bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none"
                                    )}>
                                      {msg.text}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="flex flex-col items-center justify-center h-80 text-slate-200 space-y-4">
                                <MessageSquare className="w-12 h-12 stroke-[1]" />
                                <p className="text-xs font-bold uppercase tracking-[0.2em]">Start the conversation</p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                        <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                          {user ? (
                            <form onSubmit={sendMessage} className="flex gap-2">
                              <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Write a message..."
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                              />
                              <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="bg-brand text-white p-2.5 rounded-xl hover:bg-brand/90 disabled:opacity-50 transition-all shadow-lg shadow-brand/20"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </form>
                          ) : (
                            <button
                              onClick={login}
                              className="w-full py-2.5 bg-brand text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-brand/90 transition-all"
                            >
                              Login to Chat
                            </button>
                          )}
                        </div>
                      </Card>
                    </TabsContent>
                  </Tabs>

                  {/* Broadcast News Ticker */}
                  {selectedMatch.sport === 'football' && (
                    <div className="mt-8 border-t border-white/5 bg-black/40 backdrop-blur-md py-3 overflow-hidden relative group/ticker -mx-8 -mb-1">
                      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#0A0B0E] to-transparent z-10" />
                      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0A0B0E] to-transparent z-10" />
                      
                      <motion.div 
                        animate={{ x: [0, -1500] }}
                        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                        className="flex items-center gap-16 whitespace-nowrap px-16"
                      >
                        {[
                          { label: 'TACTICAL_ALERT', text: 'High defensive line detected for ' + selectedMatch.homeTeam },
                          { label: 'WEATHER_SYNC', text: 'Scattered clouds, 18°C, humidity 64%' },
                          { label: 'VAR_STATUS', text: 'System ready, no active reviews' },
                          { label: 'GLOBAL_PULSE', text: '84k fans connected to this frequency' },
                          { label: 'TRANSCRIPT', text: 'Match momentum shifting towards mid-pitch node' },
                          { label: 'PITCH_CONDITION', text: 'Surface temperature: 21°C - Drainage optimal' },
                          { label: 'STADIUM_LATENCY', text: 'Fiber uplink stable at 10Gbps' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-4">
                            <span className="text-[9px] font-mono font-black text-brand uppercase tracking-[0.3em]">{item.label}</span>
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{item.text}</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                          </div>
                        ))}
                      </motion.div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div 
              className="space-y-10 animate-in fade-in duration-1000 pb-20 relative neural-noise"
              onMouseMove={handleMapMouseMove}
            >
              {/* Cinematic Scanline Overlay */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[3rem] z-50">
                <div className="w-full h-1 bg-brand/10 shadow-[0_0_20px_rgba(14,165,233,0.2)] animate-scanline-sweep" />
              </div>

              {/* Tactical Sensory Ticker */}
              <div className="mx-4 bg-slate-950/80 border-y border-slate-900 backdrop-blur-2xl overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0A0B0E] to-transparent z-10" />
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0A0B0E] to-transparent z-10" />
                <div className="flex items-center gap-8 py-3 animate-marquee whitespace-nowrap">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-center gap-12">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-black text-brand uppercase tracking-widest">Neural_Sync:</span>
                        <span className="text-[11px] font-mono font-bold text-slate-300">Absolute global consensus achieved (99.2%)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-black text-emerald-500 uppercase tracking-widest">Active_Node:</span>
                        <span className="text-[11px] font-mono font-bold text-slate-300">London_44 reported Goal_Trigger </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest">Grid_Pulse:</span>
                        <span className="text-[11px] font-mono font-bold text-slate-300">Atmospheric variance detected in Berlin Hub</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-black text-rose-500 uppercase tracking-widest">Critical:</span>
                        <span className="text-[11px] font-mono font-bold text-slate-300">Tokyo_09 bandwidth peaking at 12.4Tb/s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* World Hub Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="px-4 py-1.5 bg-brand/10 border border-brand/20 rounded-full flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-brand animate-ping" />
                      <span className="text-[9px] font-mono font-black text-brand uppercase tracking-[0.4em]">Neural_Nerve_Center</span>
                    </div>
                  </div>
                  <h1 className="text-6xl md:text-[9rem] font-display font-black text-white uppercase tracking-tighter leading-none glow-text">
                    Global_<span className="text-brand">Hub</span>
                  </h1>
                </div>
                <div className="flex items-center gap-10 bg-[#0A0B0E]/80 border border-slate-800 p-8 rounded-[3.5rem] backdrop-blur-3xl shadow-2xl relative overflow-hidden group/header">
                   <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover/header:opacity-100 transition-opacity" />
                   <div className="flex flex-col text-right relative z-10">
                      <span className="text-[10px] font-mono text-slate-600 uppercase tracking-[0.3em] font-black leading-none mb-3">Sync_Stability</span>
                      <div className="flex items-center gap-4">
                        <span className="text-3xl font-mono font-bold text-white tabular-nums tracking-tighter">99.88%</span>
                        <div className="flex gap-1 h-6 items-end">
                          {[1,2,3,4,5,6].map(i => (
                            <div key={i} className={cn("w-1.5 rounded-full transition-all duration-500", i <= 5 ? "bg-brand animate-pulse" : "bg-slate-800")} style={{ height: `${20 + i * 15}%` }} />
                          ))}
                        </div>
                      </div>
                   </div>
                   <div className="w-px h-16 bg-slate-800" />
                   <div className="flex flex-col text-right relative z-10">
                      <span className="text-[10px] font-mono text-slate-600 uppercase tracking-[0.3em] font-black leading-none mb-3">Total_Data_Throughput</span>
                      <span className="text-3xl font-mono font-bold text-brand tabular-nums tracking-tighter">142.4<sub className="text-xs ml-1">PB/S</sub></span>
                   </div>
                </div>
              </div>

              {/* Command Center - Bento Grid Overhaul */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 px-4">
                
                {/* Neural Projection Map Hub - ULTIMATE FIDELITY */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98, y: 40 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  className="md:col-span-2 lg:col-span-3 bg-[#0A0B0E] rounded-[4rem] border border-slate-800/80 relative overflow-hidden group/bento shadow-[0_40px_100px_rgba(0,0,0,0.9)] tactical-cursor"
                >
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/15 via-transparent to-brand/5 pointer-events-none" />
                  <div className="absolute inset-0 hologram-flare opacity-30 pointer-events-none" />
                  
                  {/* Interactive Telemetry Overlay */}
                  <div className="absolute top-10 right-10 z-30 pointer-events-none font-mono text-[9px] text-brand/60 uppercase tracking-widest space-y-2 text-right">
                    <div className="p-4 bg-black/40 border border-brand/20 backdrop-blur-md rounded-2xl">
                      <div className="flex justify-between gap-8 mb-1">
                        <span>LAT_COORD</span>
                        <span className="text-white">{(mousePos.y / 5).toFixed(4)}°N</span>
                      </div>
                      <div className="flex justify-between gap-8 mb-1">
                        <span>LONG_COORD</span>
                        <span className="text-white">{(mousePos.x / 10).toFixed(4)}°E</span>
                      </div>
                      <div className="flex justify-between gap-8">
                        <span>ALT_PRESSURE</span>
                        <span className="text-white">1013.25 MB</span>
                      </div>
                    </div>
                    <div className="text-[7px] text-slate-500">REALTIME_SURVEILLANCE_ACTIVE</div>
                  </div>

                  <div className="relative z-10 flex flex-col h-full min-h-[700px]">
                    <div className="p-12 pb-0 flex flex-col md:flex-row md:items-start justify-between gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shadow-inner group-hover/bento:shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all">
                            <Compass className="w-6 h-6 text-brand animate-spin-slow" />
                          </div>
                          <div>
                            <h2 className="text-4xl lg:text-7xl font-display font-black text-white uppercase tracking-tighter leading-none">Neural_<span className="text-brand">Projection</span></h2>
                            <div className="mt-2 flex items-center gap-3">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                               <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Global sensory mesh synchronizing...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-4 bg-[#0F1115] border border-slate-800 py-4 px-8 rounded-2xl shadow-2xl backdrop-blur-xl group-hover/bento:border-brand/50 transition-colors">
                          <div className="flex flex-col">
                             <span className="text-[8px] font-mono font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Signal_Lock</span>
                             <span className="text-xl font-mono font-bold text-brand tabular-nums tracking-tighter">100.000%</span>
                          </div>
                          <div className="w-px h-8 bg-slate-800" />
                          <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 relative flex items-center justify-center p-16 overflow-hidden">
                      {/* Advanced SVG World Map with Topographic Layers */}
                      <div className="relative w-full max-w-6xl aspect-[2/1] scale-110">
                        <svg viewBox="0 0 1000 500" className="w-full h-full text-slate-800/10 fill-current">
                           {/* Layered Topographic Data */}
                           <path d="M200,100 Q400,0 600,100 T900,100 Q1000,200 900,300 T600,450 Q400,500 200,450 T0,300 T200,100" className="opacity-10 stroke-brand/5 stroke-1" fill="none" />
                           <path d="M220,120 Q420,20 620,120 T920,120 Q1020,220 920,320 T620,470 Q420,520 220,470 T20,320 T220,120" className="opacity-5 stroke-brand/10 stroke-[0.5]" fill="none" />
                           
                           {/* Base Map */}
                           <path d="M200,100 Q400,0 600,100 T900,100 Q1000,200 900,300 T600,450 Q400,500 200,450 T0,300 T200,100" className=" opacity-[0.03]" />
                           
                           {/* Neural Connection Paths - High Fidelity */}
                           <g className="text-brand opacity-60">
                              <path d="M200,180 L450,220" fill="none" stroke="url(#neuralGradient)" strokeWidth="1" strokeDasharray="5 5" className="animate-neural-dash" />
                              <path d="M450,220 L780,150" fill="none" stroke="url(#neuralGradient)" strokeWidth="1" strokeDasharray="5 5" className="animate-neural-dash" />
                              <path d="M780,150 L650,380" fill="none" stroke="url(#neuralGradient)" strokeWidth="1" strokeDasharray="5 5" className="animate-neural-dash" />
                              <path d="M650,380 L320,350" fill="none" stroke="url(#neuralGradient)" strokeWidth="1" strokeDasharray="5 5" className="animate-neural-dash" />
                              <path d="M320,350 L200,180" fill="none" stroke="url(#neuralGradient)" strokeWidth="1" strokeDasharray="5 5" className="animate-neural-dash" />
                              <defs>
                                <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
                                  <stop offset="50%" stopColor="#0ea5e9" stopOpacity="1" />
                                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.2" />
                                </linearGradient>
                              </defs>
                           </g>

                           {/* Node Pings */}
                           <g>
                              <circle cx="200" cy="180" r="6" className="text-brand fill-current animate-ping opacity-40" />
                              <circle cx="200" cy="180" r="2" className="text-brand fill-current" />
                              
                              <circle cx="450" cy="220" r="6" className="text-brand fill-current animate-ping opacity-40 duration-1000" />
                              <circle cx="450" cy="220" r="2" className="text-brand fill-current" />
                              
                              <circle cx="780" cy="150" r="6" className="text-brand fill-current animate-ping opacity-40 duration-700" />
                              <circle cx="780" cy="150" r="2" className="text-brand fill-current" />
                           </g>
                        </svg>

                        {/* Diag_Cursor Viewport Overlay */}
                        <div 
                          className="absolute pointer-events-none mix-blend-screen transition-all duration-75"
                          style={{ left: mousePos.x - 20, top: mousePos.y - 20 }}
                        >
                           <div className="w-10 h-10 border border-brand/40 rounded-sm relative opacity-40">
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-2 bg-brand/60" />
                              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-2 bg-brand/60" />
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-px bg-brand/60" />
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-px bg-brand/60" />
                           </div>
                        </div>
                        
                        {/* Interactive Node Callouts - Refined */}
                        <div className="absolute top-[20%] left-[15%] group/node">
                           <div className="absolute -inset-8 bg-brand/5 rounded-full scale-0 group-hover/node:scale-100 transition-transform duration-500" />
                           <div className="w-16 h-16 border border-brand/40 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm group-hover/node:border-brand transition-all relative z-10">
                              <div className="w-2.5 h-2.5 bg-brand rounded-full shadow-[0_0_15px_rgba(14,165,233,1)]" />
                           </div>
                           <div className="absolute top-0 left-20 bg-slate-950/95 border border-slate-800 p-4 rounded-2xl backdrop-blur-2xl scale-0 group-hover/node:scale-100 transition-all origin-left w-48 shadow-2xl z-20 border-l-brand/50 border-l-4">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[8px] font-mono font-black text-brand uppercase">Node_UK_Alpha</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-baseline">
                                  <span className="text-[7px] font-mono text-slate-500">STABILITY</span>
                                  <span className="text-xs font-mono font-bold text-white">99.4%</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                  <span className="text-[7px] font-mono text-slate-500">TEMP_INDEX</span>
                                  <span className="text-xs font-mono font-bold text-white">14.2°C</span>
                                </div>
                                <div className="pt-2 border-t border-slate-800">
                                   <div className="flex items-center gap-2">
                                      <div className="w-1 h-3 bg-brand" />
                                      <span className="text-[7px] font-mono text-brand uppercase italic">Stream_Optimal</span>
                                   </div>
                                </div>
                              </div>
                           </div>
                        </div>

                        <div className="absolute bottom-[20%] right-[25%] group/node">
                           <div className="absolute -inset-8 bg-amber-500/5 rounded-full scale-0 group-hover/node:scale-100 transition-transform duration-500" />
                           <div className="w-16 h-16 border border-amber-500/40 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm group-hover/node:border-amber-500 transition-all relative z-10">
                              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,1)]" />
                           </div>
                           <div className="absolute bottom-0 right-20 bg-slate-950/95 border border-slate-800 p-4 rounded-2xl backdrop-blur-2xl scale-0 group-hover/node:scale-100 transition-all origin-right w-48 shadow-2xl z-20 border-r-amber-500/50 border-r-4 text-right">
                              <div className="flex justify-between items-start mb-2 flex-row-reverse">
                                <span className="text-[8px] font-mono font-black text-amber-500 uppercase">Node_JPN_Prime</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-baseline flex-row-reverse">
                                  <span className="text-[7px] font-mono text-slate-500">STABILITY</span>
                                  <span className="text-xs font-mono font-bold text-white">88.2%</span>
                                </div>
                                <div className="flex justify-between items-baseline flex-row-reverse">
                                  <span className="text-[7px] font-mono text-slate-500">VAR_SENSING</span>
                                  <span className="text-xs font-mono font-bold text-white">LOW</span>
                                </div>
                                <div className="pt-2 border-t border-slate-800">
                                   <div className="flex items-center gap-2 justify-end">
                                      <span className="text-[7px] font-mono text-amber-500 uppercase italic">Calibrating...</span>
                                      <div className="w-1 h-3 bg-amber-500" />
                                   </div>
                                </div>
                              </div>
                           </div>
                        </div>
                      </div>
                      
                      {/* Technical Signal Deck - ULTIMATE GLASS */}
                      <div className="absolute bottom-12 left-12 right-12 pointer-events-none">
                        <div className="bg-[#050608]/90 border border-slate-800 p-8 rounded-[3.5rem] backdrop-blur-3xl shadow-[0_40px_80px_rgba(0,0,0,0.8)] flex flex-wrap items-center justify-between gap-12 relative overflow-hidden group/deck">
                           <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover/deck:opacity-100 transition-opacity" />
                           
                           <div className="flex items-center gap-16 relative z-10">
                              <div className="flex flex-col gap-3">
                                 <span className="text-[8px] font-mono text-slate-500 uppercase tracking-[0.4em] font-black italic">Neural Spectrum v4</span>
                                 <div className="flex items-end gap-1.5 h-8">
                                    {[1, 2, 3, 5, 2, 6, 8, 4, 3, 5, 7, 3, 2, 4, 6].map((h, i) => (
                                      <div key={i} className="w-2 bg-brand/30 animate-spectrum-wave rounded-full" style={{ animationDelay: `${i * 0.08}s`, height: `${h * 10}%` }} />
                                    ))}
                                 </div>
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-[8px] font-mono text-slate-600 uppercase tracking-[0.4em] font-black mb-1">Hub_Variance</span>
                                 <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-mono font-bold text-white tracking-tighter tabular-nums">+1.242</span>
                                    <span className="text-[10px] font-mono text-emerald-500 uppercase font-black">Stable</span>
                                 </div>
                              </div>
                           </div>

                           <div className="flex items-center gap-12 relative z-10">
                              <div className="hidden xl:flex flex-col gap-3 w-64">
                                 <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-[0.2em] text-slate-500 font-black">
                                   <span>Neural_Fabric_Elasticity</span>
                                   <span className="text-brand">99.98%</span>
                                 </div>
                                 <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                   <motion.div initial={{ width: 0 }} animate={{ width: "99.98%" }} transition={{ duration: 3, ease: "circOut" }} className="h-full bg-brand shadow-[0_0_20px_rgba(14,165,233,0.8)]" />
                                 </div>
                              </div>
                              <div className="w-px h-14 bg-slate-800" />
                              <div className="flex flex-col">
                                 <span className="text-[8px] font-mono text-slate-600 uppercase tracking-[0.4em] font-black mb-1">Global_Throughput</span>
                                 <span className="text-2xl font-mono font-bold text-brand tracking-tighter tabular-nums">1.24 <sub className="text-[10px]">TB/S</sub></span>
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Neural Node Registry - Diagnostic Table */}
                  <div className="border-t border-slate-800 bg-[#07080A]/50 p-12 relative z-10">
                    <div className="flex items-center justify-between mb-8">
                       <div className="flex items-center gap-3">
                          <Activity className="w-4 h-4 text-brand" />
                          <h3 className="text-xl font-display font-black text-white uppercase tracking-tighter">Neural_Node_Registry</h3>
                       </div>
                       <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Displaying Top 5 Active Latencies</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {[
                         { loc: "Mumbai_5", status: "SYNCED", lat: "12ms", data: "4.2TB", color: "text-emerald-500" },
                         { loc: "Frankfurt_2", status: "OPTIMAL", lat: "18ms", data: "8.9TB", color: "text-brand" },
                         { loc: "Sao_Paulo_9", status: "WARNING", lat: "142ms", data: "1.2TB", color: "text-amber-500" }
                       ].map((node, i) => (
                         <div key={i} className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] flex flex-col gap-4 group/nodeitem hover:border-brand/40 transition-colors">
                            <div className="flex justify-between items-center">
                               <span className="text-[9px] font-mono font-black text-white uppercase tracking-widest">{node.loc}</span>
                               <span className={cn("text-[7px] font-mono font-black px-2 py-0.5 rounded-full bg-black/40", node.color)}>{node.status}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="flex flex-col">
                                  <span className="text-[7px] font-mono text-slate-600 uppercase">Latency</span>
                                  <span className="text-xs font-mono font-bold text-slate-300">{node.lat}</span>
                               </div>
                               <div className="flex flex-col text-right">
                                  <span className="text-[7px] font-mono text-slate-600 uppercase">Throughput</span>
                                  <span className="text-xs font-mono font-bold text-slate-300">{node.data}</span>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                </motion.div>
                
                {/* Specialist Column - Deep Analytics */}
                <div className="md:col-span-2 lg:col-span-1 flex flex-col gap-8 lg:gap-12">
                  {/* Neural Oracle Node */}
                  <motion.div 
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 1 }}
                    className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-[0_40px_100px_rgba(0,0,0,0.08)] relative overflow-hidden group/oracle h-fit"
                  >
                    <div className="absolute -top-12 -right-12 p-8 opacity-[0.03] group-hover/oracle:scale-110 transition-transform duration-1000 rotate-12">
                      <TrendingUp className="w-64 h-64 text-slate-900" />
                    </div>
                    <div className="relative z-10 space-y-10">
                      <div className="flex justify-between items-start">
                        <div className="w-20 h-20 bg-slate-950 rounded-[2.5rem] flex items-center justify-center text-brand shadow-2xl shadow-brand/40 group-hover/oracle:rotate-3 transition-transform">
                          <Zap className="w-10 h-10 shadow-[0_0_20px_rgba(14,165,233,0.5)]" />
                        </div>
                        <div className="flex flex-col text-right">
                           <span className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em] font-black mb-1">Model: Prophet_v32X</span>
                           <Badge variant="outline" className="text-[9px] border-emerald-500/20 text-emerald-500 bg-emerald-500/5 uppercase font-black px-3 tracking-widest">Active_Briefing</Badge>
                        </div>
                      </div>
                      <div className="space-y-8">
                         <div className="space-y-2">
                            <h3 className="text-4xl lg:text-5xl font-display font-black uppercase tracking-tighter text-slate-900 leading-none">Neural_<span className="text-brand">Oracle</span></h3>
                            <p className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-[0.4em] leading-none">Global Inference Engine Engaged</p>
                         </div>
                         <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 relative overflow-hidden group/inf">
                            <div className="absolute inset-y-0 left-0 w-1 bg-brand" />
                            <p className="text-sm text-slate-700 leading-relaxed font-medium">
                               Detected a massive <span className="text-slate-950 font-black italic">Atmospheric_Pressure</span> shift in the UEFA_DOMAIN. Probability of top-tier upsets: <span className="text-brand font-black">64.2%</span>.
                            </p>
                         </div>
                         <button className="w-full py-6 bg-slate-950 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.4em] hover:bg-brand transition-all shadow-2xl shadow-brand/20 active:scale-[0.98] flex items-center justify-center gap-4 group/btn">
                           Access Inference Nodes
                           <ChevronRight className="w-5 h-5 text-brand group-hover/btn:translate-x-2 transition-transform" />
                         </button>
                      </div>
                    </div>
                  </motion.div>

                  {/* Diag_Terminal Viewport */}
                  <motion.div 
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 1 }}
                    className="bg-[#0A0B0E] rounded-[4rem] border border-slate-800/60 relative overflow-hidden group/terminal flex-1 min-h-[400px]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent opacity-0 group-hover/terminal:opacity-100 transition-opacity" />
                    <div className="p-12 relative z-10 flex flex-col h-full gap-10">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                             <span className="text-[11px] font-mono font-black text-slate-200 uppercase tracking-[0.4em]">Diag_Terminal</span>
                          </div>
                          <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg">
                            <span className="text-[9px] font-mono text-slate-600 uppercase font-black">Session: 0x4F4C</span>
                          </div>
                       </div>
                       <div className="flex-1 space-y-5 font-mono text-[10px] leading-relaxed text-slate-400 no-scrollbar overflow-auto">
                          {[
                            { label: "COORD_LOCK", val: "44.SYNC", color: "text-slate-200" },
                            { label: "LINK_STATE", val: "STABLE", color: "text-emerald-500" },
                            { label: "BURST_MODE", val: "ENABLED", color: "text-brand" },
                            { label: "ENTROPY", val: "0.00224", color: "text-amber-500" }
                          ].map((item, i) => (
                            <div key={i} className="flex gap-4 group/termline">
                               <span className="text-brand/30 group-hover/termline:text-brand transition-colors font-black">#</span>
                               <span className="flex-1 border-b border-slate-900 pb-1 flex justify-between">
                                  <span>{item.label}:</span>
                                  <span className={cn("font-bold", item.color)}>{item.val}</span>
                               </span>
                            </div>
                          ))}
                          <div className="flex gap-4 animate-pulse mt-8">
                             <span className="text-brand/50 font-black">{">"}</span>
                             <span className="text-brand font-black uppercase tracking-widest">Waiting for neural_handshake...</span>
                          </div>
                       </div>
                       <div className="pt-6 border-t border-slate-800 mt-auto">
                          <div className="flex items-center justify-between mb-2">
                             <span className="text-[8px] font-mono text-slate-600 uppercase font-black tracking-widest">Nerve_Load</span>
                             <span className="text-[10px] font-mono text-brand font-bold">82.4%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                             <div className="w-4/5 h-full bg-brand shadow-[0_0_10px_rgba(14,165,233,0.4)]" />
                          </div>
                       </div>
                    </div>
                  </motion.div>
                </div>

                {/* Final Performance Bento Grid */}
                <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                   {[
                     { label: "Neural Load", val: "92.4%", icon: Activity, desc: "Processing_Stress", color: "text-brand" },
                     { label: "Global Bandwidth", val: "1.24 Tb/s", icon: Radio, desc: "Throughput_Stability", color: "text-emerald-500" },
                     { label: "Sync Latency", val: "14.2ms", icon: Clock, desc: "Mean_Response", color: "text-amber-500" },
                     { label: "Neural Nodes", val: "16k+", icon: Users, desc: "Grid_Population", color: "text-rose-500" }
                   ].map((stat, i) => (
                     <motion.div
                       key={i}
                       initial={{ opacity: 0, scale: 0.9 }}
                       animate={{ opacity: 1, scale: 1 }}
                       transition={{ delay: 0.6 + (i * 0.1), duration: 0.8 }}
                       className="bg-[#0A0B0E] border border-slate-800 rounded-[3rem] p-10 flex flex-col gap-8 group/statcard hover:bg-slate-900 transition-all cursor-crosshair shadow-2xl relative overflow-hidden"
                     >
                        <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover/statcard:opacity-100 transition-opacity" />
                        <div className="flex items-center justify-between relative z-10">
                           <div className={cn("w-16 h-16 rounded-2xl bg-black/40 border border-slate-800 flex items-center justify-center transition-transform group-hover/statcard:rotate-6", stat.color)}>
                              <stat.icon className="w-8 h-8" />
                           </div>
                           <div className="flex flex-col text-right">
                              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black leading-none mb-1">Status</span>
                              <span className="text-[9px] font-mono text-emerald-500 uppercase font-black">Optimal</span>
                           </div>
                        </div>
                        <div className="space-y-2 relative z-10">
                           <h3 className="text-5xl font-mono font-bold text-white tracking-tighter tabular-nums leading-none">{stat.val}</h3>
                           <p className="text-[12px] font-display font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        </div>
                        <div className="pt-6 border-t border-slate-800 relative z-10">
                           <p className="text-[8px] font-mono text-slate-600 uppercase tracking-[0.3em] font-black italic">{stat.desc}</p>
                        </div>
                     </motion.div>
                   ))}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="social" className="outline-none">
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                {selectedLeague !== "all" ? `${selectedLeague} Social Feed` : selectedSport !== "all" ? `${selectedSport} Social Feed` : "Global Social Feed"}
              </h2>
              <Badge variant="outline" className="bg-brand/5 text-brand border-brand/20 text-[10px] font-bold">
                {filteredSocialEvents.length} Recent Activities
              </Badge>
            </div>
            <ScrollArea className="h-[700px] pr-4">
              <div className="space-y-4">
                {filteredSocialEvents.length > 0 ? (
                  filteredSocialEvents.map((event, i) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="glass border-sky-100 rounded-2xl overflow-hidden glass-hover">
                        <CardContent className="p-4 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center border border-sky-100 overflow-hidden shrink-0">
                            {event.userPhoto ? (
                              <img src={event.userPhoto} alt={event.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-brand/10">
                                {event.type === 'match_event' ? <Activity className="w-5 h-5 text-brand" /> : <User className="w-5 h-5 text-brand" />}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">{event.userName || "Match Engine"}</span>
                              <span className="text-[10px] text-slate-400">{new Date(event.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">
                              {event.type === 'match_event' && (
                                <span 
                                  onClick={() => {
                                    setActiveMainTab("matches");
                                    setSelectedMatchId(event.matchId);
                                  }}
                                  className="text-brand font-bold mr-2 cursor-pointer hover:underline"
                                >
                                  [{event.matchName}]
                                </span>
                              )}
                              {event.content}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                      <Share2 className="w-8 h-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">No recent activity</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {selectedLeague !== "all" 
                          ? `No social events for ${selectedLeague} yet.` 
                          : "Check back later for updates."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="outline-none">
          <div className="space-y-8">
            <div className="text-center space-y-4 py-8">
              <div className="w-20 h-20 bg-amber-100 rounded-3xl mx-auto flex items-center justify-center border-4 border-white shadow-xl rotate-6">
                <Award className="w-10 h-10 text-amber-600" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Global Leaderboard</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top Predictors & Analysts</p>
              </div>
            </div>

            <div className="grid gap-4">
              {leaderboard.map((profile, i) => (
                <motion.div
                  key={profile.uid}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className={cn(
                    "flex items-center gap-6 p-4 rounded-2xl border transition-all",
                    i === 0 ? "bg-amber-50/50 border-amber-200 shadow-lg shadow-amber-500/5" : "glass border-sky-100"
                  )}>
                    <div className="w-8 text-center">
                      <span className={cn(
                        "text-lg font-black font-display",
                        i === 0 ? "text-amber-600" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-800" : "text-slate-300"
                      )}>#{i + 1}</span>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-100 overflow-hidden shrink-0">
                      {profile.photoURL ? (
                        <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-sky-50">
                          <User className="w-6 h-6 text-brand" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">{profile.displayName}</h4>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest line-clamp-1">{profile.bio || "No bio yet"}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-slate-900 tabular-nums">{profile.points}</div>
                      <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Points</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="player-search" className="outline-none">
          <div className="space-y-8">
            <div className="glass p-8 rounded-[2rem] border-sky-100 space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <Input
                  placeholder="Search football players (e.g. Messi, Ronaldo, Arsenal)..."
                  value={playerSearchQuery}
                  onChange={(e) => setPlayerSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchPlayers(playerSearchQuery)}
                  className="bg-white border-slate-200 rounded-xl h-12 flex-1"
                />
                <button
                  onClick={() => searchPlayers(playerSearchQuery)}
                  disabled={searchingPlayers || !playerSearchQuery.trim()}
                  className="bg-brand text-white px-8 h-12 rounded-xl font-bold uppercase tracking-widest hover:bg-brand/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {searchingPlayers ? <Activity className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search
                </button>
              </div>
              {usingAiSearch && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-brand/80 text-[10px] font-bold uppercase tracking-widest bg-brand/5 px-4 py-2 rounded-lg border border-brand/20 w-fit"
                >
                  <Zap className="w-3 h-3 animate-pulse" />
                  AI Fallback Search Active
                </motion.div>
              )}
            </div>

            <ScrollArea className="h-[600px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {playerSearchResults.map((player, i) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="glass border-sky-100 rounded-3xl overflow-hidden glass-hover h-full flex flex-col">
                      <div className="aspect-[4/5] bg-sky-50 relative overflow-hidden group/img">
                        {player.player_image ? (
                          <img 
                            src={player.player_image} 
                            alt={player.player_name} 
                            className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700"
                            referrerPolicy="no-referrer"
                            onError={(e: any) => {
                              // Secondary failover for broken external URLs
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.player_name)}&background=f1f5f9&color=64748b&size=512`;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-20 h-20 text-slate-200" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
                        {player.player_number && (
                          <div className="absolute top-4 right-4 bg-brand text-white w-10 h-10 rounded-full flex items-center justify-center font-black italic shadow-lg">
                            {player.player_number}
                          </div>
                        )}
                      </div>
                      <CardContent className="p-6 space-y-4 flex-1 flex flex-col">
                        <div className="space-y-1">
                          <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 line-clamp-1">{player.player_name}</h3>
                          <div className="flex items-center gap-2">
                             <Badge variant="outline" className="bg-sky-50 text-[9px] font-bold uppercase py-0">{player.player_position}</Badge>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{player.player_age} years</span>
                          </div>
                        </div>
                        
                        <div className="mt-auto space-y-3 pt-4 border-t border-slate-50">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Country</span>
                              <span className="text-xs font-bold text-slate-900">{player.player_country}</span>
                           </div>
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rating</span>
                              <span className="text-xs font-black text-brand italic tracking-tighter">★ {player.player_rating}</span>
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}

                {playerSearchResults.length === 0 && !searchingPlayers && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-center space-y-6 opacity-30">
                    <Users className="w-20 h-20 stroke-[1]" />
                    <p className="text-sm font-bold uppercase tracking-[0.3em]">No players found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="rankings" className="outline-none">
          <Tabs defaultValue="football" className="w-full">
            <div className="flex justify-center mb-10">
              <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 h-auto">
                <TabsTrigger value="football" className="px-8 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg shadow-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-widest transition-all">
                  Football
                </TabsTrigger>
                <TabsTrigger value="basketball" className="px-8 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg shadow-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-widest transition-all">
                  Basketball
                </TabsTrigger>
                <TabsTrigger value="hockey" className="px-8 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg shadow-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-widest transition-all">
                  Hockey
                </TabsTrigger>
                <TabsTrigger value="cricket" className="px-8 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg shadow-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-widest transition-all">
                  Cricket
                </TabsTrigger>
                <TabsTrigger value="tennis" className="px-8 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg shadow-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-widest transition-all">
                  Tennis
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="football">
              <FootballRankings onTeamClick={(leagueId, teamName) => {
                setActiveMainTab("matches");
                if (teamName) {
                  setMatchSearchQuery(teamName);
                }
              }} />
            </TabsContent>
            <TabsContent value="basketball">
              <BasketballRankings onTeamClick={(teamName) => {
                setActiveMainTab("matches");
                if (teamName) {
                  setMatchSearchQuery(teamName);
                }
              }} />
            </TabsContent>
            <TabsContent value="hockey">
              <HockeyRankings onTeamClick={(teamName) => {
                setActiveMainTab("matches");
                if (teamName) {
                  setMatchSearchQuery(teamName);
                }
              }} />
            </TabsContent>
            <TabsContent value="cricket">
              <CricketRankings onPlayerClick={(name) => {
                setPlayerSearchQuery(name);
                searchPlayers(name);
                setActiveMainTab("player-search");
              }} />
            </TabsContent>
            <TabsContent value="tennis">
              <TennisRankings onPlayerClick={(name) => {
                setPlayerSearchQuery(name);
                searchPlayers(name);
                setActiveMainTab("player-search");
              }} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  </main>

  {/* Profile Modal */}
  <AnimatePresence>
    {isProfileOpen && userProfile && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsProfileOpen(false)}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg glass border-sky-100 rounded-[2.5rem] overflow-hidden shadow-2xl"
        >
          <div className="p-8 md:p-10 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">User Profile</h2>
              <button onClick={() => setIsProfileOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                <Zap className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={updateProfile} className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-sky-50 border-2 border-white shadow-lg overflow-hidden shrink-0">
                  {profileForm.photoURL ? (
                    <img src={profileForm.photoURL} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-brand/10">
                      <User className="w-10 h-10 text-brand" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profile Photo URL</Label>
                  <Input 
                    value={profileForm.photoURL}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, photoURL: e.target.value }))}
                    placeholder="https://..."
                    className="bg-white/50 border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Display Name</Label>
                <Input 
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                  className="bg-white/50 border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bio</Label>
                <Textarea 
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                  className="bg-white/50 border-slate-200 rounded-xl min-h-[100px]"
                  placeholder="Tell the world about your analysis style..."
                />
              </div>

              <Separator className="bg-slate-100" />

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notification Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <Label className="text-xs font-bold text-slate-600">Goals</Label>
                    <Switch 
                      checked={userProfile.notificationSettings.goals} 
                      onCheckedChange={(v) => updateNotificationSettings("goals", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <Label className="text-xs font-bold text-slate-600">Cards</Label>
                    <Switch 
                      checked={userProfile.notificationSettings.cards} 
                      onCheckedChange={(v) => updateNotificationSettings("cards", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <Label className="text-xs font-bold text-slate-600">Match Start</Label>
                    <Switch 
                      checked={userProfile.notificationSettings.matchStart} 
                      onCheckedChange={(v) => updateNotificationSettings("matchStart", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <Label className="text-xs font-bold text-slate-600">Match End</Label>
                    <Switch 
                      checked={userProfile.notificationSettings.matchEnd} 
                      onCheckedChange={(v) => updateNotificationSettings("matchEnd", v)}
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-brand text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-brand/90 transition-all shadow-xl shadow-brand/20"
              >
                Save Changes
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>

      {/* Footer Ticker */}
      <footer className="fixed bottom-0 left-0 right-0 bg-brand text-white py-3 overflow-hidden z-50 shadow-[0_-10px_40px_rgba(14,165,233,0.2)]">
        <div className="flex whitespace-nowrap animate-marquee">
          {Array(10).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-12 px-12">
              {matches.map(m => (
                <div 
                  key={m.id} 
                  onClick={() => {
                    setActiveMainTab("matches");
                    setSelectedMatchId(m.id);
                  }}
                  className="flex items-center gap-4 font-black uppercase text-xs italic tracking-tighter cursor-pointer hover:text-white/80 transition-colors group/ticker"
                >
                  <span className="text-white/60 group-hover/ticker:text-white">{m.sport}</span>
                  <span>{m.homeTeam}</span>
                  <span className="bg-white text-brand px-3 py-0.5 rounded-full text-[10px] not-italic">{m.homeScore} - {m.awayScore}</span>
                  <span>{m.awayTeam}</span>
                  <span className="text-white/40 text-[9px] font-bold tracking-widest ml-1">{m.timestamp ? `${format(m.timestamp, "HH:mm")} (Local)` : m.time}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 60s linear infinite;
        }
      `}</style>
    </div>
  );
}
