import React, { useState } from "react";
import { useStore, WeaponType } from "../store";
import { Wind, Crosshair, Package, Timer } from "lucide-react";
import { sounds } from "../sounds";

export default function UI({ toggleFullscreen, isFullscreen }: { toggleFullscreen: () => void, isFullscreen: boolean }) {
  const { 
    gameState, myId, startGame, selectedWeapon, setSelectedWeapon, customName, setCustomName,
    connectSocket, joinLobby, lobbyPlayers, startOnlineGame, isOnline
  } = useStore();
  const PREDEFINED_NAMES = ["LAWRENCE OOI", "CALVIN ONG", "JOLIES", "GENE", "VELNUX", "LYNN", "WILSON LOON"];
  const [playerName, setPlayerName] = useState(customName || PREDEFINED_NAMES[0]);
  const [animalType, setAnimalType] = useState<'dog' | 'cat' | 'shiba' | 'husky' | 'orange-cat' | 'tuxedo-cat' | 'horse' | 'fatty-cat' | 'crying-cat'>('dog');
  const [mapType, setMapType] = useState<'classic' | 'desert' | 'penang' | 'online'>('classic');
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showCheatMenu, setShowCheatMenu] = useState(false);
  const [inLobby, setInLobby] = useState(false);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

  React.useEffect(() => {
    const handleResize = () => {
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(landscape);
      
      // Auto exit fullscreen if rotated to portrait
      if (!landscape && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleStart = () => {
    if (playerName.trim()) {
      sounds.playClick();
      if (mapType === 'online') {
        connectSocket();
        setInLobby(true);
        // We need a small delay to ensure socket is connected before joining
        setTimeout(() => {
          joinLobby(playerName.trim(), animalType);
        }, 500);
      } else {
        startGame(playerName.trim(), animalType, mapType);
      }
    }
  };

  if (gameState.status === "waiting") {
    if (inLobby) {
      return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 text-white p-4">
          <div className="w-full max-w-md bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-2xl">
            <h2 className="text-3xl font-black text-yellow-400 mb-6 text-center uppercase tracking-tighter">Waiting Room / 等待室</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center px-2">
                <span className="text-zinc-400 text-sm font-bold">Players Matched / 已匹配人数:</span>
                <span className="text-yellow-400 text-xl font-black">{lobbyPlayers.length}</span>
              </div>
              
              <div className="bg-black/40 rounded-2xl p-4 max-h-48 overflow-y-auto border border-white/5">
                {lobbyPlayers.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-bold text-sm">{p.name}</span>
                    <span className="text-[10px] text-zinc-500 uppercase">{p.animalType}</span>
                  </div>
                ))}
                {lobbyPlayers.length === 0 && <p className="text-center text-zinc-600 py-4 italic">Waiting for players...</p>}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => startOnlineGame()}
                disabled={lobbyPlayers.length < 1}
                className="w-full rounded-2xl bg-green-500 py-4 text-xl font-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              >
                START GAME / 开始游戏
              </button>
              <button
                onClick={() => setInLobby(false)}
                className="w-full rounded-2xl bg-zinc-800 py-3 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
              >
                LEAVE LOBBY / 离开
              </button>
            </div>
            
            <p className="mt-6 text-center text-[10px] text-zinc-500 uppercase tracking-widest animate-pulse">
              Matching with players on your server...
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 text-white overflow-y-auto py-4">
        <div className="my-auto flex flex-col items-center w-full">
          <h1 className={`font-black tracking-tighter text-yellow-400 drop-shadow-lg ${isLandscape && isMobile ? 'mb-2 text-3xl mt-4' : 'mb-8 text-6xl'}`}>
            lawrence.ct.ws
          </h1>
          
          <div className={`rounded-2xl bg-zinc-900/80 shadow-2xl backdrop-blur-sm w-full max-w-[90vw] sm:w-96 ${isLandscape && isMobile ? 'p-3 mb-4' : 'p-6 mb-8'}`}>
            <h2 className={`font-bold text-center ${isLandscape && isMobile ? 'mb-2 text-lg' : 'mb-6 text-2xl'}`}>Create Character</h2>
            
            <div className={`space-y-${isLandscape && isMobile ? '2' : '4'}`}>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">New Character Name / 自定义名称</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setPlayerName(val);
                      setCustomName(val);
                    }}
                    placeholder="TYPE YOUR NAME..."
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-bold text-yellow-400 placeholder:text-zinc-600 focus:outline-none focus:border-yellow-400/50"
                  />
                  <button
                    onClick={() => {
                      const randomName = PREDEFINED_NAMES[Math.floor(Math.random() * PREDEFINED_NAMES.length)];
                      setPlayerName(randomName);
                      setCustomName(randomName);
                      sounds.playClick();
                    }}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                    title="Random Name"
                  >
                    🎲
                  </button>
                </div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Or Select Predefined / 或选择预设</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PREDEFINED_NAMES.map(name => (
                    <button
                      key={name}
                      onClick={() => { sounds.playClick(); setPlayerName(name); }}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        playerName === name 
                          ? 'bg-yellow-400 text-black' 
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Choose Animal</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'dog', label: 'Classic Dog' },
                    { id: 'shiba', label: 'Shiba Inu' },
                    { id: 'husky', label: 'Husky' },
                    { id: 'cat', label: 'Classic Cat' },
                    { id: 'orange-cat', label: 'Orange Cat' },
                    { id: 'tuxedo-cat', label: 'Tuxedo Cat' },
                    { id: 'horse', label: 'Horse (马)' },
                    { id: 'fatty-cat', label: 'Fatty Cat (胖猫)' },
                    { id: 'crying-cat', label: 'Sad Cat (哭猫)' },
                  ].map(animal => (
                    <button
                      key={animal.id}
                      onClick={() => { sounds.playClick(); setAnimalType(animal.id as any); }}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        animalType === animal.id 
                          ? 'bg-yellow-400 text-black' 
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {animal.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Select Map</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => { sounds.playClick(); setMapType('classic'); }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      mapType === 'classic' ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    🌲 Classic Green
                  </button>
                  <button
                    onClick={() => { sounds.playClick(); setMapType('desert'); }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      mapType === 'desert' ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    🏜️ Desert Dunes
                  </button>
                  <button
                    onClick={() => { sounds.playClick(); setMapType('penang'); }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      mapType === 'penang' ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    🌉 Penang Bridge
                  </button>
                  <button
                    onClick={() => { sounds.playClick(); setMapType('online'); }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      mapType === 'online' ? 'bg-blue-500 text-white ring-2 ring-blue-400' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    🌐 ONLINE MODE
                  </button>
                </div>
              </div>

              <div className={`flex gap-2 ${isLandscape && isMobile ? 'mt-3' : 'mt-6'}`}>
                <button
                  onClick={handleStart}
                  disabled={!playerName.trim()}
                  className={`flex-1 rounded-xl bg-green-500 font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-green-400 disabled:opacity-50 disabled:hover:scale-100 ${isLandscape && isMobile ? 'px-4 py-2 text-sm' : 'px-8 py-3 text-lg'}`}
                >
                  Start Game
                </button>
                <button
                  onClick={() => { sounds.playClick(); setShowInstructions(true); }}
                  className={`rounded-xl bg-zinc-800 font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-zinc-700 ${isLandscape && isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-lg'}`}
                  title="How to Play"
                >
                  📖
                </button>
              </div>
              
              {isMobile && (
                <button
                  onClick={toggleFullscreen}
                  className="w-full mt-1 rounded-xl bg-zinc-800/50 border border-white/10 px-3 py-1.5 text-[10px] font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  {isFullscreen ? 'Exit Fullscreen / 退出全屏' : 'Toggle Fullscreen / 全屏'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.status === "gameover") {
    return (
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 text-white pointer-events-auto">
        <h1 className="mb-4 text-6xl font-black text-yellow-400">GAME OVER</h1>
        <h2 className="text-4xl font-bold">
          {gameState.winner === "Draw"
            ? "It's a Draw!"
            : `Winner: ${gameState.winner}`}
        </h2>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 rounded-xl bg-green-500 px-8 py-3 text-lg font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-green-400"
        >
          Play Again
        </button>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const isMyTurn = currentPlayer?.id === myId;
  const myPlayer = gameState.players.find(p => p.id === myId);

  if (showInstructions) {
    return (
      <div className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-zinc-950 text-white p-4 sm:p-8 overflow-y-auto pointer-events-auto">
        <div className="w-full max-w-4xl bg-zinc-900/90 rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-black text-yellow-400 uppercase tracking-tighter">Manual / 说明书</h2>
            <button onClick={() => setShowInstructions(false)} className="text-zinc-500 hover:text-white text-2xl">✕</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Weapons Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2">Weapons / 武器</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                  <span className="text-3xl">🍊</span>
                  <div>
                    <p className="font-bold text-sm">Orange (柑)</p>
                    <p className="text-xs text-zinc-400">Basic weapon. Infinite ammo. / 基本武器，无限弹药。</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                  <span className="text-3xl">🍌</span>
                  <div>
                    <p className="font-bold text-sm">Banana (香蕉)</p>
                    <p className="text-xs text-zinc-400">Medium damage. / 中等伤害。</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                  <span className="text-3xl">🩲</span>
                  <div>
                    <p className="font-bold text-sm">Panties (内裤)</p>
                    <p className="text-xs text-zinc-400">High damage explosion. / 高伤害爆炸。</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                  <span className="text-3xl">👙</span>
                  <div>
                    <p className="font-bold text-sm">Bra (内衣)</p>
                    <p className="text-xs text-zinc-400">MASSIVE damage & radius. / 极高伤害和大范围爆炸。</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                  <span className="text-3xl">🚀</span>
                  <div>
                    <p className="font-bold text-sm">Airstrike (空袭)</p>
                    <p className="text-xs text-zinc-400">Targeted strike. 3000 damage. / 定点打击，3000伤害。</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                  <span className="text-3xl">🔪</span>
                  <div>
                    <p className="font-bold text-sm">Knife (刀)</p>
                    <p className="text-xs text-zinc-400">Fast close-range strike. / 快速近战攻击。</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-blue-400 border-b border-blue-400/30 pb-2">Items / 道具</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-xl">➕</div>
                  <div>
                    <p className="font-bold text-sm">First Aid (急救包)</p>
                    <p className="text-xs text-zinc-400">Heals 2000 HP. / 恢复 2000 生命值。</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-xl">🛡️</div>
                  <div>
                    <p className="font-bold text-sm">Condom (安全套)</p>
                    <p className="text-xs text-zinc-400">Invincibility for 100s. / 100秒内无敌。</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                  <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center text-xl">🔥</div>
                  <div>
                    <p className="font-bold text-sm">Double Damage (x2)</p>
                    <p className="text-xs text-zinc-400">Doubles damage for 100s. / 100秒内双倍伤害。</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-xl">✈️</div>
                  <div>
                    <p className="font-bold text-sm">Airstrike (空投)</p>
                    <p className="text-xs text-zinc-400">Calls a random airstrike. / 召唤随机空袭。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowInstructions(false)}
            className="w-full mt-10 rounded-2xl bg-yellow-400 px-8 py-4 text-xl font-black text-black shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            UNDERSTOOD / 明白了
          </button>
        </div>
      </div>
    );
  }

  const weaponLabels: Record<WeaponType, string> = {
    orange: '柑 (∞)',
    banana: `香蕉 (${myPlayer?.inventory.banana || 0})`,
    panties: `内裤 (${myPlayer?.inventory.panties || 0})`,
    bra: `内衣 (${myPlayer?.inventory.bra || 0})`,
    airstrike: `空袭 (${myPlayer?.inventory.airstrike || 0})`,
    knife: `刀 (${myPlayer?.inventory.knife || 0})`,
  };

  const renderInventory = (isLandscapeMode: boolean) => {
    if (!isMobile || !isMyTurn || !myPlayer || !myPlayer.isAlive) return null;
    
    return (
      <div className={`pointer-events-auto flex flex-wrap gap-1 ${isLandscapeMode ? 'justify-center' : 'mt-1 max-w-[180px]'}`}>
        {(Object.keys(weaponLabels) as WeaponType[]).map((w) => (
          <button
            key={w}
            onClick={() => setSelectedWeapon(w)}
            onPointerDown={(e) => { e.preventDefault(); setSelectedWeapon(w); }}
            disabled={w !== 'orange' && (myPlayer.inventory[w] || 0) <= 0}
            className={`group relative flex flex-col items-center justify-center rounded-lg transition-all ${
              isLandscapeMode ? 'h-6 w-6' : 'h-8 w-8'
            } ${
              selectedWeapon === w
                ? 'bg-yellow-400 text-black scale-110 shadow-[0_0_10px_rgba(250,204,21,0.4)]'
                : 'bg-black/40 text-white hover:bg-black/60 border border-white/10'
            } disabled:opacity-20 disabled:grayscale disabled:scale-90`}
          >
            <span className={isLandscapeMode ? 'text-[10px]' : 'text-sm'}>
              {w === 'orange' ? '🍊' : w === 'banana' ? '🍌' : w === 'panties' ? '🩲' : w === 'bra' ? '👙' : w === 'airstrike' ? '🚀' : '🔪'}
            </span>
            <span className={`absolute -bottom-0.5 right-0.5 font-black uppercase ${isLandscapeMode ? 'text-[6px]' : 'text-[7px]'} ${selectedWeapon === w ? 'text-black' : 'text-zinc-400'}`}>
              {w === 'orange' ? '∞' : myPlayer.inventory[w] || 0}
            </span>
          </button>
        ))}
      </div>
    );
  };

  const triggerCheat = (keysStr: string) => {
    setShowCheatMenu(false);
    const keys = keysStr.split('');
    keys.forEach((key, index) => {
      setTimeout(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: `Key${key}`, key }));
        setTimeout(() => {
          window.dispatchEvent(new KeyboardEvent('keyup', { code: `Key${key}`, key }));
        }, 20);
      }, index * 50);
    });
  };

  const renderCheatMenu = (isLandscapeMode: boolean) => (
    <div className={`relative ${isLandscapeMode ? 'mt-1 flex justify-center' : ''}`}>
      {showCheatMenu && (
        <div className={`absolute ${isLandscapeMode ? 'top-full mt-2 left-1/2 -translate-x-1/2' : 'bottom-14 left-0'} bg-black/80 backdrop-blur-md border border-white/20 rounded-xl p-2 flex flex-col gap-2 w-32 shadow-2xl z-[60]`}>
          <button 
            className="bg-blue-500/80 hover:bg-blue-400 text-white text-[10px] font-bold py-1.5 px-2 rounded"
            onPointerDown={(e) => { e.preventDefault(); triggerCheat('WWWA'); }}
          >🛡️ Condom</button>
          <button 
            className="bg-red-500/80 hover:bg-red-400 text-white text-[10px] font-bold py-1.5 px-2 rounded"
            onPointerDown={(e) => { e.preventDefault(); triggerCheat('WWWD'); }}
          >🚀 Bomb</button>
          <button 
            className="bg-purple-500/80 hover:bg-purple-400 text-white text-[10px] font-bold py-1.5 px-2 rounded"
            onPointerDown={(e) => { e.preventDefault(); triggerCheat('WWWS'); }}
          >⚡ Fast Zone</button>
          <button 
            className="bg-zinc-700/80 hover:bg-zinc-600 text-white text-[10px] font-bold py-1.5 px-2 rounded"
            onPointerDown={(e) => { e.preventDefault(); triggerCheat('WWWG'); }}
          >🕶️ Gangsters</button>
          <button 
            className="bg-orange-500/80 hover:bg-orange-400 text-white text-[10px] font-bold py-1.5 px-2 rounded"
            onPointerDown={(e) => { e.preventDefault(); triggerCheat('WWW2'); }}
          >🔥 x2 Effect</button>
          <button 
            className="bg-green-500/80 hover:bg-green-400 text-white text-[10px] font-bold py-1.5 px-2 rounded"
            onPointerDown={(e) => { e.preventDefault(); triggerCheat('WWW1'); }}
          >🎁 All Items</button>
        </div>
      )}
      <button 
        className={`w-10 h-10 bg-yellow-500/80 rounded-full flex items-center justify-center text-black font-black text-[10px] active:bg-yellow-400 shadow-lg border-2 border-white/20 touch-none select-none ${isLandscapeMode ? 'scale-75' : ''}`}
        onPointerDown={(e) => {
          e.preventDefault();
          setShowCheatMenu(!showCheatMenu);
        }}
      >CHEAT</button>
    </div>
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-10 p-4 sm:p-6 flex flex-col justify-between">
      {/* Landscape Mobile Inventory (Top Center) */}
      {isMobile && isLandscape && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
          {renderInventory(true)}
          {renderCheatMenu(true)}
        </div>
      )}

      {/* PC Version Space to Attack Text */}
      {!isMobile && isMyTurn && myPlayer && myPlayer.isAlive && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 text-sm font-bold tracking-widest uppercase drop-shadow-md">
          Press Space to Attack
        </div>
      )}

      {/* Mobile Controls Overlay */}
      {isMobile && isMyTurn && myPlayer && myPlayer.isAlive && (
        <div className="pointer-events-auto fixed bottom-4 left-4 right-4 flex justify-between items-end z-50">
          <div className="flex flex-col gap-2 relative">
            {!isLandscape && renderCheatMenu(false)}
            <div className="grid grid-cols-3 gap-1 bg-black/20 p-1.5 rounded-2xl backdrop-blur-sm">
              <div />
              <button 
                className="w-10 h-10 bg-zinc-800/90 rounded-lg flex items-center justify-center text-white font-bold active:bg-yellow-400 active:text-black shadow-lg touch-none select-none text-xs"
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })); }}
                onPointerUp={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })); }}
                onPointerLeave={(e) => { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })); }}
              >W</button>
              <div />
              <button 
                className="w-10 h-10 bg-zinc-800/90 rounded-lg flex items-center justify-center text-white font-bold active:bg-yellow-400 active:text-black shadow-lg touch-none select-none text-xs"
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' })); }}
                onPointerUp={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' })); }}
                onPointerLeave={(e) => { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' })); }}
              >A</button>
              <button 
                className="w-10 h-10 bg-zinc-800/90 rounded-lg flex items-center justify-center text-white font-bold active:bg-yellow-400 active:text-black shadow-lg touch-none select-none text-xs"
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' })); }}
                onPointerUp={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' })); }}
                onPointerLeave={(e) => { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' })); }}
              >S</button>
              <button 
                className="w-10 h-10 bg-zinc-800/90 rounded-lg flex items-center justify-center text-white font-bold active:bg-yellow-400 active:text-black shadow-lg touch-none select-none text-xs"
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' })); }}
                onPointerUp={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' })); }}
                onPointerLeave={(e) => { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' })); }}
              >D</button>
            </div>
          </div>
          
          <button 
            className="w-16 h-16 bg-red-600/90 rounded-full flex items-center justify-center text-white font-black text-sm active:bg-red-500 shadow-2xl border-2 border-white/20 touch-none select-none"
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); }}
            onPointerUp={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); }}
            onPointerLeave={(e) => { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); }}
          >FIRE</button>
        </div>
      )}

      {/* Top Bar */}
      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-start justify-between'}`}>
        {/* Turn Indicator / Mobile HP */}
        <div className="flex flex-col items-start gap-1.5">
          <div className="flex items-center gap-2">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md border border-white/10">
              <Timer className="text-yellow-400" size={isMobile ? 14 : 20} />
              <span className={`${isMobile ? 'text-sm' : 'text-xl'} font-black text-white tabular-nums`}>
                {gameState.timeLeft}s
              </span>
              <div className="h-3 w-[1px] bg-white/20" />
              <span className={`${isMobile ? 'text-[10px]' : 'text-sm'} font-bold text-zinc-300 uppercase tracking-wider`}>
                {isMyTurn ? "Your Turn" : `${currentPlayer?.name}'s Turn`}
              </span>
            </div>
          </div>

          {/* Mobile PUBG Style HP Bar */}
          {isMobile && myPlayer && (
            <div className="pointer-events-auto w-40 rounded-lg bg-black/40 p-1.5 backdrop-blur-md border border-white/10">
              <div className="flex justify-between items-end mb-1">
                <span className="text-[9px] font-black text-white uppercase tracking-tighter">HP</span>
                <span className="text-[9px] font-bold text-white">{myPlayer.hp} / {myPlayer.maxHp}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${(myPlayer.hp / myPlayer.maxHp) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Other Players HP (Mobile only) */}
          {isMobile && (
            <div className="pointer-events-auto flex flex-col gap-1 mt-0.5">
              {gameState.players.filter(p => p.id !== myId).map(p => (
                <div key={p.id} className={`flex items-center gap-2 rounded bg-black/40 px-2 py-1 border border-white/5 ${!p.isAlive ? 'opacity-40 grayscale' : ''}`}>
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-[8px] font-bold text-white truncate w-16">{p.name}</span>
                  <div className="h-1 w-12 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full bg-red-500" style={{ width: `${(p.hp / p.maxHp) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Weapons Inventory (Mobile Portrait only) */}
          {!isLandscape && renderInventory(false)}
        </div>

        {/* Global Stats */}
        {!isMobile && (
          <div className="pointer-events-auto flex items-center gap-6 rounded-2xl bg-black/40 p-4 backdrop-blur-md border border-white/10">
            <div className="flex items-center gap-3">
              <Wind className="text-blue-400" size={20} />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Wind</span>
                <span className="text-lg font-black text-white">
                  {gameState.wind[0] > 0 ? "→" : "←"} {Math.abs(gameState.wind[0] * 10).toFixed(1)}
                </span>
              </div>
            </div>
            <div className="h-8 w-[1px] bg-white/20" />
            <div className="flex items-center gap-3">
              <Crosshair className="text-red-400" size={20} />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Zone</span>
                <span className="text-lg font-black text-white">
                  {gameState.zoneRadius.toFixed(0)}m
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className={`flex ${isMobile ? 'flex-col-reverse gap-4' : 'items-end justify-between'}`}>
        {/* Player List */}
        <div className={`pointer-events-auto flex flex-col gap-2 ${isMobile ? 'hidden' : ''}`}>
          {gameState.players.map((p) => (
            <div 
              key={p.id}
              className={`flex items-center gap-3 rounded-xl px-4 py-2 transition-all ${
                p.id === currentPlayer?.id 
                  ? 'bg-yellow-400/20 border border-yellow-400/50 scale-105' 
                  : 'bg-black/40 border border-white/5'
              } ${!p.isAlive ? 'opacity-40 grayscale' : ''}`}
            >
              <div 
                className="h-3 w-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-sm font-black text-white truncate w-24">
                {p.name}
              </span>
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[8px] font-bold text-zinc-400">{p.hp} HP</span>
                </div>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${(p.hp / p.maxHp) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Weapons Inventory (Desktop only) */}
        {!isMobile && isMyTurn && myPlayer && myPlayer.isAlive && (
          <div className="pointer-events-auto flex flex-col gap-3 items-end">
            <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 backdrop-blur-md border border-white/10">
              <Package className="text-yellow-400" size={16} />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Inventory</span>
            </div>
            <div className={`flex gap-2 ${isMobile ? 'flex-wrap justify-center' : ''}`}>
              {(Object.keys(weaponLabels) as WeaponType[]).map((w) => (
                <button
                  key={w}
                  onClick={() => setSelectedWeapon(w)}
                  disabled={w !== 'orange' && (myPlayer.inventory[w] || 0) <= 0}
                  className={`group relative flex h-12 w-12 sm:h-16 sm:w-16 flex-col items-center justify-center rounded-2xl transition-all ${
                    selectedWeapon === w
                      ? 'bg-yellow-400 text-black scale-110 shadow-[0_0_20px_rgba(250,204,21,0.4)]'
                      : 'bg-black/40 text-white hover:bg-black/60 border border-white/10'
                  } disabled:opacity-20 disabled:grayscale disabled:scale-90`}
                >
                  <span className="text-lg sm:text-2xl">{w === 'orange' ? '🍊' : w === 'banana' ? '🍌' : w === 'panties' ? '🩲' : w === 'bra' ? '👙' : w === 'airstrike' ? '🚀' : '🔪'}</span>
                  <span className={`text-[8px] sm:text-[10px] font-black uppercase ${selectedWeapon === w ? 'text-black' : 'text-zinc-400'}`}>
                    {w === 'orange' ? '∞' : myPlayer.inventory[w] || 0}
                  </span>
                  {selectedWeapon === w && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-black" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
