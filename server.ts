import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

dotenv.config();

// Initialize Firebase Admin
let db: admin.firestore.Firestore | null = null;

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    try {
      // Robust private key parsing
      let formattedKey = privateKey.trim();
      
      // Remove surrounding quotes if present
      if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
        formattedKey = formattedKey.slice(1, -1);
      } else if (formattedKey.startsWith("'") && formattedKey.endsWith("'")) {
        formattedKey = formattedKey.slice(1, -1);
      }
      
      // Handle escaped newlines (literal \n)
      formattedKey = formattedKey.replace(/\\n/g, '\n');
      
      const app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseConfig.projectId,
          clientEmail: "firebase-adminsdk-fbsvc@gen-lang-client-0579330806.iam.gserviceaccount.com",
          privateKey: formattedKey,
        }),
        databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
      });
      db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
      console.log(`Firebase Admin initialized successfully for database: ${firebaseConfig.firestoreDatabaseId}`);
    } catch (error) {
      console.error("Firebase Admin initialization failed:", error);
    }
  } else {
    console.warn("FIREBASE_PRIVATE_KEY not found. Server will run without Firestore persistence.");
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Match {
  id: string;
  sport: "football" | "basketball" | "tennis" | "formula1";
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "live" | "scheduled" | "finished";
  time: string;
  events: MatchEvent[];
  prediction?: string;
  finishedAt?: number;
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
    sport: "tennis",
    homeTeam: "Carlos Alcaraz",
    awayTeam: "Novak Djokovic",
    homeScore: 6,
    awayScore: 4,
    status: "live",
    time: "Set 2",
    events: [
      { id: "e3", time: "Set 1", type: "Set Point", description: "Alcaraz wins the first set 6-4" }
    ]
  },
  {
    id: "4",
    sport: "formula1",
    homeTeam: "Max Verstappen",
    awayTeam: "Lewis Hamilton",
    homeScore: 42,
    awayScore: 56,
    status: "live",
    time: "Lap 42/56",
    events: [
      { id: "e4", time: "Lap 38", type: "Fastest Lap", description: "Verstappen sets a new purple sector" }
    ]
  },
  {
    id: "5",
    sport: "football",
    homeTeam: "Madrid Kings",
    awayTeam: "Paris Saints",
    homeScore: 0,
    awayScore: 0,
    status: "scheduled",
    time: "20:45",
    events: []
  },
  {
    id: "6",
    sport: "tennis",
    homeTeam: "Rafael Nadal",
    awayTeam: "Roger Federer",
    homeScore: 6,
    awayScore: 7,
    status: "finished",
    time: "Final",
    finishedAt: Date.now() - 3600000, // 1 hour ago
    events: [
      { id: "e6", time: "Final", type: "Match Finished", description: "Federer wins a classic tiebreak" }
    ]
  },
  {
    id: "7",
    sport: "football",
    homeTeam: "Berlin Bears",
    awayTeam: "Munich Eagles",
    homeScore: 2,
    awayScore: 1,
    status: "finished",
    time: "FT",
    finishedAt: Date.now() - 7200000, // 2 hours ago
    events: [
      { id: "e7", time: "90'", type: "Match Finished", description: "The Bears hold on for a narrow victory" }
    ]
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

  // Initial Seed to Firestore
  if (db) {
    try {
      const matchesCol = db.collection("matches");
      console.log("Syncing initial matches to Firestore...");
      const batch = db.batch();
      matches.forEach(match => {
        batch.set(matchesCol.doc(match.id), match, { merge: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Initial sync failed:", error);
    }
  }

  // Simulation Loop for Score Events
  setInterval(async () => {
    const liveMatches = matches.filter(m => m.status === "live");
    if (liveMatches.length === 0) return;

    // Update clocks for all live matches
    liveMatches.forEach(match => {
      if (match.sport === "football") {
        const mins = parseInt(match.time);
        if (mins < 90) match.time = `${mins + 1}'`;
      } else {
        // Basketball time update: Q4 4:20 -> Q4 4:19
        const parts = match.time.split(" ");
        if (parts.length === 2) {
          const timeParts = parts[1].split(":");
          let mins = parseInt(timeParts[0]);
          let secs = parseInt(timeParts[1]);
          if (secs > 0) secs--;
          else if (mins > 0) { mins--; secs = 59; }
          match.time = `${parts[0]} ${mins}:${secs.toString().padStart(2, '0')}`;
        }
      }
    });

    const matchToUpdate = liveMatches[Math.floor(Math.random() * liveMatches.length)];
    
    // Random scoring event
    const rand = Math.random();
    if (rand > 0.7) {
      const isHome = Math.random() > 0.5;
      let eventType = "Action";
      let desc = "";

      if (matchToUpdate.sport === "football") {
        if (Math.random() > 0.7) {
          eventType = "Goal";
          if (isHome) matchToUpdate.homeScore++;
          else matchToUpdate.awayScore++;
          desc = `GOAL! ${isHome ? matchToUpdate.homeTeam : matchToUpdate.awayTeam} scores!`;
        } else {
          eventType = "Yellow Card";
          desc = `Yellow card for ${isHome ? matchToUpdate.homeTeam : matchToUpdate.awayTeam} player.`;
        }
      } else if (matchToUpdate.sport === "basketball") {
        const points = Math.random() > 0.5 ? 2 : 3;
        eventType = `${points}-Pointer`;
        if (isHome) matchToUpdate.homeScore += points;
        else matchToUpdate.awayScore += points;
        desc = `${points} points for ${isHome ? matchToUpdate.homeTeam : matchToUpdate.awayTeam}!`;
      } else if (matchToUpdate.sport === "tennis") {
        eventType = "Game Point";
        if (isHome) matchToUpdate.homeScore++;
        else matchToUpdate.awayScore++;
        desc = `Game for ${isHome ? matchToUpdate.homeTeam : matchToUpdate.awayTeam}. Current set: ${matchToUpdate.homeScore}-${matchToUpdate.awayScore}`;
      } else if (matchToUpdate.sport === "formula1") {
        if (Math.random() > 0.5) {
          eventType = "Fastest Lap";
          desc = `${isHome ? matchToUpdate.homeTeam : matchToUpdate.awayTeam} sets a new personal best lap time.`;
        } else {
          eventType = "Overtake";
          desc = `${isHome ? matchToUpdate.homeTeam : matchToUpdate.awayTeam} moves up in the standings.`;
        }
        matchToUpdate.homeScore = Math.min(matchToUpdate.homeScore + 1, matchToUpdate.awayScore);
        matchToUpdate.time = `Lap ${matchToUpdate.homeScore}/${matchToUpdate.awayScore}`;
      }

      const newEvent: MatchEvent = {
        id: Math.random().toString(36).substr(2, 9),
        time: matchToUpdate.time,
        type: eventType,
        description: desc,
        aiCommentary: getFallbackCommentary()
      };

      matchToUpdate.events.unshift(newEvent);
      io.emit("newEvent", { matchId: matchToUpdate.id, event: newEvent });
    }
    
    // Sync to Firestore
    if (db) {
      try {
        const batch = db.batch();
        liveMatches.forEach(match => {
          const matchRef = db!.collection("matches").doc(match.id);
          batch.set(matchRef, match, { merge: true });
        });
        await batch.commit();
      } catch (error) {
        console.error("Firestore Sync Error:", error);
      }
    }

    // Emit updates for ALL live matches to keep clocks in sync
    liveMatches.forEach(match => {
      io.emit("matchUpdate", match);
    });

    // Randomly finish a match (low chance per tick)
    if (Math.random() > 0.98) {
      const matchToFinish = liveMatches[Math.floor(Math.random() * liveMatches.length)];
      matchToFinish.status = "finished";
      matchToFinish.finishedAt = Date.now();
      
      const finishEvent: MatchEvent = {
        id: "finish-" + matchToFinish.id,
        time: matchToFinish.time,
        type: "Match Finished",
        description: `The match has ended. Final score: ${matchToFinish.homeScore} - ${matchToFinish.awayScore}`,
        aiCommentary: "The referee blows the final whistle! What a game we've witnessed today."
      };
      matchToFinish.events.unshift(finishEvent);
      io.emit("matchUpdate", matchToFinish);
      
      if (db) {
        db.collection("matches").doc(matchToFinish.id).set(matchToFinish, { merge: true });
      }
    }
  }, 5000); // Update every 5 seconds for a more "live" feel

  // Cleanup Loop: Remove finished matches after 1 day
  setInterval(async () => {
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    
    const matchesToRemove = matches.filter(m => 
      m.status === "finished" && m.finishedAt && (now - m.finishedAt > ONE_DAY_MS)
    );

    if (matchesToRemove.length > 0) {
      console.log(`Cleaning up ${matchesToRemove.length} old matches...`);
      
      // Remove from local array
      matches = matches.filter(m => !matchesToRemove.find(tr => tr.id === m.id));

      // Remove from Firestore
      if (db) {
        try {
          const batch = db.batch();
          matchesToRemove.forEach(m => {
            batch.delete(db!.collection("matches").doc(m.id));
          });
          await batch.commit();
        } catch (error) {
          console.error("Cleanup Firestore Error:", error);
        }
      }
    }
  }, 3600000); // Check every hour

  // Flavor Commentary Loop (Every 5 minutes)
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
  }, 300000); // 300 seconds = 5 minutes

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
