import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Match {
  id: string;
  sport: "football" | "basketball";
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "live" | "scheduled" | "finished";
  time: string;
  events: MatchEvent[];
}

interface MatchEvent {
  id: string;
  time: string;
  type: string;
  description: string;
  aiCommentary?: string;
}

let matches: Match[] = [
  {
    id: "1",
    sport: "football",
    homeTeam: "London Lions",
    awayTeam: "Manchester Hawks",
    homeScore: 1,
    awayScore: 0,
    status: "live",
    time: "65'",
    events: [
      { id: "e1", time: "12'", type: "Goal", description: "Goal by J. Smith (London Lions)" }
    ]
  },
  {
    id: "2",
    sport: "basketball",
    homeTeam: "LA Stars",
    awayTeam: "NY Giants",
    homeScore: 88,
    awayScore: 92,
    status: "live",
    time: "Q4 4:20",
    events: [
      { id: "e2", time: "Q4 5:10", type: "3-Pointer", description: "3-Pointer by K. Durant (NY Giants)" }
    ]
  },
  {
    id: "3",
    sport: "football",
    homeTeam: "Madrid Kings",
    awayTeam: "Paris Saints",
    homeScore: 0,
    awayScore: 0,
    status: "scheduled",
    time: "20:45",
    events: []
  }
];

const fallbackCommentaries = [
  "What a moment in the game!",
  "The tension is palpable here!",
  "Absolute brilliance on display!",
  "The fans are on their feet!",
  "A tactical masterclass unfolding.",
  "Incredible energy from both sides.",
  "This is what sports is all about!",
  "A crucial phase of the match.",
  "The momentum is shifting!",
  "Unbelievable scenes at the stadium!"
];

function getFallbackCommentary() {
  return fallbackCommentaries[Math.floor(Math.random() * fallbackCommentaries.length)];
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  const PORT = 3000;

  // API Routes
  app.get("/api/matches", (req, res) => {
    res.json(matches);
  });

  // Simulation Loop for Score Events
  setInterval(async () => {
    const liveMatches = matches.filter(m => m.status === "live");
    if (liveMatches.length === 0) return;

    const matchToUpdate = liveMatches[Math.floor(Math.random() * liveMatches.length)];
    
    // Random scoring event (less frequent now to balance with flavor commentary)
    const rand = Math.random();
    if (rand > 0.85) {
      const isHome = Math.random() > 0.5;
      let eventType = "Action";
      let desc = "";

      if (matchToUpdate.sport === "football") {
        if (Math.random() > 0.8) {
          eventType = "Goal";
          if (isHome) matchToUpdate.homeScore++;
          else matchToUpdate.awayScore++;
          desc = `GOAL! ${isHome ? matchToUpdate.homeTeam : matchToUpdate.awayTeam} scores!`;
        } else {
          eventType = "Yellow Card";
          desc = `Yellow card for ${isHome ? matchToUpdate.homeTeam : matchToUpdate.awayTeam} player.`;
        }
      } else {
        const points = Math.random() > 0.5 ? 2 : 3;
        eventType = `${points}-Pointer`;
        if (isHome) matchToUpdate.homeScore += points;
        else matchToUpdate.awayScore += points;
        desc = `${points} points for ${isHome ? matchToUpdate.homeTeam : matchToUpdate.awayTeam}!`;
      }

      const newEvent: MatchEvent = {
        id: Math.random().toString(36).substr(2, 9),
        time: matchToUpdate.time,
        type: eventType,
        description: desc,
        aiCommentary: getFallbackCommentary() // Initial fallback, client will override with AI
      };

      matchToUpdate.events.unshift(newEvent);
      
      io.emit("matchUpdate", matchToUpdate);
      io.emit("newEvent", { matchId: matchToUpdate.id, event: newEvent });
    }
  }, 10000);

  // Flavor Commentary Loop (Every 2.5 minutes)
  setInterval(async () => {
    const liveMatches = matches.filter(m => m.status === "live");
    for (const match of liveMatches) {
      const flavorEvent: MatchEvent = {
        id: Math.random().toString(36).substr(2, 9),
        time: match.time,
        type: "Match Update",
        description: "The game continues with high intensity.",
        aiCommentary: getFallbackCommentary()
      };

      match.events.unshift(flavorEvent);
      
      io.emit("matchUpdate", match);
    }
  }, 150000); // 150 seconds = 2.5 minutes

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
