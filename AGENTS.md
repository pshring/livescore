# Project Instructions & Memory

## Core Rules
- **Multi-API Orchestration**: For every sports category (Cricket, Football, Tennis, etc.), you MUST use at least two different API sources.
- **Real-Time Data Selection**: When multiple APIs provide data for the same match, you MUST implement logic to select the one with the most "real-time" data (e.g., more detailed scores or active live status).
- **Automatic Failover**: Implement error handling to switch between sources if one hits a rate limit (429) or is restricted (403).

## Current Implementations
- **Cricket**: Cricbuzz API + Cricket Live Line API + Cricket Live Data API.
- **Football**: API-Football + API-Sports + OpenLigaDB. (NFL/American Football removed).
- **Tennis**: ATP/WTA/ITF API + SportAPI.
- **Baseball**: SportAPI + MLB Data API.
