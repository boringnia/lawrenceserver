import { create } from "zustand";
import { sounds } from "./sounds";
import { io, Socket } from "socket.io-client";

export type WeaponType = 'orange' | 'banana' | 'panties' | 'bra' | 'knife' | 'airstrike';
export type DropType = WeaponType | 'medkit' | 'condom' | 'x2' | 'gangster' | 'syringe' | 'firstaid';

export interface Player {
  id: string;
  name: string;
  color: string;
  position: [number, number, number];
  isAlive: boolean;
  animalType: string;
  isAI: boolean;
  hp: number;
  maxHp: number;
  inventory: Record<WeaponType, number>;
  invincibleRounds: number;
  condomExpiry?: number;
  x2Expiry?: number;
  isGhost?: boolean;
  gangsterHits?: number; // Track hits in current wave
}

export interface Gangster {
  id: string;
  position: [number, number, number];
  hp: number;
  isAlive: boolean;
  animalType: string;
  color: string;
  spawnTime: number;
  direction: number;
}

export interface Drop {
  id: string;
  type: DropType;
  position: [number, number, number];
}

export interface DamageText {
  id: string;
  pos: [number, number, number];
  damage: number;
  timestamp: number;
}

export interface GameState {
  status: "waiting" | "playing" | "gameover";
  players: Player[];
  currentTurnIndex: number;
  currentRound: number;
  terrain: { x: number; y: number; z: number; size: number }[];
  wind: [number, number, number];
  drops: Drop[];
  winner: string | null;
  timeLeft: number;
  damageTexts: DamageText[];
  zoneRadius: number;
  isZoneFast: boolean;
  gangsters: Gangster[];
  mapWidth: number;
  mapType: string;
}

interface StoreState {
  gameState: GameState;
  myId: string | null;
  customName: string;
  setCustomName: (name: string) => void;
  selectedWeapon: WeaponType;
  setSelectedWeapon: (w: WeaponType) => void;
  startGame: (playerName: string, animalType: string, mapType: string, onlinePlayers?: any[], spawnPositions?: number[]) => void;
  endTurn: (newWind?: [number, number, number]) => void;
  tickTimer: () => void;
  updatePlayerPosition: (id: string, pos: [number, number, number]) => void;
  pickupDrop: (playerId: string, dropId: string, gangsters?: Gangster[]) => void;
  applyExplosion: (pos: [number, number, number], weapon: WeaponType) => void;
  applyAirstrike: (x: number, damage?: number) => void;
  applyCheatCondom: (playerId: string) => void;
  applyCheatHP: (playerId: string) => void;
  applyCheatDoubleDamage: (playerId: string) => void;
  applyCheatAllItems: (playerId: string) => void;
  spawnDrop: (drop: Drop) => void;
  consumeWeapon: (playerId: string, weapon: WeaponType) => void;
  removeDamageText: (id: string) => void;
  setZoneRadius: (radius: number) => void;
  activateFastZone: () => void;
  applyZoneDamage: (damage: number, stage: number) => void;
  spawnGangsters: () => void;
  updateGangsters: (delta: number) => void;
  
  // Multiplayer
  socket: Socket | null;
  isOnline: boolean;
  lobbyPlayers: any[];
  connectSocket: () => void;
  joinLobby: (name: string, animal: string) => void;
  startOnlineGame: () => void;
  syncAction: (action: any) => void;
}

const generateTerrain = (mapType: string) => {
  const terrain = [];
  for (let x = -60; x <= 60; x++) {
    let y = 0;
    if (mapType === 'desert') {
      y = -5 + Math.sin(x * 0.08) * 2.5 + Math.cos(x * 0.03) * 1.5;
    } else if (mapType === 'penang') {
      // Penang Bridge is mostly flat with a slight hump in the middle for the cable section
      const distFromCenter = Math.abs(x);
      if (distFromCenter < 15) {
        y = -3 + (15 - distFromCenter) * 0.1; // Slight rise in middle
      } else {
        y = -4;
      }
    } else {
      // Classic
      y = -5 + Math.sin(x * 0.15) * 1.5 + Math.cos(x * 0.05) * 1.0;
    }
    terrain.push({ x, y, z: 0, size: 1 });
  }
  return terrain;
};

