import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Match, MatchEvent, ChatMessage, UserProfile, SocialEvent, PredictionRecord } from "./types";
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
import { Trophy, Clock, Activity, MessageSquare, Zap, ChevronRight, ChevronDown, LogIn, LogOut, User, Heart, Send, Bell, Settings, Share2, TrendingUp, Users, Award } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { GoogleGenAI } from "@google/genai";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from "firebase/auth";
import { collection, onSnapshot, query, doc, setDoc, getDocFromServer, orderBy, limit, addDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

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

const CricketRankings = () => {
  const [rankings, setRankings] = useState<any[]>([]);
  const [type, setType] = useState("1"); // 1: Test, 2: ODI, 3: T20
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/cricket/rankings/${type}`);
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          setRankings(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch rankings:", error);
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
              key={idx}
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
                  <div>
                    <h4 className="font-black text-slate-900 text-lg leading-tight tracking-tight">{player.player_name}</h4>
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
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [selectedSport, setSelectedSport] = useState<Match["sport"] | "all">("all");
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
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
  
  const processedEvents = useRef<Set<string>>(new Set());
  const requestQueue = useRef<(() => Promise<void>)[]>([]);
  const isProcessingQueue = useRef(false);
  const lastRequestTime = useRef(0);
  const MIN_REQUEST_GAP = 15000; // 15 seconds between requests (4 RPM)
  const [isAiThrottled, setIsAiThrottled] = useState(false);
  const throttleTimer = useRef<NodeJS.Timeout | null>(null);

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
        }
      }
    }
  }, [selectedSport, selectedLeague, matches, selectedMatchId]);

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
      return sportMatch && leagueMatch && statusMatch;
    });
  };

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
    };
  }, []);

  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => signOut(auth);

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
            "hover:text-brand transition-all cursor-pointer flex items-center gap-1 py-2 h-20 relative", 
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
      <div className="fixed top-24 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
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
          
          <div className="flex items-center gap-10">
            <div className="hidden lg:flex items-center gap-10 text-xs font-bold uppercase tracking-widest text-slate-400 shrink-0">
              <span 
                onClick={() => {
                  setSelectedSport("all");
                  setSelectedLeague("all");
                }}
                className={cn("hover:text-brand transition-all cursor-pointer py-2 h-20 flex items-center relative", selectedSport === "all" && "text-brand")}
              >
                All
                {selectedSport === "all" && (
                  <motion.div 
                    layoutId="active-sport"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-brand rounded-full"
                  />
                )}
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
                sport="formula1" 
                label="Formula 1" 
                selectedSport={selectedSport} 
                selectedLeague={selectedLeague} 
                setSelectedSport={setSelectedSport} 
                setSelectedLeague={setSelectedLeague} 
              />
            </div>

            <div className="flex items-center gap-6 shrink-0">
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[9px] font-black px-1.5 py-0">
                        {userProfile?.points || 0} PTS
                      </Badge>
                      <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">{userProfile?.displayName || user.displayName}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setIsProfileOpen(true)} className="text-[9px] font-bold text-brand uppercase hover:underline transition-colors">Profile</button>
                      <button onClick={logout} className="text-[9px] font-bold text-slate-400 uppercase hover:text-red-500 transition-colors">Logout</button>
                    </div>
                  </div>
                  <button onClick={() => setIsProfileOpen(true)} className="relative group">
                    {userProfile?.photoURL || user.photoURL ? (
                      <img src={userProfile?.photoURL || user.photoURL || ""} alt="Profile" className="w-10 h-10 rounded-full border-2 border-white shadow-sm group-hover:border-brand transition-all" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center border-2 border-white shadow-sm group-hover:border-brand transition-all">
                        <User className="w-5 h-5 text-brand" />
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-brand rounded-full border-2 border-white flex items-center justify-center">
                      <Settings className="w-2 h-2 text-white" />
                    </div>
                  </button>
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

            <Badge variant="outline" className={cn(
              "px-3 py-1 rounded-full transition-all",
              matches.some(m => m.id.startsWith("real-")) 
                ? "border-green-500/30 text-green-600 bg-green-50" 
                : "border-brand/30 text-brand bg-brand/5"
            )}>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full mr-2 animate-pulse",
                matches.some(m => m.id.startsWith("real-")) ? "bg-green-500" : "bg-brand"
              )} />
              <span className="text-[10px] font-bold tracking-widest uppercase">
                {matches.some(m => m.id.startsWith("real-")) ? "Real-World Data Active" : "Live Engine Active"}
              </span>
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

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
        {/* Sidebar: Match List */}
        <div className="lg:col-span-4 space-y-10">
          <div className="flex flex-col gap-4 px-1 md:px-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Match Center</h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
                <span className="text-xs font-bold text-brand uppercase tracking-wider">{filterMatches(matches, 'live').length} Live Now</span>
              </div>
            </div>
            
            {selectedLeague !== "all" && (
              <div className="flex items-center justify-between bg-brand/5 border border-brand/10 p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-brand" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand">{selectedLeague}</span>
                </div>
                <button 
                  onClick={() => setSelectedLeague("all")}
                  className="text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-brand transition-colors"
                >
                  Clear Filter
                </button>
              </div>
            )}
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
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-2 px-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          Live Cricket
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
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                      {match.league || "Cricbuzz"} • Live
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
                                    <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">{match.time}</span>
                                  </div>
                                </div>
                                
                                <div className="space-y-3 relative z-10">
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                      <span className="font-bold tracking-tight text-slate-900">{match.homeTeam}</span>
                                      {match.homeScoreDetail && <span className="text-[9px] text-slate-400 font-medium">{match.homeScoreDetail}</span>}
                                    </div>
                                    <span className="font-display font-bold text-xl tabular-nums text-slate-900">{match.homeScore}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                      <span className="font-bold tracking-tight text-slate-900">{match.awayTeam}</span>
                                      {match.awayScoreDetail && <span className="text-[9px] text-slate-400 font-medium">{match.awayScoreDetail}</span>}
                                    </div>
                                    <span className="font-display font-bold text-xl tabular-nums text-slate-900">{match.awayScore}</span>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Baseball Section (Real-World) */}
                    {filterMatches(matches, 'live').filter(m => m.sport === 'baseball').length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 flex items-center gap-2 px-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                          Live Baseball
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
                                      {match.league || "MLB"} • Live
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
                                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{match.time}</span>
                                  </div>
                                </div>
                                
                                <div className="space-y-3 relative z-10">
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                      <span className="font-bold tracking-tight text-slate-900">{match.homeTeam}</span>
                                      {match.homeScoreDetail && <span className="text-[9px] text-slate-400 font-medium">{match.homeScoreDetail}</span>}
                                    </div>
                                    <span className="font-display font-bold text-xl tabular-nums text-slate-900">{match.homeScore}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                      <span className="font-bold tracking-tight text-slate-900">{match.awayTeam}</span>
                                      {match.awayScoreDetail && <span className="text-[9px] text-slate-400 font-medium">{match.awayScoreDetail}</span>}
                                    </div>
                                    <span className="font-display font-bold text-xl tabular-nums text-slate-900">{match.awayScore}</span>
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
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 flex items-center gap-2 px-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {selectedLeague !== "all" 
                      ? `${selectedLeague} Live` 
                      : selectedSport === "all" ? "Other Live Matches" : `Live ${selectedSport.charAt(0).toUpperCase() + selectedSport.slice(1)}`}
                  </h3>
                  <div className="space-y-4">
                    {filterMatches(matches, 'live', selectedSport === "all" ? ['cricket', 'baseball'] : []).length > 0 ? (
                      filterMatches(matches, 'live', selectedSport === "all" ? ['cricket', 'baseball'] : [])
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
                                <span className="text-[10px] font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded uppercase">{match.time}</span>
                              </div>
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
                                <span className="text-[10px] font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded uppercase">{match.time}</span>
                              </div>
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
                                <span className="text-[10px] font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded uppercase">{match.time}</span>
                              </div>
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

        {/* Main Content */}
        <div className="lg:col-span-8">
          <Tabs defaultValue="matches" className="w-full">
            <TabsList className="glass p-1.5 rounded-2xl w-full flex justify-start h-auto gap-1 mb-8">
              <TabsTrigger value="matches" className="rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all">
                <Trophy className="w-4 h-4 mr-2" /> Matches
              </TabsTrigger>
              <TabsTrigger value="social" className="rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all">
                <Share2 className="w-4 h-4 mr-2" /> Social Feed
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all">
                <TrendingUp className="w-4 h-4 mr-2" /> Leaderboard
              </TabsTrigger>
              {selectedSport === "cricket" && (
                <TabsTrigger value="rankings" className="rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all">
                  <Users className="w-4 h-4 mr-2" /> Player Rankings
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="matches" className="outline-none">
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
                    <CardContent className="p-6 md:p-12">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
                        {selectedMatch.sport !== "formula1" ? (
                          <>
                            <div className="text-center space-y-4 md:space-y-6 flex-1">
                              <div className="w-16 h-16 md:w-24 md:h-24 bg-sky-50 rounded-2xl md:rounded-3xl mx-auto flex items-center justify-center border border-sky-100 shadow-sm rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                <Trophy className="w-8 h-8 md:w-12 md:h-12 text-brand" />
                              </div>
                              <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter font-display text-slate-900">{selectedMatch.homeTeam}</h3>
                            </div>

                            <div className="flex flex-col items-center gap-4 md:gap-6">
                              {selectedMatch.league && (
                                <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-[-1rem]">
                                  {selectedMatch.league}
                                </div>
                              )}
                              <div className="flex items-center gap-4 md:gap-8">
                                <div className="flex flex-col items-center">
                                  <span className="text-5xl md:text-8xl font-black tracking-tighter tabular-nums font-display text-slate-900 text-glow">{selectedMatch.homeScore}</span>
                                  {selectedMatch.homeScoreDetail && <span className="text-[10px] md:text-xs font-bold text-slate-400 mt-1">{selectedMatch.homeScoreDetail}</span>}
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-1 h-1 rounded-full bg-slate-200" />
                                  <div className="w-1 h-1 rounded-full bg-slate-200" />
                                  <div className="w-1 h-1 rounded-full bg-slate-200" />
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-5xl md:text-8xl font-black tracking-tighter tabular-nums font-display text-slate-900 text-glow">{selectedMatch.awayScore}</span>
                                  {selectedMatch.awayScoreDetail && <span className="text-[10px] md:text-xs font-bold text-slate-400 mt-1">{selectedMatch.awayScoreDetail}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-brand font-bold tracking-[0.2em] text-[10px] md:text-xs bg-brand/10 px-4 md:px-6 py-1.5 md:py-2 rounded-full border border-brand/20 uppercase">
                                <Clock className="w-3 h-3 md:w-4 md:h-4 animate-pulse" />
                                {selectedMatch.time}
                                {selectedMatch.id.startsWith("real-cb-") && " • CRICBUZZ"}
                                {selectedMatch.id.startsWith("real-bb-") && " • MLB"}
                              </div>
                            </div>

                            <div className="text-center space-y-4 md:space-y-6 flex-1">
                              <div className="w-16 h-16 md:w-24 md:h-24 bg-sky-50 rounded-2xl md:rounded-3xl mx-auto flex items-center justify-center border border-sky-100 shadow-sm -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                <Trophy className="w-8 h-8 md:w-12 md:h-12 text-slate-200" />
                              </div>
                              <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter font-display text-slate-900">{selectedMatch.awayTeam}</h3>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center w-full gap-8">
                            <div className="flex items-center gap-12">
                              <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-brand/10 rounded-full mx-auto flex items-center justify-center border border-brand/20">
                                  <Zap className="w-10 h-10 text-brand" />
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter font-display text-slate-900">{selectedMatch.homeTeam}</h3>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Leader</span>
                              </div>
                              <div className="text-8xl font-black tracking-tighter text-brand font-display">P1</div>
                            </div>
                            <div className="flex items-center gap-4 text-brand font-bold tracking-[0.2em] text-xs bg-brand/10 px-8 py-3 rounded-full border border-brand/20 uppercase">
                              <Activity className="w-4 h-4 animate-pulse" />
                              {selectedMatch.time}
                            </div>
                          </div>
                        )}
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
                        <TabsTrigger value="chat" className="rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all">
                          <MessageSquare className="w-4 h-4 mr-2" /> Fan Chat
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
                    <ScrollArea className="h-[400px] md:h-[500px] pr-4 md:pr-6">
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
                            <CardContent className="flex flex-col items-center py-8 md:py-12 px-6 md:px-10">
                              <div className="text-center space-y-2 mb-6 md:mb-8">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Predicted Final Score</span>
                                <div className="text-5xl md:text-7xl font-black tracking-tighter text-brand font-display">{predictionData.predictedScore}</div>
                              </div>
                              <div className="h-px w-16 md:w-20 bg-slate-100 mb-6 md:mb-8" />
                              <p className="text-center text-lg md:text-xl font-medium text-slate-700 italic leading-relaxed max-w-2xl">
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
                            <CardContent className="space-y-4 md:space-y-6">
                              <span className="text-4xl md:text-5xl font-black font-display text-brand">{predictionData.homeWinProb}</span>
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
                            <CardContent className="space-y-4 md:space-y-6">
                              <span className="text-4xl md:text-5xl font-black font-display text-slate-400">{predictionData.awayWinProb}</span>
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
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[600px] glass rounded-[3rem] p-12 text-center space-y-12">
              <div className="w-32 h-32 bg-sky-50 rounded-full flex items-center justify-center border border-sky-100">
                <Zap className="w-16 h-16 text-brand" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-2xl font-black uppercase tracking-tighter font-display text-slate-900">Select a Broadcast</p>
                <p className="text-xs font-bold uppercase tracking-[0.4em] text-slate-300">Live Match Center v2.0</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="social" className="outline-none">
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Global Social Feed</h2>
              <Badge variant="outline" className="bg-brand/5 text-brand border-brand/20 text-[10px] font-bold">
                {socialEvents.length} Recent Activities
              </Badge>
            </div>
            <ScrollArea className="h-[700px] pr-4">
              <div className="space-y-4">
                {socialEvents.map((event, i) => (
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
                            {event.type === 'match_event' && <span className="text-brand font-bold mr-2">[{event.matchName}]</span>}
                            {event.content}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
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

        <TabsContent value="rankings" className="outline-none">
          <CricketRankings />
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
