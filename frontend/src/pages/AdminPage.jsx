import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  adminListCharacters, adminCheatCharacter, adminUpdateCharacter, adminDeleteCharacter,
  adminListUsers, adminToggleUserPremium, adminUpdateUserSuspension, adminSendTestPush,
  adminListAnnouncements, adminCreateAnnouncement, adminToggleAnnouncement, adminDeleteAnnouncement,
  adminListWorldEvents, adminCreateWorldEvent, adminToggleWorldEvent, adminDeleteWorldEvent,
  adminGetStats, adminGetSettings, adminUpdateSettings,
  adminListItems, adminUpdateItem, adminCreateItem, adminListContent,
} from '../utils/api';
import { playClick, playMagic } from '../utils/sounds';
import {
  Shield, Users, Megaphone, Globe, Search, Trash2, Save, Plus, ChevronLeft, Power,
  Skull, Heart, Coins, Star, Sword, Package, Crown, Calendar, BarChart3, SlidersHorizontal,
  BookOpen, Bell, Activity, TrendingUp, RotateCcw, User, Gem, Scroll, Map, X,
} from 'lucide-react';

const RACES = [
  'İnsan', 'Elf', 'Cüce', 'Yarı-Ork', 'Hobit', 'İblissoyu', 'Gnom', 'Ejderha Doğumlu', 'Melek Soylu',
];
const CLASSES = ['Savaşçı', 'Büyücü', 'Hırsız', 'Rahip', 'Avcı', 'Barbar'];
const STATS = [
  { key: 'strength', label: 'Güç' },
  { key: 'dexterity', label: 'Çeviklik' },
  { key: 'constitution', label: 'Dayanıklılık' },
  { key: 'intelligence', label: 'Zeka' },
  { key: 'wisdom', label: 'Bilgelik' },
  { key: 'charisma', label: 'Karizma' },
];
const ITEM_PRESETS = [
  { id: 'small_healing_potion', name: 'Küçük İksir', description: '2d4+2 iyileştirir', type: 'potion', value: 25 },
  { id: 'great_healing_potion', name: 'Büyük İksir', description: '4d4+4 iyileştirir', type: 'potion', value: 75 },
  { id: 'gold_bag', name: 'Altın Torbası', description: '100 altın', type: 'misc', value: 100 },
];
const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const ITEM_TYPES = ['weapon', 'armor', 'potion', 'misc', 'scroll', 'accessory'];
const CONTENT_SUBTABS = [
  { id: 'scenarios', label: 'Senaryolar', icon: Scroll },
  { id: 'races', label: 'Irklar', icon: User },
  { id: 'classes', label: 'Sınıflar', icon: Shield },
  { id: 'items', label: 'Eşyalar', icon: Package },
];
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'characters', label: 'Karakterler', icon: Shield },
  { id: 'users', label: 'Kullanıcılar', icon: Users },
  { id: 'balance', label: 'Oyun Dengesi', icon: SlidersHorizontal },
  { id: 'content', label: 'İçerik', icon: BookOpen },
  { id: 'announcements', label: 'Duyurular', icon: Megaphone },
  { id: 'world-events', label: 'Dünya Olayları', icon: Globe },
];
const DEFAULT_SETTINGS = {
  freeDailyTurns: 40,
  bonusPerAd: 15,
  maxBonusAdsPerDay: 3,
  premiumDailyWheelSpins: 3,
  adRewardGold: 10,
  adRewardXp: 0,
  shopPriceMultiplier: 1,
  goldRewardMin: 2,
  goldRewardMax: 50,
};