export const getTerrainHeight = (x: number, terrain: { x: number; y: number }[]) => {
  const block = terrain.find(t => Math.round(t.x) === Math.round(x));
  return block ? block.y : -10;
};

export const PREDEFINED_NAMES = ["LAWRENCE OOI", "CALVIN ONG", "JOLIES", "GENE", "VELNUX", "LYNN", "WILSON LOON"];
const ANIMAL_TYPES = ['dog', 'cat', 'shiba', 'husky', 'orange-cat', 'tuxedo-cat', 'horse', 'fatty-cat', 'crying-cat'];
const COLORS = ["#ef4444", "#3b82f6", "#10b981", "#a855f7", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6"];

export const useStore = create<StoreState>((set, get) => ({
  gameState: {
    status: "waiting",
    players: [],
    currentTurnIndex: 0,
    terrain: [],
    wind: [0, 0, 0],
    drops: [],
    winner: null,
    timeLeft: 20,
    damageTexts: [],
    zoneRadius: 60,
    isZoneFast: false,
    gangsters: [],
    mapWidth: 120,
    mapType: 'classic',
  },
  myId: "player-1",
  customName: "",
  setCustomName: (name) => set({ customName: name }),
  selectedWeapon: "orange",
  setSelectedWeapon: (w) => set({ selectedWeapon: w }),

  socket: null,
  isOnline: false,
  lobbyPlayers: [],

  connectSocket: () => {
    if (get().socket) return;
    
    // Use the AI Studio backend if hosted on the free server, otherwise use relative path
    const backendUrl = window.location.hostname.includes('lawrence.ct.ws') 
      ? "https://lawrenceserver-2.onrender.com" 
      : undefined;
      
    const socket = io(backendUrl);
    
    socket.on("lobby-update", (players) => {
      set({ lobbyPlayers: players });
    });

    socket.on("game-started", (data) => {
      // data: { mapType, players, spawnPositions, seed }
      set({ isOnline: true });
      get().startGame(get().customName || "PLAYER", "dog", data.mapType, data.players, data.spawnPositions);
    });

    socket.on("remote-action", (action) => {
      const state = get();
      if (action.type === 'move') {
        state.updatePlayerPosition(action.id, action.pos);
      } else if (action.type === 'shoot') {
        window.dispatchEvent(new CustomEvent('remote-shoot', { detail: action }));
      } else if (action.type === 'explosion') {
        state.applyExplosion(action.pos, action.weapon);
      } else if (action.type === 'end-turn') {
        state.endTurn(action.wind);
      } else if (action.type === 'pickup') {
        state.pickupDrop(action.playerId, action.dropId);
      } else if (action.type === 'spawn-drop') {
        state.spawnDrop(action.drop);
      }
    });

    socket.on("player-disconnected", (id) => {
      set(state => {
        if (state.gameState.status !== 'playing') return state;
        const players = state.gameState.players.map(p => 
          p.id === id ? { ...p, hp: 0, isAlive: false, isGhost: true } : p
        );
        
        const currentPlayer = state.gameState.players[state.gameState.currentTurnIndex];
        if (currentPlayer?.id === id) {
           // If the disconnected player was the current player, end their turn locally
           // keeping the current wind to avoid desync
           setTimeout(() => get().endTurn(state.gameState.wind), 0);
        }
        
        return { gameState: { ...state.gameState, players } };
      });
    });

    set({ socket });
  },

  joinLobby: (name, animal) => {
    const socket = get().socket;
    if (socket) {
      socket.emit("join-lobby", { name, animalType: animal });
    }
  },

  startOnlineGame: () => {
    const socket = get().socket;
    if (socket) {
      const maps = ['classic', 'desert', 'penang'];
      const randomMap = maps[Math.floor(Math.random() * maps.length)];
      socket.emit("start-online-game", { mapType: randomMap });
    }
  },

  syncAction: (action) => {
    const socket = get().socket;
    if (socket && get().isOnline) {
      socket.emit("game-action", action);
    }
  },
  
  startGame: (playerName, animalType, mapType, onlinePlayers, spawnPositions) => {
    const terrain = generateTerrain(mapType);
    
    const getSpawnPos = (xOffset: number): [number, number, number] => {
      const y = getTerrainHeight(xOffset, terrain) + 1;
      return [xOffset, y, 0];
    };

    let players: Player[] = [];
    let myId = "player-1";

    if (onlinePlayers && spawnPositions) {
      players = onlinePlayers.map((p, i) => ({
        id: p.socketId,
        name: p.name,
        color: COLORS[i % COLORS.length],
        position: getSpawnPos(spawnPositions[i]),
        isAlive: true,
        animalType: p.animalType,
        isAI: false,
        hp: 10000,
        maxHp: 10000,
        inventory: { orange: -1, banana: 0, panties: 0, bra: 0, knife: 0, airstrike: 0 },
        invincibleRounds: 0,
        condomExpiry: 0,
        x2Expiry: 0,
        isGhost: false,
        gangsterHits: 0,
      }));
      myId = get().socket?.id || "player-1";
    } else {
      players = [
        {
          id: 'player-1',
          name: playerName,
          color: COLORS[0],
          position: getSpawnPos((Math.random() - 0.5) * 80),
          isAlive: true,
          animalType,
          isAI: false,
          hp: 10000,
          maxHp: 10000,
          inventory: { orange: -1, banana: 0, panties: 0, bra: 0, knife: 0, airstrike: 0 },
          invincibleRounds: 0,
          condomExpiry: 0,
          x2Expiry: 0,
          isGhost: false,
          gangsterHits: 0,
        }
      ];

      const availableNames = PREDEFINED_NAMES.filter(n => n.toUpperCase() !== playerName.toUpperCase());
      
      // Spawn all other predefined characters as AI
      availableNames.forEach((name, i) => {
        players.push({
          id: `ai-${i}`,
          name: name,
          color: COLORS[(i + 1) % COLORS.length],
          position: getSpawnPos((Math.random() - 0.5) * 100),
          isAlive: true,
          animalType: ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)],
          isAI: true,
          hp: 10000,
          maxHp: 10000,
          inventory: { orange: -1, banana: 0, panties: 0, bra: 0, knife: 0, airstrike: 0 },
          invincibleRounds: 0,
          condomExpiry: 0,
          x2Expiry: 0,
          isGhost: false,
          gangsterHits: 0,
        });
      });
    }

    set({
      gameState: {
        status: 'playing',
        players,
        currentTurnIndex: 0,
        currentRound: 1,
        terrain,
        wind: [(Math.random() - 0.5) * 3, 0, 0],
        drops: [],
        winner: null,
        timeLeft: 20,
        damageTexts: [],
        zoneRadius: 60,
        isZoneFast: false,
        gangsters: [],
        mapWidth: 120,
        mapType,
      },
      myId,
      selectedWeapon: 'orange',
    });
  },

  endTurn: (newWind?: [number, number, number]) => {
    set((state) => {
      const players = [...state.gameState.players];
      
      const alivePlayers = players.filter(p => p.isAlive);
      if (alivePlayers.length <= 1) {
        return { gameState: { ...state.gameState, players, status: 'gameover', winner: alivePlayers[0]?.name || 'Draw' } };
      }

      let nextIndex = (state.gameState.currentTurnIndex + 1) % players.length;
      while (!players[nextIndex].isAlive) {
        nextIndex = (nextIndex + 1) % players.length;
      }

      let newRound = state.gameState.currentRound;
      if (nextIndex <= state.gameState.currentTurnIndex) {
        newRound += 1;
      }

      if (players[nextIndex].invincibleRounds > 0) {
        players[nextIndex].invincibleRounds -= 1;
      }

      const wind = newWind || [(Math.random() - 0.5) * 3, 0, 0] as [number, number, number];

      // If it was my turn and I'm ending it, sync the wind
      const currentPlayer = state.gameState.players[state.gameState.currentTurnIndex];
      const myId = state.socket?.id;
      if (state.isOnline && currentPlayer.id === myId && !newWind) {
        state.syncAction({ type: 'end-turn', wind });
      }

      return {
        gameState: {
          ...state.gameState,
          players,
          currentTurnIndex: nextIndex,
          currentRound: newRound,
          wind,
          timeLeft: 20,
        }
      };
    });
  },

  tickTimer: () => {
    set((state) => {
      if (state.gameState.status !== 'playing') return state;
      if (state.gameState.timeLeft <= 0) return state; // Already waiting for sync

      const newTime = state.gameState.timeLeft - 1;
      if (newTime <= 0) {
        // Auto end turn
        const players = [...state.gameState.players];
        const alivePlayers = players.filter(p => p.isAlive);
        if (alivePlayers.length <= 1) {
          return { gameState: { ...state.gameState, players, status: 'gameover', winner: alivePlayers[0]?.name || 'Draw' } };
        }

        let nextIndex = (state.gameState.currentTurnIndex + 1) % players.length;
        while (!players[nextIndex].isAlive) {
          nextIndex = (nextIndex + 1) % players.length;
        }

        if (players[nextIndex].invincibleRounds > 0) {
          players[nextIndex].invincibleRounds -= 1;
        }

        const currentPlayer = state.gameState.players[state.gameState.currentTurnIndex];
        const myId = state.socket?.id;
        
        // If online, only the current player broadcasts the end-turn
        if (state.isOnline && currentPlayer.id === myId) {
           setTimeout(() => get().endTurn(), 0);
           return { gameState: { ...state.gameState, timeLeft: 0 } };
        } else if (state.isOnline) {
           // Wait for the network event from the current player
           return { gameState: { ...state.gameState, timeLeft: 0 } };
        }

        return {
          gameState: {
            ...state.gameState,
            players,
            currentTurnIndex: nextIndex,
            wind: [(Math.random() - 0.5) * 3, 0, 0],
            timeLeft: 20,
          }
        };
      }
      return { gameState: { ...state.gameState, timeLeft: newTime } };
    });
  },

  updatePlayerPosition: (id, pos) => {
    set((state) => ({
      gameState: {
        ...state.gameState,
        players: state.gameState.players.map(p => p.id === id ? { ...p, position: pos } : p)
      }
    }));
  },

  pickupDrop: (playerId, dropId, gangsters) => {
    set((state) => {
      const drop = state.gameState.drops.find(d => d.id === dropId);
      if (!drop) return state;

      const players = state.gameState.players.map(p => {
        if (p.id === playerId) {
          if (drop.type === 'medkit') {
            return { ...p, hp: p.hp + 100 };
          } else if (drop.type === 'firstaid') {
            return { ...p, hp: p.hp + 2000 };
          } else if (drop.type === 'syringe') {
            return { ...p, hp: p.hp + 5000 };
          } else if (drop.type === 'condom') {
            return { ...p, condomExpiry: Date.now() + 100000 };
          } else if (drop.type === 'x2') {
            return { ...p, x2Expiry: Date.now() + 100000 };
          } else if (drop.type === 'gangster') {
            return { ...p, gangsterHits: 0 }; // Reset hits when a new wave is called
          } else {
            return {
              ...p,
              inventory: {
                ...p.inventory,
                [drop.type as WeaponType]: (p.inventory[drop.type as WeaponType] || 0) + 1
              }
            };
          }
        }
        return p;
      });

      const newDrops = state.gameState.drops.filter(d => d.id !== dropId);
      
      if (drop.type === 'gangster') {
        const newGangsters: Gangster[] = gangsters || [];
        if (!gangsters) {
          const mapWidth = state.gameState.mapWidth;
          for (let i = 0; i < 5; i++) {
            const x = (Math.random() - 0.5) * mapWidth;
            const randomAnimal = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
            const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
            newGangsters.push({
              id: `gangster-${Date.now()}-${i}`,
              position: [x, getTerrainHeight(x, state.gameState.terrain) + 1, 0],
              hp: 2500,
              isAlive: true,
              animalType: randomAnimal,
              color: randomColor,
              spawnTime: Date.now(),
              direction: Math.random() > 0.5 ? 1 : -1,
            });
          }
        }
        return {
          gameState: {
            ...state.gameState,
            players: players.map(p => ({ ...p, gangsterHits: 0 })),
            drops: newDrops,
            gangsters: [...state.gameState.gangsters.filter(g => g.isAlive), ...newGangsters]
          }
        };
      }

      return {
        gameState: {
          ...state.gameState,
          players,
          drops: newDrops
        }
      };
    });
  },

  applyExplosion: (pos, weapon) => {
    sounds.playExplosion();
    set((state) => {
      const damageMap: Record<WeaponType, number> = {
        orange: 200,
        banana: 500,
        panties: 1000,
        bra: 4000,
        knife: 100,
        airstrike: 3000,
      };
      const radiusMap: Record<WeaponType, number> = {
        orange: 3,
        banana: 4,
        panties: 5,
        bra: 8,
        knife: 1,
        airstrike: 12,
      };

      let damage = damageMap[weapon];
      const currentPlayer = state.gameState.players[state.gameState.currentTurnIndex];
      if (currentPlayer && currentPlayer.x2Expiry && currentPlayer.x2Expiry > Date.now()) {
        damage *= 2;
      }

      const radius = radiusMap[weapon];
      const newDamageTexts = [...state.gameState.damageTexts];

      const players = state.gameState.players.map(p => {
        if (!p.isAlive) return p;
        const dx = p.position[0] - pos[0];
        const dy = p.position[1] - pos[1];
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist <= radius) {
          if (p.invincibleRounds > 0 || (p.condomExpiry && p.condomExpiry > Date.now())) {
            newDamageTexts.push({
              id: Math.random().toString(),
              pos: [p.position[0], p.position[1] + 4, p.position[2]],
              damage: 0,
              timestamp: Date.now()
            });
            return p;
          }
          const newHp = Math.max(0, p.hp - damage);
          newDamageTexts.push({
            id: Math.random().toString(),
            pos: [p.position[0], p.position[1] + 4, p.position[2]],
            damage: damage,
            timestamp: Date.now()
          });
          return { ...p, hp: newHp, isAlive: newHp > 0, isGhost: newHp <= 0 };
        }
        return p;
      });

      // Also damage gangsters
      const gangsters = state.gameState.gangsters
        .map(g => {
          if (!g.isAlive) return g;
          const dx = g.position[0] - pos[0];
          const dy = g.position[1] - pos[1];
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist <= radius) {
            const newHp = Math.max(0, g.hp - damage);
            return { ...g, hp: newHp, isAlive: newHp > 0 };
          }
          return g;
        })
        .filter(g => g.isAlive);

      return {
        gameState: {
          ...state.gameState,
          players,
          gangsters,
          damageTexts: newDamageTexts,
        }
      };
    });
  },

  applyAirstrike: (x, damage = 400) => {
    set((state) => {
      const newDamageTexts = [...state.gameState.damageTexts];
      const currentPlayer = state.gameState.players[state.gameState.currentTurnIndex];
      let finalDamage = damage;
      if (currentPlayer && currentPlayer.x2Expiry && currentPlayer.x2Expiry > Date.now()) {
        finalDamage *= 2;
      }

      const players = state.gameState.players.map(p => {
        if (!p.isAlive) return p;
        if (Math.abs(p.position[0] - x) <= 8) {
          if (p.invincibleRounds > 0 || (p.condomExpiry && p.condomExpiry > Date.now())) {
            newDamageTexts.push({
              id: Math.random().toString(),
              pos: [p.position[0], p.position[1] + 4, p.position[2]],
              damage: 0,
              timestamp: Date.now()
            });
            return p;
          }
          const newHp = Math.max(0, p.hp - finalDamage);
          newDamageTexts.push({
            id: Math.random().toString(),
            pos: [p.position[0], p.position[1] + 4, p.position[2]],
            damage: finalDamage,
            timestamp: Date.now()
          });
          return { ...p, hp: newHp, isAlive: newHp > 0, isGhost: newHp <= 0 };
        }
        return p;
      });

      const gangsters = state.gameState.gangsters
        .map(g => {
          if (!g.isAlive) return g;
          if (Math.abs(g.position[0] - x) <= 8) {
            const newHp = Math.max(0, g.hp - finalDamage);
            return { ...g, hp: newHp, isAlive: newHp > 0 };
          }
          return g;
        })
        .filter(g => g.isAlive);

      return {
        gameState: {
          ...state.gameState,
          players,
          gangsters,
          damageTexts: newDamageTexts
        }
      };
    });
  },

  applyCheatCondom: (playerId) => {
    set((state) => ({
      gameState: {
        ...state.gameState,
        players: state.gameState.players.map(p => 
          p.id === playerId ? { ...p, condomExpiry: Date.now() + 100000 } : p
        )
      }
    }));
  },

  applyCheatHP: (playerId) => {
    set((state) => ({
      gameState: {
        ...state.gameState,
        players: state.gameState.players.map(p => 
          p.id === playerId ? { ...p, hp: p.hp + 2000 } : p
        )
      }
    }));
  },

  applyCheatDoubleDamage: (playerId) => {
    set((state) => ({
      gameState: {
        ...state.gameState,
        players: state.gameState.players.map(p => 
          p.id === playerId ? { ...p, x2Expiry: Date.now() + 100000 } : p
        )
      }
    }));
  },

  applyCheatAllItems: (playerId) => {
    set((state) => ({
      gameState: {
        ...state.gameState,
        players: state.gameState.players.map(p => 
          p.id === playerId ? { 
            ...p, 
            inventory: {
              ...p.inventory,
              banana: (p.inventory.banana || 0) + 99,
              panties: (p.inventory.panties || 0) + 99,
              bra: (p.inventory.bra || 0) + 99,
              knife: (p.inventory.knife || 0) + 99,
              airstrike: (p.inventory.airstrike || 0) + 99,
            }
          } : p
        )
      }
    }));
  },

  spawnDrop: (drop) => {
    set((state) => ({
      gameState: {
        ...state.gameState,
        drops: [...state.gameState.drops, drop]
      }
    }));
  },



  consumeWeapon: (playerId, weapon) => {
    set((state) => {
      if (weapon === 'orange') return state;
      let selectedWeapon = state.selectedWeapon;
      
      const players = state.gameState.players.map(p => {
        if (p.id === playerId) {
          const newCount = Math.max(0, p.inventory[weapon] - 1);
          if (newCount === 0 && selectedWeapon === weapon) {
            selectedWeapon = 'orange';
          }
          return {
            ...p,
            inventory: { ...p.inventory, [weapon]: newCount }
          };
        }
        return p;
      });
      
      return { 
        gameState: { ...state.gameState, players },
        selectedWeapon
      };
    });
  },

  removeDamageText: (id) => {
    set((state) => ({
      gameState: {
        ...state.gameState,
        damageTexts: state.gameState.damageTexts.filter(dt => dt.id !== id)
      }
    }));
  },

  setZoneRadius: (radius) => {
    set((state) => ({
      gameState: {
        ...state.gameState,
        zoneRadius: radius
      }
    }));
  },

  activateFastZone: () => {
    set((state) => ({
      gameState: {
        ...state.gameState,
        isZoneFast: true
      }
    }));
  },

  applyZoneDamage: (damage, stage) => {
    set((state) => {
      const newDamageTexts = [...state.gameState.damageTexts];
      const players = state.gameState.players.map(p => {
        if (!p.isAlive) return p;
        if (Math.abs(p.position[0]) > state.gameState.zoneRadius) {
          let finalDamage = Math.floor(damage * 1.8);
          if (p.condomExpiry && p.condomExpiry > Date.now()) {
            finalDamage = Math.floor(finalDamage * 0.2); // Still hurts a bit
          }
          const newHp = Math.max(0, p.hp - finalDamage);
          newDamageTexts.push({
            id: Math.random().toString(),
            pos: [p.position[0], p.position[1] + 2, p.position[2]],
            damage: finalDamage,
            timestamp: Date.now()
          });
          return { ...p, hp: newHp, isAlive: newHp > 0, isGhost: newHp <= 0 };
        }
        return p;
      });
      return {
        gameState: {
          ...state.gameState,
          players,
          damageTexts: newDamageTexts
        }
      };
    });
  },

  spawnGangsters: () => {
    set((state) => {
      const newGangsters: Gangster[] = [];
      const mapWidth = state.gameState.mapWidth;
      for (let i = 0; i < 5; i++) {
        const x = (Math.random() - 0.5) * mapWidth;
        const randomAnimal = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
        const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        newGangsters.push({
          id: `gangster-${Date.now()}-${i}`,
          position: [x, getTerrainHeight(x, state.gameState.terrain) + 1, 0],
          hp: 2500,
          isAlive: true,
          animalType: randomAnimal,
          color: randomColor,
          spawnTime: Date.now(),
          direction: Math.random() > 0.5 ? 1 : -1,
        });
      }
      return {
        gameState: {
          ...state.gameState,
          gangsters: [...state.gameState.gangsters.filter(g => g.isAlive), ...newGangsters]
        }
      };
    });
  },

  updateGangsters: (delta) => {
    set((state) => {
      if (state.gameState.status !== 'playing') return state;
      const now = Date.now();
      const mapWidth = state.gameState.mapWidth;
      const speed = mapWidth / 5; 
      const newDamageTexts = [...state.gameState.damageTexts];
      const players = [...state.gameState.players];

      const newGangsters = state.gameState.gangsters
        .filter(g => g.isAlive && (now - g.spawnTime < 13000))
        .map(g => {
          let newX = g.position[0] + g.direction * speed * delta;
          let newDirection = g.direction;

          if (newX > mapWidth / 2) {
            newX = mapWidth / 2;
            newDirection = -1;
          } else if (newX < -mapWidth / 2) {
            newX = -mapWidth / 2;
            newDirection = 1;
          }

          const newY = getTerrainHeight(newX, state.gameState.terrain) + 1;
          const updatedPos: [number, number, number] = [newX, newY, 0];

          // Collision detection
          players.forEach((p, pIdx) => {
            if (!p.isAlive) return;
            const dist = Math.abs(p.position[0] - newX);
            if (dist < 1.5) {
              // Cooldown: only hit once every 2 seconds per player-gangster pair
              const lastHit = (g as any).lastHitTimes?.[p.id] || 0;
              if (now - lastHit > 2000) {
                if (!(p.invincibleRounds > 0 || (p.condomExpiry && p.condomExpiry > Date.now()))) {
                  const damage = 80;
                  const updatedPlayer = { ...p };
                  updatedPlayer.hp = Math.max(0, updatedPlayer.hp - damage);
                  updatedPlayer.isAlive = updatedPlayer.hp > 0;
                  updatedPlayer.isGhost = updatedPlayer.hp <= 0;
                  updatedPlayer.gangsterHits = (p.gangsterHits || 0) + 1;
                  
                  newDamageTexts.push({
                    id: `g-hit-${now}-${p.id}-${g.id}`,
                    pos: [p.position[0], p.position[1] + 2, p.position[2]],
                    damage: damage,
                    timestamp: now
                  });
                  players[pIdx] = updatedPlayer;
                  
                  // Update last hit time
                  if (!(g as any).lastHitTimes) (g as any).lastHitTimes = {};
                  (g as any).lastHitTimes[p.id] = now;
                }
              }
            }
          });

          return { ...g, position: updatedPos, direction: newDirection };
        });

      return {
        gameState: {
          ...state.gameState,
          gangsters: newGangsters,
          players,
          damageTexts: newDamageTexts
        }
      };
    });
  }
}));
