import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getCharacter, getMessages, getSession, sendChat, startAdventure, useItem, equipItem, dropItem, combatAttack, levelUpStat, finalDeathSave, getNpcs, getQuests, hireNpc, dismissNpc, abandonQuest, applyAdReward, claimDailyBonus, sendHeartbeat, spinWheel } from '../utils/api';
import { showRewardedAd, showInterstitialAd } from '../utils/ads';
import { useSound } from '../hooks/useSound';
import TypewriterText from '../components/TypewriterText';
import Particles from '../components/Particles';
import AnnouncementsBar from '../components/AnnouncementsBar';
import DiceRoll from '../components/DiceRoll';
import QuestPanel from '../components/QuestPanel';
import NpcDialogModal from '../components/NpcDialogModal';
import SkillTreeModal from '../components/SkillTreeModal';
import TutorialModal from '../components/TutorialModal';
import {
  playClick, playDiceRoll, playDiceResult, playNat1, playDamage,
  playHeal, playLevelUp, playGold, playNarrator, playSend,
  playHeartbeat, playError, playSwordHit, playSwordMiss, playCriticalHit, playMagic,
} from '../utils/sounds';
import { startAmbience, stopAmbience, cleanupAmbience, mapScenarioToAmbience, detectAmbienceFromScene } from '../utils/ambient';
import { StatIcon, ItemIcon } from '../utils/icons';
import {
  Swords, Sword, Shield, Heart, Coins, Star, Volume2, VolumeX, Backpack,
  Users, Store, BarChart3, ScrollText, Skull, X, AlertTriangle,
  CheckCircle2, XCircle, Dices, Zap, Wind, Send, Bomb, Sparkles, RotateCcw, Target, Wand2,
  Crown, CircleDot,
} from 'lucide-react';

const FOLLOWER_ROLE_META = {
  warrior: { label: 'Savaşçı', icon: Sword, color: 'text-slate-300' },
  archer: { label: 'Okçu', icon: Target, color: 'text-emerald-300' },
  mage: { label: 'Büyücü', icon: Wand2, color: 'text-violet-300' },
  healer: { label: 'Şifacı', icon: Heart, color: 'text-pink-300' },
};
function getFollowerRoleMeta(role) {
  return FOLLOWER_ROLE_META[role] || FOLLOWER_ROLE_META.warrior;
}

const STAT_COLS = [
  ['GÜÇ', 'strength', StatIcon.strength],
  ['ÇEV', 'dexterity', StatIcon.dexterity],
  ['DAY', 'constitution', StatIcon.constitution],
  ['ZEK', 'intelligence', StatIcon.intelligence],
  ['BİL', 'wisdom', StatIcon.wisdom],
  ['KAR', 'charisma', StatIcon.charisma],
];

const RACE_PORTRAITS = {
  'İnsan': '/races/insan.svg',
  'Elf': '/races/elf.svg',
  'Cüce': '/races/cuce.svg',
  'Yarı-Ork': '/races/yariork.svg',
  'Hobit': '/races/hobit.svg',
  'İblissoyu': '/races/iblissoyu.svg',
};
function getRacePortrait(race) {
  return RACE_PORTRAITS[race] || '/races/insan.svg';
}

// SVG arc helpers for the wheel of fate
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

const WHEEL_SEGMENTS = [
  { label: '15 Altın', color: '#c9a73a' },
  { label: '30 Altın', color: '#e5b94a' },
  { label: '50 Altın', color: '#ffd700' },
  { label: 'İyileşme', color: '#4ade80' },
  { label: 'Büyü', color: '#60a5fa' },
  { label: '+5 Hamle', color: '#f472b6' },
  { label: '+2 Güç', color: '#f87171' },
  { label: '+2 Çevik', color: '#a78bfa' },
  { label: 'Tılsım', color: '#fbbf24' },
];

function stripEvents(text) {
  return (text || '').replace(/\{[^{}]*"event"[^{}]*\}/g, '').trim();
}

function stripPlayerFacingArtifacts(text) {
  if (!text) return '';
  return text
    .split('\n')
    .filter(line => !/^\s*Thought:/i.test(line))
    .join('\n')
    .replace(/\[\s*1d20\s*[^\]]*zar\s*atışı\s*!\s*\]/gi, '')
    .replace(/d20\s*att[ıiİ][k]?n?,?\s*\d+\s*geldi/gi, '')
    .replace(/Zar:\s*d20\s*→\s*\d+/gi, '')
    .replace(/\(\s*d20\s*=\s*\d+\s*\)/gi, '')
    .trim();
}

// Parse A/B/C or 1/2/3 options from narrator text
function parseOptions(text) {
  const t = stripPlayerFacingArtifacts(stripEvents(text || ''));
  const options = [];

  // Pattern: **A)** text, **B)** text, **C)** text (markdown bold)
  const boldLetterRegex = /\*\*\s*([A-Fa-f])\s*[)\.\-:]\s*\*\*\s*([^\n]+?)(?=\s*\*\*|$)/g;
  let m;
  while ((m = boldLetterRegex.exec(t)) !== null) {
    options.push({ label: m[1].toUpperCase(), text: m[2].trim() });
  }

  if (options.length > 0) return options;

  // Pattern: A) text / A. text / A: text / A - text (line-based)
  const letterRegex = /(?:^|\n)\s*([A-Fa-f])\s*[)\.\-:]\s*(.+?)(?=(?:\n\s*[A-Fa-f]\s*[)\.\-:]\s*)|$)/g;
  while ((m = letterRegex.exec(t)) !== null) {
    options.push({ label: m[1].toUpperCase(), text: m[2].trim() });
  }

  if (options.length > 0) return options;

  // Pattern: 1. text / 2. text / 1) text
  const numberRegex = /(?:^|\n)\s*(\d+)\s*[\.\-:]\s*(.+?)(?=(?:\n\s*\d+\s*[\.\-:]\s*)|$)/g;
  while ((m = numberRegex.exec(t)) !== null) {
    options.push({ label: m[1], text: m[2].trim() });
  }

  return options;
}

