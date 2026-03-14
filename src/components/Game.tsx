import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrthographicCamera,
  Text,
  Billboard,
  RoundedBox,
  Sky,
  Cloud,
  Stars,
  Float,
} from "@react-three/drei";
import * as THREE from "three";
import { useStore, WeaponType, DropType, Drop, getTerrainHeight } from "../store";
import { sounds } from "../sounds";

const GRAVITY = -9.8;

function AnimalModel({ type, color, isGhost }: { type: string, color: string, isGhost?: boolean }) {
  const emojiMap: Record<string, string> = {
    dog: '🐶',
    shiba: '🐕',
    husky: '🐺',
    cat: '🐱',
    'orange-cat': '🐈',
    'tuxedo-cat': '🐈‍⬛',
    horse: '🐴',
    'fatty-cat': '😸',
    'crying-cat': '😿',
    gangster: '👹',
    airstrike: '🚀',
    firstaid: '🏥',
    x2: '🔥',
  };

  const emoji = emojiMap[type] || '🐾';
  const opacity = isGhost ? 0.6 : 1;
  const isFatty = type === 'fatty-cat';
  const isCrying = type === 'crying-cat';

  return (
    <Billboard position={[0, 0.5, 0.1]}>
      <group scale={isFatty ? [1.3, 0.9, 1] : [1, 1, 1]}>
        {/* Cute 2D Sticker Background with Black Border */}
        <mesh position={[0, 0, -0.05]}>
          <circleGeometry args={[0.65, 32]} />
          <meshBasicMaterial color="black" transparent opacity={opacity} />
        </mesh>
        <mesh position={[0, 0, -0.04]}>
          <circleGeometry args={[0.6, 32]} />
          <meshBasicMaterial color="white" transparent opacity={opacity * 0.8} />
        </mesh>
        <mesh position={[0, 0, -0.03]}>
          <circleGeometry args={[0.7, 32]} />
          <meshBasicMaterial color={color} transparent opacity={opacity * 0.5} />
        </mesh>
        
        {/* Yellow Hood for Crying Cat */}
        {isCrying && (
          <mesh position={[0, 0.1, -0.02]}>
            <circleGeometry args={[0.6, 32, Math.PI, Math.PI]} />
            <meshBasicMaterial color="#facc15" transparent opacity={opacity} />
          </mesh>
        )}

        {/* The Emoji Sprite */}
        <Text
          fontSize={1.2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {emoji}
        </Text>
        
        {isGhost && (
          <Text position={[0, 0.8, 0.1]} fontSize={0.4} color="white" outlineWidth={0.05} outlineColor="black">BOOO</Text>
        )}
      </group>
    </Billboard>
  );
}

function PlayerModel({
  player,
  isCurrentTurn,
  isMe,
  onFire
}: {
  player: any;
  isCurrentTurn: boolean;
  isMe: boolean;
  onFire: (pos: [number, number, number], vel: [number, number, number], weapon: WeaponType) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [aimAngle, setAimAngle] = useState(Math.PI / 4);
  const [power, setPower] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [facing, setFacing] = useState(1);
  const { gameState, updatePlayerPosition, selectedWeapon, pickupDrop, isOnline, syncAction } = useStore();
  
  const [moveLeft, setMoveLeft] = useState(5);
  const keys = useRef({ a: false, d: false, w: false, s: false, space: false });
  const aiState = useRef({ phase: 'idle', timer: 0, targetX: 0, moveDir: 1 });
  const pickedDrops = useRef<Set<string>>(new Set());

  const lastSyncTime = useRef(0);

  useEffect(() => {
    if (isCurrentTurn) {
      setMoveLeft(5);
      if (player.isAI) {
        aiState.current = { phase: 'think', timer: 1, targetX: 0, moveDir: 1 };
      }
    }
  }, [isCurrentTurn, player.isAI]);

  useEffect(() => {
    if (!isCurrentTurn || !isMe || !player.isAlive || player.isAI) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyA') keys.current.a = true;
      if (e.code === 'KeyD') keys.current.d = true;
      if (e.code === 'KeyW') keys.current.w = true;
      if (e.code === 'KeyS') keys.current.s = true;
      if (e.code === 'Space') {
        keys.current.space = true;
        if (!isCharging) setIsCharging(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA') {
        keys.current.a = false;
        if (isOnline) syncAction({ type: 'move', id: player.id, pos: useStore.getState().gameState.players.find(p => p.id === player.id)?.position || player.position });
      }
      if (e.code === 'KeyD') {
        keys.current.d = false;
        if (isOnline) syncAction({ type: 'move', id: player.id, pos: useStore.getState().gameState.players.find(p => p.id === player.id)?.position || player.position });
      }
      if (e.code === 'KeyW') keys.current.w = false;
      if (e.code === 'KeyS') keys.current.s = false;
      if (e.code === 'Space') {
        keys.current.space = false;
        if (isCharging) {
          setIsCharging(false);
          if (selectedWeapon !== 'orange' && player.inventory[selectedWeapon] <= 0) {
            setPower(0);
            return;
          }
          const velocity = [
            facing * Math.cos(aimAngle) * power * 0.5,
            Math.sin(aimAngle) * power * 0.5,
            0,
          ] as [number, number, number];
          
          sounds.playAttack();
          onFire(
            [player.position[0], player.position[1] + 1, 0],
            velocity,
            selectedWeapon
          );
          if (isOnline) {
            syncAction({
              type: 'shoot',
              id: player.id,
              pos: [player.position[0], player.position[1] + 1, 0],
              vel: velocity,
              weapon: selectedWeapon
            });
          }
          setPower(0);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    isCurrentTurn, isMe, isCharging, power, aimAngle, facing,
    player, selectedWeapon, onFire
  ]);

  useEffect(() => {
    if (!isOnline || isMe) return;

    const handleRemoteShoot = (e: any) => {
      const action = e.detail;
      if (action.id === player.id) {
        sounds.playAttack();
        onFire(action.pos, action.vel, action.weapon);
      }
    };

    window.addEventListener('remote-shoot', handleRemoteShoot);
    return () => window.removeEventListener('remote-shoot', handleRemoteShoot);
  }, [isOnline, isMe, player.id, onFire]);

  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...player.position);
    }
  }, []); // Only on mount

  useFrame((state, delta) => {
    if (groupRef.current) {
      if (!isMe && isOnline) {
        // Smoothly interpolate remote player positions
        groupRef.current.position.lerp(new THREE.Vector3(...player.position), 0.3);
      } else {
        // Snap local player immediately
        groupRef.current.position.set(...player.position);
      }
    }

    if (!player.isAlive) return;

    // Drop pickup logic
    gameState.drops.forEach(drop => {
      if (pickedDrops.current.has(drop.id)) return;
      const dist = Math.abs(player.position[0] - drop.position[0]);
      if (dist < 1.5) {
        pickedDrops.current.add(drop.id);
        sounds.playPickup();
        pickupDrop(player.id, drop.id);
        if (isOnline && isMe) {
          syncAction({ type: 'pickup', playerId: player.id, dropId: drop.id });
        }
      }
    });

    if (isCurrentTurn) {
      if (isMe) {
        if (keys.current.w) setAimAngle(a => Math.min(Math.PI / 2, a + delta * 2));
        if (keys.current.s) setAimAngle(a => Math.max(0, a - delta * 2));
        
        if ((keys.current.a || keys.current.d) && moveLeft > 0) {
          setMoveLeft(m => Math.max(0, m - delta));
          const dir = keys.current.a ? -1 : 1;
          setFacing(dir);
          const newX = Math.max(-58, Math.min(58, player.position[0] + dir * delta * 5));
          const newY = getTerrainHeight(newX, gameState.terrain) + 1;
          if (Math.abs(newX - player.position[0]) > 0.01) {
             if (Math.floor(state.clock.elapsedTime * 5) !== Math.floor((state.clock.elapsedTime - delta) * 5)) {
               sounds.playJump();
             }
          }
          updatePlayerPosition(player.id, [newX, newY, 0]);
          if (isOnline) {
            const now = Date.now();
            if (now - lastSyncTime.current > 50) {
              syncAction({ type: 'move', id: player.id, pos: [newX, newY, 0] });
              lastSyncTime.current = now;
            }
          }
        }

        if (isCharging) setPower(p => Math.min(30, p + delta * 20));
      } else if (player.isAI) {
        const ai = aiState.current;
        ai.timer -= delta;
        
        if (ai.phase === 'think' && ai.timer <= 0) {
          let targetX = player.position[0];
          let nearestDist = Infinity;
          const wantsDrop = Math.random() > 0.3 && gameState.drops.length > 0;
          
          if (wantsDrop) {
            gameState.drops.forEach(d => {
              const dist = Math.abs(d.position[0] - player.position[0]);
              if (dist < nearestDist) {
                nearestDist = dist;
                targetX = d.position[0];
              }
            });
          } else {
            gameState.players.forEach(p => {
              if (p.id !== player.id && p.isAlive) {
                const dist = Math.abs(p.position[0] - player.position[0]);
                if (dist < nearestDist) {
                  nearestDist = dist;
                  targetX = p.position[0];
                }
              }
            });
          }
          
          ai.targetX = targetX;
          ai.moveDir = targetX > player.position[0] ? 1 : -1;
          setFacing(ai.moveDir);
          ai.phase = 'move';
          ai.timer = Math.random() * 2 + 1; // Move for 1-3 seconds
        } 
        else if (ai.phase === 'move') {
          const distToTarget = Math.abs(ai.targetX - player.position[0]);
          if (ai.timer <= 0 || distToTarget < 1 || moveLeft <= 0) {
            ai.phase = 'aim';
            ai.timer = 1;
          } else {
            setMoveLeft(m => Math.max(0, m - delta));
            const newX = Math.max(-58, Math.min(58, player.position[0] + ai.moveDir * delta * 5));
            const newY = getTerrainHeight(newX, gameState.terrain) + 1;
            updatePlayerPosition(player.id, [newX, newY, 0]);
          }
        }
        else if (ai.phase === 'aim' && ai.timer <= 0) {
          ai.phase = 'fire';
          let enemyDist = Infinity;
          let enemy = null;
          gameState.players.forEach(p => {
            if (p.id !== player.id && p.isAlive) {
              const dist = Math.abs(p.position[0] - player.position[0]);
              if (dist < enemyDist) {
                enemyDist = dist;
                enemy = p;
              }
            }
          });

          if (enemy) {
            const fireDir = enemy.position[0] > player.position[0] ? 1 : -1;
            setFacing(fireDir);
            const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.2;
            setAimAngle(angle);
            
            const requiredPower = Math.min(30, Math.max(10, Math.sqrt(enemyDist * 15) + (Math.random() - 0.5) * 5));
            
            const availableWeapons = (['bra', 'panties', 'banana', 'orange', 'airstrike'] as WeaponType[]).filter(w => w === 'orange' || player.inventory[w] > 0);
            const aiWeapon = availableWeapons[0];

            const velocity = [
              fireDir * Math.cos(angle) * requiredPower * 0.5,
              Math.sin(angle) * requiredPower * 0.5,
              0,
            ] as [number, number, number];
            
            sounds.playAttack();
            onFire([player.position[0], player.position[1] + 1, 0], velocity, aiWeapon);
          } else {
            onFire([player.position[0], player.position[1] + 1, 0], [facing * 10, 10, 0], 'orange');
          }
        }
      }
    }

    if (ref.current) {
      if (isCurrentTurn) {
        ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 5) * 0.1);
      } else {
        ref.current.scale.setScalar(1);
      }
    }
  });

  if (!player.isAlive && !player.isGhost) return null;

  return (
    <group ref={groupRef}>
      {(player.invincibleRounds > 0 || (player.condomExpiry && player.condomExpiry > Date.now())) && (
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[1.2, 32, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} />
        </mesh>
      )}
      {player.x2Expiry && player.x2Expiry > Date.now() && (
        <Text position={[0, 2.2, 0]} fontSize={0.4} color="#fbbf24">x2 ACTIVE</Text>
      )}
      <group ref={ref} rotation={[0, facing === 1 ? Math.PI / 2 : -Math.PI / 2, 0]}>
        <AnimalModel type={player.animalType || 'dog'} color={player.color} isGhost={player.isGhost} />
      </group>
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.5}
        color={player.isGhost ? '#ffffff' : player.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {player.name} {player.isGhost ? '(BOOO)' : ''}
      </Text>
      {isCurrentTurn && isMe && (
        <group position={[0, 0.5, 0]}>
          <mesh
            rotation={[0, 0, facing * aimAngle]}
            position={[facing * Math.cos(aimAngle) * 1.5, Math.sin(aimAngle) * 1.5, 0]}
          >
            <cylinderGeometry args={[0.02, 0.02, 3]} />
            <meshBasicMaterial color="white" transparent opacity={0.5} />
          </mesh>
          {isCharging && (
            <mesh position={[0, 1, 0]}>
              <boxGeometry args={[power / 10, 0.1, 0.1]} />
              <meshBasicMaterial color="red" />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
}

function Projectile({
  startPos,
  initialVelocity,
  weapon,
  onHit,
  onUpdatePos,
}: {
  startPos: [number, number, number];
  initialVelocity: [number, number, number];
  weapon: WeaponType;
  onHit: (pos: [number, number, number]) => void;
  onUpdatePos: (pos: [number, number, number]) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [pos, setPos] = useState(new THREE.Vector3(...startPos));
  const [vel, setVel] = useState(new THREE.Vector3(...initialVelocity));
  const { gameState } = useStore();

  useFrame((state, delta) => {
    if (!ref.current) return;

    const newVel = vel.clone();
    newVel.y += GRAVITY * delta;
    newVel.x += gameState.wind[0] * delta;

    const newPos = pos.clone().add(newVel.clone().multiplyScalar(delta));

    setVel(newVel);
    setPos(newPos);
    ref.current.position.copy(newPos);
    ref.current.rotation.x += delta * 10;
    
    onUpdatePos([newPos.x, newPos.y, newPos.z]);
    ref.current.rotation.y += delta * 10;

    let hit = false;
    const terrainHeight = getTerrainHeight(newPos.x, gameState.terrain);
    if (newPos.y < terrainHeight) {
      newPos.y = terrainHeight;
      hit = true;
    }

    if (hit) {
      onHit([newPos.x, newPos.y, newPos.z]);
    }
  });

  return (
    <group ref={ref} position={startPos}>
      {weapon === 'orange' && (
        <Text position={[0, 0, 0]} fontSize={1} color="white" outlineWidth={0.1} outlineColor="black">🍊</Text>
      )}
      {weapon === 'banana' && (
        <Text position={[0, 0, 0]} fontSize={1} color="white" outlineWidth={0.1} outlineColor="black">🍌</Text>
      )}
      {weapon === 'panties' && (
        <Text position={[0, 0, 0]} fontSize={1} color="white" outlineWidth={0.1} outlineColor="black">🩲</Text>
      )}
      {weapon === 'bra' && (
        <Text position={[0, 0, 0]} fontSize={1} color="white" outlineWidth={0.1} outlineColor="black">👙</Text>
      )}
      {weapon === 'airstrike' && (
        <Text position={[0, 0, 0]} fontSize={1} color="white" outlineWidth={0.1} outlineColor="black">🚀</Text>
      )}
      {weapon === 'knife' && (
        <Text position={[0, 0, 0]} fontSize={1} color="white" outlineWidth={0.1} outlineColor="black">🔪</Text>
      )}
    </group>
  );
}

function Explosion({ position, weapon }: { position: [number, number, number], weapon: WeaponType }) {
  const ref = useRef<THREE.Group>(null);
  const [scale, setScale] = useState(0.1);
  const [opacity, setOpacity] = useState(1);

  useFrame((state, delta) => {
    if (ref.current) {
      setScale((s) => Math.min(weapon === 'bra' ? 8 : weapon === 'panties' ? 5 : weapon === 'banana' ? 4 : 3, s + delta * 20));
      setOpacity((o) => Math.max(0, o - delta * 1.5));
      ref.current.scale.setScalar(scale);
      
      const explosionMesh = ref.current.children[0] as THREE.Mesh;
      if (explosionMesh && explosionMesh.material) {
        (explosionMesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      }
    }
  });

  if (opacity <= 0) return null;

  const textMap = {
    orange: '柑你拿',
    banana: '吃香蕉啦',
    panties: '原味内裤',
    bra: '爆炸内衣',
    condom: '安全套攻击'
  };

  const damageMap = {
    orange: '-200 HP',
    banana: '-500 HP',
    panties: '-1000 HP',
    bra: '-5000 HP',
    condom: '-100 HP'
  };

  return (
    <group ref={ref} position={position}>
      <mesh>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={weapon === 'bra' ? '#ef4444' : weapon === 'panties' ? '#ec4899' : '#ffaa00'} transparent opacity={opacity} />
      </mesh>
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.8}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {textMap[weapon]}
      </Text>
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.6}
        color="#ff0000"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#ffffff"
      >
        {damageMap[weapon]}
      </Text>
    </group>
  );
}

function DropItem({ drop }: { drop: Drop }) {
  const ref = useRef<THREE.Group>(null);
  const [y, setY] = useState(drop.position[1]);
  const { gameState } = useStore();
  
  useFrame((state, delta) => {
    const terrainHeight = getTerrainHeight(drop.position[0], gameState.terrain);
    const maxY = terrainHeight;
    
    if (y > maxY + 1) {
      setY(y => Math.max(maxY + 1, y - delta * 10));
    }

    if (ref.current) {
      ref.current.rotation.y += 0.05;
      ref.current.position.y = y + (y <= maxY + 1 ? Math.sin(state.clock.elapsedTime * 2) * 0.2 : 0);
    }
  });

  return (
    <group ref={ref} position={[drop.position[0], y, drop.position[2]]}>
      {drop.type === 'medkit' && (
        <Text position={[0, 0, 0]} fontSize={1.5} color="white" outlineWidth={0.1} outlineColor="black">🏥</Text>
      )}
      {drop.type === 'firstaid' && (
        <Text position={[0, 0, 0]} fontSize={1.5} color="white" outlineWidth={0.1} outlineColor="black">🩹</Text>
      )}
      {drop.type === 'banana' && (
        <Text position={[0, 0, 0]} fontSize={1.5} color="white" outlineWidth={0.1} outlineColor="black">🍌</Text>
      )}
      {drop.type === 'panties' && (
        <Text position={[0, 0, 0]} fontSize={1.5} color="white" outlineWidth={0.1} outlineColor="black">🩲</Text>
      )}
      {drop.type === 'bra' && (
        <Text position={[0, 0, 0]} fontSize={1.5} color="white" outlineWidth={0.1} outlineColor="black">👙</Text>
      )}
      {drop.type === 'condom' && (
        <Text position={[0, 0, 0]} fontSize={1.5} color="white" outlineWidth={0.1} outlineColor="black">🛡️</Text>
      )}
      {drop.type === 'x2' && (
        <Text position={[0, 0, 0]} fontSize={1.5} color="white" outlineWidth={0.1} outlineColor="black">🔥</Text>
      )}
      {drop.type === 'gangster' && (
        <Text position={[0, 0, 0]} fontSize={1.5} color="white" outlineWidth={0.1} outlineColor="black">🕶️</Text>
      )}
      {drop.type === 'syringe' && (
        <Text position={[0, 0, 0]} fontSize={1.5} color="white" outlineWidth={0.1} outlineColor="black">💉</Text>
      )}
      {drop.type === 'airstrike' && (
        <Text position={[0, 0, 0]} fontSize={1.5} color="white" outlineWidth={0.1} outlineColor="black">🚀</Text>
      )}
      <Text position={[0, 1.2, 0]} fontSize={0.5} color="white" outlineWidth={0.05} outlineColor="black">
        {drop.type === 'medkit' ? 'HP' : (drop.type === 'syringe' ? 'HP+5000' : (drop.type === 'firstaid' ? 'HP+2000' : (drop.type === 'gangster' ? '' : (drop.type === 'x2' ? '' : drop.type))))}
      </Text>
    </group>
  );
}

function Superman() {
  const { spawnDrop, gameState } = useStore();
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState(new THREE.Vector3(-40, 15, 0));
  const [targetDrop, setTargetDrop] = useState<DropType>('banana');
  const [dropX, setDropX] = useState(0);

  useEffect(() => {
    if (gameState.status !== 'playing') return;
    
    const interval = setInterval(() => {
      if (!active) {
        const r = Math.random() * 170;
        let type: DropType = 'banana';
        
        if (r < 20) {
          type = 'gangster';
        } else if (r < 30) {
          type = 'condom';
        } else if (r < 50) {
          type = 'bra';
        } else if (r < 80) {
          type = 'panties';
        } else if (r < 130) {
          type = 'banana';
        } else if (r < 140) {
          type = 'syringe';
        } else if (r < 155) {
          type = 'firstaid';
        } else if (r < 165) {
          type = 'x2';
        } else {
          type = 'airstrike';
        }

        setTargetDrop(type);
        setPos(new THREE.Vector3(-gameState.mapWidth/2 - 10, 15, 0));
        setDropX((Math.random() - 0.5) * (gameState.mapWidth - 10));
        setActive(true);
      }
    }, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, [gameState.status, active, gameState.mapWidth]);

  useFrame((state, delta) => {
    if (active) {
      const newPos = pos.clone();
      newPos.x += delta * 20;
      setPos(newPos);

      if (newPos.x > dropX && pos.x <= dropX) {
        const isHost = !gameState.players[0] || gameState.players[0].id === useStore.getState().myId;
        if (!useStore.getState().isOnline || isHost) {
          const drop: Drop = {
            id: `drop-${Date.now()}`,
            type: targetDrop,
            position: [newPos.x, newPos.y, 0]
          };
          spawnDrop(drop);
          if (useStore.getState().isOnline) {
            useStore.getState().syncAction({ type: 'spawn-drop', drop });
          }
        }
      }

      if (newPos.x > gameState.mapWidth/2 + 10) {
        setActive(false);
      }
    }
  });

  if (!active) return null;

  return (
    <group position={pos}>
      <mesh castShadow>
        <boxGeometry args={[2, 0.5, 1]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <Text position={[0, 1.5, 0]} fontSize={0.8} color="white" outlineWidth={0.05} outlineColor="black">
        SUPERMAN
      </Text>
    </group>
  );
}

function Superwoman() {
  const { spawnDrop, gameState } = useStore();
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState(new THREE.Vector3(40, 12, 0));
  const [dropX, setDropX] = useState(0);

  useEffect(() => {
    if (gameState.status !== 'playing') return;
    
    const interval = setInterval(() => {
      if (!active) {
        setPos(new THREE.Vector3(gameState.mapWidth/2 + 10, 12, 0));
        setDropX((Math.random() - 0.5) * (gameState.mapWidth - 10));
        setActive(true);
      }
    }, 2000); // Every 2 seconds
    return () => clearInterval(interval);
  }, [gameState.status, active, gameState.mapWidth]);

  useFrame((state, delta) => {
    if (active) {
      const newPos = pos.clone();
      newPos.x -= delta * 60; // Very fast to avoid overlap
      setPos(newPos);

      if (newPos.x < dropX && pos.x >= dropX) {
        const isHost = !gameState.players[0] || gameState.players[0].id === useStore.getState().myId;
        if (!useStore.getState().isOnline || isHost) {
          const drop: Drop = {
            id: `medkit-${Date.now()}`,
            type: 'medkit',
            position: [newPos.x, newPos.y, 0]
          };
          spawnDrop(drop);
          if (useStore.getState().isOnline) {
            useStore.getState().syncAction({ type: 'spawn-drop', drop });
          }
        }
      }

      if (newPos.x < -gameState.mapWidth/2 - 10) {
        setActive(false);
      }
    }
  });

  if (!active) return null;

  return (
    <group position={pos}>
      <mesh castShadow>
        <boxGeometry args={[1.5, 0.4, 0.8]} />
        <meshStandardMaterial color="#ec4899" />
      </mesh>
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color="#f472b6" />
      </mesh>
      <Text position={[0, 1.2, 0]} fontSize={0.6} color="white" outlineWidth={0.05} outlineColor="black">
        SUPERWOMAN
      </Text>
    </group>
  );
}

function Bridge() {
  const { gameState } = useStore();
  const isDesert = gameState.mapType === 'desert';
  const isPenang = gameState.mapType === 'penang';
  const terrainColor = isDesert ? "#fcd34d" : (isPenang ? "#94a3b8" : "#4ade80");
  const emissiveColor = isDesert ? "#fbbf24" : (isPenang ? "#64748b" : "#22c55e");

  return (
    <group>
      {gameState.terrain.map((block, i) => (
        <RoundedBox
          key={i}
          args={[1.05, 15, 2]}
          radius={0.2}
          smoothness={4}
          position={[block.x, block.y - 7.5, -0.5]}
        >
          <meshStandardMaterial 
            color={terrainColor} 
            roughness={isDesert ? 0.9 : 0.6}
            emissive={emissiveColor}
            emissiveIntensity={0.05}
          />
        </RoundedBox>
      ))}

      {/* Penang Bridge Cables and Pillars */}
      {isPenang && (
        <group>
          {/* Main Pillars */}
          {[-10, 10].map(x => (
            <group key={x} position={[x, 5, -1]}>
              <mesh>
                <boxGeometry args={[1, 20, 1]} />
                <meshStandardMaterial color="#cbd5e1" />
              </mesh>
              {/* Cables */}
              {[...Array(8)].map((_, i) => (
                <group key={i}>
                  <mesh position={[x > 0 ? -4 - i : 4 + i, -2 - i * 0.5, 0]} rotation={[0, 0, x > 0 ? 0.5 : -0.5]}>
                    <boxGeometry args={[10, 0.05, 0.05]} />
                    <meshBasicMaterial color="white" />
                  </mesh>
                </group>
              ))}
            </group>
          ))}
          {/* Water */}
          <mesh position={[0, -10, -5]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[200, 100]} />
            <meshStandardMaterial color="#0ea5e9" transparent opacity={0.6} />
          </mesh>
        </group>
      )}
      
      {/* Background Decor - MapleStory Style */}
      <Sky distance={450000} sunPosition={isDesert ? [10, 5, 0] : [0, 1, 0]} inclination={0} azimuth={0.25} />
      <Cloud position={[-20, 10, -15]} speed={0.2} opacity={0.5} color={isDesert ? "#fef3c7" : "white"} />
      <Cloud position={[20, 15, -20]} speed={0.1} opacity={0.3} color={isDesert ? "#fef3c7" : "white"} />
      <Cloud position={[0, 12, -25]} speed={0.15} opacity={0.4} color={isDesert ? "#fef3c7" : "white"} />
      {!isDesert && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
      
      {/* Distant Hills */}
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
        <mesh position={[-25, -5, -25]}>
          <sphereGeometry args={[15, 32, 32]} />
          <meshStandardMaterial color={isDesert ? "#fde68a" : (isPenang ? "#1e293b" : "#86efac")} />
        </mesh>
      </Float>
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
        <mesh position={[30, -6, -30]}>
          <sphereGeometry args={[18, 32, 32]} />
          <meshStandardMaterial color={isDesert ? "#fef08a" : (isPenang ? "#334155" : "#bbf7d0")} />
        </mesh>
      </Float>
      
      {/* Ground plane for shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -15, -10]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <shadowMaterial opacity={0.2} />
      </mesh>
    </group>
  );
}

function DamageTextDisplay({ id, pos, damage, timestamp }: { id: string, pos: [number, number, number], damage: number, timestamp: number }) {
  const { removeDamageText } = useStore();
  const [yOffset, setYOffset] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useFrame((state, delta) => {
    const age = Date.now() - timestamp;
    if (age > 2000) {
      removeDamageText(id);
    } else {
      setYOffset(y => y + delta * 2);
      setOpacity(Math.max(0, 1 - age / 2000));
    }
  });

  return (
    <Text
      position={[pos[0], pos[1] + yOffset, pos[2]]}
      fontSize={0.5}
      color={damage === 0 ? "#3b82f6" : "#ef4444"}
      outlineWidth={0.05}
      outlineColor="black"
      fillOpacity={opacity}
      outlineOpacity={opacity}
    >
      {damage === 0 ? "BLOCKED" : `-${damage}`}
    </Text>
  );
}

function GangsterModel({ gangster }: { gangster: any }) {
  if (!gangster.isAlive) return null;
  return (
    <group position={gangster.position}>
      <AnimalModel type={gangster.animalType || 'gangster'} color={gangster.color || "#18181b"} />
      <Text position={[0, 1.5, 0]} fontSize={0.4} color="red" outlineWidth={0.05} outlineColor="black">GANGSTER</Text>
    </group>
  );
}

function Lightning({ position }: { position: [number, number, number] }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), 100);
    return () => clearTimeout(timeout);
  }, []);
  if (!visible) return null;
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.1, 0.1, 40]} />
      <meshBasicMaterial color="#fef08a" transparent opacity={0.8} />
    </mesh>
  );
}

function BlueZone() {
  const { gameState, applyZoneDamage, setZoneRadius } = useStore();
  const [timePassed, setTimePassed] = useState(0);
  const lastDamageTime = useRef(0);
  const [lightningPos, setLightningPos] = useState<[number, number, number] | null>(null);
  const visualRadius = useRef(gameState.zoneRadius);

  useFrame((state, delta) => {
    if (gameState.status !== 'playing') return;
    
    setTimePassed(t => t + delta);
    
    const stageDuration = 18;
    const stage = Math.min(12, Math.floor(timePassed / stageDuration));
    
    const reductionPerStage = 0.08;
    const currentReduction = stage * reductionPerStage;
    const targetRadius = (gameState.mapWidth / 2) * (1 - currentReduction);
    
    // Smoothly interpolate the radius for visual effect
    visualRadius.current = THREE.MathUtils.lerp(visualRadius.current, targetRadius, delta * 0.5);
    setZoneRadius(visualRadius.current);

    if (timePassed - lastDamageTime.current >= 5) {
      const damage = 50 + stage * 50;
      applyZoneDamage(damage, stage);
      lastDamageTime.current = timePassed;

      if (stage >= 11) {
        setLightningPos([(Math.random() - 0.5) * visualRadius.current * 2, 0, 0]);
      }
    }
  });

  const stageDuration = 18;
  const stage = Math.min(12, Math.floor(timePassed / stageDuration));
  
  // Color transition: Blue -> Purple -> Red
  let color = "#3b82f6"; // Blue
  if (stage > 4 && stage <= 8) color = "#a855f7"; // Purple
  if (stage > 8) color = "#ef4444"; // Red

  return (
    <group>
      {lightningPos && <Lightning position={lightningPos} />}
      {/* Left Zone */}
      <mesh position={[-gameState.zoneRadius - 50, 0, 0]}>
        <boxGeometry args={[100, 40, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      {/* Right Zone */}
      <mesh position={[gameState.zoneRadius + 50, 0, 0]}>
        <boxGeometry args={[100, 40, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
}

function GameEvents() {
  const { gameState, spawnDrop, applyAirstrike, updateGangsters } = useStore();
  const [explosions, setExplosions] = useState<Array<{ id: number; pos: [number, number, number], weapon: WeaponType }>>([]);

  useFrame((state, delta) => {
    if (gameState.status === 'playing') {
      updateGangsters(delta);
    }
  });

  useEffect(() => {
    if (gameState.status !== 'playing') return;
    const interval = setInterval(() => {
      spawnDrop({
        id: `condom1-${Date.now()}`,
        type: 'condom',
        position: [(Math.random() - 0.5) * 70, 15, 0]
      });
      spawnDrop({
        id: `condom2-${Date.now()}`,
        type: 'condom',
        position: [(Math.random() - 0.5) * 70, 15, 0]
      });
    }, 240000);
    return () => clearInterval(interval);
  }, [gameState.status, spawnDrop]);

  useEffect(() => {
    if (gameState.status !== 'playing') return;
    const interval = setInterval(() => {
      const x = (Math.random() - 0.5) * 64;
      applyAirstrike(x, 400); // 400 damage
      // We can show an explosion effect for the airstrike
      setExplosions(prev => [...prev, { id: Date.now(), pos: [x, 0, 0], weapon: 'bra' }]); // using bra for large explosion
    }, 60000); // Every 1 minute
    return () => clearInterval(interval);
  }, [gameState.status, applyAirstrike]);

  return (
    <>
      {explosions.map((exp) => (
        <Explosion key={exp.id} position={exp.pos} weapon={exp.weapon} />
      ))}
    </>
  );
}

function CheatCodeHandler({ setExplosions }: { setExplosions: React.Dispatch<React.SetStateAction<any[]>> }) {
  const { applyAirstrike, applyCheatCondom, activateFastZone, spawnGangsters, applyCheatDoubleDamage, applyCheatAllItems, myId, gameState } = useStore();
  const [keySequence, setKeySequence] = useState<string[]>([]);
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const now = Date.now();
      
      if (now - lastKeyTime.current > 1000) {
        setKeySequence([key]);
      } else {
        setKeySequence(prev => [...prev, key].slice(-4));
      }
      lastKeyTime.current = now;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const sequence = keySequence.join('');
    if (sequence === 'WWWD') {
      const x = (Math.random() - 0.5) * 64;
      applyAirstrike(x, 300);
      setExplosions(prev => [...prev, { id: Date.now(), pos: [x, 0, 0], weapon: 'bra' }]);
      setKeySequence([]);
    } else if (sequence === 'WWWA') {
      if (myId) applyCheatCondom(myId);
      setKeySequence([]);
    } else if (sequence === 'WWWS') {
      activateFastZone();
      setKeySequence([]);
    } else if (sequence === 'WWWG') {
      // Cheat 4: Call 10 Gangsters
      spawnGangsters();
      setKeySequence([]);
    } else if (sequence === 'WWW2') {
      if (myId) applyCheatDoubleDamage(myId);
      setKeySequence([]);
    } else if (sequence === 'WWW1') {
      if (myId) applyCheatAllItems(myId);
      setKeySequence([]);
    }
  }, [keySequence, applyAirstrike, applyCheatCondom, activateFastZone, spawnGangsters, applyCheatDoubleDamage, applyCheatAllItems, myId, setExplosions]);

  return null;
}

function Scene() {
  const { gameState, myId, applyExplosion, endTurn, consumeWeapon } = useStore();
  const [activeProjectile, setActiveProjectile] = useState<{
    pos: [number, number, number];
    currentPos: [number, number, number];
    vel: [number, number, number];
    weapon: WeaponType;
  } | null>(null);
  const [explosions, setExplosions] = useState<
    Array<{ id: number; pos: [number, number, number], weapon: WeaponType }>
  >([]);
  const { camera } = useThree();

  const handleFire = (pos: [number, number, number], vel: [number, number, number], weapon: WeaponType) => {
    setActiveProjectile({ pos, currentPos: pos, vel, weapon });
    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    if (currentPlayer) {
      consumeWeapon(currentPlayer.id, weapon);
    }
  };

  const handleHit = (pos: [number, number, number]) => {
    if (activeProjectile) {
      setExplosions((prev) => [
        ...prev,
        { id: Date.now(), pos, weapon: activeProjectile.weapon },
      ]);
      applyExplosion(pos, activeProjectile.weapon);
      setActiveProjectile(null);
      
      const turnIndexWhenFired = gameState.currentTurnIndex;
      
      setTimeout(() => {
        const state = useStore.getState();
        // Only end turn if the turn hasn't already advanced (e.g., by the timer)
        if (state.gameState.currentTurnIndex === turnIndexWhenFired) {
          const currentPlayer = state.gameState.players[state.gameState.currentTurnIndex];
          const isMe = currentPlayer?.id === state.myId;
          if (!state.isOnline || isMe) {
            endTurn();
          }
        }
      }, 2000);
    }
  };

  const handleUpdateProjectilePos = (pos: [number, number, number]) => {
    setActiveProjectile(prev => prev ? { ...prev, currentPos: pos } : null);
  };

  useFrame((state) => {
    const { camera, size } = state;
    const aspect = size.width / size.height;
    // On mobile/portrait (aspect < 1.2), we need to zoom out to see the battlefield
    const zoomFactor = aspect < 1.2 ? Math.min(2, 1.2 / aspect) : 1;
    const targetZ = 25 * zoomFactor;

    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    if (gameState.status === "playing" && currentPlayer) {
      const target = activeProjectile
        ? new THREE.Vector3(activeProjectile.currentPos[0], activeProjectile.currentPos[1], 0)
        : new THREE.Vector3(currentPlayer.position[0], currentPlayer.position[1], 0);
      
      // Keep camera centered on action but locked in Z, and slightly higher to avoid terrain blocking
      camera.position.lerp(
        new THREE.Vector3(target.x, Math.max(5, target.y + 8), targetZ),
        0.05
      );
      camera.lookAt(target.x, Math.max(0, target.y + 2), 0);
    } else {
      camera.position.lerp(new THREE.Vector3(0, 8, targetZ), 0.05);
      camera.lookAt(0, 0, 0);
    }
  });

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight
        castShadow
        position={[10, 20, 10]}
        intensity={1.5}
        shadow-mapSize={[2048, 2048]}
      />

      <Bridge />

      {gameState.players.map((p, i) => (
        <PlayerModel
          key={p.id}
          player={p}
          isCurrentTurn={gameState.currentTurnIndex === i}
          isMe={p.id === myId}
          onFire={handleFire}
        />
      ))}

      {gameState.drops.map(drop => (
        <DropItem key={drop.id} drop={drop} />
      ))}

      <Superman />
      <Superwoman />

      {activeProjectile && (
        <Projectile
          startPos={activeProjectile.pos}
          initialVelocity={activeProjectile.vel}
          weapon={activeProjectile.weapon}
          onHit={handleHit}
          onUpdatePos={handleUpdateProjectilePos}
        />
      )}

      {explosions.map((exp) => (
        <Explosion key={exp.id} position={exp.pos} weapon={exp.weapon} />
      ))}
      {gameState.damageTexts.map(dt => (
        <DamageTextDisplay key={dt.id} {...dt} />
      ))}

      <BlueZone />
      <GameEvents />
      <CheatCodeHandler setExplosions={setExplosions} />
      {gameState.gangsters.map(g => (
        <GangsterModel key={g.id} gangster={g} />
      ))}
    </>
  );
}

export default function Game() {
  return (
    <div className="absolute inset-0">
      <Canvas shadows camera={{ position: [0, 5, 30], fov: 40 }}>
        <Scene />
      </Canvas>
    </div>
  );
}