function formatLastActive(isoString) {
  if (!isoString) return 'Hiç aktif değil';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Bilinmiyor';
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Şimdi aktif';
  if (diffMins < 60) return `${diffMins} dk önce`;
  if (diffHours < 24) return `${diffHours} sa önce`;
  if (diffDays < 7) return `${diffDays} gün önce`;
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toISODateEnd(dateString) {
  if (!dateString) return null;
  return `${dateString}T23:59:59.999Z`;
}

export default function AdminPage({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const [characters, setCharacters] = useState([]);
  const [users, setUsers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [worldEvents, setWorldEvents] = useState([]);
  const [statsData, setStatsData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [settingsDraft, setSettingsDraft] = useState({});
  const [items, setItems] = useState([]);
  const [contentType, setContentType] = useState('scenarios');
  const [contentList, setContentList] = useState([]);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ race: '', class: '', status: '', minLevel: '' });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const showMessage = useCallback((text, isError = false) => {
    if (isError) setError(text);
    else setMessage(text);
    setTimeout(() => { if (isError) setError(''); else setMessage(''); }, 3500);
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const loadCharacters = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListCharacters({ username: search, ...filters });
      setCharacters(data.characters || []);
    } catch (err) { showMessage(err.message, true); }
    setLoading(false);
  }, [search, filters, showMessage]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await adminListUsers();
      setUsers(data.users || []);
    } catch (err) { showMessage(err.message, true); }
  }, [showMessage]);

  const loadAdminContent = useCallback(async () => {
    try {
      const [aData, eData] = await Promise.all([adminListAnnouncements(), adminListWorldEvents()]);
      setAnnouncements(aData.announcements || []);
      setWorldEvents(eData.events || []);
    } catch (err) { showMessage(err.message, true); }
  }, [showMessage]);

  const loadStats = useCallback(async () => {
    try {
      const data = await adminGetStats();
      setStatsData(data);
    } catch (err) { showMessage(err.message, true); }
  }, [showMessage]);

  const loadSettings = useCallback(async () => {
    try {
      const data = await adminGetSettings();
      const base = data.settings || {};
      setSettings(base);
      setSettingsDraft(base);
    } catch (err) { showMessage(err.message, true); }
  }, [showMessage]);

  const loadItems = useCallback(async () => {
    try {
      const data = await adminListItems();
      setItems(data.items || []);
    } catch (err) { showMessage(err.message, true); }
  }, [showMessage]);

  const loadContent = useCallback(async () => {
    try {
      const data = await adminListContent(contentType);
      setContentList(data[contentType] || data.items || data.races || data.classes || []);
    } catch (err) { showMessage(err.message, true); }
  }, [contentType, showMessage]);

  useEffect(() => { loadCharacters(); }, [loadCharacters]);
  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadAdminContent(); }, [loadAdminContent]);
  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (activeTab === 'balance') loadSettings();
    if (activeTab === 'content') { loadItems(); loadContent(); }
  }, [activeTab, loadSettings, loadItems, loadContent]);

  const handleUpdateCharacter = useCallback(async (id, payload) => {
    try {
      await adminUpdateCharacter(id, payload);
      playMagic();
      showMessage('Karakter güncellendi');
      loadCharacters();
    } catch (err) { showMessage(err.message, true); }
  }, [loadCharacters, showMessage]);

  const handleCheatCharacter = useCallback(async (id, payload) => {
    try {
      await adminCheatCharacter(id, payload);
      playMagic();
      showMessage('Hile işlemi uygulandı');
      loadCharacters();
    } catch (err) { showMessage(err.message, true); }
  }, [loadCharacters, showMessage]);

  const handleDeleteCharacter = useCallback(async (id, name) => {
    if (!window.confirm(`${name} karakterini kalıcı olarak sil?`)) return;
    try {
      await adminDeleteCharacter(id);
      showMessage('Karakter silindi');
      loadCharacters();
    } catch (err) { showMessage(err.message, true); }
  }, [loadCharacters, showMessage]);

  const handleSaveSettings = useCallback(async () => {
    try {
      await adminUpdateSettings(settingsDraft);
      setSettings({ ...settingsDraft });
      showMessage('Oyun dengesi ayarları kaydedildi');
    } catch (err) { showMessage(err.message, true); }
  }, [settingsDraft, showMessage]);

  const handleCreateAnnouncement = useCallback(async (form) => {
    try {
      const result = await adminCreateAnnouncement(form);
      showMessage(`Duyuru yayınlandı · ${result?.pushResult?.sent || 0} cihaza bildirim gönderildi`);
      loadAdminContent();
    } catch (err) { showMessage(err.message, true); }
  }, [loadAdminContent, showMessage]);

  const handleCreateWorldEvent = useCallback(async (form) => {
    try {
      await adminCreateWorldEvent(form);
      showMessage('Dünya olayı başlatıldı');
      loadAdminContent();
    } catch (err) { showMessage(err.message, true); }
  }, [loadAdminContent, showMessage]);

  const handleToggleAnnouncement = useCallback(async (id, active) => {
    try {
      await adminToggleAnnouncement(id, active);
      loadAdminContent();
    } catch (err) { showMessage(err.message, true); }
  }, [loadAdminContent, showMessage]);

  const handleDeleteAnnouncement = useCallback(async (id) => {
    if (!window.confirm('Duyuruyu sil?')) return;
    try {
      await adminDeleteAnnouncement(id);
      loadAdminContent();
    } catch (err) { showMessage(err.message, true); }
  }, [loadAdminContent, showMessage]);

  const handleToggleWorldEvent = useCallback(async (id, active) => {
    try {
      await adminToggleWorldEvent(id, active);
      loadAdminContent();
    } catch (err) { showMessage(err.message, true); }
  }, [loadAdminContent, showMessage]);

  const handleDeleteWorldEvent = useCallback(async (id) => {
    if (!window.confirm('Dünya olayını sil?')) return;
    try {
      await adminDeleteWorldEvent(id);
      loadAdminContent();
    } catch (err) { showMessage(err.message, true); }
  }, [loadAdminContent, showMessage]);

  const handleUpdateItem = useCallback(async (id, data) => {
    try {
      await adminUpdateItem(id, data);
      showMessage('Eşya güncellendi');
      loadItems();
    } catch (err) { showMessage(err.message, true); }
  }, [loadItems, showMessage]);

  const handleCreateItem = useCallback(async (data) => {
    try {
      await adminCreateItem(data);
      showMessage('Eşya eklendi');
      loadItems();
    } catch (err) { showMessage(err.message, true); }
  }, [loadItems, showMessage]);

  const handleTogglePremium = useCallback(async (uid, isPremium, expiresAt) => {
    try {
      await adminToggleUserPremium(uid, isPremium, toISODateEnd(expiresAt));
      showMessage(isPremium ? 'Premium aktif edildi' : 'Premium kaldırıldı');
      loadUsers();
    } catch (err) { showMessage(err.message, true); }
  }, [loadUsers, showMessage]);

  const handleToggleSuspension = useCallback(async (uid, suspended) => {
    try {
      await adminUpdateUserSuspension(uid, suspended, suspended ? 'Yönetici askıya aldı' : '');
      showMessage(suspended ? 'Hesap askıya alındı' : 'Hesap açıldı');
      loadUsers();
    } catch (err) { showMessage(err.message, true); }
  }, [loadUsers, showMessage]);

  const handleSendTestPush = useCallback(async (uid, title, body) => {
    try {
      return await adminSendTestPush(uid, title, body);
    } catch (err) {
      showMessage(err.message, true);
      return { error: err.message };
    }
  }, [showMessage]);

  const header = (
    <header
      style={{
        height: 64,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,8,6,0.85)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Sword size={26} color="var(--gold)" />
        <div>
          <h1 className="font-fantasy gold-text" style={{ margin: 0, fontSize: '1.25rem', lineHeight: 1.2 }}>Tanrı Modu</h1>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.7rem', fontFamily: "'Crimson Text', serif" }}>
            {user?.username || user?.email || 'Yönetici'}
          </p>
        </div>
      </div>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => { playClick(); navigate('/'); }}
        className="btn-dark"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
      >
        <ChevronLeft size={16} /> Geri
      </motion.button>
    </header>
  );

  const navItems = TABS.map((t) => {
    const Icon = t.icon;
    const active = activeTab === t.id;
    const btn = (
      <motion.button
        key={t.id}
        whileTap={{ scale: 0.95 }}
        onClick={() => { playClick(); setActiveTab(t.id); setNavOpen(false); }}
        style={{
          width: isMobile ? 68 : '100%',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: isMobile ? 'center' : 'flex-start',
          gap: isMobile ? '0.15rem' : '0.6rem',
          padding: isMobile ? '0.35rem 0' : '0.65rem 0.85rem',
          borderRadius: 8,
          border: 'none',
          background: active ? 'rgba(201,150,58,0.18)' : 'transparent',
          color: active ? 'var(--gold2)' : 'var(--text-dim)',
          fontFamily: "'Cinzel', serif",
          fontSize: isMobile ? '0.6rem' : '0.8rem',
          cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        <Icon size={isMobile ? 18 : 18} />
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</span>
      </motion.button>
    );
    return btn;
  });

  const sidebar = !isMobile ? (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        background: 'rgba(10,8,6,0.65)',
        display: 'flex',
        flexDirection: 'column',
        padding: '0.75rem',
        gap: '0.35rem',
        overflowY: 'auto',
      }}
    >
      <div className="font-fantasy" style={{ color: 'var(--gold)', fontSize: '0.75rem', padding: '0.5rem 0.6rem' }}>MENÜ</div>
      {navItems}
    </aside>
  ) : null;

  const bottomNav = isMobile ? (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 68,
        background: 'rgba(10,8,6,0.95)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0 0.25rem',
        zIndex: 100,
      }}
    >
      {navItems}
    </nav>
  ) : null;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab stats={statsData} users={users} characters={characters} announcements={announcements} worldEvents={worldEvents} />;
      case 'characters':
        return (
          <CharactersTab
            characters={characters}
            search={search}
            setSearch={setSearch}
            filters={filters}
            setFilters={setFilters}
            loading={loading}
            onUpdate={handleUpdateCharacter}
            onCheat={handleCheatCharacter}
            onDelete={handleDeleteCharacter}
          />
        );
      case 'users':
        return (
          <UsersTab
            users={users}
            onTogglePremium={handleTogglePremium}
            onToggleSuspension={handleToggleSuspension}
            onSendTestPush={handleSendTestPush}
          />
        );
      case 'balance':
        return (
          <BalanceTab
            settings={settings}
            draft={settingsDraft}
            setDraft={setSettingsDraft}
            onSave={handleSaveSettings}
          />
        );
      case 'content':
        return (
          <ContentTab
            contentType={contentType}
            setContentType={setContentType}
            contentList={contentList}
            items={items}
            onUpdateItem={handleUpdateItem}
            onCreateItem={handleCreateItem}
          />
        );
      case 'announcements':
        return (
          <EventsTab
            title="Duyuru"
            type="announcement"
            items={announcements}
            onCreate={handleCreateAnnouncement}
            onToggle={handleToggleAnnouncement}
            onDelete={handleDeleteAnnouncement}
          />
        );
      case 'world-events':
        return (
          <EventsTab
            title="Dünya Olayı"
            type="world-event"
            items={worldEvents}
            onCreate={handleCreateWorldEvent}
            onToggle={handleToggleWorldEvent}
            onDelete={handleDeleteWorldEvent}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="stone-bg" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {header}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {sidebar}
        <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '1rem 1rem 5.5rem 1rem' : '1.25rem', position: 'relative' }}>
          <AnimatePresence>
            {(error || message) && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 50,
                  padding: '0.65rem 1rem',
                  borderRadius: 8,
                  marginBottom: '1rem',
                  background: error ? 'rgba(180,50,40,0.18)' : 'rgba(40,140,80,0.14)',
                  border: `1px solid ${error ? 'rgba(180,50,40,0.5)' : 'rgba(40,140,80,0.4)'}`,
                  color: error ? '#ff9a8a' : '#7fd97f',
                  fontFamily: "'Crimson Text', serif",
                  fontSize: '0.9rem',
                  backdropFilter: 'blur(4px)',
                }}
              >
                {error || message}
              </motion.div>
            )}
          </AnimatePresence>
          {renderContent()}
        </main>
      </div>
      {bottomNav}
    </div>
  );
}

