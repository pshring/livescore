import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Match, MatchEvent } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Trophy, Clock, Activity, MessageSquare, Zap, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { GoogleGenAI } from "@google/genai";

const socket: Socket = io();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const processedEvents = useRef<Set<string>>(new Set());

  const generateCommentary = async (match: Match, event: MatchEvent) => {
    if (processedEvents.current.has(event.id)) return;
    processedEvents.current.add(event.id);

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
    } catch (error) {
      console.error("Gemini Error:", error);
    }
  };

  useEffect(() => {
    fetch("/api/matches")
      .then((res) => res.json())
      .then((data) => {
        setMatches(data);
        if (data.length > 0) setSelectedMatchId(data[0].id);
        setLoading(false);
      });

    socket.on("matchUpdate", (updatedMatch: Match) => {
      setMatches((prev) => {
        const existing = prev.find(m => m.id === updatedMatch.id);
        const newEvents = updatedMatch.events.filter(e => !existing?.events.some(ee => ee.id === e.id));
        
        // Trigger commentary for new events
        newEvents.forEach(e => generateCommentary(updatedMatch, e));

        return prev.map((m) => (m.id === updatedMatch.id ? {
          ...updatedMatch,
          // Preserve already generated commentaries if any
          events: updatedMatch.events.map(e => {
            const oldEvent = existing?.events.find(ee => ee.id === e.id);
            return oldEvent?.aiCommentary && !e.aiCommentary.includes("!") ? { ...e, aiCommentary: oldEvent.aiCommentary } : e;
          })
        } : m));
      });
    });

    return () => {
      socket.off("matchUpdate");
    };
  }, []);

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-yellow-400 selection:text-black">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-400 rounded-sm flex items-center justify-center">
              <Zap className="text-black w-5 h-5 fill-current" />
            </div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">
              LiveScore<span className="text-yellow-400">X</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-yellow-400/50 text-yellow-400 animate-pulse">
              <Activity className="w-3 h-3 mr-1" /> LIVE UPDATES
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Match List */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">Active Matches</h2>
            <span className="text-xs font-mono text-yellow-400">{matches.filter(m => m.status === 'live').length} LIVE</span>
          </div>
          
          <div className="space-y-3">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-24 bg-white/5 rounded-lg animate-pulse" />
              ))
            ) : (
              matches.map((match) => (
                <motion.div
                  key={match.id}
                  layoutId={match.id}
                  onClick={() => setSelectedMatchId(match.id)}
                  className={cn(
                    "group cursor-pointer p-4 rounded-xl border transition-all duration-300",
                    selectedMatchId === match.id
                      ? "bg-white/10 border-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.1)]"
                      : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/[0.07]"
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant={match.status === 'live' ? "default" : "secondary"} 
                           className={cn(match.status === 'live' ? "bg-red-500 hover:bg-red-600" : "bg-white/10")}>
                      {match.status === 'live' ? "LIVE" : match.status.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-mono text-white/40">{match.time}</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold truncate">{match.homeTeam}</span>
                        <span className="font-mono text-lg">{match.homeScore}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold truncate">{match.awayTeam}</span>
                        <span className="font-mono text-lg">{match.awayScore}</span>
                      </div>
                    </div>
                    <ChevronRight className={cn("w-5 h-5 transition-transform", selectedMatchId === match.id ? "text-yellow-400 translate-x-1" : "text-white/20")} />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Main Content: Match Details */}
        <div className="lg:col-span-8 space-y-8">
          {selectedMatch ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedMatch.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Scoreboard */}
                <Card className="bg-gradient-to-br from-white/10 to-transparent border-white/10 overflow-hidden">
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="text-center space-y-4 flex-1">
                        <div className="w-20 h-20 bg-white/5 rounded-full mx-auto flex items-center justify-center border border-white/10">
                          <Trophy className="w-10 h-10 text-yellow-400" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">{selectedMatch.homeTeam}</h3>
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-6">
                          <span className="text-7xl font-black tracking-tighter tabular-nums">{selectedMatch.homeScore}</span>
                          <span className="text-4xl font-light text-white/20">:</span>
                          <span className="text-7xl font-black tracking-tighter tabular-nums">{selectedMatch.awayScore}</span>
                        </div>
                        <div className="flex items-center gap-2 text-yellow-400 font-mono text-sm bg-yellow-400/10 px-3 py-1 rounded-full">
                          <Clock className="w-4 h-4" />
                          {selectedMatch.time}
                        </div>
                      </div>

                      <div className="text-center space-y-4 flex-1">
                        <div className="w-20 h-20 bg-white/5 rounded-full mx-auto flex items-center justify-center border border-white/10">
                          <Trophy className="w-10 h-10 text-white/40" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">{selectedMatch.awayTeam}</h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Commentary & Events */}
                <Tabs defaultValue="commentary" className="w-full">
                  <TabsList className="bg-white/5 border border-white/10 p-1 w-full justify-start h-12">
                    <TabsTrigger value="commentary" className="data-[state=active]:bg-white/10 data-[state=active]:text-yellow-400">
                      <MessageSquare className="w-4 h-4 mr-2" /> Commentary
                    </TabsTrigger>
                    <TabsTrigger value="events" className="data-[state=active]:bg-white/10 data-[state=active]:text-yellow-400">
                      <Activity className="w-4 h-4 mr-2" /> Match Events
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="commentary" className="mt-6">
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-6">
                        {selectedMatch.events.length > 0 ? (
                          selectedMatch.events.map((event, i) => (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="relative pl-8 border-l border-white/10 pb-6 last:pb-0"
                            >
                              <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-mono text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">{event.time}</span>
                                  <span className="text-sm font-bold uppercase tracking-wider">{event.type}</span>
                                </div>
                                <p className="text-white/80 leading-relaxed">{event.description}</p>
                                {event.aiCommentary && (
                                  <div className="bg-white/5 p-4 rounded-lg border border-white/5 italic text-white/60 text-sm flex gap-3">
                                    <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                                    "{event.aiCommentary}"
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center h-64 text-white/20 space-y-4">
                            <MessageSquare className="w-12 h-12" />
                            <p>Waiting for match events...</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="events" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <Card className="bg-white/5 border-white/10">
                         <CardHeader>
                           <CardTitle className="text-sm uppercase tracking-widest text-white/40">Possession</CardTitle>
                         </CardHeader>
                         <CardContent>
                            <div className="flex items-center justify-between mb-2">
                              <span>{selectedMatch.homeTeam}</span>
                              <span>54%</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-400 w-[54%]" />
                            </div>
                         </CardContent>
                       </Card>
                       <Card className="bg-white/5 border-white/10">
                         <CardHeader>
                           <CardTitle className="text-sm uppercase tracking-widest text-white/40">Shots on Target</CardTitle>
                         </CardHeader>
                         <CardContent>
                            <div className="flex items-center justify-between mb-2">
                              <span>{selectedMatch.homeTeam}</span>
                              <span>8</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>{selectedMatch.awayTeam}</span>
                              <span>5</span>
                            </div>
                         </CardContent>
                       </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white/20 space-y-4">
              <Zap className="w-16 h-16" />
              <p className="text-xl font-bold uppercase tracking-tighter">Select a match to view live updates</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer Ticker */}
      <footer className="fixed bottom-0 left-0 right-0 bg-yellow-400 text-black py-2 overflow-hidden z-50">
        <div className="flex whitespace-nowrap animate-marquee">
          {Array(10).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-8 px-8">
              {matches.map(m => (
                <div key={m.id} className="flex items-center gap-2 font-black uppercase text-sm italic">
                  <span>{m.homeTeam}</span>
                  <span className="bg-black text-yellow-400 px-2 rounded">{m.homeScore}-{m.awayScore}</span>
                  <span>{m.awayTeam}</span>
                  <Separator orientation="vertical" className="h-4 bg-black/20 mx-4" />
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
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </div>
  );
}
