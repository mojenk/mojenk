import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getCharacters, getSessions, deleteCharacter, deleteSession } from '../utils/api';
import { playClick, playDamage, playError } from '../utils/sounds';
import Particles from '../components/Particles';
import AnnouncementsBar from '../components/AnnouncementsBar';
import { Sparkles, Swords, Castle, Skull, Heart, Coins, ScrollText, Trash2, X, Dices } from 'lucide-react';

const RACE_PORTRAITS = {
  'İnsan': '/races/insan.svg',
  'Elf': '/races/elf.svg',
  'Cüce': '/races/cuce.svg',
  'Yarı-Ork': '/races/yariork.svg',
  'Hobit': '/races/hobit.svg',
  'İblissoyu': '/races/iblissoyu.svg',
};

export default function CharactersPage({ user, onLogout, isAdmin }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionMap, setSessionMap] = useState({});
  const [expandedChar, setExpandedChar] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [createdNotice, setCreatedNotice] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const d = await getCharacters(user.id);
      const chars = d.characters || [];
      setCharacters(chars);
      // Load sessions for all characters in parallel
      const sessionsResults = await Promise.all(
        chars.map((c) => getSessions(c.id).catch(() => ({ sessions: [] })))
      );
      const map = {};
      chars.forEach((c, i) => {
        map[c.id] = (sessionsResults[i].sessions || []).slice(0, 5);
      });
      setSessionMap(map);
    } catch (err) {
      setError(err.message || 'Veriler yüklenemedi');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user.id]);

  useEffect(() => {
    if (loading) return;
    const createdId = location.state?.createdCharacterId;
    if (createdId) {
      if (characters.some((c) => c.id === createdId)) {
        const createdChar = characters.find((c) => c.id === createdId);
        setExpandedChar(createdId);
        setCreatedNotice(`${createdChar?.name || 'Kahraman'} oluşturuldu. Macerayı başlatmak için kartındaki "Yeni Macera" düğmesine bas.`);
      } else {
        loadData();
      }
      navigate('/', { replace: true });
      return;
    }

  }, [loading, location.state, characters, navigate]);

  const handleDelete = async (charId) => {
    setDeleting(true);
    try {
      await deleteCharacter(charId, user.id);
      playDamage();
      setCharacters((prev) => prev.filter((c) => c.id !== charId));
      setDeleteConfirm(null);
    } catch (err) {
      playError();
      setError(err.message || 'Silme başarısız');
    }
    setDeleting(false);
  };

  const handleDeleteSession = async (sessionId, charId) => {
    try {
      await deleteSession(sessionId);
      playClick();
      setSessionMap((prev) => ({
        ...prev,
        [charId]: (prev[charId] || []).filter((s) => s.id !== sessionId),
      }));
    } catch (err) {
      playError();
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  return (
    <div
      className="stone-bg"
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}
    >
      <Particles type="ember" count={10} />

      {/* Header */}
      <div
        style={{
          padding: '1.25rem 1rem 1rem',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(26,21,16,0.85)',
          backdropFilter: 'blur(6px)',
          flexShrink: 0,
        }}
        className="pt-safe"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1
              className="font-fantasy gold-shimmer"
              style={{
                fontSize: '1.4rem',
                letterSpacing: '0.1em',
                textShadow: '0 0 14px rgba(201,150,58,0.5)',
                margin: 0,
              }}
            >
              KADER'İN SESİ
            </h1>
            <p
              style={{
                color: 'var(--text-dim)',
                fontFamily: "'Crimson Text', serif",
                fontSize: '0.85rem',
                margin: '0.15rem 0 0',
              }}
            >
              Hoş geldin,{' '}
              <span style={{ color: 'var(--gold2)' }}>{user.username}</span>
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onLogout}
            className="btn-dark"
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem' }}
          >
            Çıkış
          </motion.button>
        </div>
        {/* Nav row */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { playClick(); navigate('/hall-of-fame'); }}
            className="btn-dark"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', minHeight: '36px' }}
          >
            Onur Listesi
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { playClick(); navigate('/settings'); }}
            className="btn-dark"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', minHeight: '36px' }}
          >
            Ayarlar
          </motion.button>
          {isAdmin && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { playClick(); navigate('/admin'); }}
              className="btn-dark"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', minHeight: '36px', borderColor: 'var(--gold)', color: 'var(--gold)' }}
            >
              Tanrı Modu
            </motion.button>
          )}
        </div>

      </div>

      <AnnouncementsBar />

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', paddingBottom: '2rem' }}>
        {/* Section header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <h2
            className="font-fantasy"
            style={{ color: 'var(--text)', fontSize: '1.1rem', margin: 0 }}
          >
            Kahramanlarım
          </h2>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { playClick(); navigate('/create-character'); }}
            className="btn-gold"
            style={{ fontSize: '0.8rem', padding: '0.45rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Sparkles size={14} /> Yeni Kahraman
          </motion.button>
        </div>

        {/* Error banner */}
        {createdNotice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: '0.6rem 0.8rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              background: 'rgba(74,222,128,0.1)',
              border: '1px solid rgba(74,222,128,0.35)',
              color: '#4ade80',
              fontFamily: "'Crimson Text', serif",
              fontSize: '0.9rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span>{createdNotice}</span>
            <button
              onClick={() => setCreatedNotice('')}
              style={{
                background: 'none',
                border: '1px solid rgba(74,222,128,0.45)',
                color: '#4ade80',
                borderRadius: '6px',
                padding: '0.2rem 0.5rem',
                cursor: 'pointer',
                fontFamily: "'Crimson Text', serif",
                fontSize: '0.8rem',
              }}
            >
              Tamam
            </button>
          </motion.div>
        )}

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: '0.6rem 0.8rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              background: 'rgba(122,21,21,0.15)',
              border: '1px solid rgba(122,21,21,0.4)',
              color: 'var(--blood)',
              fontFamily: "'Crimson Text', serif",
              fontSize: '0.9rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{error}</span>
            <button
              onClick={loadData}
              style={{
                background: 'none',
                border: '1px solid var(--blood)',
                color: 'var(--blood)',
                borderRadius: '6px',
                padding: '0.2rem 0.6rem',
                cursor: 'pointer',
                fontFamily: "'Crimson Text', serif",
                fontSize: '0.8rem',
              }}
            >
              Tekrar Dene
            </button>
          </motion.div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-dim)' }}>
            <div style={{ marginBottom: '1rem', animation: 'spin 1.5s linear infinite', display: 'flex', justifyContent: 'center' }}><Swords size={40} /></div>
            <p style={{ fontFamily: "'Crimson Text', serif" }}>Yükleniyor...</p>
          </div>
        ) : characters.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '4rem 1rem' }}
          >
            <div className="animate-float" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', color: 'var(--gold)' }}><Castle size={56} /></div>
            <p style={{ color: 'var(--text)', fontFamily: "'Crimson Text', serif", fontSize: '1.1rem', marginBottom: '0.4rem' }}>
              Henüz kahramanın yok
            </p>
            <p style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Efsaneni yazmaya hazır mısın?
            </p>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { playClick(); navigate('/create-character'); }}
              className="btn-gold"
              style={{ fontSize: '1rem', padding: '0.75rem 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Swords size={18} /> İlk Kahramanını Yarat
            </motion.button>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {characters.map((char, i) => {
              const hpPct = Math.max(0, Math.min(100, (char.hp / char.max_hp) * 100));
              const hpColorClass = hpPct <= 20 ? 'hp-bar-critical' : hpPct <= 50 ? 'hp-bar-warn' : 'hp-bar-safe';
              const sessions = sessionMap[char.id] || [];
              const isExpanded = expandedChar === char.id;
              const isDead = char.status === 'dead';

              return (
                <motion.div
                  key={char.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="stone-card"
                  style={{
                    padding: '1rem',
                    opacity: isDead ? 0.5 : 1,
                    filter: isDead ? 'grayscale(0.7)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                    {/* Race portrait */}
                    <div
                      style={{
                        width: '3.5rem',
                        height: '3.5rem',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: '1px solid rgba(92,74,42,0.6)',
                        background: 'rgba(0,0,0,0.4)',
                      }}
                    >
                      <img
                        src={RACE_PORTRAITS[char.race] || '/races/insan.svg'}
                        alt={char.race}
                        style={{
                          width: '100%', height: '100%', objectFit: 'cover',
                          filter: isDead ? 'grayscale(1)' : 'none',
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h3 className="font-fantasy gold-text" style={{ fontSize: '1.05rem', margin: 0 }}>
                          {char.name}
                        </h3>
                        <span
                          style={{
                            background: 'rgba(201,150,58,0.18)',
                            border: '1px solid var(--border)',
                            color: 'var(--gold)',
                            fontFamily: "'Cinzel', serif",
                            fontSize: '0.6rem',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '20px',
                          }}
                        >
                          Sv.{char.level}
                        </span>
                        {isDead && (
                          <span style={{ color: 'var(--blood)', fontSize: '0.65rem', fontFamily: "'Cinzel', serif", display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Skull size={11} /> DÜŞTÜ
                          </span>
                        )}
                      </div>
                      <p style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.85rem', margin: '0.15rem 0 0' }}>
                        {char.race} · {char.class}
                      </p>
                    </div>

                    {/* HP + Gold */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ color: 'var(--blood)', fontFamily: "'Crimson Text', serif", fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Heart size={13} /> {char.hp}/{char.max_hp}
                      </div>
                      <div style={{ color: 'var(--gold)', fontFamily: "'Crimson Text', serif", fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                        <Coins size={12} /> {char.gold}
                      </div>
                    </div>
                  </div>

                  {/* HP Bar */}
                  <div
                    style={{
                      marginTop: '0.75rem',
                      background: 'rgba(0,0,0,0.4)',
                      borderRadius: '99px',
                      height: '6px',
                      overflow: 'hidden',
                    }}
                  >
                    <div className={`hp-bar ${hpColorClass}`} style={{ width: `${hpPct}%`, height: '100%', borderRadius: '99px' }} />
                  </div>

                  {/* Sessions list */}
                  {sessions.length > 0 && (
                    <div style={{ marginTop: '0.65rem' }}>
                      <button
                        onClick={() => { playClick(); setExpandedChar(isExpanded ? null : char.id); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-dim)',
                          fontFamily: "'Crimson Text', serif",
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▶</span>
                        {sessions.length} Macera
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden', marginTop: '0.4rem' }}
                          >
                            {sessions.map((s) => (
                              <div
                                key={s.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0.4rem 0.5rem',
                                  borderRadius: '6px',
                                  background: 'rgba(0,0,0,0.2)',
                                  marginBottom: '0.3rem',
                                }}
                              >
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{
                                    color: 'var(--text)',
                                    fontFamily: "'Crimson Text', serif",
                                    fontSize: '0.82rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                  }}>
                                    <ScrollText size={12} style={{ flexShrink: 0 }} /> {s.title || s.scenario || 'Macera'}
                                  </div>
                                  <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', fontFamily: "'Crimson Text', serif" }}>
                                    {formatDate(s.updated_at || s.created_at)}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                                  <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => { playClick(); navigate(`/game/${s.id}?characterId=${char.id}`); }}
                                    className="btn-gold"
                                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                                  >
                                    Devam
                                  </motion.button>
                                  <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => handleDeleteSession(s.id, char.id)}
                                    style={{
                                      background: 'rgba(122,21,21,0.2)',
                                      border: '1px solid rgba(122,21,21,0.4)',
                                      color: 'var(--blood)',
                                      borderRadius: '6px',
                                      fontSize: '0.72rem',
                                      padding: '0.3rem 0.5rem',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <X size={12} />
                                  </motion.button>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
                    {!isDead && (
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => { playClick(); navigate(`/scenario/${char.id}`); }}
                        className="btn-gold"
                        style={{ flex: 1, fontSize: '0.85rem', padding: '0.55rem 0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      >
                        <Dices size={16} /> Yeni Macera
                      </motion.button>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { playClick(); navigate(`/character/${char.id}`); }}
                      className="btn-dark"
                      style={{ padding: '0.55rem 0.8rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <ScrollText size={16} />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { playClick(); setDeleteConfirm(char.id); }}
                      style={{
                        background: 'rgba(122,21,21,0.15)',
                        border: '1px solid rgba(122,21,21,0.4)',
                        color: 'var(--blood)',
                        borderRadius: '8px',
                        padding: '0.55rem 0.7rem',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
            onClick={() => !deleting && setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="stone-card"
              style={{ padding: '1.5rem', maxWidth: '20rem', width: '100%', textAlign: 'center' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center', color: 'var(--blood)' }}><Skull size={40} /></div>
              <h3
                className="font-fantasy"
                style={{ color: 'var(--blood)', fontSize: '1rem', margin: '0 0 0.5rem' }}
              >
                Kahramanı Sil?
              </h3>
              <p style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.9rem', marginBottom: '1rem' }}>
                {characters.find((c) => c.id === deleteConfirm)?.name} ve tüm maceraları kalıcı olarak silinecek.
              </p>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setDeleteConfirm(null)}
                  className="btn-dark"
                  disabled={deleting}
                  style={{ flex: 1, fontSize: '0.9rem', padding: '0.5rem 0' }}
                >
                  Vazgeç
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    background: 'rgba(155,32,32,0.25)',
                    border: '1px solid rgba(155,32,32,0.6)',
                    color: '#ff6b6b',
                    fontFamily: "'Cinzel', serif",
                    fontSize: '0.9rem',
                    padding: '0.5rem 0',
                    borderRadius: '8px',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.5 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {deleting ? '...' : (<><Skull size={15} /> Sil</>)}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
