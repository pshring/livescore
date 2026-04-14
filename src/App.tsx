import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Match, MatchEvent } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Clock, Activity, MessageSquare, Zap, ChevronRight, LogIn, LogOut, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { GoogleGenAI } from "@google/genai";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from "firebase/auth";
import { collection, onSnapshot, query, doc, setDoc, getDocFromServer } from "firebase/firestore";

const socket: Socket = io();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const processedEvents = useRef<Set<string>>(new Set());
  const requestQueue = useRef<(() => Promise<void>)[]>([]);
  const isProcessingQueue = useRef(false);
  const lastRequestTime = useRef(0);
  const MIN_REQUEST_GAP = 15000; // 15 seconds between requests (4 RPM)
  const [isAiThrottled, setIsAiThrottled] = useState(false);
  const throttleTimer = useRef<NodeJS.Timeout | null>(null);

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
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        // Sync user to Firestore
        const userRef = doc(db, "users", currentUser.uid);
        setDoc(userRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          role: "user" // Default role
        }, { merge: true });
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
          .then((res) => res.json())
          .then((data) => {
            setMatches(data);
            if (data.length > 0 && !selectedMatchId) setSelectedMatchId(data[0].id);
            setLoading(false);
          });
      });
    } catch (error) {
      console.error("Firestore Initialization Error:", error);
      setLoading(false);
    }

    // Initial fetch from API as a secondary fallback/speedup
    fetch("/api/matches")
      .then((res) => res.json())
      .then((data) => {
        setMatches(prev => prev.length === 0 ? data : prev);
        if (data.length > 0 && !selectedMatchId) setSelectedMatchId(data[0].id);
        setLoading(false);
      });

    socket.on("matchUpdate", (updatedMatch: Match) => {
      // Socket still used for immediate UI feedback before Firestore syncs
      setMatches((prev) => {
        const existing = prev.find(m => m.id === updatedMatch.id);
        const newEvents = updatedMatch.events.filter(e => !existing?.events.some(ee => ee.id === e.id));
        
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

    return () => {
      unsubscribeAuth();
      unsubscribeMatches();
      socket.off("matchUpdate");
    };
  }, []);

  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => signOut(auth);

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);

  const [predictions, setPredictions] = useState<Record<string, string>>({});
  const [predicting, setPredicting] = useState<Record<string, boolean>>({});
  const predictingRef = useRef<Record<string, boolean>>({});
  const [enabledCommentaryMatches, setEnabledCommentaryMatches] = useState<Set<string>>(new Set());
  const enabledMatchesRef = useRef<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("commentary");

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

    addToQueue(async () => {
      try {
        const prompt = `You are a sports analyst. 
        Match: ${match.homeTeam} vs ${match.awayTeam} (${match.sport})
        Current Score: ${match.homeScore} - ${match.awayScore}
        Time: ${match.time}
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
        console.error("Prediction Error:", error);
        if (isRateLimitError(error)) throw error;
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

  return (
    <div className="min-h-screen bg-surface text-slate-900 font-sans selection:bg-brand selection:text-white relative overflow-x-hidden">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#0ea5e908_1px,transparent_1px),linear-gradient(to_bottom,#0ea5e908_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-line bg-surface/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
          <div className="flex items-center gap-4 shrink-0">
            <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center glow-brand rotate-3">
              <Zap className="text-white w-6 h-6 fill-current -rotate-3" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic font-display text-slate-900">
              LiveScore<span className="text-brand">X</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-10 overflow-hidden">
            <div className="hidden lg:flex items-center gap-10 text-xs font-bold uppercase tracking-widest text-slate-400 shrink-0">
              <span className="hover:text-brand transition-colors cursor-pointer">Football</span>
              <span className="hover:text-brand transition-colors cursor-pointer">Basketball</span>
              <span className="hover:text-brand transition-colors cursor-pointer">Tennis</span>
              <span className="hover:text-brand transition-colors cursor-pointer">Formula 1</span>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">{user.displayName}</span>
                    <button onClick={logout} className="text-[9px] font-bold text-slate-400 uppercase hover:text-red-500 transition-colors">Logout</button>
                  </div>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-sky-100" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center border border-sky-100">
                      <User className="w-4 h-4 text-brand" />
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={login}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-50 text-brand border border-sky-100 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand hover:text-white transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" /> Login
                </button>
              )}
            </div>

            <Badge variant="outline" className="border-brand/30 text-brand bg-brand/5 px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-brand mr-2 animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest uppercase">Live Engine Active</span>
            </Badge>

            {isAiThrottled && (
              <Badge variant="outline" className="border-red-500/50 text-red-500 bg-red-500/10 px-3 py-1 rounded-full animate-pulse">
                <span className="text-[10px] font-bold tracking-widest uppercase">Quota Reached - Cooling Down (2m)</span>
              </Badge>
            )}
            {!isAiThrottled && requestQueue.current.length > 0 && (
              <Badge variant="outline" className="border-brand/50 text-brand bg-brand/10 px-3 py-1 rounded-full animate-pulse">
                <span className="text-[10px] font-bold tracking-widest uppercase">AI Queue: {requestQueue.current.length}</span>
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar: Match List */}
        <div className="lg:col-span-4 space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Match Center</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
              <span className="text-xs font-bold text-brand uppercase tracking-wider">{matches.filter(m => m.status === 'live').length} Live Now</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-28 glass rounded-2xl animate-pulse" />
              ))
            ) : (
              matches.map((match) => (
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
                    <span className="text-[10px] font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded uppercase">{match.time}</span>
                  </div>
                  
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "font-bold tracking-tight transition-colors",
                        selectedMatchId === match.id ? "text-slate-900" : "text-slate-600"
                      )}>{match.homeTeam}</span>
                      <span className="font-display font-bold text-xl tabular-nums text-slate-900">{match.homeScore}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "font-bold tracking-tight transition-colors",
                        selectedMatchId === match.id ? "text-slate-900" : "text-slate-600"
                      )}>{match.awayTeam}</span>
                      <span className="font-display font-bold text-xl tabular-nums text-slate-900">{match.awayScore}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Main Content: Match Details */}
        <div className="lg:col-span-8">
          {selectedMatch ? (
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
                  <div className="absolute -inset-1 bg-gradient-to-r from-brand/20 via-transparent to-brand/20 rounded-[2rem] blur-2xl opacity-30 group-hover:opacity-50 transition duration-1000" />
                  <Card className="glass border-sky-100 rounded-[2rem] overflow-hidden relative inner-glow">
                    <CardContent className="p-12">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="text-center space-y-6 flex-1">
                          <div className="w-24 h-24 bg-sky-50 rounded-3xl mx-auto flex items-center justify-center border border-sky-100 shadow-sm rotate-3 group-hover:rotate-0 transition-transform duration-500">
                            <Trophy className="w-12 h-12 text-brand" />
                          </div>
                          <h3 className="text-3xl font-black uppercase tracking-tighter font-display text-slate-900">{selectedMatch.homeTeam}</h3>
                        </div>

                        <div className="flex flex-col items-center gap-6">
                          <div className="flex items-center gap-8">
                            <span className="text-8xl font-black tracking-tighter tabular-nums font-display text-slate-900 text-glow">{selectedMatch.homeScore}</span>
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-1 h-1 rounded-full bg-slate-200" />
                              <div className="w-1 h-1 rounded-full bg-slate-200" />
                              <div className="w-1 h-1 rounded-full bg-slate-200" />
                            </div>
                            <span className="text-8xl font-black tracking-tighter tabular-nums font-display text-slate-900 text-glow">{selectedMatch.awayScore}</span>
                          </div>
                          <div className="flex items-center gap-3 text-brand font-bold tracking-[0.2em] text-xs bg-brand/10 px-6 py-2 rounded-full border border-brand/20 uppercase">
                            <Clock className="w-4 h-4 animate-pulse" />
                            {selectedMatch.time}
                          </div>
                        </div>

                        <div className="text-center space-y-6 flex-1">
                          <div className="w-24 h-24 bg-sky-50 rounded-3xl mx-auto flex items-center justify-center border border-sky-100 shadow-sm -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                            <Trophy className="w-12 h-12 text-slate-200" />
                          </div>
                          <h3 className="text-3xl font-black uppercase tracking-tighter font-display text-slate-900">{selectedMatch.awayTeam}</h3>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Commentary & Events */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                      <TabsList className="glass p-1.5 rounded-2xl w-full md:w-auto flex justify-start h-auto gap-1">
                        <TabsTrigger value="commentary" className="rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all">
                          <MessageSquare className="w-4 h-4 mr-2" /> Commentary
                        </TabsTrigger>
                        <TabsTrigger value="events" className="rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all">
                          <Activity className="w-4 h-4 mr-2" /> Match Events
                        </TabsTrigger>
                        <TabsTrigger value="prediction" className="rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all">
                          <Zap className="w-4 h-4 mr-2" /> Predictions
                        </TabsTrigger>
                      </TabsList>

                      <button
                        onClick={() => toggleCommentary(selectedMatch.id)}
                        className={cn(
                          "flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 border",
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
                    <ScrollArea className="h-[500px] pr-6">
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
                                <p className="text-lg font-medium text-slate-900 leading-snug tracking-tight">{event.description}</p>
                                {event.aiCommentary && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass p-6 rounded-2xl italic text-slate-500 text-sm flex gap-4 leading-relaxed relative overflow-hidden group/commentary"
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
                  </TabsContent>

                  <TabsContent value="events" className="mt-8 outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                              <Zap className="w-8 h-8 text-brand animate-pulse" />
                            </div>
                            <CardHeader className="pb-0">
                              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand">AI Tactical Forecast</CardTitle>
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card className="glass border-sky-100 rounded-3xl p-2">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{selectedMatch.homeTeam} Win Probability</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
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
                            <CardContent className="space-y-4">
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
                  </TabsContent>
                </Tabs>
              </div>
            </motion.div>
          </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center h-[600px] glass rounded-[3rem] text-slate-100 space-y-8 border-dashed">
              <div className="w-32 h-32 bg-sky-50 rounded-full flex items-center justify-center border border-sky-100">
                <Zap className="w-16 h-16 text-brand" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-2xl font-black uppercase tracking-tighter font-display text-slate-900">Select a Broadcast</p>
                <p className="text-xs font-bold uppercase tracking-[0.4em] text-slate-300">Live Match Center v2.0</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Ticker */}
      <footer className="fixed bottom-0 left-0 right-0 bg-brand text-white py-3 overflow-hidden z-50 shadow-[0_-10px_40px_rgba(14,165,233,0.2)]">
        <div className="flex whitespace-nowrap animate-marquee">
          {Array(10).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-12 px-12">
              {matches.map(m => (
                <div key={m.id} className="flex items-center gap-4 font-black uppercase text-xs italic tracking-tighter">
                  <span className="text-white/60">{m.sport}</span>
                  <span>{m.homeTeam}</span>
                  <span className="bg-white text-brand px-3 py-0.5 rounded-full text-[10px] not-italic">{m.homeScore} - {m.awayScore}</span>
                  <span>{m.awayTeam}</span>
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