export default function GamePage({ user }) {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const characterId = searchParams.get('characterId');
  const scenario = searchParams.get('scenario');
  const { soundOn, toggleSound } = useSound();

  const [character, setCharacter] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSkillTree, setShowSkillTree] = useState(false);
  const [lastMsgId, setLastMsgId] = useState(null);
  const [shaking, setShaking] = useState(false);
  const [hpEffect, setHpEffect] = useState(null);
  const [hpDelta, setHpDelta] = useState(null);
  const [enemyHpDelta, setEnemyHpDelta] = useState(null);
  const prevEnemyRef = useRef({ name: null, hp: null });
  const [levelUpShow, setLevelUpShow] = useState(false);
  const [followerJoinShow, setFollowerJoinShow] = useState(null);
  const [statSelectOpen, setStatSelectOpen] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [chatError, setChatError] = useState('');
  const [lastFailedSend, setLastFailedSend] = useState(null); // { text, diceResult }
  const [inventory, setInventory] = useState([]);
  const [showBag, setShowBag] = useState(false);
  const [npcs, setNpcs] = useState([]);
  const [showNpcs, setShowNpcs] = useState(false);
  const [npcMsg, setNpcMsg] = useState('');
  const [hiringId, setHiringId] = useState(null);
  const [dismissingId, setDismissingId] = useState(null);
  const [followerAssistMsg, setFollowerAssistMsg] = useState(null); // { text, isHeal, role }
  const [quests, setQuests] = useState([]);
  const [showQuests, setShowQuests] = useState(false);
  const [selectedNpc, setSelectedNpc] = useState(null);
  const [itemMsg, setItemMsg] = useState('');
  const [lastDice, setLastDice] = useState(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [combatResult, setCombatResult] = useState(null);
  const [combatPhase, setCombatPhase] = useState(null); // 'rolling' | 'result'
  const [combatSending, setCombatSending] = useState(false);
  const [currentEnemy, setCurrentEnemy] = useState(null); // first alive enemy for combat
  const [allEnemies, setAllEnemies] = useState([]); // all alive enemies for multi-bar UI
  const [finalJourney, setFinalJourney] = useState(null);
  const [reviveRoll, setReviveRoll] = useState(null);
  const [reviveState, setReviveState] = useState('idle');
  const [turnRewardDue, setTurnRewardDue] = useState(false);
  const [turnAdLoading, setTurnAdLoading] = useState(false);
  const [dailyLimitInfo, setDailyLimitInfo] = useState(null);
  const [dailyBonusLoading, setDailyBonusLoading] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [sceneAmbience, setSceneAmbience] = useState(null);
  const [session, setSession] = useState(null);
  const [showRecap, setShowRecap] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showWheel, setShowWheel] = useState(false);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState(null);
  const [wheelError, setWheelError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const prevHpRef = useRef(null);
  const prevLevelRef = useRef(null);

  const updateTurnProgress = (turnCount) => {
    if (isPremiumUser) return;
    if (turnCount > 0 && turnCount % 10 === 0) {
      const rewardKey = `dnd_turn_reward_${sessionId}_${turnCount}`;
      if (!localStorage.getItem(rewardKey)) {
        setTurnRewardDue(true);
      }
    }
    setSession((previousSession) => previousSession
      ? { ...previousSession, turn_count: turnCount }
      : previousSession);
  };

  const registerTurn = () => {
    if (isPremiumUser) {
      setSession((previousSession) => previousSession
        ? { ...previousSession, turn_count: (previousSession.turn_count || 0) + 1 }
        : previousSession);
      return;
    }
    setSession((previousSession) => {
      if (!previousSession) return previousSession;
      const nextTurnCount = (previousSession.turn_count || 0) + 1;
      if (nextTurnCount > 0 && nextTurnCount % 10 === 0) {
        const rewardKey = `dnd_turn_reward_${sessionId}_${nextTurnCount}`;
        if (!localStorage.getItem(rewardKey)) {
          setTurnRewardDue(true);
        }
      }
      return { ...previousSession, turn_count: nextTurnCount };
    });
  };

  const parseEnemies = useCallback((raw) => {
    if (!raw) return [];
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed.filter(e => e.hp > 0);
    if (parsed && parsed.name) return [parsed];
    return [];
  }, []);

  const loadEnemy = useCallback(async () => {
    try {
      const data = await getSession(sessionId);
      const enemies = parseEnemies(data.session?.current_enemy);
      setAllEnemies(enemies);
      setCurrentEnemy(enemies.length > 0 ? enemies[0] : null);
    } catch (_) {}
  }, [sessionId]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('dnd_user') || '{}');
      setIsPremiumUser(Boolean(saved?.is_premium));
    } catch { setIsPremiumUser(false); }
  }, []);

  useEffect(() => {
    sendHeartbeat().catch(() => {});
    const id = setInterval(() => {
      sendHeartbeat().catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (showBag && (currentEnemy || (character && character.hp <= 0))) {
      setShowBag(false);
    }
  }, [currentEnemy, character?.hp, showBag]);

  useEffect(() => {
    if (!characterId) return;
    Promise.all([getCharacter(characterId), getMessages(sessionId), getSession(sessionId)]).then(
      ([charData, msgData, sessionData]) => {
        setCharacter(charData.character);
        setInventory(charData.inventory || []);
        try { localStorage.setItem('dnd_active_character_id', characterId); } catch {}
        prevHpRef.current = charData.character?.hp;
        prevLevelRef.current = charData.character?.level;
        const currentSession = sessionData.session || null;
        setSession(currentSession);
        const enemies = parseEnemies(currentSession?.current_enemy);
        setAllEnemies(enemies);
        setCurrentEnemy(enemies.length > 0 ? enemies[0] : null);
        setSceneAmbience(mapScenarioToAmbience(currentSession?.scenario || scenario));
        const msgs = msgData.messages || [];
        setMessages(msgs);
        // Load NPCs
        getNpcs(characterId).then(d => setNpcs(d.npcs || [])).catch(() => {});
        // Load quests
        getQuests(characterId).then(d => setQuests(d.quests || [])).catch(() => {});
        if (msgs.length === 0) {
          const tutorialKey = `dnd_tutorial_${characterId}`;
          const alreadySeen = localStorage.getItem(tutorialKey);
          if (!alreadySeen) setShowTutorial(true);
          setStarting(true);
          startAdventure(sessionId, characterId, scenario).then((data) => {
            if (data.reply) {
              const newMsg = { role: 'assistant', content: data.reply, id: 'intro' };
              setMessages([newMsg]);
              setLastMsgId('intro');
              playNarrator();
            }
            if (data.character) setCharacter(data.character);
            // Handle scene_change events from start response
            const sceneEv = Array.isArray(data.events)
              ? data.events.find((e) => e.event === 'scene_change' && e.scene)
              : null;
            if (sceneEv) {
              setSceneAmbience(sceneEv.scene);
            } else if (data.reply) {
              // Fallback: detect scene from intro text
              const detected = detectAmbienceFromScene(data.reply);
              if (detected) setSceneAmbience(detected);
            }
            // Refresh NPC + quest lists after start
            getNpcs(characterId).then(d => setNpcs(d.npcs || [])).catch(() => {});
            getQuests(characterId).then(d => setQuests(d.quests || [])).catch(() => {});
            setStarting(false);
          }).catch((err) => {
            setStarting(false);
            if (err.status === 429 && err.data?.error === 'DAILY_LIMIT_REACHED') {
              setDailyLimitInfo({
                used: err.data.dailyUsed,
                limit: err.data.dailyLimit,
                bonusAdsUsed: err.data.bonusAdsUsed,
                maxBonusAds: err.data.maxBonusAds,
              });
            } else {
              setChatError(err.message || 'Macera başlatılamadı');
              playError();
            }
          });
        }
      }
    ).catch((err) => {
      setChatError(err.message || 'Veriler yüklenemedi');
      playError();
    });
  }, [sessionId, characterId]);

  // ── Ambiyans ses motoru: sahneye göre başlat, dövüşte gerginlik temasına geç ──
  useEffect(() => {
    if (!sceneAmbience) return;
    startAmbience(allEnemies.length > 0 ? 'combat' : sceneAmbience);
  }, [sceneAmbience, allEnemies]);

  useEffect(() => {
    return () => cleanupAmbience();
  }, []);

  // HP change detection
  useEffect(() => {
    if (!character || prevHpRef.current === null) return;
    const prevHp = prevHpRef.current;
    const prevLevel = prevLevelRef.current;

    if (character.hp < prevHp) {
      setHpEffect('damage');
      setShaking(true);
      playDamage();
      setHpDelta({ value: character.hp - prevHp, id: Date.now() });
      if (navigator.vibrate) navigator.vibrate(100);
      setTimeout(() => { setShaking(false); setHpEffect(null); }, 500);
      setTimeout(() => setHpDelta(null), 900);
    } else if (character.hp > prevHp) {
      setHpEffect('heal');
      playHeal();
      setHpDelta({ value: character.hp - prevHp, id: Date.now() });
      setTimeout(() => setHpEffect(null), 600);
      setTimeout(() => setHpDelta(null), 900);
    }

    if (character.level > prevLevel) {
      setLevelUpShow(true);
      setStatSelectOpen(true);
      playLevelUp();
      setTimeout(() => setLevelUpShow(false), 2500);
    }

    // Low HP heartbeat
    if (character.hp <= character.max_hp * 0.25 && character.hp > 0) {
      playHeartbeat();
    }

    prevHpRef.current = character.hp;
    prevLevelRef.current = character.level;
  }, [character?.hp, character?.level]);

  // Enemy HP change detection — floating damage numbers on the enemy bar
  useEffect(() => {
    if (!currentEnemy) {
      prevEnemyRef.current = { name: null, hp: null };
      return;
    }
    const prev = prevEnemyRef.current;
    if (prev.name === currentEnemy.name && prev.hp !== null && currentEnemy.hp !== prev.hp) {
      const delta = currentEnemy.hp - prev.hp;
      setEnemyHpDelta({ value: delta, id: Date.now() });
      setTimeout(() => setEnemyHpDelta(null), 900);
    }
    prevEnemyRef.current = { name: currentEnemy.name, hp: currentEnemy.hp };
  }, [currentEnemy]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, starting]);

  // Scroll detection
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowScrollDown(!atBottom);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (messageText, diceResult = null) => {
    const charDead = character && (character.status === 'dead' || character.status === 'unconscious' || character.hp <= 0) || !!finalJourney;
    if (charDead) return;
    const text = messageText || input.trim();
    if (!text && !diceResult) return;
    if (loading) return;

    // Auto-roll d20 when no dice result is provided
    let finalDice = diceResult;
    if (!finalDice && character) {
      const { stat, mod } = chooseModifierForText(text);
      const raw = Math.floor(Math.random() * 20) + 1;
      const total = raw + mod;
      finalDice = {
        dice: 'd20',
        rolls: [raw],
        total,
        modifier: mod,
        stat,
      };
      setLastDice(finalDice);
      setDiceRolling(true);
      playDiceRoll();
      await new Promise((r) => setTimeout(r, 1300));
      setDiceRolling(false);
      if (raw === 20) playDiceResult(true);
      else if (raw === 1) playNat1();
      else playDiceResult(false);
    }

    playSend();
    setChatError('');
    setLastFailedSend(null);

    // Show only the action text to the player; dice info is sent to backend separately
    const userMsgId = Date.now();
    setMessages((m) => [...m, { role: 'user', content: text, id: userMsgId }]);
    setInput('');
    setLoading(true);

    try {
      const data = await sendChat(sessionId, characterId, text, finalDice);
      if (data.reply) {
        const newMsgId = Date.now() + 1;
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: data.reply, id: newMsgId },
        ]);
        setLastMsgId(newMsgId);
        playNarrator();
      }
      if (data.character) setCharacter(data.character);
      const sessionData = await getSession(sessionId);
      if (sessionData.session) {
        updateTurnProgress(sessionData.session.turn_count || 0);
      }
      // Handle scene_change event — update ambience dynamically
      const sceneEvent = Array.isArray(data.events)
        ? data.events.find((e) => e.event === 'scene_change' && e.scene)
        : null;
      if (sceneEvent && sceneEvent.scene !== sceneAmbience) {
        setSceneAmbience(sceneEvent.scene);
      } else if (!sceneEvent && data.reply) {
        // Fallback: try to detect scene from AI text when no explicit event
        const detected = detectAmbienceFromScene(data.reply);
        if (detected && detected !== sceneAmbience && detected !== 'combat') {
          setSceneAmbience(detected);
        }
      }
      // Show a companion-joined celebration if the story recruited an NPC as a follower
      const recruitEvent = Array.isArray(data.events)
        ? data.events.find((e) => e.event === 'npc_recruit' && e.name)
        : null;
      if (recruitEvent) {
        setFollowerJoinShow(recruitEvent.name);
        playMagic();
        setTimeout(() => setFollowerJoinShow(null), 3200);
      }
      // Show a brief banner when a follower assists in combat (attack or heal)
      const assistEvent = Array.isArray(data.events)
        ? data.events.find((e) => e.event === 'follower_assist')
        : null;
      if (assistEvent) {
        setFollowerAssistMsg({
          text: assistEvent.summary,
          isHeal: !!assistEvent.isHeal,
          role: assistEvent.role,
          followerDied: !!assistEvent.followerDied,
          followerDowned: !!assistEvent.followerDowned,
        });
        if (assistEvent.isHeal) playHeal();
        else if (assistEvent.isHit) playSwordHit();
        else playSwordMiss();
        setTimeout(() => setFollowerAssistMsg(null), 3800);
      }
      // Refresh inventory if the story consumed an item
      const itemUsedEvent = Array.isArray(data.events)
        ? data.events.find((e) => e.event === 'item_used' && e.name)
        : null;
      if (itemUsedEvent) {
        getCharacter(characterId).then((d) => {
          if (d.character) setCharacter(d.character);
          if (d.inventory) setInventory(d.inventory);
        }).catch(() => {});
      }
      // Refresh NPC + quest lists after AI reply
      getNpcs(characterId).then(d => setNpcs(d.npcs || [])).catch(() => {});
      getQuests(characterId).then(d => setQuests(d.quests || [])).catch(() => {});
    } catch (err) {
      setMessages((m) => m.filter((msg) => msg.id !== userMsgId));
      if (err.status === 429 && err.data?.error === 'DAILY_LIMIT_REACHED') {
        setDailyLimitInfo({
          used: err.data.dailyUsed,
          limit: err.data.dailyLimit,
          bonusAdsUsed: err.data.bonusAdsUsed,
          maxBonusAds: err.data.maxBonusAds,
        });
      } else {
        setChatError(err.message || 'Mesaj gönderilemedi');
        setLastFailedSend({ text, diceResult: finalDice });
        playError();
      }
    }
    setLastDice(null);
    setLoading(false);
    loadEnemy();
  };

  // ── Abandon (cancel) an active quest ──
  const handleAbandonQuest = async (questId) => {
    setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, status: 'abandoned' } : q)));
    try {
      await abandonQuest(characterId, questId);
    } catch (err) {
      // revert on failure
      getQuests(characterId).then((d) => setQuests(d.quests || [])).catch(() => {});
    }
  };

  // ── Auto roll d20 with relevant stat modifier ──
  function chooseModifierForText(text) {
    const t = (text || '').toLowerCase();
    if (/vur|saldır|kaldır|it|zorla|kır|sürük|yak|savun|kalkan|dövüş/.test(t)) return { stat: 'STR', mod: Math.floor((character.strength - 10) / 2) };
    if (/kaç|saklan|gizlen|atlat|sirkin|bekçi|esne|hraç|pençe|tırman/.test(t)) return { stat: 'DEX', mod: Math.floor((character.dexterity - 10) / 2) };
    if (/dayan|hasta|zehir|yorul|acı|maraton|nefes|stres/.test(t)) return { stat: 'CON', mod: Math.floor((character.constitution - 10) / 2) };
    if (/araştır|bilm|incele|okuma|yazı|puzzle|mantık|eski|lisan|büyü kitabı/.test(t)) return { stat: 'INT', mod: Math.floor((character.intelligence - 10) / 2) };
    if (/farket|hisset|izle|duy|sez|doğa|hayvan|tedavi|ilaç|manevi/.test(t)) return { stat: 'WIS', mod: Math.floor((character.wisdom - 10) / 2) };
    if (/ikna|yalvar|aldat|tehdit|konuş|nezaket|gözdağı|karizma|şarkı|oyna/.test(t)) return { stat: 'CHA', mod: Math.floor((character.charisma - 10) / 2) };
    return { stat: 'DEX', mod: Math.floor((character.dexterity - 10) / 2) };
  }

  // ── Inventory actions ──
  const handleHire = async (npc) => {
    if (hiringId) return;
    setHiringId(npc.id);
    setNpcMsg('');
    try {
      const data = await hireNpc(characterId, npc.id);
      if (data.character) setCharacter(data.character);
      if (data.npc) {
        setNpcs((prev) => prev.map((n) => (n.id === data.npc.id ? { ...n, ...data.npc } : n)));
      }
      playGold();
      setNpcMsg(`${npc.name} artık takipçin!`);
      setTimeout(() => setNpcMsg(''), 2500);
      setFollowerJoinShow(npc.name);
      setTimeout(() => setFollowerJoinShow(null), 3200);
    } catch (err) {
      playError();
      setNpcMsg(err.message || 'İşe alınamadı');
      setTimeout(() => setNpcMsg(''), 2500);
    } finally {
      setHiringId(null);
    }
  };

  const handleDismiss = async (npc) => {
    if (dismissingId) return;
    setDismissingId(npc.id);
    setNpcMsg('');
    try {
      const data = await dismissNpc(characterId, npc.id);
      if (data.npc) {
        setNpcs((prev) => prev.map((n) => (n.id === data.npc.id ? { ...n, ...data.npc } : n)));
      }
      setNpcMsg(`${npc.name} ile yollarınız ayrıldı.`);
      setTimeout(() => setNpcMsg(''), 2500);
      setSelectedNpc(null);
    } catch (err) {
      playError();
      setNpcMsg(err.message || 'Yolları ayıramadın');
      setTimeout(() => setNpcMsg(''), 2500);
    } finally {
      setDismissingId(null);
    }
  };

  const handleUseItem = async (itemId) => {
    try {
      const data = await useItem(characterId, itemId);
      if (data.character) setCharacter(data.character);
      if (data.inventory) setInventory(data.inventory);
      if (data.message) {
        setItemMsg(data.message);
        playHeal();
        setTimeout(() => setItemMsg(''), 2500);
      }
    } catch (err) {
      playError();
      setItemMsg(err.message || 'Kullanılamadı');
      setTimeout(() => setItemMsg(''), 2000);
    }
  };

  const handleSpinWheel = async () => {
    if (wheelSpinning || !characterId) return;
    setWheelSpinning(true);
    setWheelResult(null);
    setWheelError('');
    playDiceRoll();
    try {
      const data = await spinWheel(characterId);
      setTimeout(() => {
        if (data.character) setCharacter(data.character);
        if (data.inventory) setInventory(data.inventory);
        setWheelResult(data);
        playMagic();
        setWheelSpinning(false);
      }, 1500);
    } catch (err) {
      setWheelError(err.message || 'Çark çevrilemedi');
      playError();
      setWheelSpinning(false);
    }
  };

  const handleEquipItem = async (itemId) => {
    try {
      playClick();
      const data = await equipItem(characterId, itemId);
      if (data.character) setCharacter(data.character);
      if (data.inventory) setInventory(data.inventory);
    } catch (err) {
      playError();
      setItemMsg(err.message || 'Kuşanılamadı');
      setTimeout(() => setItemMsg(''), 2000);
    }
  };

  const handleDropItem = async (itemId) => {
    try {
      playClick();
      const data = await dropItem(characterId, itemId);
      if (data.character) setCharacter(data.character);
      if (data.inventory) setInventory(data.inventory);
    } catch (err) {
      playError();
    }
  };

  // ── Combat Attack ──
  const handleAttack = async () => {
    const charDead = character && (character.status === 'dead' || character.status === 'unconscious' || character.hp <= 0) || !!finalJourney;
    if (charDead) return;
    if (loading || combatPhase) return;
    setCombatPhase('rolling');
    playDiceRoll();

    try {
      const result = await combatAttack(characterId, currentEnemy?.enemyAC || 13, sessionId);
      setCombatResult(result);
      // Update multi-enemy state
      if (result.enemies) {
        setAllEnemies(result.enemies);
        setCurrentEnemy(result.enemies.length > 0 ? result.enemies[0] : null);
      } else if (result.enemy) {
        setCurrentEnemy(result.enemy);
        setAllEnemies(prev => prev.map(e => e.name === result.enemy.name ? result.enemy : e).filter(e => e.hp > 0));
      } else {
        setCurrentEnemy(null);
        setAllEnemies([]);
      }
      if (result.character) setCharacter(result.character);
      setCombatPhase('result');

      // Play appropriate sound after a brief delay for dice animation
      setTimeout(() => {
        if (result.isCritical) {
          playCriticalHit();
          if (navigator.vibrate) navigator.vibrate([50, 30, 80]);
        } else if (result.isHit) {
          playSwordHit();
          if (navigator.vibrate) navigator.vibrate(40);
        } else {
          playSwordMiss();
        }
        if (result.loot && result.loot.gold > 0) {
          setTimeout(() => playGold(), 400);
        }
      }, 300);
    } catch (err) {
      setCombatPhase(null);
      playError();
      setChatError(err.message || 'Saldiri hatasi');
    }
  };

  const handleCombatConfirm = async () => {
    if (!combatResult || combatSending) return;
    setCombatSending(true);
    playSend();

    const msg = combatResult.followerAssist
      ? `${combatResult.summary} ${combatResult.followerAssist.summary}`
      : combatResult.summary;
    const userMsgId = Date.now();
    setMessages((m) => [...m, { role: 'user', content: msg, id: userMsgId }]);
    setLoading(true);

    try {
      const dicePayload = {
        dice: 'd20',
        total: combatResult.attackRoll,
        rolls: [combatResult.attackRoll],
        modifier: combatResult.attackMod,
        combat: {
          weapon: combatResult.weapon,
          isHit: combatResult.isHit,
          isCritical: combatResult.isCritical,
          isCritFail: combatResult.isCritFail,
          damageTotal: combatResult.damageTotal,
          damageDice: combatResult.damageDice,
          followerAssist: combatResult.followerAssist || null,
        },
      };
      const data = await sendChat(sessionId, characterId, `Saldırıyorum! ${msg}`, dicePayload);
      if (data.reply) {
        const newMsgId = Date.now() + 1;
        setMessages((m) => [...m, { role: 'assistant', content: data.reply, id: newMsgId }]);
        setLastMsgId(newMsgId);
        playNarrator();
      }
      if (data.character) setCharacter(data.character);
      registerTurn();
    } catch (err) {
      setChatError(err.message || 'Mesaj gonderilemedi');
      playError();
    }

    setCombatResult(null);
    setCombatPhase(null);
    setCombatSending(false);
    setLoading(false);
    loadEnemy();
  };

  const handleCombatCancel = () => {
    setCombatResult(null);
    setCombatPhase(null);
    playClick();
  };

  if (!character) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: '#0d0a05',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <Particles type="ember" count={8} />
        <AnnouncementsBar />
        <div
          style={{
            animation: 'spin 1.5s linear infinite',
            display: 'flex',
            color: 'var(--gold)',
          }}
        >
          <Swords size={48} />
        </div>
        <p
          className="gold-shimmer font-fantasy"
          style={{ fontSize: '1rem' }}
        >
          Macera hazırlanıyor...
        </p>
      </div>
    );
  }

  const hpPct = Math.max(0, Math.min(100, (character.hp / character.max_hp) * 100));
  const hpTone = hpPct > 50 ? 'safe' : hpPct > 25 ? 'warn' : 'critical';
  // Keep the bar visibly non-empty while HP > 0 — otherwise a sliver of HP
  // (e.g. 1/80) rounds down to a near-invisible fraction of a pixel.
  const hpBarWidth = character.hp > 0 ? Math.max(hpPct, 4) : 0;
  const isDead = character.status === 'dead' || character.status === 'unconscious' || !!finalJourney || character.hp <= 0;

  const handleStatSelect = async (statKey) => {
    try {
      const data = await levelUpStat(characterId, statKey);
      setCharacter(data.character);
      setStatSelectOpen(false);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Seviye atladın! **${STAT_COLS.find((s) => s[1] === statKey)?.[0]}** seçerek ${data.character[statKey]} oldu. Yeni gücünle yoluna devam et.`,
          id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        },
      ]);
      playLevelUp();
    } catch (err) {
      setChatError(err.message || 'Stat artışı uygulanamadı');
      playError();
    }
  };

  return (
    <div
      className={shaking ? 'screen-shake' : ''}
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d0a05',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <AnnouncementsBar />

      <AnimatePresence>
        {showTutorial && (
          <TutorialModal
            onClose={() => {
              try { localStorage.setItem(`dnd_tutorial_${characterId}`, '1'); } catch {}
              setShowTutorial(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {turnRewardDue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 120,
              background: 'rgba(0,0,0,0.82)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1.25rem',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              className="stone-card"
              style={{ width: '100%', maxWidth: '360px', padding: '1.25rem', textAlign: 'center' }}
            >
              <Sparkles size={36} style={{ color: 'var(--gold)', marginBottom: '0.5rem' }} />
              <h3 className="font-fantasy" style={{ color: 'var(--gold)', margin: '0 0 0.5rem' }}>
                10 Hamle Tamamlandı
              </h3>
              <p style={{ color: 'var(--text-muted)', fontFamily: "'Crimson Text', serif", lineHeight: 1.5 }}>
                Maceraya devam etmek için kısa reklamı izle. Reklam tamamlandığında 10 altın da kazanacaksın.
              </p>
              <div style={{ marginTop: '1rem' }}>
                <button
                  className="btn-gold"
                  disabled={turnAdLoading}
                  style={{ width: '100%', opacity: turnAdLoading ? 0.65 : 1 }}
                  onClick={async () => {
                    const currentTurn = session?.turn_count || 0;
                    setTurnAdLoading(true);
                    try {
                      await showRewardedAd(async () => {
                        const result = await applyAdReward(characterId, sessionId, currentTurn);
                        setCharacter((previousCharacter) => previousCharacter
                          ? { ...previousCharacter, gold: result.gold, xp: result.xp }
                          : previousCharacter);
                        localStorage.setItem(`dnd_turn_reward_${sessionId}_${currentTurn}`, 'claimed');
                        setTurnRewardDue(false);
                        setTurnAdLoading(false);
                      });
                    } catch {
                      setTurnAdLoading(false);
                    }
                  }}
                >
                  {turnAdLoading ? 'Reklam Hazırlanıyor...' : 'Reklamı İzle ve Devam Et'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dailyLimitInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 120,
              background: 'rgba(0,0,0,0.82)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1.25rem',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              className="stone-card"
              style={{ width: '100%', maxWidth: '360px', padding: '1.25rem', textAlign: 'center' }}
            >
              <Sparkles size={36} style={{ color: 'var(--gold)', marginBottom: '0.5rem' }} />
              <h3 className="font-fantasy" style={{ color: 'var(--gold)', margin: '0 0 0.5rem' }}>
                Günlük Ücretsiz Hakkın Bitti
              </h3>
              {dailyLimitInfo.bonusAdsUsed < dailyLimitInfo.maxBonusAds ? (
                <>
                  <p style={{ color: 'var(--text-muted)', fontFamily: "'Crimson Text', serif", lineHeight: 1.5 }}>
                    Bugünkü ücretsiz hamlelerin bitti. Kısa bir reklam izleyerek {15} ekstra hamle kazanabilirsin.
                  </p>
                  <div style={{ marginTop: '1rem' }}>
                    <button
                      className="btn-gold"
                      disabled={dailyBonusLoading}
                      style={{ width: '100%', opacity: dailyBonusLoading ? 0.65 : 1 }}
                      onClick={async () => {
                        setDailyBonusLoading(true);
                        try {
                          await showRewardedAd(async () => {
                            await claimDailyBonus();
                            setDailyLimitInfo(null);
                            setDailyBonusLoading(false);
                          });
                        } catch {
                          setDailyBonusLoading(false);
                        }
                      }}
                    >
                      {dailyBonusLoading ? 'Reklam Hazırlanıyor...' : 'Reklamı İzle ve +15 Hamle Kazan'}
                    </button>
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontFamily: "'Crimson Text', serif", lineHeight: 1.5 }}>
                  Bugünlük bu kadar! Maceraya yarın tekrar devam edebilirsin.
                </p>
              )}
              <div style={{ marginTop: '0.75rem' }}>
                <button
                  style={{ width: '100%', background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-muted)', borderRadius: '8px', padding: '0.6rem', fontFamily: "'Crimson Text', serif" }}
                  onClick={() => setDailyLimitInfo(null)}
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background dust particles */}
      <Particles type="dust" count={8} />

      {/* ── LEVEL UP OVERLAY ── */}
      <AnimatePresence>
        {levelUpShow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)',
              pointerEvents: 'none',
            }}
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', color: 'var(--gold)' }}>
                <Swords size={56} />
              </div>
              <h2
                className="font-fantasy gold-shimmer"
                style={{ fontSize: '2.2rem', letterSpacing: '0.15em' }}
              >
                SEVİYE ATLADIN!
              </h2>
              <p
                style={{
                  color: 'var(--gold2)',
                  fontFamily: "'Cinzel', serif",
                  fontSize: '1.2rem',
                  marginTop: '0.5rem',
                }}
              >
                Seviye {character.level}
              </p>
            </motion.div>
            {/* Gold particles burst */}
            <Particles type="gold" count={20} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FOLLOWER JOINED OVERLAY ── */}
      <AnimatePresence>
        {followerJoinShow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)',
              pointerEvents: 'none',
            }}
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', color: '#4caf50' }}>
                <Users size={56} />
              </div>
              <h2
                className="font-fantasy gold-shimmer"
                style={{ fontSize: '2rem', letterSpacing: '0.15em' }}
              >
                YENİ YOLDAŞ!
              </h2>
              <p
                style={{
                  color: '#4caf50',
                  fontFamily: "'Cinzel', serif",
                  fontSize: '1.3rem',
                  marginTop: '0.5rem',
                }}
              >
                {followerJoinShow}
              </p>
              <p
                style={{
                  color: 'var(--text-dim)',
                  fontFamily: "'Crimson Text', serif",
                  fontSize: '0.9rem',
                  marginTop: '0.3rem',
                }}
              >
                artık yolculuğuna eşlik ediyor
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STAT SELECT MODAL ── */}
      <AnimatePresence>
        {statSelectOpen && character && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 101,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.85)',
              padding: '1rem',
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="stone-card"
              style={{
                maxWidth: '360px',
                width: '100%',
                padding: '1.25rem',
                textAlign: 'center',
                border: '1px solid var(--gold)',
                boxShadow: '0 0 30px rgba(201,150,58,0.25)',
              }}
            >
              <h2
                className="font-fantasy gold-shimmer"
                style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}
              >
                Güçlenme Zamanı
              </h2>
              <p
                style={{
                  color: 'var(--text-dim)',
                  fontFamily: "'Crimson Text', serif",
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                Seviye {character.level} oldun. Bir özelliğini geliştir.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.55rem',
                }}
              >
                {STAT_COLS.map(([label, key, Icon]) => {
                  const current = character[key] ?? 10;
                  const disabled = current >= 20;
                  return (
                    <motion.button
                      key={key}
                      whileTap={disabled ? {} : { scale: 0.96 }}
                      onClick={() => !disabled && handleStatSelect(key)}
                      disabled={disabled}
                      className="btn-secondary"
                      style={{
                        padding: '0.65rem 0.3rem',
                        opacity: disabled ? 0.4 : 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.2rem',
                        fontFamily: "'Cinzel', serif",
                        fontSize: '0.75rem',
                      }}
                    >
                      <Icon size={19} />
                      <span>{label}</span>
                      <span style={{ color: 'var(--gold2)', fontSize: '0.9rem' }}>
                        {current} → {disabled ? current : current + 1}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              {chatError && (
                <p style={{ color: 'var(--blood)', fontSize: '0.8rem', marginTop: '0.6rem' }}>
                  {chatError}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <div
        style={{
          flexShrink: 0,
          padding: '0.75rem 0.85rem 0.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(13,10,5,0.97)',
        }}
        className="pt-safe"
      >
        <div className="game-header-flex" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Portrait + Back */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={async () => {
              playClick();
              if (!isPremiumUser) await showInterstitialAd();
              navigate('/');
            }}
            style={{
              width: '2.6rem',
              height: '2.6rem',
              borderRadius: '50%',
              background: 'rgba(92,74,42,0.15)',
              border: '2px solid var(--gold)',
              padding: 0,
              overflow: 'hidden',
              flexShrink: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(201,150,58,0.25)',
            }}
            title="Geri dön"
          >
            <img
              src={getRacePortrait(character.race)}
              alt={character.race}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </motion.button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span
                className="font-fantasy gold-text"
                style={{
                  fontSize: '0.95rem',
                  letterSpacing: '0.06em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {character.name}
              </span>
              <span
                style={{
                  color: 'var(--text-dim)',
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.65rem',
                  flexShrink: 0,
                }}
              >
                Sv.{character.level}
              </span>
              {isPremiumUser && (
                <span
                  title="Premium"
                  style={{
                    color: '#fff',
                    background: 'var(--gold)',
                    fontSize: '0.55rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '0.12rem 0.35rem',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.15rem',
                    flexShrink: 0,
                  }}
                >
                  <Crown size={9} /> Premium
                </span>
              )}
            </div>
            <div
              style={{
                color: hpPct <= 25 ? 'var(--crimson)' : 'var(--blood)',
                fontFamily: "'Crimson Text', serif",
                fontSize: '0.75rem',
                animation: hpPct <= 25 ? 'blink-cursor 1.5s step-end infinite' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <Heart size={16} /> {character.hp}/{character.max_hp}
              <span style={{ color: 'var(--text-dim)', marginLeft: '0.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                <Shield size={14} />{character.armor_class || 10}
              </span>
            </div>
          </div>

          <div className="game-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <span
              style={{
                color: 'var(--gold)',
                fontFamily: "'Crimson Text', serif",
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              <Coins size={16} />{character.gold}
            </span>
            <span
              style={{
                color: 'var(--text-dim)',
                fontFamily: "'Crimson Text', serif",
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              <Star size={14} />{Math.min(100, Math.round(((character.experience ?? 0) / 300) * 100))}%
            </span>
            {/* Wheel of Fate button */}
            {(() => {
              const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
              const spinDate = character?.wheel_spin_date;
              const spinsUsed = spinDate === today ? (character?.wheel_spins_used || 0) : 0;
              const maxSpins = isPremiumUser ? 3 : 1;
              const remaining = Math.max(0, maxSpins - spinsUsed);
              return (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { playClick(); setShowWheel(true); }}
                  title={`Kader Çarkı — ${remaining} hakkın kaldı`}
                  style={{
                    width: '2.1rem',
                    height: '2.1rem',
                    borderRadius: '8px',
                    background: 'rgba(92,74,42,0.2)',
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: remaining > 0 ? 'var(--gold)' : 'var(--text-dim)',
                  }}
                >
                  <CircleDot size={18} />
                </motion.button>
              );
            })()}
            {/* Sound toggle */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { playClick(); toggleSound(); }}
              style={{
                width: '2.1rem',
                height: '2.1rem',
                borderRadius: '8px',
                background: 'rgba(92,74,42,0.2)',
                border: '1px solid var(--border)',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                playClick();
                if (character.hp <= 0) return;
                if (currentEnemy) return;
                setShowBag((s) => !s);
              }}
              title={character.hp <= 0 ? 'Baygınken envantere erişilemez' : currentEnemy ? 'Savaşta envantere erişilemez' : 'Çanta'}
              style={{
                width: '2.1rem',
                height: '2.1rem',
                borderRadius: '8px',
                background: showBag
                  ? 'rgba(201,150,58,0.25)'
                  : 'rgba(92,74,42,0.2)',
                border: '1px solid var(--border)',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: character.hp <= 0 || currentEnemy ? 'not-allowed' : 'pointer',
                opacity: character.hp <= 0 || currentEnemy ? 0.45 : 1,
                position: 'relative',
              }}
            >
              <Backpack size={18} />
              {inventory.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  color: '#0d0a05',
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {inventory.length}
                </span>
              )}
            </motion.button>
            {/* Shop button */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { playClick(); navigate(`/shop/${characterId}`); }}
              style={{
                width: '2.1rem',
                height: '2.1rem',
                borderRadius: '8px',
                background: 'rgba(92,74,42,0.2)',
                border: '1px solid var(--border)',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Tüccar Dükkânı"
            >
              <Store size={18} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { playClick(); setShowStats((s) => !s); }}
              style={{
                width: '2.1rem',
                height: '2.1rem',
                borderRadius: '8px',
                background: showStats
                  ? 'rgba(201,150,58,0.25)'
                  : 'rgba(92,74,42,0.2)',
                border: '1px solid var(--border)',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <BarChart3 size={18} />
            </motion.button>
            {/* NPC button */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { playClick(); setShowNpcs((s) => !s); setShowQuests(false); }}
              style={{
                width: '2.1rem',
                height: '2.1rem',
                borderRadius: '8px',
                background: showNpcs
                  ? 'rgba(201,150,58,0.25)'
                  : 'rgba(92,74,42,0.2)',
                border: `1px solid ${npcs.length > 0 ? 'var(--gold)' : 'var(--border)'}`,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
              }}
              title={`Tanınan NPC'ler (${npcs.length})`}
            >
              <Users size={18} />
              {npcs.length > 0 && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: 'var(--gold)', color: '#1a1510',
                  borderRadius: '50%', width: '14px', height: '14px',
                  fontSize: '0.55rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Cinzel', serif",
                }}>{npcs.length > 9 ? '9+' : npcs.length}</span>
              )}
            </motion.button>
            {/* Quest button */}
            {(() => {
              const activeQuests = quests.filter(q => q.status === 'active');
              return (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { playClick(); setShowQuests((s) => !s); setShowNpcs(false); }}
                  style={{
                    width: '2.1rem',
                    height: '2.1rem',
                    borderRadius: '8px',
                    background: showQuests
                      ? 'rgba(201,150,58,0.25)'
                      : 'rgba(92,74,42,0.2)',
                    border: `1px solid ${activeQuests.length > 0 ? 'var(--gold)' : 'var(--border)'}`,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  title={`Görevler (${activeQuests.length} aktif)`}
                >
                  <ScrollText size={18} />
                  {activeQuests.length > 0 && (
                    <span style={{
                      position: 'absolute', top: '-4px', right: '-4px',
                      background: '#c9963a', color: '#1a1510',
                      borderRadius: '50%', width: '14px', height: '14px',
                      fontSize: '0.55rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Cinzel', serif",
                    }}>{activeQuests.length > 9 ? '9+' : activeQuests.length}</span>
                  )}
                </motion.button>
              );
            })()}
          </div>
        </div>

        {/* Full-width HP bar */}
        <div
          className={hpEffect === 'damage' ? 'hp-damage-flash' : hpEffect === 'heal' ? 'hp-heal-glow' : ''}
          style={{
            marginTop: '0.45rem',
            height: '8px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '99px',
            overflow: 'visible',
            position: 'relative',
          }}
        >
          <div style={{ height: '100%', borderRadius: '99px', overflow: 'hidden' }}>
            <div
              className={`hp-bar hp-bar-${hpTone}`}
              style={{
                width: `${hpBarWidth}%`,
                height: '100%',
                borderRadius: '99px',
              }}
            />
          </div>
          {hpDelta && (
            <span
              key={hpDelta.id}
              className="hp-float-number"
              style={{
                left: `${hpBarWidth}%`,
                top: '-2px',
                transform: 'translateX(-50%)',
                fontSize: '0.85rem',
                color: hpDelta.value < 0 ? '#ff6b6b' : '#7fd97f',
              }}
            >
              {hpDelta.value > 0 ? `+${hpDelta.value}` : hpDelta.value}
            </span>
          )}
        </div>
      </div>

      {/* ── ENEMY HP BARS (multi-enemy) ── */}
      <AnimatePresence>
        {allEnemies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            style={{
              flexShrink: 0,
              margin: '0 0.75rem 0.5rem',
              padding: '0.5rem 0.7rem',
              borderRadius: '8px',
              background: 'rgba(122,21,21,0.15)',
              border: '1px solid rgba(122,21,21,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            {allEnemies.map((enemy, idx) => {
              const enemyPct = Math.max(0, Math.min(100, (enemy.hp / enemy.max_hp) * 100));
              const enemyTone = enemyPct > 50 ? 'safe' : enemyPct > 25 ? 'warn' : 'critical';
              const enemyBarWidth = enemy.hp > 0 ? Math.max(enemyPct, 4) : 0;
              const isTarget = currentEnemy && currentEnemy.name === enemy.name;
              return (
                <div key={enemy.name + idx}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ color: isTarget ? 'var(--blood)' : 'var(--text-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Skull size={isTarget ? 16 : 13} /> {enemy.name}
                      {isTarget && allEnemies.length > 1 && <span style={{ fontSize: '0.5rem', color: 'var(--gold)', marginLeft: '0.2rem' }}>HEDEF</span>}
                    </span>
                    <span style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.65rem' }}>
                      {enemy.hp}/{enemy.max_hp}
                    </span>
                  </div>
                  <div style={{ height: isTarget ? '8px' : '5px', background: 'rgba(0,0,0,0.35)', borderRadius: '99px', overflow: 'visible', position: 'relative' }}>
                    <div style={{ height: '100%', borderRadius: '99px', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${enemyBarWidth}%` }}
                        transition={{ duration: 0.4 }}
                        className={`hp-bar hp-bar-${enemyTone}`}
                        style={{ height: '100%', borderRadius: '99px' }}
                      />
                    </div>
                    {isTarget && enemyHpDelta && (
                      <span
                        key={enemyHpDelta.id}
                        className="hp-float-number"
                        style={{
                          left: `${enemyBarWidth}%`,
                          top: '-2px',
                          transform: 'translateX(-50%)',
                          fontSize: '0.8rem',
                          color: enemyHpDelta.value < 0 ? '#ff6b6b' : '#7fd97f',
                        }}
                      >
                        {enemyHpDelta.value > 0 ? `+${enemyHpDelta.value}` : enemyHpDelta.value}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STATS PANEL ── */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{
              flexShrink: 0,
              overflow: 'hidden',
              background: 'rgba(26,21,16,0.97)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '0.25rem',
                padding: '0.6rem 0.75rem',
              }}
            >
              {STAT_COLS.map(([abbr, key, Icon]) => {
                const val = character[key] ?? 10;
                const mod = Math.floor((val - 10) / 2);
                return (
                  <div key={abbr} style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--gold)' }}><Icon size={16} /></div>
                    <div
                      className="font-fantasy gold-text"
                      style={{ fontSize: '0.9rem', fontWeight: 700 }}
                    >
                      {val}
                    </div>
                    <div
                      style={{
                        color: 'var(--text-dim)',
                        fontFamily: "'Cinzel', serif",
                        fontSize: '0.55rem',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {abbr}
                    </div>
                    <div
                      style={{
                        color: mod >= 0 ? 'var(--gold)' : 'var(--blood)',
                        fontFamily: "'Crimson Text', serif",
                        fontSize: '0.7rem',
                      }}
                    >
                      {mod >= 0 ? '+' : ''}{mod}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Skill Tree button */}
            <div style={{ padding: '0 0.75rem 0.6rem', display: 'flex', justifyContent: 'center' }}>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => { playClick(); setShowSkillTree(true); setShowStats(false); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.4rem 0.9rem', borderRadius: '8px',
                  background: (character.pending_perk_points > 0) ? 'rgba(201,150,58,0.2)' : 'rgba(30,25,20,0.6)',
                  border: `1px solid ${(character.pending_perk_points > 0) ? 'var(--gold)' : 'var(--border)'}`,
                  color: (character.pending_perk_points > 0) ? 'var(--gold)' : 'var(--text-dim)',
                  fontFamily: "'Cinzel', serif", fontSize: '0.72rem', cursor: 'pointer',
                }}
              >
                <Sparkles size={14} /> Yetenek Ağacı
                {character.pending_perk_points > 0 && (
                  <span style={{
                    background: 'var(--gold)', color: '#1a1510',
                    borderRadius: '50%', width: '1.1rem', height: '1.1rem',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', fontWeight: 700,
                  }}>
                    {character.pending_perk_points}
                  </span>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NPC PANEL ── */}
      <AnimatePresence>
        {showNpcs && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              flexShrink: 0,
              overflow: 'hidden',
              background: 'rgba(26,21,16,0.98)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ padding: '0.75rem 1rem' }}>
              {npcMsg && (
                <div style={{
                  padding: '0.4rem 0.6rem',
                  marginBottom: '0.6rem',
                  borderRadius: '6px',
                  background: 'rgba(74,222,128,0.12)',
                  border: '1px solid rgba(74,222,128,0.3)',
                  color: '#4ade80',
                  fontFamily: "'Crimson Text', serif",
                  fontSize: '0.82rem',
                  textAlign: 'center',
                }}>
                  {npcMsg}
                </div>
              )}

              {npcs.filter(n => n.is_follower).length > 0 && (
                <>
                  <p className="font-fantasy" style={{ color: '#4caf50', fontSize: '0.75rem', letterSpacing: '0.1em', margin: '0 0 0.6rem' }}>
                    TAKİPÇİLERİN
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.8rem' }}>
                    {npcs.filter(n => n.is_follower).map((npc) => {
                      const roleMeta = getFollowerRoleMeta(npc.follower_role);
                      const RoleIcon = roleMeta.icon;
                      const hasHp = npc.follower_max_hp != null;
                      const hp = npc.follower_hp ?? npc.follower_max_hp ?? 0;
                      const maxHp = npc.follower_max_hp ?? 0;
                      const hpPct = hasHp && maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 100;
                      const isDowned = hasHp && hp <= 0;
                      const morale = npc.follower_morale ?? 60;
                      const loyalty = npc.follower_loyalty ?? 60;
                      const fLevel = npc.follower_level ?? 1;
                      const fXp = npc.follower_xp ?? 0;
                      const fXpPct = Math.min(100, Math.round((fXp / 200) * 100));
                      const moraleColor = morale >= 60 ? '#4caf50' : morale >= 30 ? '#ff9800' : '#e53935';
                      const loyaltyColor = loyalty >= 60 ? '#4caf50' : loyalty >= 30 ? '#ff9800' : '#e53935';
                      return (
                      <motion.div
                        key={npc.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { playClick(); setSelectedNpc(npc); }}
                        style={{
                          background: 'rgba(76,175,80,0.08)',
                          border: '1px solid rgba(76,175,80,0.35)',
                          borderLeft: '3px solid #4caf50',
                          borderRadius: '6px',
                          padding: '0.5rem 0.65rem',
                          cursor: 'pointer',
                          opacity: isDowned ? 0.6 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.8rem', color: 'var(--text)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Users size={13} /> {npc.name}
                            <span style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.7rem', color: 'var(--gold)', marginLeft: '0.25rem' }}>Sv.{fLevel}</span>
                          </span>
                          <span className={roleMeta.color} style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.72rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <RoleIcon size={12} /> {roleMeta.label}
                          </span>
                        </div>
                        {npc.description && (
                          <p style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.8rem', color: 'var(--text-dim)', margin: '0 0 0.35rem' }}>{npc.description}</p>
                        )}
                        {hasHp && (
                          <div style={{ marginBottom: '0.3rem' }}>
                            <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${hpPct}%`,
                                background: isDowned ? '#666' : hpPct < 30 ? '#e53935' : '#4caf50',
                                transition: 'width 0.3s',
                              }} />
                            </div>
                            <span style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.68rem', color: isDowned ? '#e57373' : 'var(--text-muted)' }}>
                              {isDowned ? 'Ağır yaralı — dinleniyor' : `${hp}/${maxHp} HP`}
                            </span>
                          </div>
                        )}
                        {/* XP bar */}
                        <div style={{ marginBottom: '0.25rem' }}>
                          <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${fXpPct}%`, background: 'var(--gold)', transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.65rem', color: 'var(--text-muted)' }}>XP %{fXpPct}</span>
                        </div>
                        {/* Morale & Loyalty */}
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.2rem' }}>
                          <span style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.68rem', color: moraleColor }}>
                            Moral: {morale}/100
                          </span>
                          <span style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.68rem', color: loyaltyColor }}>
                            Sadakat: {loyalty}/100
                          </span>
                        </div>
                      </motion.div>
                      );
                    })}
                  </div>
                </>
              )}

              <p className="font-fantasy" style={{ color: 'var(--gold)', fontSize: '0.75rem', letterSpacing: '0.1em', margin: '0 0 0.6rem' }}>
                TANINAN NPC'LER
              </p>
              {npcs.filter(n => !n.is_follower && n.npc_status !== 'dead' && n.relationship !== 'dead').length === 0 ? (
                <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                  Henüz tanınan NPC yok. Hikayede karakterlerle tanıştıkça burada görünecek.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
                  {npcs.filter(n => !n.is_follower && n.npc_status !== 'dead' && n.relationship !== 'dead').map((npc) => {
                    const relColor = { friendly: '#4caf50', neutral: '#c9963a', hostile: '#e53935', unknown: '#888' }[npc.relationship] || '#888';
                    const relLabel = { friendly: 'Dost', neutral: 'Tarafsız', hostile: 'Düşman', unknown: 'Bilinmiyor' }[npc.relationship] || 'Bilinmiyor';
                    const canAfford = character && npc.hire_cost && character.gold >= npc.hire_cost;
                    return (
                      <motion.div
                        key={npc.id}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: 'rgba(0,0,0,0.35)',
                          border: `1px solid ${relColor}33`,
                          borderLeft: `3px solid ${relColor}`,
                          borderRadius: '6px',
                          padding: '0.5rem 0.65rem',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div onClick={() => { playClick(); setSelectedNpc(npc); }} style={{ cursor: 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.8rem', color: 'var(--text)', fontWeight: 600 }}>{npc.name}</span>
                            <span style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.72rem', color: relColor, fontWeight: 600 }}>{relLabel}</span>
                          </div>
                          {npc.description && (
                            <p style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>{npc.description}</p>
                          )}
                          {npc.notes && (
                            <p style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0', fontStyle: 'italic' }}>
                              {npc.notes}
                            </p>
                          )}
                        </div>
                        {npc.hire_cost > 0 && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            disabled={!canAfford || hiringId === npc.id}
                            onClick={(e) => { e.stopPropagation(); handleHire(npc); }}
                            style={{
                              marginTop: '0.4rem',
                              width: '100%',
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid var(--gold)',
                              background: canAfford ? 'rgba(201,150,58,0.15)' : 'rgba(120,120,120,0.1)',
                              color: canAfford ? 'var(--gold)' : 'var(--text-muted)',
                              fontFamily: "'Cinzel', serif",
                              fontSize: '0.72rem',
                              cursor: canAfford ? 'pointer' : 'not-allowed',
                              opacity: hiringId === npc.id ? 0.6 : 1,
                            }}
                          >
                            {hiringId === npc.id ? 'İşe alınıyor...' : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Coins size={14} /> İşe Al ({npc.hire_cost} altın)
                              </span>
                            )}
                          </motion.button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── QUEST PANEL ── */}
      <AnimatePresence>
        {showQuests && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              flexShrink: 0,
              overflow: 'hidden',
              background: 'rgba(26,21,16,0.98)',
              borderBottom: '1px solid var(--border)',
              maxHeight: '45vh',
            }}
          >
            <QuestPanel quests={quests} onAbandon={handleAbandonQuest} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── INVENTORY PANEL ── */}
      <AnimatePresence>
        {showBag && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              flexShrink: 0,
              overflow: 'hidden',
              background: 'rgba(26,21,16,0.98)',
              borderBottom: '1px solid var(--border)',
              maxHeight: '45vh',
            }}
          >
            <div style={{ padding: '0.6rem 0.75rem', overflowY: 'auto', maxHeight: '44vh' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="font-fantasy gold-text" style={{ fontSize: '0.85rem', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Backpack size={16} /> Envanter
                </span>
                <span style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.75rem' }}>
                  {inventory.length} eşya
                </span>
              </div>

              {/* Item message toast */}
              {itemMsg && (
                <div style={{
                  padding: '0.4rem 0.6rem',
                  marginBottom: '0.4rem',
                  borderRadius: '6px',
                  background: 'rgba(74,222,128,0.12)',
                  border: '1px solid rgba(74,222,128,0.3)',
                  color: '#4ade80',
                  fontFamily: "'Crimson Text', serif",
                  fontSize: '0.82rem',
                  textAlign: 'center',
                }}>
                  {itemMsg}
                </div>
              )}

              {inventory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-dim)' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.3rem' }}>
                    <Backpack size={24} />
                  </div>
                  <p style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.85rem', margin: 0 }}>Envanterin boş</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {inventory.map((item) => {
                    const ItemIconComp = ItemIcon[item.type] || ItemIcon.misc;
                    const canUse = item.type === 'potion';
                    const canEquip = ['weapon', 'armor'].includes(item.type);
                    const itemLocked = character.hp <= 0 || Boolean(currentEnemy);
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.6rem',
                          borderRadius: '8px',
                          background: item.equipped ? 'rgba(201,150,58,0.1)' : 'rgba(0,0,0,0.2)',
                          border: item.equipped ? '1px solid rgba(201,150,58,0.35)' : '1px solid rgba(92,74,42,0.2)',
                        }}
                      >
                        <ItemIconComp size={18} style={{ flexShrink: 0 }} color="var(--gold)" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                            <span className="gold-text" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.78rem', fontWeight: 700 }}>
                              {item.name}
                            </span>
                            {item.quantity > 1 && (
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>×{item.quantity}</span>
                            )}
                            {item.equipped ? (
                              <span style={{
                                background: 'rgba(201,150,58,0.2)',
                                color: 'var(--gold)',
                                fontFamily: "'Cinzel', serif",
                                fontSize: '0.5rem',
                                padding: '0.05rem 0.35rem',
                                borderRadius: '20px',
                                letterSpacing: '0.04em',
                              }}>
                                E
                              </span>
                            ) : null}
                          </div>
                          <div style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.72rem' }}>
                            {item.description}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                          {canUse && (
                            <motion.button
                              whileTap={itemLocked ? {} : { scale: 0.9 }}
                              onClick={() => !itemLocked && handleUseItem(item.id)}
                              disabled={itemLocked}
                              style={{
                                background: itemLocked ? 'rgba(92,74,42,0.15)' : 'rgba(74,222,128,0.15)',
                                border: `1px solid ${itemLocked ? 'rgba(92,74,42,0.3)' : 'rgba(74,222,128,0.4)'}`,
                                color: itemLocked ? 'var(--text-dim)' : '#4ade80',
                                borderRadius: '6px',
                                fontSize: '0.65rem',
                                padding: '0.25rem 0.45rem',
                                cursor: itemLocked ? 'not-allowed' : 'pointer',
                                fontFamily: "'Cinzel', serif",
                              }}
                            >
                              İç
                            </motion.button>
                          )}
                          {canEquip && (
                            <motion.button
                              whileTap={itemLocked ? {} : { scale: 0.9 }}
                              onClick={() => !itemLocked && handleEquipItem(item.id)}
                              disabled={itemLocked}
                              style={{
                                background: itemLocked ? 'rgba(92,74,42,0.15)' : item.equipped ? 'rgba(122,21,21,0.15)' : 'rgba(201,150,58,0.12)',
                                border: `1px solid ${itemLocked ? 'rgba(92,74,42,0.3)' : item.equipped ? 'rgba(122,21,21,0.4)' : 'rgba(201,150,58,0.4)'}`,
                                color: itemLocked ? 'var(--text-dim)' : item.equipped ? 'var(--blood)' : 'var(--gold)',
                                borderRadius: '6px',
                                fontSize: '0.65rem',
                                padding: '0.25rem 0.45rem',
                                cursor: itemLocked ? 'not-allowed' : 'pointer',
                                fontFamily: "'Cinzel', serif",
                              }}
                            >
                              {item.equipped ? 'Çıkar' : 'Kuşan'}
                            </motion.button>
                          )}
                          <motion.button
                            whileTap={itemLocked ? {} : { scale: 0.9 }}
                            onClick={() => !itemLocked && handleDropItem(item.id)}
                            disabled={itemLocked}
                            style={{
                              background: itemLocked ? 'rgba(92,74,42,0.1)' : 'rgba(92,74,42,0.1)',
                              border: `1px solid ${itemLocked ? 'rgba(92,74,42,0.2)' : 'rgba(92,74,42,0.3)'}`,
                              color: itemLocked ? 'var(--text-dim)' : 'var(--text-dim)',
                              borderRadius: '6px',
                              fontSize: '0.65rem',
                              padding: '0.25rem 0.4rem',
                              cursor: itemLocked ? 'not-allowed' : 'pointer',
                              fontFamily: "'Cinzel', serif",
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <X size={14} />
                          </motion.button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MESSAGES ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          position: 'relative',
        }}
      >
        <AnimatePresence initial={false}>
          {/* Recap card when continuing an existing session */}
          {showRecap && messages.length > 0 && session?.story_summary && (
            <motion.div
              key="recap"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(26,21,16,0.95)',
                border: '1px solid rgba(201,150,58,0.35)',
                borderRadius: '10px',
                padding: '0.75rem 0.9rem',
                marginBottom: '0.3rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span className="font-fantasy" style={{ color: 'var(--gold)', fontSize: '0.7rem', letterSpacing: '0.1em', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ScrollText size={14} /> KALDIĞIN YER
                </span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowRecap(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0 }}
                >
                  <X size={16} />
                </motion.button>
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontFamily: "'Crimson Text', serif", fontSize: '0.88rem', lineHeight: 1.55 }}>
                {session.story_summary}
              </p>
              {(session.current_scene || session.active_quest_titles?.length > 0 || session.last_choice_summary) && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {session.current_scene && session.current_scene !== 'unknown' && (
                    <span style={{ background: 'rgba(201,150,58,0.12)', color: 'var(--gold)', fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '20px', fontFamily: "'Cinzel', serif" }}>
                      {session.current_scene}
                    </span>
                  )}
                  {session.active_quest_titles?.slice(0, 3).map((title) => (
                    <span key={title} style={{ background: 'rgba(74,222,128,0.1)', color: '#7fd97f', fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '20px', fontFamily: "'Cinzel', serif" }}>
                      {title}
                    </span>
                  ))}
                  {session.turn_count > 0 && (
                    <span style={{ background: 'rgba(92,74,42,0.2)', color: 'var(--text-dim)', fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '20px', fontFamily: "'Cinzel', serif" }}>
                      Tur {session.turn_count}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Starting indicator */}
          {starting && (
            <motion.div
              key="starting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="msg-narrator"
              style={{ padding: '0.85rem 1rem', borderRadius: '10px' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.4rem',
                }}
              >
                <ScrollText size={14} color="var(--gold)" />
                <span
                  className="font-fantasy"
                  style={{
                    color: 'var(--gold)',
                    fontSize: '0.6rem',
                    letterSpacing: '0.1em',
                  }}
                >
                  KADER'İN SESİ
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
                <span
                  style={{
                    color: 'var(--text-dim)',
                    fontFamily: "'Crimson Text', serif",
                    fontSize: '0.85rem',
                    fontStyle: 'italic',
                    marginLeft: '0.3rem',
                  }}
                >
                  Hikaye açılıyor...
                </span>
              </div>
            </motion.div>
          )}

          {/* Messages */}
          {messages.map((msg) => {
            const isNew = msg.id === lastMsgId && msg.role === 'assistant';
            const options = msg.role === 'assistant' ? parseOptions(msg.content) : [];
            return (
              <motion.div
                key={msg.id || msg.created_at}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={msg.role === 'assistant' ? 'msg-narrator' : 'msg-player'}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  ...(msg.role === 'user'
                    ? { marginLeft: 'auto', maxWidth: '18rem' }
                    : {}),
                }}
              >
                {msg.role === 'assistant' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      marginBottom: '0.4rem',
                    }}
                  >
                    <ScrollText size={14} color="var(--gold)" />
                    <span
                      className="font-fantasy"
                      style={{
                        color: 'var(--gold)',
                        fontSize: '0.58rem',
                        letterSpacing: '0.1em',
                      }}
                    >
                      KADER'İN SESİ
                    </span>
                  </div>
                )}
                {msg.role === 'user' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginBottom: '0.3rem',
                    }}
                  >
                    <Swords size={13} color="var(--gold)" />
                  </div>
                )}
                {isNew ? (
                  <TypewriterText
                    text={stripEvents(msg.content)}
                    speed={14}
                    onComplete={() => setLastMsgId(null)}
                    style={{
                      fontFamily: "'Crimson Text', serif",
                      fontSize: '0.95rem',
                      lineHeight: 1.55,
                      margin: 0,
                      color: 'var(--text)',
                      whiteSpace: 'pre-wrap',
                    }}
                  />
                ) : (
                  <p
                    style={{
                      fontFamily: "'Crimson Text', serif",
                      fontSize: '0.95rem',
                      lineHeight: 1.55,
                      margin: 0,
                      color: 'var(--text)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {stripEvents(msg.content)}
                  </p>
                )}

                {/* Option buttons */}
                {options.length > 0 && !isNew && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {options.map((opt, i) => (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { playClick(); handleSend(opt.text); }}
                        disabled={loading}
                        style={{
                          textAlign: 'left',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '8px',
                          background: 'rgba(201,150,58,0.1)',
                          border: '1px solid rgba(201,150,58,0.4)',
                          color: 'var(--gold)',
                          fontFamily: "'Crimson Text', serif",
                          fontSize: '0.9rem',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          opacity: loading ? 0.5 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <span
                          style={{
                            background: 'rgba(201,150,58,0.25)',
                            color: '#0d0a05',
                            fontFamily: "'Cinzel', serif",
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            width: '1.4rem',
                            height: '1.4rem',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {opt.label}
                        </span>
                        <span style={{ lineHeight: 1.35 }}>{opt.text}</span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Typing indicator */}
          {loading && (
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="msg-narrator"
              style={{ padding: '0.85rem 1rem', borderRadius: '10px' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  marginBottom: '0.4rem',
                }}
              >
                <ScrollText size={13} color="var(--gold)" />
                <span
                  className="font-fantasy"
                  style={{
                    color: 'var(--gold)',
                    fontSize: '0.58rem',
                    letterSpacing: '0.1em',
                  }}
                >
                  KADER'İN SESİ
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {chatError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              flexShrink: 0,
              margin: '0 0.75rem 0.4rem',
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              background: 'rgba(122,21,21,0.2)',
              border: '1px solid rgba(122,21,21,0.5)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ color: 'var(--blood)', fontFamily: "'Crimson Text', serif", fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flex: 1 }}>
              <AlertTriangle size={15} /> {chatError}
            </span>
            <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
              {lastFailedSend && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    const { text, diceResult } = lastFailedSend;
                    setChatError('');
                    setLastFailedSend(null);
                    handleSend(text, diceResult);
                  }}
                  style={{
                    background: 'rgba(201,150,58,0.2)',
                    border: '1px solid var(--gold)',
                    color: 'var(--gold)',
                    borderRadius: '6px',
                    padding: '0.25rem 0.6rem',
                    cursor: 'pointer',
                    fontFamily: "'Cinzel', serif",
                    fontSize: '0.72rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  <RotateCcw size={13} /> Tekrar Dene
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => { setChatError(''); setLastFailedSend(null); }}
                style={{
                  background: 'rgba(122,21,21,0.3)',
                  border: '1px solid var(--blood)',
                  color: 'var(--blood)',
                  borderRadius: '6px',
                  padding: '0.2rem 0.5rem',
                  cursor: 'pointer',
                  fontFamily: "'Crimson Text', serif",
                  fontSize: '0.78rem',
                }}
              >
                Kapat
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Follower combat assist banner */}
      <AnimatePresence>
        {followerAssistMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              flexShrink: 0,
              margin: '0 0.75rem 0.4rem',
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              background: followerAssistMsg.followerDied
                ? 'rgba(122,21,21,0.2)'
                : followerAssistMsg.isHeal
                ? 'rgba(76,175,80,0.15)'
                : 'rgba(201,150,58,0.12)',
              border: `1px solid ${followerAssistMsg.followerDied ? 'rgba(122,21,21,0.5)' : followerAssistMsg.isHeal ? 'rgba(76,175,80,0.4)' : 'rgba(201,150,58,0.35)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            {followerAssistMsg.isHeal ? <Heart size={14} color="#4caf50" /> : <Sword size={14} color="var(--gold)" />}
            <span style={{
              color: followerAssistMsg.followerDied ? 'var(--blood)' : 'var(--text)',
              fontFamily: "'Crimson Text', serif", fontSize: '0.82rem',
            }}>
              {followerAssistMsg.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final Journey screen (permanent death) */}
      <AnimatePresence>
        {finalJourney && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.95)', flexDirection: 'column',
              gap: '1.2rem', padding: '2rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--blood)' }}><Swords size={48} /></div>
            <h2 className="font-fantasy" style={{ color: 'var(--blood)', fontSize: '1.6rem', letterSpacing: '0.12em', margin: 0, textAlign: 'center' }}>
              SON YOLCULUK
            </h2>
            <p style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.95rem', textAlign: 'center', maxWidth: '340px', lineHeight: 1.6 }}>
              {finalJourney.finalMessage}
            </p>
            {finalJourney.summary && (
              <div style={{
                background: 'rgba(20,14,8,0.9)', border: '1px solid rgba(92,74,42,0.5)',
                borderRadius: '0.5rem', padding: '1rem', maxWidth: '340px',
                fontFamily: "'Crimson Text', serif", fontSize: '0.9rem',
                color: 'var(--text-muted)', lineHeight: 1.6, maxHeight: '200px', overflowY: 'auto',
              }}>
                {finalJourney.summary}
              </div>
            )}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/create-character')}
              className="btn-gold"
              style={{ fontSize: '1rem', padding: '0.65rem 1.5rem' }}
            >
              Yeni Kahraman Yarat
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={async () => {
                if (!isPremiumUser) await showInterstitialAd();
                navigate('/create-character');
              }}
              className="btn-dark"
              style={{ fontSize: '0.9rem', padding: '0.55rem 1.2rem' }}
            >
              Ana Menüye Dön
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Death overlay — single rebirth die */}
      <AnimatePresence>
        {character.status === 'dead' && !finalJourney && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 90,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.9)', flexDirection: 'column', gap: '1rem', padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--blood)' }}><Skull size={56} /></div>
            <h2 className="font-fantasy" style={{ color: 'var(--blood)', fontSize: '1.7rem', letterSpacing: '0.1em', margin: 0, textAlign: 'center' }}>
              KAHRAMANIN DÜŞTÜ
            </h2>
            <p style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '1rem', textAlign: 'center', maxWidth: '320px' }}>
              {character.name} ölümün kıyısında. Yeniden doğma zarında 10+ atarsan 1 canla dirilirsin.
            </p>

            {reviveRoll && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  width: '3.2rem', height: '3.2rem', borderRadius: '10px',
                  background: reviveRoll.success ? 'rgba(74,222,128,0.15)' : 'rgba(220,38,38,0.15)',
                  border: `1px solid ${reviveRoll.success ? '#4ade80' : 'var(--blood)'}`,
                  color: reviveRoll.success ? '#4ade80' : 'var(--blood)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Cinzel', serif", fontSize: '1.3rem',
                }}
              >
                {reviveRoll.roll}
              </motion.div>
            )}

            {reviveState === 'idle' && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={async () => {
                  setReviveState('rolling');
                  try {
                    const result = await finalDeathSave(characterId, sessionId);
                    await new Promise((resolve) => setTimeout(resolve, 700));
                    setReviveRoll({ roll: result.roll, success: result.success });
                    if (result.success) {
                      setCharacter(result.character);
                      setCurrentEnemy(null);
                      setMessages((currentMessages) => [
                        ...currentMessages,
                        { role: 'assistant', content: `${character.name} kaderin pençesinden kurtuldu! 1 canla yeniden doğdu.`, id: Date.now() },
                      ]);
                      setTimeout(() => {
                        setReviveRoll(null);
                        setReviveState('idle');
                      }, 2500);
                    } else {
                      if (!isPremiumUser) await showInterstitialAd();
                      setFinalJourney({ summary: result.summary, finalMessage: result.finalMessage });
                    }
                  } catch {
                    setReviveState('failed');
                  }
                }}
                className="btn-gold"
                style={{ fontSize: '1rem', padding: '0.65rem 1.5rem' }}
              >
                Yeniden Doğma Zarını At
              </motion.button>
            )}

            {reviveState === 'rolling' && (
              <span style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif" }}>Kader çarkı dönüyor...</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unconscious overlay */}
      <AnimatePresence>
        {character.status === 'unconscious' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              background: 'rgba(122,21,21,0.15)',
              borderBottom: '2px solid rgba(122,21,21,0.5)',
              padding: '0.5rem 0.75rem',
              textAlign: 'center',
              zIndex: 50,
            }}
          >
            <span className="font-fantasy" style={{ color: 'var(--blood)', fontSize: '0.75rem', letterSpacing: '0.08em', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
              <Skull size={16} /> BAYGIN — Ölüm Zarları: <CheckCircle2 size={14} /> {character.death_saves_success || 0}/3 <XCircle size={14} /> {character.death_saves_fail || 0}/3
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll down indicator */}
      <AnimatePresence>
        {showScrollDown && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="scroll-indicator"
            style={{
              position: 'absolute',
              bottom: '10rem',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
              background: 'rgba(26,21,16,0.95)',
              border: '1px solid var(--border)',
              color: 'var(--gold)',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            ↓
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── DICE ROLL ANIMATION BANNER ── */}
      <AnimatePresence>
        {(diceRolling || lastDice) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            style={{
              flexShrink: 0,
              margin: '0 0.75rem 0.5rem',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: 'rgba(201,150,58,0.12)',
              border: '1px solid rgba(201,150,58,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  color: 'var(--gold)',
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.7rem',
                  letterSpacing: '0.08em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Dices size={15} /> {diceRolling ? 'Zar atılıyor...' : `Otomatik ${lastDice?.stat || ''} Zarı`}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.3rem' }}>
                <DiceRoll
                  value={lastDice?.rolls?.[0] || 1}
                  rolling={diceRolling}
                  size={56}
                  label="d20"
                />
                <div>
                  <div
                    className={`font-fantasy ${
                      lastDice?.nat20 ? 'nat20-glow' : lastDice?.nat1 ? 'nat1-shake' : 'gold-text'
                    }`}
                    style={{ fontSize: '1.6rem', lineHeight: 1 }}
                  >
                    {lastDice ? lastDice.total : '...'}
                  </div>
                  {lastDice && (
                    <div style={{ color: 'var(--text-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.6rem' }}>
                      {lastDice.rolls[0]} {lastDice.modifier >= 0 ? '+' : ''}{lastDice.modifier} {lastDice.stat}
                    </div>
                  )}
                </div>
              </div>
              {lastDice?.nat20 && (
                <span style={{ color: 'var(--gold2)', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.1em' }}>
                  KRİTİK BAŞARI!
                </span>
              )}
              {lastDice?.nat1 && (
                <span style={{ color: 'var(--blood)', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.1em' }}>
                  KRİTİK BAŞARISIZLIK!
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── COMBAT RESULT BANNER ── */}
      <AnimatePresence>
        {combatPhase === 'rolling' && (
          <motion.div
            key="combat-rolling"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            style={{
              flexShrink: 0,
              margin: '0 0.75rem 0.5rem',
              padding: '1rem',
              borderRadius: '10px',
              background: 'rgba(122,21,21,0.15)',
              border: '1px solid rgba(201,150,58,0.4)',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--gold)' }} className="dice-spin-3d"><Swords size={40} /></div>
            <p className="font-fantasy gold-text" style={{ fontSize: '0.9rem', margin: '0.4rem 0 0' }}>
              Saldiri zarı atılıyor...
            </p>
          </motion.div>
        )}

        {combatPhase === 'result' && combatResult && (
          <motion.div
            key="combat-result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              flexShrink: 0,
              margin: '0 0.75rem 0.5rem',
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              background: combatResult.isCritical
                ? 'rgba(201,150,58,0.2)'
                : combatResult.isHit
                ? 'rgba(74,222,128,0.1)'
                : 'rgba(122,21,21,0.15)',
              border: `1px solid ${
                combatResult.isCritical
                  ? 'rgba(201,150,58,0.6)'
                  : combatResult.isHit
                  ? 'rgba(74,222,128,0.4)'
                  : 'rgba(122,21,21,0.5)'
              }`,
            }}
          >
            {/* Attack roll display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'center', minWidth: '3.5rem' }}>
                <div
                  className={`font-fantasy ${
                    combatResult.isCritical ? 'gold-shimmer' : combatResult.isCritFail ? 'nat1-shake' : 'gold-text'
                  }`}
                  style={{ fontSize: '2.2rem', lineHeight: 1 }}
                >
                  {combatResult.attackRoll}
                </div>
                <div style={{
                  color: 'var(--text-dim)',
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.55rem',
                  letterSpacing: '0.06em',
                  marginTop: '0.15rem',
                }}>
                  d20{combatResult.attackMod >= 0 ? '+' : ''}{combatResult.attackMod}
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: combatResult.isCritical
                    ? 'var(--gold)'
                    : combatResult.isHit
                    ? '#4ade80'
                    : 'var(--blood)',
                  marginBottom: '0.2rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}>
                  {combatResult.isCritFail
                    ? <><Bomb size={18} /> KRİTİK BAŞARISIZLIK!</>
                    : combatResult.isCritical
                    ? <><Zap size={18} /> KRİTİK İSABET!</>
                    : combatResult.isHit
                    ? <><Sword size={18} /> İSABET!</>
                    : <><Wind size={18} /> ISKALADI!</>}
                </div>

                <div style={{
                  color: 'var(--text)',
                  fontFamily: "'Crimson Text', serif",
                  fontSize: '0.82rem',
                  lineHeight: 1.4,
                }}>
                  <span style={{ color: 'var(--gold)' }}>{combatResult.weapon}</span>
                  {' '}ile {combatResult.attackTotal} vs AC {combatResult.enemyAC}
                </div>

                {combatResult.isHit && (
                  <div style={{
                    marginTop: '0.3rem',
                    padding: '0.3rem 0.5rem',
                    borderRadius: '6px',
                    background: 'rgba(122,21,21,0.2)',
                    border: '1px solid rgba(122,21,21,0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}>
                    <Zap size={15} color="var(--blood)" />
                    <span style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: 'var(--blood)',
                    }}>
                      {combatResult.damageTotal} HASAR
                    </span>
                    <span style={{
                      color: 'var(--text-dim)',
                      fontFamily: "'Crimson Text', serif",
                      fontSize: '0.7rem',
                    }}>
                      ({combatResult.damageDice}
                      {combatResult.damageMod > 0 ? `+${combatResult.damageMod}` : combatResult.damageMod < 0 ? combatResult.damageMod : ''}
                      {' '}= [{combatResult.damageRolls.join(', ')}]
                      {combatResult.damageMod !== 0 ? `${combatResult.damageMod > 0 ? '+' : ''}${combatResult.damageMod}` : ''})
                    </span>
                  </div>
                )}

                {combatResult.followerAssist && (
                  <div style={{
                    marginTop: '0.35rem',
                    padding: '0.3rem 0.5rem',
                    borderRadius: '6px',
                    background: 'rgba(76,175,80,0.1)',
                    border: '1px solid rgba(76,175,80,0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}>
                    {combatResult.followerAssist.isHit ? <Shield size={14} color="#4caf50" /> : <Wind size={14} color="var(--text-dim)" />}
                    <span style={{
                      fontFamily: "'Crimson Text', serif",
                      fontSize: '0.78rem',
                      color: combatResult.followerAssist.isHit ? '#4caf50' : 'var(--text-dim)',
                    }}>
                      {combatResult.followerAssist.summary}
                    </span>
                  </div>
                )}

                {combatResult.xpGained > 0 && (
                  <div style={{
                    marginTop: '0.35rem',
                    padding: '0.3rem 0.5rem',
                    borderRadius: '6px',
                    background: 'rgba(124,158,189,0.12)',
                    border: '1px solid rgba(124,158,189,0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}>
                    <Sparkles size={15} color="#7c9ebd" />
                    <span style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#7c9ebd',
                    }}>
                      +{combatResult.xpGained} XP
                    </span>
                  </div>
                )}

                {combatResult.loot && (combatResult.loot.gold > 0 || combatResult.loot.items?.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    style={{
                      marginTop: '0.4rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.35rem',
                    }}
                  >
                    {combatResult.loot.gold > 0 && (
                      <div style={{
                        padding: '0.3rem 0.5rem',
                        borderRadius: '6px',
                        background: 'rgba(201,150,58,0.15)',
                        border: '1px solid rgba(201,150,58,0.45)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}>
                        <Coins size={15} color="var(--gold)" />
                        <span className="gold-text" style={{
                          fontFamily: "'Cinzel', serif",
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}>
                          +{combatResult.loot.gold} Altın
                        </span>
                      </div>
                    )}
                    {combatResult.loot.items?.map((item, idx) => {
                      const LootIcon = ItemIcon[item.type] || ItemIcon.potion;
                      const RARITY_COLOR = {
                        common: 'var(--parch)',
                        uncommon: '#6fcf6f',
                        rare: '#6bb1e8',
                        epic: '#c9a3f5',
                        legendary: '#f0b03e',
                      };
                      const color = RARITY_COLOR[item.rarity] || RARITY_COLOR.common;
                      const isNotable = item.rarity && item.rarity !== 'common';
                      return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.25 + idx * 0.1 }}
                        style={{
                          padding: '0.3rem 0.5rem',
                          borderRadius: '6px',
                          background: isNotable ? `${color}26` : 'rgba(122,90,50,0.15)',
                          border: `1px solid ${isNotable ? `${color}99` : 'rgba(122,90,50,0.4)'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          boxShadow: isNotable ? `0 0 8px ${color}59` : 'none',
                        }}
                      >
                        <LootIcon size={14} color={color} />
                        <span style={{
                          fontFamily: "'Crimson Text', serif",
                          fontSize: '0.74rem',
                          fontWeight: isNotable ? 700 : 400,
                          color,
                        }}>
                          {item.name}
                        </span>
                      </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem', justifyContent: 'flex-end' }}>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleCombatConfirm}
                disabled={combatSending}
                className="btn-gold"
                style={{
                  fontSize: '0.82rem',
                  padding: '0.45rem 0.9rem',
                  opacity: combatSending ? 0.5 : 1,
                }}
              >
                {combatSending ? 'Gönderiliyor...' : <><span>Anlatıcıya Bildir</span> <Swords size={14} /></>}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleCombatCancel}
                className="btn-dark"
                style={{ fontSize: '0.82rem', padding: '0.45rem 0.7rem' }}
              >
                İptal
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── INPUT BAR ── */}
      <div
        style={{
          flexShrink: 0,
          padding: '0.5rem 0.75rem',
          borderTop: '1px solid var(--border)',
          background: 'rgba(13,10,5,0.97)',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          position: 'relative',
        }}
        className="pb-safe"
      >
        {/* Text input */}
        <input
          ref={inputRef}
          className="input-dark"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={isDead ? 'Kahraman düştü...' : 'Ne yapıyorsun? (otomatik d20)'}
          disabled={loading || isDead}
          style={{
            flex: 1,
            fontSize: '0.95rem',
            padding: '0.55rem 0.85rem',
            borderRadius: '8px',
          }}
        />

        {/* Send button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => handleSend()}
          disabled={!input.trim() || loading || isDead}
          className="btn-gold"
          style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '8px',
            padding: 0,
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: !input.trim() || loading || isDead ? 0.4 : 1,
            cursor: !input.trim() || loading || isDead ? 'not-allowed' : 'pointer',
          }}
        >
          <Send size={18} />
        </motion.button>
      </div>

      {/* Wheel of Fate Modal */}
      <AnimatePresence>
        {showWheel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !wheelSpinning && setShowWheel(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(22rem, 100%)',
                background: 'linear-gradient(180deg, #1a1410 0%, #0d0a05 100%)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '1.5rem',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem', color: 'var(--gold)', fontFamily: "'Cinzel Decorative', serif" }}>
                Kader Çarkı
              </h3>
              <p style={{ margin: '0 0 1rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                {(() => {
                  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
                  const spinDate = character?.wheel_spin_date;
                  const spinsUsed = spinDate === today ? (character?.wheel_spins_used || 0) : 0;
                  const maxSpins = isPremiumUser ? 3 : 1;
                  const remaining = Math.max(0, maxSpins - spinsUsed);
                  return `Bugün ${remaining}/${maxSpins} çark hakkın kaldı. Altın, iksir, ekstra hamle veya nadir eşya kazan.`;
                })()}
              </p>

              <div style={{ position: 'relative', width: 'min(16rem, 80vw)', height: 'min(16rem, 80vw)', margin: '0 auto 1.5rem' }}>
                <motion.div
                  animate={{ rotate: wheelSpinning ? 1800 + Math.random() * 360 : 0 }}
                  transition={{ duration: 1.8, ease: 'easeOut' }}
                  style={{ width: '100%', height: '100%' }}
                >
                  <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    {WHEEL_SEGMENTS.map((seg, i) => {
                      const start = i * 40;
                      const end = (i + 1) * 40;
                      const mid = (start + end) / 2;
                      const outer = describeArc(100, 100, 96, start, end);
                      const r = 68;
                      const rad = (mid - 90) * Math.PI / 180;
                      const x = 100 + r * Math.cos(rad);
                      const y = 100 + r * Math.sin(rad);
                      return (
                        <g key={`slice-${i}`}>
                          <path
                            d={`${outer} L 100 100 Z`}
                            fill={seg.color}
                            stroke="#0d0a05"
                            strokeWidth="1.5"
                          />
                          <text
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="9"
                            fontWeight="800"
                            fill="#0d0a05"
                            transform={`rotate(${mid + 90}, ${x}, ${y})`}
                            style={{ textShadow: '0 0 2px rgba(255,255,255,0.35)', userSelect: 'none' }}
                          >
                            {seg.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </motion.div>
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: '50%',
                    background: '#0d0a05',
                    border: '2px solid var(--gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    color: 'var(--gold)',
                    fontWeight: 700,
                    boxShadow: '0 0 16px rgba(0,0,0,0.8)',
                  }}
                >
                  KADER
                </div>
                <div
                  style={{
                    position: 'absolute',
                    top: '-0.4rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '10px solid transparent',
                    borderRight: '10px solid transparent',
                    borderTop: '16px solid var(--blood)',
                    zIndex: 2,
                  }}
                />
              </div>

              {wheelResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    background: 'rgba(201,167,58,0.12)',
                    border: '1px solid var(--gold)',
                    color: 'var(--gold)',
                    fontWeight: 600,
                  }}
                >
                  {wheelResult.message}
                </motion.div>
              )}

              {wheelError && (
                <div style={{ marginBottom: '1rem', color: 'var(--blood)', fontSize: '0.85rem' }}>
                  {wheelError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                {(() => {
                  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
                  const spinDate = character?.wheel_spin_date;
                  const spinsUsed = spinDate === today ? (character?.wheel_spins_used || 0) : 0;
                  const maxSpins = isPremiumUser ? 3 : 1;
                  const remaining = Math.max(0, maxSpins - spinsUsed);
                  const canSpin = remaining > 0;
                  return (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={handleSpinWheel}
                        disabled={wheelSpinning || !canSpin}
                        style={{
                          padding: '0.7rem 1.4rem',
                          borderRadius: '10px',
                          border: 'none',
                          background: canSpin ? 'linear-gradient(135deg, var(--gold), #b8942a)' : 'rgba(92,74,42,0.3)',
                          color: '#0d0a05',
                          fontWeight: 700,
                          cursor: canSpin ? 'pointer' : 'not-allowed',
                          opacity: canSpin ? 1 : 0.5,
                          fontSize: '0.9rem',
                        }}
                      >
                        {wheelSpinning ? 'Çevriliyor...' : canSpin ? `Çevir (${remaining})` : 'Bugün Çevrildi'}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setShowWheel(false)}
                        disabled={wheelSpinning}
                        style={{
                          padding: '0.7rem 1.2rem',
                          borderRadius: '10px',
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          color: 'var(--text)',
                          cursor: wheelSpinning ? 'not-allowed' : 'pointer',
                          fontSize: '0.9rem',
                        }}
                      >
                        Kapat
                      </motion.button>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skill Tree Modal */}
      {showSkillTree && (
        <SkillTreeModal
          characterId={characterId}
          onClose={() => setShowSkillTree(false)}
          onCharacterUpdate={(c) => setCharacter(c)}
        />
      )}

      {/* NPC Dialog Modal */}
      {selectedNpc && (
        <NpcDialogModal
          npc={selectedNpc}
          characterId={characterId}
          sessionId={sessionId}
          onClose={() => {
            setSelectedNpc(null);
            // Refresh NPC list when modal closes so notes/topics show up
            getNpcs(characterId).then(d => setNpcs(d.npcs || [])).catch(() => {});
          }}
          onNpcUpdate={(updated) => {
            setNpcs(prev => prev.map(n => n.id === updated.id ? updated : n));
          }}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}
