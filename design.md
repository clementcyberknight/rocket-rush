# Rocket Rush — Game Architecture & Server-Side Anti-Cheat Design Document

## 1. Game Overview & Core Retention Loops

Rocket Rush is a high-octane 3D hyper-casual arcade tunnel runner. To maximize long-term player retention and daily engagement, the game incorporates an arcade progression system centered around **Collectible Energy Orbs**, **Hangar Garage Customization**, and **Gameplay Stat Perks**.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           CORE RETENTION LOOP                             │
└───────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
        ┌──────────────────────────────────────────────────────────┐
        │  FLY & SURVIVE                                           │
        │  Steer through neon tunnel, dodge obstacles & collect    │
        │  glowing 3D Energy Orbs floating on course.              │
        └──────────────────────────────────────────────────────────┘
                                     │
                                     ▼
        ┌──────────────────────────────────────────────────────────┐
        │  EARN & ACCUMULATE ORBS                                  │
        │  Orbs collected during runs are persisted to player      │
        │  profile & synchronized with Redis backend.              │
        └──────────────────────────────────────────────────────────┘
                                     │
                                     ▼
        ┌──────────────────────────────────────────────────────────┐
        │  HANGAR GARAGE UNLOCKS                                   │
        │  Spend Orbs in the Garage to unlock new Rocket Ships,     │
        │  Thruster Trail FX, and powerful Gameplay Perks.         │
        └──────────────────────────────────────────────────────────┘
                                     │
                                     ▼
        ┌──────────────────────────────────────────────────────────┐
        │  CLIMB THE REAL-TIME LEADERBOARD                         │
        │  Equip Shield & Magnet ships to achieve higher scores    │
        │  and dominate the live global top 20 rankings.           │
        └──────────────────────────────────────────────────────────┘
```

---

## 2. Hangar Garage & Gameplay Stat Perks

Players can unlock 4 distinct Rocket Ships and 4 Thruster Trail FX using Orbs collected during gameplay:

| Ship Model | Perk / Ability | Cost (Orbs) | Strategic Advantage |
|---|---|---|---|
| **RUSH-V1 (Default)** | Balanced Specs | Free | Standard agility and thruster response. |
| **ORB MAGNET V2** | Magnetic Field Radius (8u) | 250 Orbs | Automatically pulls nearby floating Orbs within 8 units radius. |
| **CYBER AGILE X** | Sharp Steering (+25% Sensitivity) | 500 Orbs | Increased lateral acceleration for precision dodging at high speeds. |
| **AEGIS SHIELD PRIME** | Crash Protection Shield (1x) | 1,000 Orbs | Absorbs 1 obstacle crash per run, triggering a visual energy burst so player continues flying. |

### Thruster Trail Colors
- **Neon Pink** (Default)
- **Laser Cyan** (100 Orbs)
- **Golden Fusion** (250 Orbs)
- **Plasma Violet** (500 Orbs)

---

## 3. Server-Side Anti-Cheat & Telemetry Verification Architecture

To prevent cheating while guaranteeing 100% reliability for legitimate players (even during network reconnects), Rocket Rush implements a **Server-Validated Physics Telemetry Architecture**.

```
┌─────────────────┐       1. START_SESSION (Wallet / Guest ID)        ┌──────────────────┐
│                 │ ───────────────────────────────────────────► │                  │
│  Client Game    │ ◄─────────────────────────────────────────── │  Bun / TS Server │
│  (R3F Frontend) │       Session Token & Telemetry Config       │  (WebSocket)     │
│                 │                                              │                  │
│                 │       2. Periodic Telemetry Ticks (1.0s)      │                  │
│                 │ ───────────────────────────────────────────► │                  │
│                 │       Score, Speed, Level, Orbs, Shield      │  Validation      │
│                 │                                              │  Engine          │
│                 │       3. SUBMIT_SCORE (Final Run Data)       │                  │
│                 │ ───────────────────────────────────────────► │                  │
└─────────────────┘ ◄─────────────────────────────────────────── └──────────────────┘
                          4. Verified Score & Top 20 Stream               │
                                                                          ▼
                                                                  ┌────────────────┐
                                                                  │ Redis Store    │
                                                                  │ ZADD & HSET    │
                                                                  └────────────────┘
```

### Key Anti-Cheat Safeguards:

1. **Session-Bound Cryptographic Token**:
   - When a player starts a run, the server issues a `sessionId` linked to the player's unique identity (`walletAddress`, `email`, or `guest_id`).
   - If the WebSocket reconnects mid-game, the client sends a `RECONNECT_SESSION` frame with the `sessionId`, preventing session drops.

2. **Physical Kinematic Ceiling ($\text{Score}_{\text{max}}$)**:
   - Game speed starts at $v_0 = 0.5$ and accelerates over duration $t$.
   - Max distance possible after duration $t$:
     $$\text{Distance}_{\text{max}}(t) = \int_{0}^{t} v(\tau) d\tau + \text{Margin}$$
   - Any submitted score exceeding $\text{Distance}_{\text{max}}(t)$ is flagged as speed/position hacking.

3. **Orb Spawn Density Cap**:
   - Course density caps Orb spawns at max 15 Orbs per 100 units distance.
   - Submitting an Orb collection count exceeding $\text{Distance} \times 0.15$ is flagged as currency injection.

4. **Aegis Shield Verification**:
   - Equipping Aegis Shield Prime allows exactly 1 crash absorption per session.
   - If a client continues reporting ticks after 2 crash events without shield reset, session is terminated.

5. **Server Log Audit & Rejection Grace**:
   - Rather than silently dropping rejected scores, the server emits a `SCORE_SUBMITTED` packet with explicit validation reason (`valid: true` or `valid: false, reason: 'Speed ceiling exceeded'`) to ensure transparency.

---

## 4. Database & Protobuf Schema

### Redis Key Structure:
- `rocket-rush:leaderboard:YYYY-WW` — Sorted Set (`ZADD`) of top scores keyed by player identifier.
- `rocket-rush:usernames` — Hash (`HSET`) mapping player identifier to custom callsign/username.
- `rocket-rush:player:orbs` — Hash (`HSET`) mapping player identifier to accumulated Orb currency.
- `rocket-rush:player:inventory` — Hash (`HSET`) mapping player identifier to unlocked ships & trails.

### Protobuf Client Message Types:
```protobuf
enum ClientMessageType {
  START_SESSION = 1;
  GAME_TICK = 2;
  SUBMIT_SCORE = 3;
  GET_LEADERBOARD = 4;
  UPDATE_USERNAME = 5;
  BUY_ITEM = 6;
}
```
