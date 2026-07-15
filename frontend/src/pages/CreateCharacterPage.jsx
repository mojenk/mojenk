import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createCharacter } from '../utils/api';
import { showInterstitialAd } from '../utils/ads';
import { playClick, playMagic } from '../utils/sounds';
import Particles from '../components/Particles';
import { ScrollText, Check, Target, AlertTriangle, Swords, Sword } from 'lucide-react';
import { ClassIcon, StatIcon } from '../utils/icons';

const RACES = [
  { name: 'İnsan', image: '/races/insan.svg', desc: 'Uyarlanabilir ve kararlı, her mesleğe elverişli.' },
  { name: 'Elf', image: '/races/elf.svg', desc: 'Uzun ömürlü, zarif ve doğayla iç içe. Çeviklik bonusu.' },
  { name: 'Cüce', image: '/races/cuce.svg', desc: 'Dayanıklı, gururlu ve madenlerin ustadı. Anayasa bonusu.' },
  { name: 'Yarı-Ork', image: '/races/yariork.svg', desc: 'Vahşi güç ve savaş azmi. Güç ve anayasa bonusu.' },
  { name: 'Hobit', image: '/races/hobit.svg', desc: 'Küçük, sessiz ve şanslı. Çeviklik ve karizma bonusu.' },
  { name: 'İblissoyu', image: '/races/iblissoyu.svg', desc: 'Cehennem izi taşıyan gizemli yarı-insan. Zeka ve karizma bonusu.' },
];

const CLASSES = [
  { name: 'Savaşçı', desc: 'Güçlü dövüşçü, her silahı kullanabilir' },
  { name: 'Büyücü', desc: 'Güçlü büyüler, ama zayıf zırh' },
  { name: 'Hırsız', desc: 'Gizlilik ve hile ustası' },
  { name: 'Rahip', desc: 'İyileştirici ve ilahi büyü kullanıcısı' },
  { name: 'Avcı', desc: 'Uzak mesafe ve iz sürme uzmanı' },
  { name: 'Barbar', desc: 'Öfkeli savaşçı, en yüksek HP' },
];

