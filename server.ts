import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import admin from "firebase-admin";
import axios from "axios";
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
  sport: "football" | "basketball" | "tennis" | "formula1" | "baseball" | "cricket";
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

async function fetchOpenLigaMatches() {
  try {
    // OpenLigaDB is a free API for German Bundesliga
    const response = await axios.get("https://api.openligadb.de/getmatchdata/bl1", { timeout: 5000 });
    const data = response.data;
    if (!Array.isArray(data)) return null;

    // Filter for matches that are currently live or very recent
    return data
      .filter((m: any) => m.matchIsFinished === false)
      .map((m: any) => ({
        id: `real-ol-${m.matchID}`,
        sport: "football",
        homeTeam: m.team1.teamName,
        awayTeam: m.team2.teamName,
        homeScore: m.matchResults?.[0]?.pointsTeam1 ?? 0,
        awayScore: m.matchResults?.[0]?.pointsTeam2 ?? 0,
        status: "live",
        time: "Live",
        events: []
      })) as Match[];
  } catch (error) {
    console.error("OpenLigaDB Fetch Error:", error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}

async function fetchBaseballMatches() {
  const KEY = "af98a0eabbmshbaf584a02f620b5p1df683jsnd0ebaa907c01";
  const HOST = "sportapi7.p.rapidapi.com";

  try {
    const response = await axios.get("https://sportapi7.p.rapidapi.com/api/v1/sport/baseball/events/live", {
      headers: { "x-rapidapi-key": KEY, "x-rapidapi-host": HOST },
      timeout: 8000
    });

    const events = response.data.events;
    if (!Array.isArray(events)) return [];

    return events.map((e: any) => ({
      id: `real-sa-bb-${e.id}`,
      sport: "baseball",
      homeTeam: e.homeTeam.name,
      awayTeam: e.awayTeam.name,
      homeScore: e.homeScore.current ?? 0,
      awayScore: e.awayScore.current ?? 0,
      status: "live",
      time: e.status.description || "Live",
      events: []
    })) as Match[];
  } catch (error) {
    console.error("Baseball API Error:", error instanceof Error ? error.message : "Unknown error");
    return [];
  }
}

async function fetchCricketMatches() {
  const KEY = "af98a0eabbmshbaf584a02f620b5p1df683jsnd0ebaa907c01";
  const HOST = "cricbuzz-cricket.p.rapidapi.com";

  try {
    // Cricbuzz live matches list endpoint
    const response = await axios.get("https://cricbuzz-cricket.p.rapidapi.com/matches/v1/live", {
      headers: { "x-rapidapi-key": KEY, "x-rapidapi-host": HOST },
      timeout: 8000
    });

    const matchesData = response.data.typeMatches;
    if (!Array.isArray(matchesData)) return [];

    const cricketMatches: Match[] = [];
    matchesData.forEach((type: any) => {
      if (type.seriesMatches) {
        type.seriesMatches.forEach((series: any) => {
          if (series.seriesAdWrapper && series.seriesAdWrapper.matches) {
            series.seriesAdWrapper.matches.forEach((m: any) => {
              const matchInfo = m.matchInfo;
              const matchScore = m.matchScore;
              if (matchInfo && matchScore) {
                cricketMatches.push({
                  id: `real-cb-${matchInfo.matchId}`,
                  sport: "cricket",
                  homeTeam: matchInfo.team1.teamName,
                  awayTeam: matchInfo.team2.teamName,
                  // Cricket scores are complex (runs/wickets), we'll simplify for the UI score slots
                  homeScore: matchScore.team1Score?.inngs1?.runs ?? 0,
                  awayScore: matchScore.team2Score?.inngs1?.runs ?? 0,
                  status: "live",
                  time: matchInfo.status || "Live",
                  events: []
                });
              }
            });
          }
        });
      }
    });

    return cricketMatches;
  } catch (error) {
    console.error("Cricket API Error:", error instanceof Error ? error.message : "Unknown error");
    return [];
  }
}

async function fetchRealWorldMatches() {
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || process.env.VITE_RAPIDAPI_KEY;
  
  // Fetch from all sources in parallel
  const [baseballMatches, cricketMatches, footballMatches, openLigaMatches] = await Promise.all([
    fetchBaseballMatches(),
    fetchCricketMatches(),
    (async () => {
      if (!RAPIDAPI_KEY || RAPIDAPI_KEY.trim() === "" || RAPIDAPI_KEY.includes("TODO")) return [];
      const key = RAPIDAPI_KEY.trim();
      
      // Strategy 1: RapidAPI
      try {
        const response = await axios.get("https://api-football-v1.p.rapidapi.com/v3/fixtures", {
          params: { live: "all" },
          headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com" },
          timeout: 8000
        });
        if (response.data.response && Array.isArray(response.data.response)) {
          return mapFixtures(response.data.response);
        }
      } catch (error: any) {
        // If 403, try Strategy 2: Direct API-Sports
        if (error.response?.status === 403) {
          try {
            const response = await axios.get("https://v3.football.api-sports.io/fixtures", {
              params: { live: "all" },
              headers: { "x-apisports-key": key },
              timeout: 8000
            });
            if (response.data.response && Array.isArray(response.data.response)) {
              return mapFixtures(response.data.response);
            }
          } catch (e) {
            console.warn("API-Football: 403 on all hosts.");
          }
        }
      }
      return [];
    })(),
    fetchOpenLigaMatches()
  ]);

  // Combine all real-world matches
  const allRealMatches = [
    ...(baseballMatches || []),
    ...(cricketMatches || []),
    ...(footballMatches || []),
    ...(openLigaMatches || [])
  ];

  return allRealMatches.length > 0 ? allRealMatches : null;
}

function mapFixtures(fixtures: any[]) {
  return fixtures.map((f: any) => ({
    id: `real-${f.fixture.id}`,
    sport: "football",
    homeTeam: f.teams.home.name,
    awayTeam: f.teams.away.name,
    homeScore: f.goals.home ?? 0,
    awayScore: f.goals.away ?? 0,
    status: "live",
    time: `${f.fixture.status.elapsed}'`,
    events: []
  })) as Match[];
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

  app.get("/api/debug/sports", (req, res) => {
    const key = process.env.RAPIDAPI_KEY || process.env.VITE_RAPIDAPI_KEY;
    res.json({
      configured: !!key && key.trim() !== "",
      keyPrefix: key ? `${key.substring(0, 4)}****` : null,
      host: "api-football-v1.p.rapidapi.com",
      lastError: null, // We could store this in a variable
      simulationActive: matches.filter(m => !m.id.startsWith("real-")).length > 0
    });
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

  // Real-world API Fetch Loop
  setInterval(async () => {
    const realMatches = await fetchRealWorldMatches();
    if (realMatches && realMatches.length > 0) {
      console.log(`Fetched ${realMatches.length} real-world matches.`);
      
      // Merge real matches into the local matches array
      // We keep simulated matches but prioritize real ones for live data
      realMatches.forEach(real => {
        const index = matches.findIndex(m => m.id === real.id);
        if (index !== -1) {
          matches[index] = { ...matches[index], ...real };
        } else {
          matches.push(real);
        }
      });

      // Broadcast updates
      realMatches.forEach(match => {
        io.emit("matchUpdate", match);
        if (db) {
          db.collection("matches").doc(match.id).set(match, { merge: true });
        }
      });
    }
  }, 30000); // Fetch every 30 seconds

  // Simulation Loop for Score Events
  setInterval(async () => {
    const liveMatches = matches.filter(m => m.status === "live" && !m.id.startsWith("real-"));
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

      // Write to social feed
      if (db) {
        db.collection("social_events").add({
          type: "match_event",
          matchId: matchToUpdate.id,
          matchName: `${matchToUpdate.homeTeam} vs ${matchToUpdate.awayTeam}`,
          content: desc,
          timestamp: Date.now()
        }).catch(err => console.error("Social Event Error:", err));
      }
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
        const matchRef = db.collection("matches").doc(matchToFinish.id);
        matchRef.set(matchToFinish, { merge: true });

        // Calculate prediction points
        const actualScore = `${matchToFinish.homeScore}-${matchToFinish.awayScore}`;
        db.collection("predictions")
          .where("matchId", "==", matchToFinish.id)
          .get()
          .then(snapshot => {
            snapshot.forEach(async (doc) => {
              const prediction = doc.data();
              let pointsEarned = 0;
              if (prediction.predictedScore === actualScore) {
                pointsEarned = 10; // Exact score
              } else {
                // Check if result (win/draw/loss) is correct
                const [pHome, pAway] = prediction.predictedScore.split("-").map(Number);
                const [aHome, aAway] = actualScore.split("-").map(Number);
                const pResult = pHome > pAway ? 1 : pHome < pAway ? -1 : 0;
                const aResult = aHome > aAway ? 1 : aHome < aAway ? -1 : 0;
                if (pResult === aResult) pointsEarned = 5;
              }

              if (pointsEarned > 0) {
                await doc.ref.update({ actualScore, pointsEarned });
                await db!.collection("users").doc(prediction.userId).update({
                  points: admin.firestore.FieldValue.increment(pointsEarned)
                });
              } else {
                await doc.ref.update({ actualScore, pointsEarned: 0 });
              }
            });
          })
          .catch(err => console.error("Prediction Points Error:", err));
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