function DashboardTab({ stats, users, characters, announcements, worldEvents }) {
  if (!stats) return <LoadingState />;
  const totals = stats.totals || {};
  const economy = stats.economy || {};
  const daily = stats.daily || [];

  const statCards = [
    { label: 'Kullanıcı', value: totals.users ?? users.length, icon: Users },
    { label: 'Karakter', value: totals.characters ?? characters.length, icon: Shield },
    { label: 'Premium', value: totals.premiumUsers ?? 0, icon: Crown },
    { label: 'Aktif Duyuru', value: totals.activeAnnouncements ?? announcements.filter((a) => a.active).length, icon: Megaphone },
    { label: 'Canlı Olay', value: totals.activeWorldEvents ?? worldEvents.filter((e) => e.active).length, icon: Globe },
    { label: 'Ort. Seviye', value: economy.avgLevel ?? '-', icon: Star },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <SectionTitle icon={TrendingUp}>Genel Bakış</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
        {statCards.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
        <Panel title="Ekonomi Özeti" icon={Coins}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <EcoItem label="Toplam Altın" value={(economy.totalGold ?? 0).toLocaleString('tr-TR')} />
            <EcoItem label="Toplam XP" value={(economy.totalXp ?? 0).toLocaleString('tr-TR')} />
            <EcoItem label="Ort. Altın" value={(economy.avgGold ?? 0).toLocaleString('tr-TR')} />
            <EcoItem label="Ort. XP" value={(economy.avgXp ?? 0).toLocaleString('tr-TR')} />
            <EcoItem label="Baygın" value={economy.downCount ?? 0} color="var(--gold)" />
            <EcoItem label="Ölü" value={economy.deadCount ?? 0} color="var(--blood)" />
          </div>
        </Panel>

        <Panel title="Son 7 Gün" icon={BarChart3}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <MiniBarChart data={daily.map((d) => ({ label: d.date.slice(5), value: d.users }))} color="rgba(201,150,58,0.75)" title="Yeni Kullanıcı" />
            <MiniBarChart data={daily.map((d) => ({ label: d.date.slice(5), value: d.characters }))} color="rgba(120,160,220,0.75)" title="Yeni Karakter" />
            <MiniBarChart data={daily.map((d) => ({ label: d.date.slice(5), value: d.messages }))} color="rgba(140,210,140,0.75)" title="Mesaj" />
          </div>
        </Panel>
      </div>

      <Panel title="Günlük Özet Tablosu" icon={Activity}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {daily.map((d) => (
            <div
              key={d.date}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 1fr 1fr',
                gap: '0.5rem',
                fontSize: '0.78rem',
                color: 'var(--text-dim)',
                fontFamily: "'Crimson Text', serif",
                padding: '0.4rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <span style={{ color: 'var(--gold)' }}>{d.date}</span>
              <span><User size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {d.users}</span>
              <span><Shield size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {d.characters}</span>
              <span><Megaphone size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {d.messages}</span>
            </div>
          ))}
          {daily.length === 0 && <EmptyState>Veri yok.</EmptyState>}
        </div>
      </Panel>
    </div>
  );
}

function CharactersTab({ characters, search, setSearch, filters, setFilters, loading, onUpdate, onCheat, onDelete }) {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setSelected(null);
  }, [search, filters]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <SectionTitle icon={Shield}>Karakterler</SectionTitle>
      <div
        style={{
          display: 'grid',
          gap: '0.55rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          padding: '0.75rem',
          borderRadius: 12,
          background: 'rgba(0,0,0,0.18)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <Input value={search} onChange={(v) => setSearch(v)} placeholder="Ara..." style={{ paddingLeft: '2rem' }} />
        </div>
        <SelectInput value={filters.race} onChange={(v) => setFilters((p) => ({ ...p, race: v }))} options={['', ...RACES]} labels={['Tüm ırklar', ...RACES]} />
        <SelectInput value={filters.class} onChange={(v) => setFilters((p) => ({ ...p, class: v }))} options={['', ...CLASSES]} labels={['Tüm sınıflar', ...CLASSES]} />
        <SelectInput value={filters.status} onChange={(v) => setFilters((p) => ({ ...p, status: v }))} options={['', 'alive', 'unconscious', 'dead']} labels={['Tüm durumlar', 'Canlı', 'Baygın', 'Ölü']} />
        <Input type="number" value={filters.minLevel} onChange={(v) => setFilters((p) => ({ ...p, minLevel: v }))} placeholder="Min seviye" />
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {characters.map((c) => (
              <motion.button
                key={c.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(c)}
                style={{
                  textAlign: 'left',
                  padding: '0.85rem',
                  borderRadius: 12,
                  background: selected?.id === c.id ? 'rgba(201,150,58,0.14)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${selected?.id === c.id ? 'var(--gold)' : 'var(--border)'}`,
                  color: 'var(--text)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="font-fantasy" style={{ color: 'var(--gold2)', fontSize: '0.95rem' }}>{c.name}</div>
                  <LevelBadge level={c.level} />
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif" }}>
                  {c.race} {c.class} · {c.owner_username || c.user_id}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Heart size={11} /> {c.hp}/{c.max_hp}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Coins size={11} /> {c.gold}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Star size={11} /> {c.xp || 0}</span>
                </div>
                {c.status !== 'alive' && (
                  <div style={{ fontSize: '0.68rem', color: c.status === 'dead' ? '#ff9a8a' : '#e8b060', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {c.status === 'dead' ? <Skull size={11} /> : <Heart size={11} />}
                    {c.status === 'dead' ? 'Ölü' : 'Baygın'}
                  </div>
                )}
              </motion.button>
            ))}
          </div>
          {characters.length === 0 && <EmptyState>Karakter bulunamadı.</EmptyState>}
        </>
      )}

      <AnimatePresence>
        {selected && (
          <CharacterDetailPanel
            key={selected.id}
            character={selected}
            onClose={() => setSelected(null)}
            onUpdate={onUpdate}
            onCheat={onCheat}
            onDelete={onDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CharacterDetailPanel({ character, onClose, onUpdate, onCheat, onDelete }) {
  const [draft, setDraft] = useState(() => ({ ...character }));

  useEffect(() => {
    setDraft({ ...character });
  }, [character]);

  const changed = useMemo(() => {
    const keys = ['name', 'race', 'class', 'level', 'gold', 'hp', 'max_hp', ...STATS.map((s) => s.key)];
    const out = {};
    keys.forEach((k) => { if (draft[k] !== character[k]) out[k] = draft[k]; });
    return out;
  }, [draft, character]);

  const applyChange = (key, value) => setDraft((p) => ({ ...p, [key]: value }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      style={{
        border: '1px solid var(--gold)',
        borderRadius: 14,
        padding: '1rem',
        background: 'rgba(0,0,0,0.28)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <h3 className="font-fantasy" style={{ color: 'var(--gold)', margin: 0, fontSize: '1.05rem' }}>{character.name} — Düzenle</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'inline-flex' }}><X size={18} /></button>
      </div>

      <div style={{ display: 'grid', gap: '0.6rem', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginBottom: '0.85rem' }}>
        <Field label="İsim" value={draft.name} onChange={(v) => applyChange('name', v)} />
        <Select label="Irk" value={draft.race} options={RACES} onChange={(v) => applyChange('race', v)} />
        <Select label="Sınıf" value={draft.class} options={CLASSES} onChange={(v) => applyChange('class', v)} />
      </div>

      <div style={{ display: 'grid', gap: '0.6rem', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', marginBottom: '0.85rem' }}>
        <NumberField label="Seviye" value={draft.level} onChange={(v) => applyChange('level', v)} />
        <NumberField label="Altın" value={draft.gold} onChange={(v) => applyChange('gold', v)} />
        <NumberField label="HP" value={draft.hp} onChange={(v) => applyChange('hp', v)} />
        <NumberField label="Max HP" value={draft.max_hp} onChange={(v) => applyChange('max_hp', v)} />
      </div>

      <div style={{ color: 'var(--gold)', fontSize: '0.78rem', fontFamily: "'Cinzel', serif", marginBottom: '0.5rem' }}>Temel Özellikler</div>
      <div style={{ display: 'grid', gap: '0.55rem', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: '0.85rem' }}>
        {STATS.map((s) => (
          <NumberField key={s.key} label={s.label} value={draft[s.key]} onChange={(v) => applyChange(s.key, v)} />
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => onUpdate(character.id, changed)}
        disabled={Object.keys(changed).length === 0}
        style={{
          width: '100%',
          marginBottom: '1rem',
          padding: '0.6rem',
          borderRadius: 8,
          background: Object.keys(changed).length === 0 ? 'rgba(201,150,58,0.08)' : 'rgba(201,150,58,0.2)',
          border: '1px solid var(--gold)',
          color: 'var(--gold2)',
          fontFamily: "'Cinzel', serif",
          fontSize: '0.82rem',
          cursor: Object.keys(changed).length === 0 ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
        }}
      >
        <Save size={15} /> Değişiklikleri Kaydet
      </motion.button>

      <div style={{ color: 'var(--gold)', fontSize: '0.78rem', fontFamily: "'Cinzel', serif", marginBottom: '0.5rem' }}>Hile / Ekle</div>
      <div style={{ display: 'grid', gap: '0.55rem', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: '0.85rem' }}>
        <CheatNumber label="Altın +" onApply={(v) => onCheat(character.id, { gold: v })} />
        <CheatNumber label="XP +" onApply={(v) => onCheat(character.id, { xp: v })} />
        <CheatNumber label="Seviye +" onApply={(v) => onCheat(character.id, { level: v })} />
        <CheatNumber label="Perk Puanı +" onApply={(v) => onCheat(character.id, { perkPoint: v })} />
        <CheatNumber label="HP +" onApply={(v) => onCheat(character.id, { hp: v })} />
        <CheatNumber label="Max HP +" onApply={(v) => onCheat(character.id, { maxHp: v })} />
      </div>

      <div style={{ marginBottom: '0.85rem' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginBottom: '0.4rem', fontFamily: "'Crimson Text', serif" }}>Eşya Ver</div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {ITEM_PRESETS.map((item) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onCheat(character.id, { item })}
              className="btn-dark"
              style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Package size={13} /> {item.name}
            </motion.button>
          ))}
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onDelete(character.id, character.name)}
        style={{
          width: '100%',
          padding: '0.6rem',
          borderRadius: 8,
          background: 'rgba(180,40,30,0.15)',
          border: '1px solid rgba(180,40,30,0.5)',
          color: '#ff9a8a',
          fontFamily: "'Cinzel', serif",
          fontSize: '0.8rem',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
        }}
      >
        <Trash2 size={15} /> Karakteri Sil
      </motion.button>
    </motion.div>
  );
}

function UsersTab({ users, onTogglePremium, onToggleSuspension, onSendTestPush }) {
  const [selected, setSelected] = useState(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [pushTitle, setPushTitle] = useState('Test Bildirimi');
  const [pushBody, setPushBody] = useState("Kader'in Sesi push servisi çalışıyor.");
  const [pushResult, setPushResult] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);

  useEffect(() => {
    if (selected?.premium_until) {
      const d = new Date(selected.premium_until);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setExpiresAt(`${yyyy}-${mm}-${dd}`);
      }
    } else {
      setExpiresAt('');
    }
  }, [selected]);

  const doPremium = async (u) => {
    const next = !u.is_premium;
    if (next && !expiresAt) {
      alert('Premium aktif etmek için bitiş tarihi seçin.');
      return;
    }
    setLoadingAction(`premium-${u.id}`);
    await onTogglePremium(u.id, next, next ? expiresAt : null);
    setLoadingAction(null);
  };

  const doSuspend = async (u) => {
    setLoadingAction(`suspend-${u.id}`);
    await onToggleSuspension(u.id, !u.is_suspended);
    setLoadingAction(null);
  };

  const doPush = async () => {
    if (!selected) return;
    setLoadingAction(`push-${selected.id}`);
    setPushResult(null);
    const result = await onSendTestPush(selected.id, pushTitle, pushBody);
    setPushResult(result);
    setLoadingAction(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <SectionTitle icon={Users}>Kullanıcılar</SectionTitle>
      {users.map((u) => (
        <motion.div
          key={u.id}
          whileTap={{ scale: 0.99 }}
          onClick={() => setSelected(u)}
          style={{
            padding: '0.85rem',
            borderRadius: 12,
            background: 'rgba(0,0,0,0.2)',
            border: `1px solid ${u.is_premium ? 'rgba(201,150,58,0.55)' : 'var(--border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            cursor: 'pointer',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="font-fantasy" style={{ color: u.is_premium ? 'var(--gold2)' : 'var(--text)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              {u.username || 'İsimsiz'}
              {u.is_premium && <Crown size={14} color="var(--gold)" />}
              {u.is_suspended && <span style={{ fontSize: '0.65rem', color: '#ff9a8a', border: '1px solid #ff9a8a', padding: '0.05rem 0.3rem', borderRadius: 4 }}>Askıda</span>}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif" }}>
              {u.email || 'E-posta yok'} · {u.characterCount || 0} karakter
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--gold)', fontFamily: "'Crimson Text', serif", marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={10} /> Son aktif: {formatLastActive(u.last_active_at)} · Kayıt: {u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : 'Bilinmiyor'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
            <SmallButton
              onClick={(e) => { e.stopPropagation(); doPremium(u); }}
              loading={loadingAction === `premium-${u.id}`}
              color={u.is_premium ? 'crimson' : 'gold'}
            >
              {u.is_premium ? <><Power size={11} /> Kaldır</> : <><Crown size={11} /> Premium</>}
            </SmallButton>
          </div>
        </motion.div>
      ))}
      {users.length === 0 && <EmptyState>Kullanıcı bulunamadı.</EmptyState>}

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            style={{
              border: '1px solid var(--gold)',
              borderRadius: 14,
              padding: '1rem',
              background: 'rgba(0,0,0,0.28)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 className="font-fantasy" style={{ color: 'var(--gold)', margin: 0, fontSize: '1.05rem' }}>{selected.username || 'İsimsiz'} — Detay</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", marginBottom: '0.75rem', lineHeight: 1.6 }}>
              <div>E-posta: {selected.email || '-'}</div>
              <div>UID: {selected.firebase_uid || selected.id}</div>
              <div>Karakter sayısı: {selected.characterCount || 0}</div>
              <div>Kayıt: {selected.created_at ? new Date(selected.created_at).toLocaleString('tr-TR') : '-'}</div>
              <div>Premium: {selected.is_premium ? 'Evet' : 'Hayır'} {selected.premium_until ? `(bitiş: ${new Date(selected.premium_until).toLocaleDateString('tr-TR')})` : ''}</div>
              <div>FCM: {(selected.fcmTokens?.length || selected.fcmToken ? 1 : 0) > 0 ? 'Var' : 'Yok'}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Premium Bitiş Tarihi</label>
                <Input type="date" value={expiresAt} onChange={setExpiresAt} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <SmallButton onClick={() => doPremium(selected)} loading={loadingAction === `premium-${selected.id}`} color={selected.is_premium ? 'crimson' : 'gold'}>
                  {selected.is_premium ? <><Power size={12} /> Premium Kaldır</> : <><Crown size={12} /> Premium Yap</>}
                </SmallButton>
                <SmallButton onClick={() => doSuspend(selected)} loading={loadingAction === `suspend-${selected.id}`} color={selected.is_suspended ? 'gold' : 'crimson'}>
                  {selected.is_suspended ? 'Hesabı Aç' : 'Hesabı Askıya Al'}
                </SmallButton>
              </div>
            </div>

            <div style={{ color: 'var(--gold)', fontSize: '0.8rem', fontFamily: "'Cinzel', serif", marginBottom: '0.5rem' }}>Test Push Gönder</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Input value={pushTitle} onChange={setPushTitle} placeholder="Başlık" />
              <Input value={pushBody} onChange={setPushBody} placeholder="İçerik" />
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={doPush}
              disabled={loadingAction === `push-${selected.id}`}
              className="btn-dark"
              style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Bell size={14} /> {loadingAction === `push-${selected.id}` ? 'Gönderiliyor...' : 'Push Gönder'}
            </motion.button>
            {pushResult && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: pushResult.error ? '#ff9a8a' : '#7fd97f', fontFamily: "'Crimson Text', serif" }}>
                {pushResult.error ? pushResult.error : `Gönderildi: ${pushResult.sent || 0}, Başarısız: ${pushResult.failed || 0}`}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BalanceTab({ settings, draft, setDraft, onSave }) {
  if (!settings) return <LoadingState />;

  const fields = [
    { key: 'freeDailyTurns', label: 'Günlük Ücretsiz Hamle', helper: 'Her gün resetlenen ücretsiz hamle hakkı' },
    { key: 'bonusPerAd', label: 'Reklam Başına Bonus Hamle', helper: 'Ödüllü reklam izleyince kazanılan ekstra hamle' },
    { key: 'maxBonusAdsPerDay', label: 'Günlük Max Bonus Reklam', helper: 'Bir günde izlenebilecek maksimum ödüllü reklam' },
    { key: 'premiumDailyWheelSpins', label: 'Premium Günlük Çark Hakkı', helper: 'Premium kullanıcıların günlük çark hakları' },
    { key: 'adRewardGold', label: 'Reklam Ödülü Altın', helper: 'Reklam ödülü altın miktarı' },
    { key: 'adRewardXp', label: 'Reklam Ödülü XP', helper: 'Reklam ödülü XP miktarı' },
    { key: 'shopPriceMultiplier', label: 'Mağaza Fiyat Çarpanı', helper: '1 = normal, 0.5 = yarım fiyat' },
    { key: 'goldRewardMin', label: 'Min Altın Ödülü', helper: 'Hikâyede verilecek minimum altın' },
    { key: 'goldRewardMax', label: 'Max Altın Ödülü', helper: 'Hikâyede verilecek maksimum altın' },
  ];

  return (
    <Panel title="Oyun Dengesi Ayarları" icon={SlidersHorizontal}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {fields.map((f) => (
          <div key={f.key}>
            <label style={labelStyle}>{f.label}</label>
            <Input
              type="number"
              step={f.key === 'shopPriceMultiplier' ? 0.1 : 1}
              value={draft[f.key] ?? settings[f.key] ?? 0}
              onChange={(v) => setDraft((prev) => ({ ...prev, [f.key]: Number(v) }))}
            />
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: "'Crimson Text', serif", marginTop: '0.2rem' }}>{f.helper}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onSave}
          style={{ flex: 1, padding: '0.65rem', borderRadius: 8, background: 'rgba(201,150,58,0.2)', border: '1px solid var(--gold)', color: 'var(--gold2)', fontFamily: "'Cinzel', serif", fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
        >
          <Save size={16} /> Kaydet
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setDraft(DEFAULT_SETTINGS)}
          style={{ flex: 1, padding: '0.65rem', borderRadius: 8, background: 'rgba(120,120,120,0.12)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
        >
          <RotateCcw size={16} /> Varsayılana Döndür
        </motion.button>
      </div>
    </Panel>
  );
}

function ContentTab({ contentType, setContentType, contentList, items, onUpdateItem, onCreateItem }) {
  const [editing, setEditing] = useState(null);
  const [newItem, setNewItem] = useState({ id: '', name: '', description: '', type: 'misc', value: 0, rarity: 'Common', image: '', shopVisible: false });

  const isItems = contentType === 'items';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <SectionTitle icon={BookOpen}>İçerik Yönetimi</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
        {CONTENT_SUBTABS.map((t) => {
          const Icon = t.icon;
          const active = contentType === t.id;
          return (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => { playClick(); setContentType(t.id); setEditing(null); }}
              style={{
                padding: '0.55rem',
                borderRadius: 8,
                border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                background: active ? 'rgba(201,150,58,0.15)' : 'rgba(0,0,0,0.2)',
                color: active ? 'var(--gold2)' : 'var(--text)',
                fontFamily: "'Cinzel', serif",
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
              }}
            >
              <Icon size={14} /> {t.label}
            </motion.button>
          );
        })}
      </div>

      {!isItems ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {contentList.map((c) => (
            <div key={c.id} style={{ padding: '0.85rem', borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <ContentImage src={c.image || c.icon} />
              <div>
                <div className="font-fantasy" style={{ color: 'var(--gold2)', fontSize: '0.95rem' }}>{c.title || c.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", marginTop: '0.3rem' }}>{c.description}</div>
              </div>
            </div>
          ))}
          {contentList.length === 0 && <EmptyState>Kayıt bulunamadı.</EmptyState>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((item) => (
            <div key={item.id} style={{ padding: '0.85rem', borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
              {editing?.id === item.id ? (
                <ItemForm
                  value={editing}
                  onChange={setEditing}
                  submitLabel="Kaydet"
                  onSubmit={async () => { await onUpdateItem(item.id, editing); setEditing(null); }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div>
                    <div className="font-fantasy" style={{ color: 'var(--gold2)', fontSize: '0.95rem' }}>
                      {item.name} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({item.id})</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif" }}>{item.description}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--gold)', marginTop: '0.25rem', fontFamily: "'Crimson Text', serif" }}>
                      {item.type} · {item.rarity} · {item.value} altın · Mağaza: {item.shopVisible ? 'Evet' : 'Hayır'}
                    </div>
                  </div>
                  <SmallButton onClick={() => setEditing({ ...item })}><Save size={13} /></SmallButton>
                </div>
              )}
            </div>
          ))}

          <Panel title="Yeni Eşya Ekle" icon={Plus}>
            <ItemForm
              value={newItem}
              onChange={setNewItem}
              submitLabel="Ekle"
              onSubmit={async () => { await onCreateItem(newItem); setNewItem({ id: '', name: '', description: '', type: 'misc', value: 0, rarity: 'Common', image: '', shopVisible: false }); }}
            />
          </Panel>
        </div>
      )}
    </div>
  );
}

function ItemForm({ value, onChange, submitLabel, onSubmit, onCancel }) {
  const update = (key, val) => onChange((p) => ({ ...p, [key]: val }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
      <div style={{ display: 'flex', gap: '0.45rem' }}>
        <Input value={value.id} onChange={(v) => update('id', v)} placeholder="id" style={{ flex: 1 }} />
        <Input value={value.name} onChange={(v) => update('name', v)} placeholder="Ad" style={{ flex: 2 }} />
      </div>
      <Input value={value.description} onChange={(v) => update('description', v)} placeholder="Açıklama" />
      <Input value={value.image} onChange={(v) => update('image', v)} placeholder="Görsel URL" />
      <div style={{ display: 'flex', gap: '0.45rem' }}>
        <SelectInput value={value.type} onChange={(v) => update('type', v)} options={ITEM_TYPES} style={{ flex: 1 }} />
        <Input type="number" value={value.value} onChange={(v) => update('value', Number(v))} placeholder="Değer" style={{ flex: 1 }} />
        <SelectInput value={value.rarity} onChange={(v) => update('rarity', v)} options={RARITIES} style={{ flex: 1 }} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-dim)', fontSize: '0.78rem', fontFamily: "'Crimson Text', serif" }}>
        <input type="checkbox" checked={!!value.shopVisible} onChange={(e) => update('shopVisible', e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
        Mağazada satılsın
      </label>
      <div style={{ display: 'flex', gap: '0.45rem' }}>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onSubmit} style={{ ...smallBtnStyle, flex: 1, justifyContent: 'center' }}><Plus size={14} /> {submitLabel}</motion.button>
        {onCancel && <motion.button whileTap={{ scale: 0.95 }} onClick={onCancel} style={{ ...smallBtnStyle, background: 'transparent', justifyContent: 'center' }}>İptal</motion.button>}
      </div>
    </div>
  );
}

function EventsTab({ title, type, items, onCreate, onToggle, onDelete }) {
  const [form, setForm] = useState({ title: '', [type === 'announcement' ? 'content' : 'description']: '', type: type === 'announcement' ? 'info' : 'event', sendPush: false });
  const bodyKey = type === 'announcement' ? 'content' : 'description';

  const submit = () => {
    if (!form.title.trim() || !form[bodyKey].trim()) return;
    onCreate({ ...form });
    setForm({ title: '', [bodyKey]: '', type: type === 'announcement' ? 'info' : 'event', sendPush: false });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <SectionTitle icon={type === 'announcement' ? Megaphone : Globe}>{title} Yönetimi</SectionTitle>
      <Panel title={`Yeni ${title} Oluştur`} icon={Plus}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          <Input value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} placeholder="Başlık" />
          <textarea
            value={form[bodyKey]}
            onChange={(e) => setForm((p) => ({ ...p, [bodyKey]: e.target.value }))}
            placeholder={type === 'announcement' ? 'Tüm oyunculara gösterilecek duyuru...' : 'AI anlatısına yansıyacak dünya olayı...'}
            rows={4}
            style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
          />
          <SelectInput
            value={form.type}
            onChange={(v) => setForm((p) => ({ ...p, type: v }))}
            options={type === 'announcement' ? ['info', 'update', 'event', 'warning'] : ['event', 'disaster', 'blessing', 'invasion']}
          />
          {type === 'announcement' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--gold)', fontSize: '0.8rem', fontFamily: "'Crimson Text', serif", cursor: 'pointer' }}>
              <input type="checkbox" checked={Boolean(form.sendPush)} onChange={(e) => setForm((p) => ({ ...p, sendPush: e.target.checked }))} style={{ accentColor: 'var(--gold)' }} />
              Tüm oyunculara push bildirimi de gönder
            </label>
          )}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={submit}
            style={{ width: '100%', padding: '0.6rem', borderRadius: 8, background: 'rgba(201,150,58,0.2)', border: '1px solid var(--gold)', color: 'var(--gold2)', fontFamily: "'Cinzel', serif", fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> {type === 'announcement' ? 'Duyuruyu Yayınla' : 'Olayı Başlat'}
          </motion.button>
        </div>
      </Panel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {items.map((item) => (
          <div key={item.id} style={{ padding: '0.9rem', borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ minWidth: 0 }}>
                <div className="font-fantasy" style={{ color: item.active ? 'var(--gold2)' : 'var(--text-dim)', fontSize: '0.95rem' }}>{item.title}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginTop: '0.35rem', whiteSpace: 'pre-wrap', lineHeight: 1.35, fontFamily: "'Crimson Text', serif" }}>
                  {item.content || item.description}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontFamily: "'Crimson Text', serif" }}>
                  {item.created_at ? new Date(item.created_at).toLocaleString('tr-TR') : ''} · {item.active ? 'Aktif' : 'Pasif'} · {item.type}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <SmallButton onClick={() => onToggle(item.id, !item.active)} color={item.active ? 'crimson' : 'green'}>
                  <Power size={12} /> {item.active ? 'Kapat' : 'Aç'}
                </SmallButton>
                <SmallButton onClick={() => onDelete(item.id)} color="crimson">
                  <Trash2 size={13} />
                </SmallButton>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <EmptyState>Henüz kayıt yok.</EmptyState>}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.22)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'rgba(201,150,58,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--gold)',
        }}
      >
        <Icon size={19} />
      </div>
      <div>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.1rem', color: 'var(--gold2)' }}>{value}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif" }}>{label}</div>
      </div>
    </div>
  );
}

function EcoItem({ label, value, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.55rem' }}>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: "'Crimson Text', serif" }}>{label}</div>
      <div style={{ fontSize: '0.95rem', color: color || 'var(--gold2)', fontFamily: "'Cinzel', serif", marginTop: '0.15rem' }}>{value}</div>
    </div>
  );
}

function MiniBarChart({ data, color, title }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", marginBottom: '0.35rem' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.3rem', height: 70 }}>
        {data.map((d) => (
          <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
            <div
              title={`${d.label}: ${d.value}`}
              style={{
                width: '100%',
                height: `${Math.max(4, (d.value / max) * 58)}px`,
                background: color,
                borderRadius: '3px 3px 0 0',
                minHeight: 4,
              }}
            />
            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', transform: 'rotate(-35deg)', transformOrigin: 'top left', marginTop: '0.3rem', whiteSpace: 'nowrap' }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <div className="stone-card" style={{ padding: '1rem', borderRadius: 12 }}>
      <div style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif", fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {Icon && <Icon size={16} />} {title}
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ children, icon: Icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--gold)', fontFamily: "'Cinzel', serif", fontSize: '1rem' }}>
      {Icon && <Icon size={18} />}
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2.5rem', fontFamily: "'Crimson Text', serif" }}>
      <Activity size={28} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
      <div>Yükleniyor...</div>
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem', fontFamily: "'Crimson Text', serif", border: '1px dashed var(--border)', borderRadius: 12 }}>
      {children}
    </div>
  );
}

function LevelBadge({ level }) {
  return (
    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', background: 'rgba(0,0,0,0.35)', padding: '0.15rem 0.45rem', borderRadius: 12, fontFamily: "'Cinzel', serif" }}>
      L{level}
    </span>
  );
}

function ContentImage({ src }) {
  if (!src) return <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(0,0,0,0.3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Gem size={20} /></div>;
  return <img src={src} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid var(--border)' }} />;
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <Input value={value} onChange={onChange} />
    </div>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <SelectInput value={value} onChange={onChange} options={options} />
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <Input type="number" value={value ?? 0} onChange={(v) => onChange(Number(v))} />
    </div>
  );
}

function CheatNumber({ label, onApply }) {
  const [v, setV] = useState(0);
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: '0.35rem' }}>
        <Input type="number" value={v} onChange={(val) => setV(Number(val))} />
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { onApply(v); setV(0); }} style={smallBtnStyle}><Plus size={14} /></motion.button>
      </div>
    </div>
  );
}

function Input({ type = 'text', value, onChange, placeholder, style: extraStyle = {}, ...props }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...inputStyle, ...extraStyle }}
      {...props}
    />
  );
}

function SelectInput({ value, onChange, options, labels, style: extraStyle = {} }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, ...extraStyle }}>
      {options.map((o, i) => (
        <option key={o} value={o}>{labels?.[i] ?? o}</option>
      ))}
    </select>
  );
}

function SmallButton({ children, onClick, loading, color = 'gold', ...props }) {
  const palette = {
    gold: { bg: 'rgba(201,150,58,0.12)', border: 'var(--gold)', text: 'var(--gold)' },
    crimson: { bg: 'rgba(180,40,30,0.12)', border: 'rgba(180,40,30,0.5)', text: '#ff9a8a' },
    green: { bg: 'rgba(40,140,80,0.12)', border: 'rgba(40,140,80,0.45)', text: '#7fd97f' },
  }[color];
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={loading}
      style={{
        ...smallBtnStyle,
        background: palette.bg,
        borderColor: palette.border,
        color: palette.text,
        opacity: loading ? 0.6 : 1,
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

const labelStyle = {
  color: 'var(--text-dim)',
  fontSize: '0.72rem',
  display: 'block',
  marginBottom: '0.3rem',
  fontFamily: "'Crimson Text', serif",
};

const inputStyle = {
  width: '100%',
  padding: '0.55rem 0.7rem',
  borderRadius: 8,
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontFamily: "'Crimson Text', serif",
  fontSize: '0.85rem',
  boxSizing: 'border-box',
};

const smallBtnStyle = {
  padding: '0.4rem 0.55rem',
  borderRadius: 7,
  border: '1px solid var(--gold)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.75rem',
  fontFamily: "'Cinzel', serif",
};
