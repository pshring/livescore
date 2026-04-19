import React, { useState, useEffect, useCallback } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  KeyboardSensor,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Zap, Users, Shield, Sword, Activity, RefreshCw, Play, Info, Save, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GoogleGenAI, Type } from "@google/genai";
import { WCTeam, BracketMatch } from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Droppable Slot Component
interface BracketSlotProps {
  id: string;
  match: BracketMatch;
  team?: WCTeam;
  side: 'home' | 'away';
  onSimulate: (matchId: string) => void;
  isSimulating: boolean;
  onClear: (matchId: string, side: 'home' | 'away') => void;
}

const BracketSlot = ({ id, match, team, side, onSimulate, isSimulating, onClear }: BracketSlotProps) => {
  const { setNodeRef, isOver } = useSortable({ id });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "relative h-14 md:h-16 w-full rounded-xl border-2 transition-all duration-300 flex items-center px-4 gap-3 overflow-hidden group",
        isOver ? "border-brand bg-brand/5 scale-[1.02] shadow-lg shadow-brand/10" : "border-slate-100 bg-white shadow-sm",
        !team && "border-dashed border-slate-200 bg-slate-50/50"
      )}
    >
      {team ? (
        <>
          <div className="w-8 h-6 rounded bg-slate-50 overflow-hidden border border-slate-100 flex-shrink-0">
            {team.image ? (
              <img src={team.image} alt={team.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Trophy className="w-full h-full p-1 text-slate-200" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] md:text-xs font-black uppercase tracking-tighter text-slate-900 truncate">
              {team.name}
            </p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
              Rank #{team.rank || "--"}
            </p>
          </div>
          {match.winnerTeamId === team.id && (
            <div className="absolute right-8 top-1/2 -translate-y-1/2">
              <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            </div>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onClear(match.id, side); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
          >
            <X className="w-3 h-3" />
          </button>
        </>
      ) : (
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mx-auto italic">
          Drop Team
        </p>
      )}
    </div>
  );
};

// Draggable Team Card
const DraggableTeam: React.FC<{ team: WCTeam }> = ({ team }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: team.id,
    data: { team }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 rounded-2xl border border-slate-100 bg-white shadow-sm hover:border-brand/40 hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex flex-col items-center text-center gap-2 group"
    >
      <div className="w-12 h-8 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden group-hover:scale-110 transition-transform">
        {team.image ? (
          <img src={team.image} alt={team.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <Trophy className="w-full h-full p-1 text-slate-200" />
        )}
      </div>
      <p className="text-[9px] font-black uppercase tracking-tighter text-slate-900 line-clamp-1">{team.name}</p>
    </div>
  );
};

interface BracketBuilderProps {
  user: FirebaseUser | null;
}

const ConnectorLines = ({ round }: { round: number }) => {
  if (round >= 3) return null; // No connectors from Final

  const matchCount = Math.pow(2, 3 - round);
  const connectors = Array.from({ length: matchCount / 2 }, (_, i) => i);

  return (
    <div className="absolute right-[-24px] inset-y-0 w-6 pointer-events-none hidden md:block">
      <svg className="w-full h-full" viewBox="0 0 24 800" preserveAspectRatio="none">
        {connectors.map(i => {
          const topMatchY = (i * 2 * (800 / matchCount)) + (400 / matchCount);
          const bottomMatchY = ((i * 2 + 1) * (800 / matchCount)) + (400 / matchCount);
          const midY = (topMatchY + bottomMatchY) / 2;

          return (
            <g key={i} className="stroke-slate-200" strokeWidth="2" fill="none">
              <path d={`M 0 ${topMatchY} L 12 ${topMatchY} L 12 ${midY} L 24 ${midY}`} />
              <path d={`M 0 ${bottomMatchY} L 12 ${bottomMatchY} L 12 ${midY}`} />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const BracketBuilder = ({ user }: BracketBuilderProps) => {
  const [teams, setTeams] = useState<WCTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [simulatingMatchId, setSimulatingMatchId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const initBracket = useCallback(() => {
    const r16: BracketMatch[] = Array.from({ length: 8 }, (_, i) => ({
      id: `r16-${i}`,
      round: 0,
      position: i,
    }));
    const qf: BracketMatch[] = Array.from({ length: 4 }, (_, i) => ({
      id: `qf-${i}`,
      round: 1,
      position: i,
    }));
    const sf: BracketMatch[] = Array.from({ length: 2 }, (_, i) => ({
      id: `sf-${i}`,
      round: 2,
      position: i,
    }));
    const final: BracketMatch[] = [{
      id: `f-0`,
      round: 3,
      position: 0,
    }];
    return [...r16, ...qf, ...sf, ...final];
  }, []);

  // Initialize Bracket
  useEffect(() => {
    setMatches(initBracket());
  }, [initBracket]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch("/api/football/world-cup/teams");
        const data = await response.json();
        if (Array.isArray(data)) {
          const formatted = data.map(t => ({
            id: t.id || t.team.toLowerCase().replace(/\s/g, '-'),
            name: t.team || t.name,
            image: t.image,
            group: t.group,
            rank: Math.floor(Math.random() * 50) + 1, // Mock rank if not provided
            stats: {
              attack: 70 + Math.floor(Math.random() * 25),
              defense: 70 + Math.floor(Math.random() * 25),
              midfield: 70 + Math.floor(Math.random() * 25),
            }
          }));
          setTeams(formatted);
        }
      } catch (error) {
        console.error("Failed to fetch WC teams:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  // Load saved bracket
  useEffect(() => {
    if (user) {
      const loadSaved = async () => {
        try {
          const docRef = doc(db, 'user_brackets', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setMatches(docSnap.data().matches);
          }
        } catch (error) {
          // It's okay if bracket doesn't exist yet
          if (error instanceof Error && !error.message.includes('not-found')) {
             console.error("Error loading bracket:", error);
          }
        }
      };
      loadSaved();
    }
  }, [user]);

  const saveBracket = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'user_brackets', user.uid), {
        matches,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error("Error saving bracket:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetBracket = () => {
    if (window.confirm("Are you sure you want to reset your entire bracket?")) {
      setMatches(initBracket());
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const propagateChange = useCallback((prevMatches: BracketMatch[], matchId: string, side: 'home' | 'away', newTeamId?: string): BracketMatch[] => {
    let nextMatches = [...prevMatches];
    const matchIndex = nextMatches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) return nextMatches;
    
    const currentMatch = nextMatches[matchIndex];
    const oldWinnerId = currentMatch.winnerTeamId;
    
    // Update current match
    nextMatches[matchIndex] = {
      ...currentMatch,
      [side === 'home' ? 'homeTeamId' : 'awayTeamId']: newTeamId,
      winnerTeamId: undefined,
      simulatedResult: undefined
    };

    // Recursively clear downstream slots if a winner had already progressed
    if (oldWinnerId) {
      const roundNames = ['r16', 'qf', 'sf', 'f'];
      const nextRound = currentMatch.round + 1;
      const nextPos = Math.floor(currentMatch.position / 2);
      const isNextHomeSide = currentMatch.position % 2 === 0;

      if (nextRound < roundNames.length) {
        const nextMatchId = `${roundNames[nextRound]}-${nextPos}`;
        return propagateChange(nextMatches, nextMatchId, isNextHomeSide ? 'home' : 'away', undefined);
      }
    }

    return nextMatches;
  }, []);

  const clearSlot = (matchId: string, side: 'home' | 'away') => {
    setMatches(prev => propagateChange(prev, matchId, side, undefined));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const overId = over.id as string;
    const teamId = active.id as string;

    // Check if dropping onto any bracket slot
    if (overId.includes('-slot-')) {
      const [roundPrefix,, posStr, side] = overId.split('-');
      const matchId = `${roundPrefix}-${posStr}`;
      setMatches(prev => propagateChange(prev, matchId, side as 'home' | 'away', teamId));
    }
  };

  const simulateMatch = async (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match || !match.homeTeamId || !match.awayTeamId) return;

    const homeTeam = teams.find(t => t.id === match.homeTeamId);
    const awayTeam = teams.find(t => t.id === match.awayTeamId);
    if (!homeTeam || !awayTeam) return;

    setSimulatingMatchId(matchId);
    try {
      const prompt = `Simulate a high-stakes 2026 World Cup football match between ${homeTeam.name} and ${awayTeam.name}. 
      
      Tactical Profiles:
      - ${homeTeam.name}: Rank #${homeTeam.rank}, Attack: ${homeTeam.stats?.attack}, Defense: ${homeTeam.stats?.defense}, Midfield: ${homeTeam.stats?.midfield}
      - ${awayTeam.name}: Rank #${awayTeam.rank}, Attack: ${awayTeam.stats?.attack}, Defense: ${awayTeam.stats?.defense}, Midfield: ${awayTeam.stats?.midfield}
      
      Requirements:
      1. Consider these tactical stats and current world standing.
      2. Return a JSON result with homeScore, awayScore, and a 1-sentence analytical summary (max 25 words).
      3. Use a realistic football score distribution.
      4. If scores are equal, simulate a penalty shootout and assign the extra goal to the winner for the final score.
      5. Explicitly name the winner in the 'winner' field.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              homeScore: { type: Type.NUMBER },
              awayScore: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              winner: { type: Type.STRING, description: "Name of the winning team" }
            },
            required: ["homeScore", "awayScore", "summary", "winner"]
          }
        }
      });

      const result = JSON.parse(response.text.trim());
      const winnerId = result.winner.toLowerCase().includes(homeTeam.name.toLowerCase()) ? homeTeam.id : awayTeam.id;

      setMatches(prev => {
        let nextMatches = prev.map(m => {
          if (m.id === matchId) {
            return {
              ...m,
              winnerTeamId: winnerId,
              simulatedResult: {
                homeScore: result.homeScore,
                awayScore: result.awayScore,
                summary: result.summary
              }
            };
          }
          return m;
        });

        // Auto-advance winner to next round using propagateChange logic
        const [roundPrefix, posStr] = matchId.split('-');
        const currentPos = parseInt(posStr);
        const nextRound = match.round + 1;
        const nextPos = Math.floor(currentPos / 2);
        const isHomeSide = currentPos % 2 === 0;

        const roundNames = ['r16', 'qf', 'sf', 'f'];
        if (nextRound < roundNames.length) {
          const nextMatchId = `${roundNames[nextRound]}-${nextPos}`;
          return propagateChange(nextMatches, nextMatchId, isHomeSide ? 'home' : 'away', winnerId);
        }
        return nextMatches;
      });
    } catch (error) {
      console.error("Simulation Error:", error);
    } finally {
      setSimulatingMatchId(null);
    }
  };

  const renderRound = (roundIndex: number, label: string) => {
    const roundMatches = matches.filter(m => m.round === roundIndex);
    const roundPrefix = ['r16', 'qf', 'sf', 'f'][roundIndex];

    return (
      <div className="flex flex-col justify-around gap-8 md:gap-16 relative">
        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center mb-4">{label}</h4>
        {roundMatches.map((m) => (
          <div key={m.id} className="space-y-3 relative group">
            <div className="space-y-1">
              <BracketSlot 
                id={`${roundPrefix}-slot-${m.position}-home`}
                match={m}
                team={teams.find(t => t.id === m.homeTeamId)}
                side="home"
                onSimulate={simulateMatch}
                isSimulating={simulatingMatchId === m.id}
                onClear={clearSlot}
              />
              <BracketSlot 
                id={`${roundPrefix}-slot-${m.position}-away`}
                match={m}
                team={teams.find(t => t.id === m.awayTeamId)}
                side="away"
                onSimulate={simulateMatch}
                isSimulating={simulatingMatchId === m.id}
                onClear={clearSlot}
              />
            </div>
            
            {(m.homeTeamId && m.awayTeamId) && (
              <button
                onClick={() => simulateMatch(m.id)}
                disabled={simulatingMatchId === m.id}
                className={cn(
                  "w-full py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  m.simulatedResult 
                    ? "bg-slate-900 text-white shadow-lg" 
                    : "bg-brand/10 text-brand hover:bg-brand hover:text-white border border-brand/20"
                )}
              >
                {simulatingMatchId === m.id ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Simulating...
                  </>
                ) : m.simulatedResult ? (
                  <>
                    <Zap className="w-3 h-3" />
                    {m.simulatedResult.homeScore} - {m.simulatedResult.awayScore}
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    Run AI Simulation
                  </>
                )}
              </button>
            )}

            {m.simulatedResult && (
              <div className="absolute -bottom-12 left-0 right-0 z-20 bg-slate-900 text-white p-2.5 rounded-xl text-[9px] font-medium leading-tight opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl">
                {m.simulatedResult.summary}
              </div>
            )}
          </div>
        ))}
        {roundIndex < 3 && <ConnectorLines round={roundIndex} />}
      </div>
    );
  };

  if (loading) return <div className="p-10 flex items-center justify-center"><Skeleton className="w-full h-96 rounded-[3rem]" /></div>;

  const activeTeam = activeId ? teams.find(t => t.id === activeId) : null;

  return (
    <DndContext 
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 min-h-[800px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Left Panel: Teams Pool */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass p-6 rounded-[2rem] border-sky-100 sticky top-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-brand/10 rounded-xl">
                <Users className="w-5 h-5 text-brand" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-black uppercase tracking-tighter text-slate-900">National Pool</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Drag teams to bracket</p>
              </div>
            </div>
            
            <SortableContext items={teams.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                {teams.map((team) => (
                  <DraggableTeam key={team.id} team={team} />
                ))}
              </div>
            </SortableContext>
          </div>
        </div>

        {/* Center: The Bracket */}
        <div className="lg:col-span-9 glass p-8 md:p-12 rounded-[3rem] border-sky-100 overflow-x-auto relative">
           {/* Actions Header */}
           <div className="flex justify-between items-center mb-8 relative z-20">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-slate-900 rounded-2xl shadow-xl">
                   <Trophy className="w-6 h-6 text-amber-500" />
                 </div>
                 <div>
                   <h2 className="text-lg font-black uppercase tracking-tighter text-slate-900">World Cup 2026</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">AI Tournament Simulation</p>
                 </div>
              </div>
              
              <div className="flex gap-2">
                 <button 
                   onClick={resetBracket}
                   className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all border border-slate-100 group"
                   title="Reset Bracket"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={saveBracket}
                   disabled={!user || isSaving}
                   className={cn(
                     "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm",
                     isSaving ? "bg-slate-100 text-slate-400" : "bg-brand text-white hover:shadow-lg hover:shadow-brand/20 active:scale-95"
                   )}
                 >
                   {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                   {isSaving ? "Saving..." : user ? "Save Bracket" : "Login to Save"}
                 </button>
              </div>
           </div>


           <div className="min-w-[1000px] flex justify-between h-full py-4 relative z-10">
              {/* Connector Lines (SVG) could go here but for now just visual spacing */}
              {renderRound(0, "Round of 16")}
              {renderRound(1, "Quarter Finals")}
              {renderRound(2, "Semi Finals")}
              {renderRound(3, "The Final")}
              
              <div className="flex flex-col justify-around">
                <div className="space-y-6 text-center">
                   {matches.find(m => m.id === 'f-0')?.winnerTeamId ? (
                     <motion.div 
                       initial={{ scale: 0.5, opacity: 0 }}
                       animate={{ scale: 1, opacity: 1 }}
                       transition={{ type: "spring", damping: 12 }}
                       className="space-y-6"
                     >
                       <div className="w-32 h-32 bg-amber-100 rounded-full mx-auto flex items-center justify-center border-4 border-white shadow-2xl relative">
                          <img 
                            src={teams.find(t => t.id === matches.find(m => m.id === 'f-0')?.winnerTeamId)?.image} 
                            alt="Champion"
                            className="w-20 h-14 object-cover rounded shadow-sm relative z-10"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute -top-4 -right-2 bg-amber-500 p-2 rounded-full shadow-lg border-2 border-white rotate-12">
                             <Trophy className="w-6 h-6 text-white" />
                          </div>
                          <div className="absolute inset-0 bg-amber-500/20 animate-ping rounded-full" />
                       </div>
                       <div className="space-y-2">
                          <div className="inline-block bg-amber-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg shadow-amber-500/30 mb-2">
                             Tournament Winner
                          </div>
                          <p className="text-2xl font-black uppercase tracking-tighter text-slate-900 font-display">
                            {teams.find(t => t.id === matches.find(m => m.id === 'f-0')?.winnerTeamId)?.name}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand">Champion of the World</p>
                       </div>
                     </motion.div>
                   ) : (
                     <>
                        <div className="w-32 h-32 bg-amber-50 rounded-full mx-auto flex items-center justify-center border-4 border-white shadow-2xl relative">
                           <Trophy className="w-16 h-16 text-amber-500" />
                           <div className="absolute inset-0 bg-amber-500/10 animate-ping rounded-full" />
                        </div>
                        <div className="space-y-1">
                           <p className="text-xl font-black uppercase tracking-tighter text-slate-900 font-display">WC 2026 Champion</p>
                           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand">The Road to Glory</p>
                        </div>
                     </>
                   )}
                </div>
              </div>
           </div>
           
           {/* Instructions */}
           <div className="mt-12 flex items-center gap-4 bg-slate-900 text-white/90 p-4 rounded-2xl border border-white/10">
              <div className="p-2 bg-brand rounded-xl shadow-lg shadow-brand/20">
                <Zap className="w-4 h-4 text-white fill-current" />
              </div>
              <p className="text-[10px] md:text-xs font-medium italic">
                Drag and drop teams from the pool into the Round of 16 slots. Once two teams are in a match, run the <span className="text-brand font-black">AI Simulation</span> to predict the winner and advance them through the tournament. Match dynamics are calculated using Gemini 3.
              </p>
           </div>
        </div>
      </div>

      <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.4',
              },
            },
          }),
        }}>
        {activeTeam ? (
          <div className="p-3 rounded-2xl border-2 border-brand bg-white shadow-2xl flex flex-col items-center text-center gap-2 scale-110">
            <div className="w-12 h-8 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden">
              {activeTeam.image && <img src={activeTeam.image} alt={activeTeam.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
            </div>
            <p className="text-[9px] font-black uppercase tracking-tighter text-slate-900">{activeTeam.name}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