const RACE_BONUSES = {
  'İnsan': { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
  'Elf': { dexterity: 2, wisdom: 1 },
  'Cüce': { constitution: 2, strength: 1 },
  'Yarı-Ork': { strength: 2, constitution: 1 },
  'Hobit': { dexterity: 2, charisma: 1 },
  'İblissoyu': { charisma: 2, intelligence: 1 },
};

const CLASS_BONUSES = {
  Savaşçı: { strength: 1 },
  Büyücü: { intelligence: 1 },
  Hırsız: { dexterity: 1 },
  Rahip: { wisdom: 1 },
  Avcı: { dexterity: 1 },
  Barbar: { strength: 1 },
};

const BASE_STATS = {
  Savaşçı: { strength: 15, dexterity: 12, constitution: 14, intelligence: 8, wisdom: 10, charisma: 8 },
  Büyücü: { strength: 8, dexterity: 14, constitution: 10, intelligence: 15, wisdom: 12, charisma: 8 },
  Hırsız: { strength: 8, dexterity: 15, constitution: 12, intelligence: 13, wisdom: 10, charisma: 10 },
  Rahip: { strength: 12, dexterity: 8, constitution: 13, intelligence: 10, wisdom: 15, charisma: 10 },
  Avcı: { strength: 12, dexterity: 15, constitution: 13, intelligence: 10, wisdom: 12, charisma: 8 },
  Barbar: { strength: 15, dexterity: 13, constitution: 14, intelligence: 8, wisdom: 10, charisma: 8 },
};

// D&D 5e Point-Buy maliyet tablosu
const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const TOTAL_POINTS = 27;

function calcPointsUsed(st) {
  return Object.values(st).reduce((sum, v) => sum + (POINT_COST[v] ?? 0), 0);
}

function canIncrease(st, key) {
  if (st[key] >= 15) return false;
  const nextVal = st[key] + 1;
  const currentUsed = calcPointsUsed(st);
  const currentCost = POINT_COST[st[key]] ?? 0;
  const nextCost = POINT_COST[nextVal] ?? 0;
  return currentUsed - currentCost + nextCost <= TOTAL_POINTS;
}

function canDecrease(st, key) {
  return st[key] > 8;
}

const STAT_ROWS = [
  { key: 'strength', label: 'Güç' },
  { key: 'dexterity', label: 'Çeviklik' },
  { key: 'constitution', label: 'Anayasa' },
  { key: 'intelligence', label: 'Zeka' },
  { key: 'wisdom', label: 'Bilgelik' },
  { key: 'charisma', label: 'Karizma' },
];

const SUGGESTED_NAMES = ['Aragorn', 'Gandalf', 'Legolas', 'Drizzt', 'Elminster', 'Lyra'];
const STEPS = ['İsim', 'Irk', 'Sınıf', 'Özellikler'];

const RACE_BACKSTORIES = {
  'İnsan': [
    { id: 'noble', label: 'Düşmüş Asil', desc: 'Bir zamanlar güçlü bir ailenin varisi olan karakter, siyasi bir komplo yüzünden her şeyini kaybetti. Sürgün hayatı yaşıyor, bir gün tahtını geri almak için mücadele ediyor.' },
    { id: 'soldier', label: 'Emekli Asker', desc: 'Büyük Savaş\'tan sağ kurtulan eski bir asker. Savaşın dehşetini yakından gören karakter, artık huzur arıyor ama geçmişin hayaletleri yakasını bırakmıyor.' },
    { id: 'orphan', label: 'Yetim Sokak Çocuğu', desc: 'Şehrin arka sokaklarında büyümüş, hayatta kalmayı kendi başına öğrenmiş bir yetim. Hırsızlık yaparak geçimini sağladı, ama kalbinde daha büyük bir kader olduğunu hissediyor.' },
  ],
  'Elf': [
    { id: 'exile', label: 'Sürgün Elf', desc: 'Elf topluluğundan kovulmuş bir sürgün. Yasak bir büyüye dokunduğu için ya da bir insan sevdiği için halkından ayrılmak zorunda kaldı. Yüzyıllık yalnızlığın izini taşıyor.' },
    { id: 'guardian', label: 'Orman Koruyucusu', desc: 'Antik ormanın son koruyucularından biri. Ağaçlar kesilir, orman yok edilirken doğanın son umudu olarak mücadele ediyor. Doğanın dilini konuşuyor.' },
    { id: 'scholar', label: 'Bilge Kaşif', desc: 'Yüzlerce yıl kütüphanelerde bilgi biriktirmiş, artık teorileri pratiğe dökmek isteyen meraklı bir Elf. Eski haritalar ve kayıp medeniyetler peşinde.' },
  ],
  'Cüce': [
    { id: 'smith', label: 'Usta Demirci', desc: 'Nesillerdir aktarılan demircilik geleneğinin son temsilcisi. Efsanevi bir silah yaratmak için nadir malzemeler peşinde dolaşıyor. Çekici onun en iyi arkadaşı.' },
    { id: 'miner', label: 'Kayıp Maden Kaşifi', desc: 'Derinlerde kazarken lanetli bir maden damarı keşfetti. Tüm iş arkadaşları kayboldu, tek başına yüzeye çıktı. Derinlerdeki sırrı çözmek için geri dönmesi gerekiyor.' },
    { id: 'merchant', label: 'Tüccar Cüce', desc: 'Madencilik yerine ticareti seçen isyankar bir Cüce. Klanı tarafından dışlanmış, ama tüm dünyayı dolaşarak zenginleşmiş. Altın kadar değerli bağlantıları var.' },
  ],
  'Yarı-Ork': [
    { id: 'chieftain', label: 'Kabile Lideri', desc: 'Kabilenin en güçlüsü olarak liderliği kazandı ama dış dünyayla barış yapmak istediği için kendi kabilesi tarafından ihanete uğradı. Tek başına yeni bir yol arıyor.' },
    { id: 'gladiator', label: 'Arena Gladyatörü', desc: 'Esir düşüp gladyatör arenesinde savaşmaya zorlandı. Yıllar sonra özgürlüğünü kazandı ama arena\'nın alkışları hala kulaklarında çınlıyor.' },
    { id: 'halfblood', label: 'İki Dünya Arası', desc: 'Ne insanlar ne de orklar tarafından kabul edildi. İki dünyanın arasında kalmış, kendi kimliğini arıyor. Hem güç hem de merhamet arasında denge kurma çabasında.' },
  ],
  'Hobit': [
    { id: 'cook', label: 'Gezgin Aşçı', desc: 'Dünyanın en iyi yemeklerini tatmak ve pişirmek için evini terk eden meraklı bir aşçı. Sırt çantasında tencere, tavası ve baharat koleksiyonu var.' },
    { id: 'curious', label: 'Meraklı Kaşif', desc: 'Shire\'ın sıkıcı hayatından bunalmış, "dışarıda ne var?" sorusunun peşine düşmüş cesur bir Hobit. Büyük maceralara atılan nadir Hobitlerden biri.' },
    { id: 'thief', label: 'Şanslı Hırsız', desc: 'Doğuştan gelen şans ve sessizlik yeteneğini kullanarak ünlü bir hazine avcısı olmuş. Hiç yakalanmadı — şimdiye kadar. Son işi onu beklemediği bir maceraya sürükledi.' },
  ],
  'İblissoyu': [
    { id: 'cultist', label: 'Tövbekar Kültist', desc: 'Bir zamanlar karanlık bir kültün üyesiydi. Gördüğü dehşetler sonrası kültü terk etti ama lanetli güçler hala damarlarında akıyor. Geçmişinin peşini bırakmasını bekliyor.' },
    { id: 'noble_outcast', label: 'Maskeli Asil', desc: 'Şeytan kanını gizleyen maskeli bir asil. Toplumda saygın bir konumu var ama gerçek kimliği ortaya çıkarsa her şeyini kaybedecek. Çifte hayat yaşıyor.' },
    { id: 'wanderer', label: 'Lanetli Gezgin', desc: 'Cehennem kanının lanetini kırmak için diyar diyar dolaşıyor. Her yerde önyargıyla karşılaşıyor, ama yardım ettiği insanlar onun gerçek doğasını görüyor.' },
  ],
};

export default function CreateCharacterPage({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [race, setRace] = useState('');
  const [charClass, setCharClass] = useState('');
  const [stats, setStats] = useState({
    strength: 10, dexterity: 10, constitution: 10,
    intelligence: 10, wisdom: 10, charisma: 10,
  });
  const [background, setBackground] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClassSelect = (cls) => {
    setCharClass(cls);
    setStats(BASE_STATS[cls]);
  };

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const currentUser = (() => {
        try {
          return user?.id ? user : JSON.parse(localStorage.getItem('dnd_user') || 'null');
        } catch {
          return user?.id ? user : null;
        }
      })();
      if (!(currentUser?.uid || currentUser?.firebase_uid || currentUser?.id)) {
        throw new Error('Kullanıcı bilgisi alınamadı');
      }
      const data = await createCharacter({
        name, race, charClass,
        ...stats, background,
      });
      if (data.character) {
        await showInterstitialAd();
        navigate('/', { replace: true, state: { createdCharacterId: data.character.id } });
      }
      else setError(data.error || 'Hata oluştu');
    } catch (err) {
      setError(err.message || 'Karakter oluşturulamadı');
    }
    setLoading(false);
  };

  const canNext = [
    name.trim().length >= 2,
    !!race,
    !!charClass,
    true,
  ][step];

  const adjustStat = (key, delta) => {
    setStats((s) => {
      if (delta > 0 && !canIncrease(s, key)) return s;
      if (delta < 0 && !canDecrease(s, key)) return s;
      return { ...s, [key]: s[key] + delta };
    });
  };

  const pointsUsed = calcPointsUsed(stats);
  const pointsLeft = TOTAL_POINTS - pointsUsed;

  // Calculate preview of final stats with race/class bonuses
  const previewBonus = (key) =>
    ((RACE_BONUSES[race] || {})[key] || 0) + ((CLASS_BONUSES[charClass] || {})[key] || 0);
  const finalStat = (key) => Math.min(20, stats[key] + previewBonus(key));

  return (
    <div
      className="stone-bg"
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}
    >
      <Particles type="magic" count={8} />
      <div
        style={{
          padding: '1.1rem 1rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexShrink: 0,
          borderBottom: '1px solid var(--border)',
        }}
        className="pt-safe"
      >
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => (step > 0 ? setStep((s) => s - 1) : navigate('/'))}
          className="btn-dark"
          style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', flexShrink: 0 }}
        >
          ←
        </motion.button>
        <div>
          <h1
            className="font-fantasy gold-text"
            style={{ fontSize: '1.15rem', margin: 0, letterSpacing: '0.08em' }}
          >
            Kahraman Yarat
          </h1>
          <p
            style={{
              color: 'var(--text-dim)',
              fontFamily: "'Crimson Text', serif",
              fontSize: '0.78rem',
              margin: 0,
            }}
          >
            {step + 1}/{STEPS.length} · {STEPS[step]}
          </p>
        </div>
      </div>

      {/* Step progress bars */}
      <div
        style={{
          display: 'flex',
          gap: '0.35rem',
          padding: '0.75rem 1rem',
          flexShrink: 0,
        }}
      >
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={i <= step ? 'step-bar done' : 'step-bar'}
            style={{ flex: 1 }}
          />
        ))}
      </div>

      {/* Step content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem' }}>
        <AnimatePresence mode="wait">
          {/* STEP 0 — Name */}
          {step === 0 && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ textAlign: 'center', margin: '1.5rem 0 1.25rem' }}>
                <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', color: 'var(--gold2)' }}>
                  <ScrollText size={52} />
                </div>
                <h2
                  className="font-fantasy gold-text"
                  style={{ fontSize: '1.4rem', margin: 0 }}
                >
                  Kahramanının Adı
                </h2>
                <p
                  style={{
                    color: 'var(--text-dim)',
                    fontFamily: "'Crimson Text', serif",
                    fontSize: '0.9rem',
                    marginTop: '0.3rem',
                  }}
                >
                  Bu isim efsanelere yazılacak
                </p>
              </div>

              <input
                className="input-dark"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Adını gir..."
                maxLength={30}
                autoFocus
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  fontSize: '1.2rem',
                  textAlign: 'center',
                  padding: '0.85rem 1rem',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginTop: '1rem',
                  justifyContent: 'center',
                }}
              >
                {SUGGESTED_NAMES.map((n) => (
                  <motion.button
                    key={n}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setName(n)}
                    className="quick-chip"
                  >
                    {n}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 1 — Race */}
          {step === 1 && (
            <motion.div
              key="race"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <h2
                className="font-fantasy gold-text"
                style={{ fontSize: '1.3rem', textAlign: 'center', margin: '1.25rem 0 1rem' }}
              >
                Irk Seç
              </h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                {RACES.map((r) => (
                  <motion.button
                    key={r.name}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setRace(r.name)}
                    className={`select-card${race === r.name ? ' active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        width: '3.2rem',
                        height: '3.2rem',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: race === r.name ? '2px solid var(--gold2)' : '2px solid transparent',
                        boxShadow: race === r.name ? '0 0 12px rgba(201,150,58,0.35)' : 'none',
                      }}
                    >
                      <img
                        src={r.image}
                        alt={r.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="font-fantasy"
                        style={{
                          color: race === r.name ? 'var(--gold2)' : 'var(--text)',
                          fontSize: '0.95rem',
                          fontWeight: 700,
                        }}
                      >
                        {r.name}
                      </div>
                      <div
                        style={{
                          color: 'var(--text-dim)',
                          fontFamily: "'Crimson Text', serif",
                          fontSize: '0.78rem',
                          marginTop: '0.1rem',
                          lineHeight: 1.35,
                        }}
                      >
                        {r.desc}
                      </div>
                    </div>
                    {race === r.name && (
                      <Check size={18} color="var(--gold2)" style={{ flexShrink: 0 }} />
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Race Backstory Selection */}
              {race && RACE_BACKSTORIES[race] && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: '1rem' }}
                >
                  <h3
                    className="font-fantasy"
                    style={{
                      color: 'var(--gold)',
                      fontSize: '0.95rem',
                      textAlign: 'center',
                      margin: '0 0 0.5rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Geçmiş Hikayesi Seç
                  </h3>
                  <p style={{
                    color: 'var(--text-dim)',
                    fontFamily: "'Crimson Text', serif",
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    marginBottom: '0.6rem',
                  }}>
                    AI bu geçmişe göre hikayeyi şekillendirecek
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {RACE_BACKSTORIES[race].map((bs) => {
                      const isSelected = background === bs.desc;
                      return (
                        <motion.button
                          key={bs.id}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setBackground(isSelected ? '' : bs.desc)}
                          className={`select-card${isSelected ? ' active' : ''}`}
                          style={{
                            padding: '0.65rem 0.85rem',
                            textAlign: 'left',
                            width: '100%',
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}>
                            <span className="font-fantasy" style={{
                              color: isSelected ? 'var(--gold2)' : 'var(--text)',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                            }}>
                              {bs.label}
                            </span>
                            {isSelected && <Check size={16} color="var(--gold2)" />}
                          </div>
                          <div style={{
                            color: 'var(--text-dim)',
                            fontFamily: "'Crimson Text', serif",
                            fontSize: '0.75rem',
                            marginTop: '0.2rem',
                            lineHeight: 1.4,
                          }}>
                            {bs.desc}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* STEP 2 — Class */}
          {step === 2 && (
            <motion.div
              key="class"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <h2
                className="font-fantasy gold-text"
                style={{ fontSize: '1.3rem', textAlign: 'center', margin: '1.25rem 0 1rem' }}
              >
                Sınıf Seç
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {CLASSES.map((c) => {
                  const Icon = ClassIcon[c.name] || Sword;
                  return (
                  <motion.button
                    key={c.name}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleClassSelect(c.name)}
                    className={`select-card${charClass === c.name ? ' active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '0.85rem 1rem',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <div style={{ flexShrink: 0, display: 'flex', color: charClass === c.name ? 'var(--gold2)' : 'var(--text)' }}>
                      <Icon size={28} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        className="font-fantasy"
                        style={{
                          color: charClass === c.name ? 'var(--gold2)' : 'var(--text)',
                          fontSize: '0.95rem',
                          fontWeight: 700,
                        }}
                      >
                        {c.name}
                      </div>
                      <div
                        style={{
                          color: 'var(--text-dim)',
                          fontFamily: "'Crimson Text', serif",
                          fontSize: '0.82rem',
                          marginTop: '0.1rem',
                        }}
                      >
                        {c.desc}
                      </div>
                    </div>
                    {charClass === c.name && (
                      <Check size={18} color="var(--gold2)" style={{ flexShrink: 0 }} />
                    )}
                  </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 3 — Stats */}
          {step === 3 && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <h2
                className="font-fantasy gold-text"
                style={{ fontSize: '1.3rem', textAlign: 'center', margin: '1.25rem 0 0.5rem' }}
              >
                Özellikler
              </h2>
              {/* Points remaining */}
              <div
                style={{
                  textAlign: 'center',
                  marginBottom: '0.85rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  background: pointsLeft > 0 ? 'rgba(201,150,58,0.12)' : 'rgba(74,222,128,0.1)',
                  border: `1px solid ${pointsLeft > 0 ? 'rgba(201,150,58,0.4)' : 'rgba(74,222,128,0.3)'}`,
                }}
              >
                <span style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.75rem',
                  color: pointsLeft > 0 ? 'var(--gold)' : '#4ade80',
                  letterSpacing: '0.06em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}>
                  <Target size={15} /> Kalan Puan: <strong style={{ fontSize: '1rem' }}>{pointsLeft}</strong> / {TOTAL_POINTS}
                </span>
              </div>

              <div
                className="stone-card"
                style={{ padding: '0.75rem 1rem', marginBottom: '0.85rem' }}
              >
                {STAT_ROWS.map((row, idx) => {
                  const Icon = StatIcon[row.key] || Sword;
                  return (
                  <div
                    key={row.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0',
                      borderBottom:
                        idx < STAT_ROWS.length - 1
                          ? '1px solid rgba(92,74,42,0.3)'
                          : 'none',
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--text)',
                        fontFamily: "'Crimson Text', serif",
                        fontSize: '0.95rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <Icon size={17} /> {row.label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => adjustStat(row.key, -1)}
                        className="stat-btn"
                        disabled={!canDecrease(stats, row.key)}
                        style={{ opacity: canDecrease(stats, row.key) ? 1 : 0.3 }}
                      >
                        −
                      </motion.button>
                      <span
                        className="font-fantasy gold-text"
                        style={{ fontSize: '1rem', minWidth: '1.5rem', textAlign: 'center' }}
                      >
                        {stats[row.key]}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => adjustStat(row.key, 1)}
                        className="stat-btn"
                        disabled={!canIncrease(stats, row.key)}
                        style={{ opacity: canIncrease(stats, row.key) ? 1 : 0.3 }}
                      >
                        +
                      </motion.button>
                      {(race || charClass) && (
                        <span
                          style={{
                            color: 'var(--gold2)',
                            fontFamily: "'Cinzel', serif",
                            fontSize: '0.65rem',
                            minWidth: '1.4rem',
                            textAlign: 'center',
                            opacity: previewBonus(row.key) ? 1 : 0,
                          }}
                        >
                          {previewBonus(row.key) > 0 ? `+${previewBonus(row.key)}` : ''}
                        </span>
                      )}
                      <span style={{
                        color: 'var(--text-dim)',
                        fontFamily: "'Crimson Text', serif",
                        fontSize: '0.7rem',
                        minWidth: '1.2rem',
                      }}>
                        {Math.floor((stats[row.key] - 10) / 2) >= 0 ? '+' : ''}{Math.floor((stats[row.key] - 10) / 2)}
                      </span>
                    </div>
                  </div>
                  );
                })}
              </div>

              <textarea
                className="input-dark"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                placeholder="Geçmiş hikayesi (isteğe bağlı)..."
                rows={3}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  resize: 'none',
                  fontFamily: "'Crimson Text', serif",
                  fontSize: '0.95rem',
                }}
              />

              {error && (
                <p
                  style={{
                    color: 'var(--blood)',
                    fontFamily: "'Crimson Text', serif",
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    marginTop: '0.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    width: '100%',
                  }}
                >
                  <AlertTriangle size={15} /> {error}
                </p>
              )}

              {/* Final stats preview summary */}
              {(race || charClass) && (
                <div
                  className="stone-card"
                  style={{
                    marginTop: '0.85rem',
                    padding: '0.6rem 0.8rem',
                    background: 'rgba(201,150,58,0.08)',
                    border: '1px solid rgba(201,150,58,0.25)',
                  }}
                >
                  <div
                    style={{
                      color: 'var(--gold2)',
                      fontFamily: "'Cinzel', serif",
                      fontSize: '0.7rem',
                      letterSpacing: '0.06em',
                      marginBottom: '0.35rem',
                      textAlign: 'center',
                    }}
                  >
                    Nihai Özellikler
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.3rem',
                      textAlign: 'center',
                    }}
                  >
                    {STAT_ROWS.map((row) => {
                      const bonus = previewBonus(row.key);
                      return (
                        <div key={row.key}>
                          <span
                            style={{
                              color: bonus ? 'var(--gold2)' : 'var(--text-dim)',
                              fontFamily: "'Crimson Text', serif",
                              fontSize: '0.8rem',
                            }}
                          >
                            {row.label}: {finalStat(row.key)}
                            {bonus > 0 && (
                              <span style={{ color: 'var(--gold2)', fontSize: '0.65rem', marginLeft: '0.15rem' }}>
                                +{bonus}
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom button */}
      <div
        style={{
          padding: '1rem',
          flexShrink: 0,
          borderTop: '1px solid var(--border)',
          background: 'rgba(26,21,16,0.9)',
        }}
        className="pb-safe"
      >
        <motion.button
          whileTap={{ scale: 0.96 }}
          disabled={!canNext || loading}
          onClick={() => { playClick(); step < 3 ? setStep((s) => s + 1) : handleCreate(); }}
          className="btn-gold"
          style={{
            width: '100%',
            fontSize: '1rem',
            padding: '0.85rem',
            opacity: !canNext || loading ? 0.45 : 1,
            cursor: !canNext || loading ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
          }}
        >
          {loading
            ? '⏳ Oluşturuluyor...'
            : step < 3
            ? 'Devam Et →'
            : (<><Swords size={16} /> Kahramanı Yarat!</>)}
        </motion.button>
      </div>
    </div>
  );
}
