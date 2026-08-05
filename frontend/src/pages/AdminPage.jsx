import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  adminListCharacters, adminCheatCharacter, adminUpdateCharacter,
  adminDeleteCharacter, adminListUsers, adminToggleUserPremium,
  adminListAnnouncements, adminCreateAnnouncement, adminToggleAnnouncement, adminDeleteAnnouncement,
  adminListWorldEvents, adminCreateWorldEvent, adminToggleWorldEvent, adminDeleteWorldEvent,
  adminGetStats, adminUpdateUserSuspension, adminSendTestPush,
  adminGetSettings, adminUpdateSettings,
  adminListItems, adminUpdateItem, adminCreateItem, adminListContent,
} from '../utils/api';
import { playClick, playMagic } from '../utils/sounds';
import {
  Shield, Users, Megaphone, Globe, Search, Trash2, Save, Plus,
  ChevronLeft, Power, Skull, Heart, Coins, Star, Sword, Package,
  Crown, Calendar, BarChart3, SlidersHorizontal, BookOpen, Bell,
} from 'lucide-react';

const RACES = ['İnsan', 'Elf', 'Cüce', 'Yarı-Ork', 'Hobit', 'İblissoyu'];
const CLASSES = ['Savaşçı', 'Büyücü', 'Hırsız', 'Rahip', 'Avcı', 'Barbar'];
const STATS = [
  { key: 'strength', label: 'Güç' },
  { key: 'dexterity', label: 'Çeviklik' },
  { key: 'constitution', label: 'Dayanıklılık' },
  { key: 'intelligence', label: 'Zeka' },
  { key: 'wisdom', label: 'Bilgelik' },
  { key: 'charisma', label: 'Karizma' },
];
const ITEMS = [
  { id: 'small_healing_potion', name: 'Küçük İksir', description: '2d4+2 iyileştirir', type: 'potion', value: 25 },
  { id: 'great_healing_potion', name: 'Büyük İksir', description: '4d4+4 iyileştirir', type: 'potion', value: 75 },
  { id: 'gold_bag', name: 'Altın Torbası', description: '100 altın', type: 'misc', value: 100 },
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
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function AdminPage({ user }) {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filters, setFilters] = useState({ race: '', class: '', status: '', minLevel: '' });
  const [announcements, setAnnouncements] = useState([]);
  const [worldEvents, setWorldEvents] = useState([]);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', type: 'info', sendPush: false });
  const [worldEventForm, setWorldEventForm] = useState({ title: '', description: '', type: 'event' });
  const [statsData, setStatsData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [settingsDraft, setSettingsDraft] = useState({});
  const [items, setItems] = useState([]);
  const [contentType, setContentType] = useState('scenarios');
  const [contentList, setContentList] = useState([]);

  const showMessage = (text, isError = false) => {
    if (isError) setError(text);
    else setMessage(text);
    setTimeout(() => { if (isError) setError(''); else setMessage(''); }, 3000);
  };

  const loadCharacters = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListCharacters({ username: search, ...filters });
      setCharacters(data.characters || []);
    } catch (err) { showMessage(err.message, true); }
    setLoading(false);
  }, [search, filters]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await adminListUsers();
      setUsers(data.users || []);
    } catch (err) { showMessage(err.message, true); }
  }, []);

  const loadAdminContent = useCallback(async () => {
    try {
      const [announcementData, eventData] = await Promise.all([
        adminListAnnouncements(),
        adminListWorldEvents(),
      ]);
      setAnnouncements(announcementData.announcements || []);
      setWorldEvents(eventData.events || []);
    } catch (err) { showMessage(err.message, true); }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await adminGetStats();
      setStatsData(data);
    } catch (err) { showMessage(err.message, true); }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const data = await adminGetSettings();
      setSettings(data.settings || {});
      setSettingsDraft(data.settings || {});
    } catch (err) { showMessage(err.message, true); }
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const data = await adminListItems();
      setItems(data.items || []);
    } catch (err) { showMessage(err.message, true); }
  }, []);

  const loadContent = useCallback(async () => {
    try {
      const data = await adminListContent(contentType);
      setContentList(data[contentType] || data.items || data.races || data.classes || []);
    } catch (err) { showMessage(err.message, true); }
  }, [contentType]);

  useEffect(() => { loadCharacters(); }, [loadCharacters]);
  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadAdminContent(); }, [loadAdminContent]);
  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (activeTab === 'balance') loadSettings();
    if (activeTab === 'content') { loadItems(); loadContent(); }
  }, [activeTab, loadSettings, loadItems, loadContent]);

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) return;
    try {
      const result = await adminCreateAnnouncement(announcementForm);
      setAnnouncementForm({ title: '', content: '', type: 'info', sendPush: false });
      const sent = result?.pushResult?.sent || 0;
      showMessage(`Duyuru yayınlandı${sent > 0 ? ` · ${sent} cihaza bildirim gönderildi` : ''}`);
      await loadAdminContent();
    } catch (err) { showMessage(err.message, true); }
  };

  const handleCreateWorldEvent = async () => {
    if (!worldEventForm.title.trim() || !worldEventForm.description.trim()) return;
    try {
      await adminCreateWorldEvent(worldEventForm);
      setWorldEventForm({ title: '', description: '', type: 'event' });
      showMessage('Dünya olayı başlatıldı');
      await loadAdminContent();
    } catch (err) { showMessage(err.message, true); }
  };

  const handleCheat = async (payload) => {
    if (!selected) return;
    try {
      await adminCheatCharacter(selected.id, payload);
      playMagic();
      showMessage('İşlem başarılı');
      loadCharacters();
    } catch (err) { showMessage(err.message, true); }
  };

  const handleUpdate = async (payload) => {
    if (!selected) return;
    try {
      await adminUpdateCharacter(selected.id, payload);
      playMagic();
      showMessage('Karakter güncellendi');
      setSelected((prev) => ({ ...prev, ...payload }));
      loadCharacters();
    } catch (err) { showMessage(err.message, true); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`${selected.name} karakterini kalıcı olarak sil?`)) return;
    try {
      await adminDeleteCharacter(selected.id);
      setSelected(null);
      loadCharacters();
      showMessage('Karakter silindi');
    } catch (err) { showMessage(err.message, true); }
  };

  const handleSaveSettings = async () => {
    try {
      await adminUpdateSettings(settingsDraft);
      setSettings({ ...settingsDraft });
      showMessage('Oyun dengesi ayarları kaydedildi');
    } catch (err) { showMessage(err.message, true); }
  };

  const stats = [
    { label: 'Kullanıcı', value: statsData?.totals?.users ?? users.length, icon: Users },
    { label: 'Karakter', value: statsData?.totals?.characters ?? characters.length, icon: Shield },
    { label: 'Premium', value: statsData?.totals?.premiumUsers ?? 0, icon: Crown },
    { label: 'Aktif Duyuru', value: statsData?.totals?.activeAnnouncements ?? announcements.filter((a) => a.active).length, icon: Megaphone },
    { label: 'Canlı Olay', value: statsData?.totals?.activeWorldEvents ?? worldEvents.filter((e) => e.active).length, icon: Globe },
  ];

  return (
    <div className="stone-bg" style={{ minHeight: '100dvh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Sword size={28} color="var(--gold)" />
            <div>
              <h1 className="font-fantasy gold-text" style={{ margin: 0, fontSize: '1.4rem' }}>Tanrı Modu</h1>
              <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.75rem', fontFamily: "'Crimson Text', serif" }}>{user?.username || user?.email || 'Yönetici'}</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => { playClick(); navigate('/'); }}
            className="btn-dark"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ChevronLeft size={16} /> Geri
          </motion.button>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                background: 'rgba(0,0,0,0.22)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: 'rgba(201,150,58,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--gold)',
                }}
              >
                <s.icon size={18} />
              </div>
              <div>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.1rem', color: 'var(--gold2)' }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem',
            marginBottom: '0.75rem',
          }}
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => { playClick(); setActiveTab(t.id); }}
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 0.9rem',
                  borderRadius: '8px',
                  border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                  background: active ? 'rgba(201,150,58,0.18)' : 'rgba(30,25,20,0.5)',
                  color: active ? 'var(--gold2)' : 'var(--text)',
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                <Icon size={15} /> {t.label}
              </motion.button>
            );
          })}
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {(error || message) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                padding: '0.6rem 0.9rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                background: error ? 'rgba(180,50,40,0.15)' : 'rgba(40,140,80,0.12)',
                border: `1px solid ${error ? 'rgba(180,50,40,0.45)' : 'rgba(40,140,80,0.35)'}`,
                color: error ? '#ff9a8a' : '#7fd97f',
                fontFamily: "'Crimson Text', serif",
                fontSize: '0.9rem',
              }}
            >
              {error || message}
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'dashboard' && <DashboardTab stats={statsData} />}

        {activeTab === 'characters' && (
          <CharacterTab
            characters={characters}
            users={users}
            search={search}
            setSearch={setSearch}
            filters={filters}
            setFilters={setFilters}
            loading={loading}
            selected={selected}
            setSelected={setSelected}
            onUpdate={handleUpdate}
            onCheat={handleCheat}
            onDelete={handleDelete}
          />
        )}

        {activeTab === 'users' && <UsersTab users={users} />}

        {activeTab === 'balance' && (
          <BalanceTab
            settings={settings}
            draft={settingsDraft}
            setDraft={setSettingsDraft}
            onSave={handleSaveSettings}
          />
        )}

        {activeTab === 'content' && (
          <ContentManagerTab
            items={items}
            setItems={setItems}
            contentType={contentType}
            setContentType={setContentType}
            contentList={contentList}
          />
        )}

        {activeTab === 'announcements' && (
          <ContentTab
            title="Duyuru"
            form={announcementForm}
            setForm={setAnnouncementForm}
            bodyKey="content"
            bodyPlaceholder="Tüm oyunculara gösterilecek duyuru..."
            submitLabel="Duyuruyu Yayınla"
            pushKey="sendPush"
            pushLabel="Tüm oyunculara push bildirimi de gönder"
            onSubmit={handleCreateAnnouncement}
            items={announcements}
            onToggle={async (item) => { await adminToggleAnnouncement(item.id, !item.active); await loadAdminContent(); }}
            onDelete={async (item) => { await adminDeleteAnnouncement(item.id); await loadAdminContent(); }}
          />
        )}

        {activeTab === 'world-events' && (
          <ContentTab
            title="Dünya Olayı"
            form={worldEventForm}
            setForm={setWorldEventForm}
            bodyKey="description"
            bodyPlaceholder="AI anlatısına yansıyacak dünya olayı..."
            submitLabel="Olayı Başlat"
            onSubmit={handleCreateWorldEvent}
            items={worldEvents}
            onToggle={async (item) => { await adminToggleWorldEvent(item.id, !item.active); await loadAdminContent(); }}
            onDelete={async (item) => { await adminDeleteWorldEvent(item.id); await loadAdminContent(); }}
          />
        )}
      </div>
    </div>
  );
}

function CharacterTab({ characters, users, search, setSearch, filters, setFilters, loading, selected, setSelected, onUpdate, onCheat, onDelete }) {
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gap: '0.6rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          marginBottom: '0.85rem',
        }}
      >
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ara..."
            style={{ ...inputStyle, width: '100%', paddingLeft: '2rem' }}
          />
        </div>
        <select value={filters.race} onChange={(e) => setFilters((prev) => ({ ...prev, race: e.target.value }))} style={inputStyle}>
          <option value="">Tüm ırklar</option>
          {RACES.map((race) => <option key={race} value={race}>{race}</option>)}
        </select>
        <select value={filters.class} onChange={(e) => setFilters((prev) => ({ ...prev, class: e.target.value }))} style={inputStyle}>
          <option value="">Tüm sınıflar</option>
          {CLASSES.map((className) => <option key={className} value={className}>{className}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} style={inputStyle}>
          <option value="">Tüm durumlar</option>
          <option value="alive">Canlı</option>
          <option value="unconscious">Baygın</option>
          <option value="dead">Ölü</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Yükleniyor...</div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {characters.map((c) => (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(c)}
              style={{
                textAlign: 'left',
                padding: '0.85rem',
                borderRadius: '10px',
                background: selected?.id === c.id ? 'rgba(201,150,58,0.14)' : 'rgba(0,0,0,0.22)',
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
                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.4rem', borderRadius: '12px' }}>L{c.level}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif" }}>
                {c.race} {c.class} · {c.owner_username}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Heart size={11} /> {c.hp}/{c.max_hp}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Coins size={11} /> {c.gold}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Star size={11} /> {c.xp || 0} XP</span>
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
      )}

      {selected && (
        <div
          style={{
            marginTop: '1rem',
            border: '1px solid var(--gold)',
            borderRadius: '12px',
            padding: '1rem',
            background: 'rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 className="font-fantasy" style={{ color: 'var(--gold)', margin: 0 }}>{selected.name} — Düzenle</h3>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>Kapat</button>
          </div>

          <div style={{ display: 'grid', gap: '0.6rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '0.75rem' }}>
            <Field label="İsim" value={selected.name} onChange={(v) => onUpdate({ name: v })} />
            <Select label="Irk" value={selected.race} options={RACES} onChange={(v) => onUpdate({ race: v })} />
            <Select label="Sınıf" value={selected.class} options={CLASSES} onChange={(v) => onUpdate({ class: v })} />
          </div>

          <div style={{ color: 'var(--gold)', fontSize: '0.78rem', fontFamily: "'Cinzel', serif", marginBottom: '0.5rem' }}>Temel Özellikler</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {STATS.map((s) => (
              <NumberField
                key={s.key}
                label={s.label}
                value={selected[s.key]}
                onApply={(v) => onUpdate({ [s.key]: v })}
              />
            ))}
          </div>

          <div style={{ color: 'var(--gold)', fontSize: '0.78rem', fontFamily: "'Cinzel', serif", marginBottom: '0.5rem' }}>Hile / Ekle</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <NumberField label="Altın +" value={0} onApply={(v) => onCheat({ gold: v })} />
            <NumberField label="XP +" value={0} onApply={(v) => onCheat({ xp: v })} />
            <NumberField label="Seviye +" value={0} onApply={(v) => onCheat({ level: v })} />
            <NumberField label="Perk Puanı +" value={0} onApply={(v) => onCheat({ perkPoint: v })} />
            <NumberField label="HP +" value={0} onApply={(v) => onCheat({ hp: v })} />
            <NumberField label="Max HP +" value={0} onApply={(v) => onCheat({ maxHp: v })} />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginBottom: '0.4rem', fontFamily: "'Crimson Text', serif" }}>Eşya Ver</div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {ITEMS.map((item) => (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onCheat({ item })}
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
            onClick={onDelete}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '8px',
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
        </div>
      )}
    </div>
  );
}

function UsersTab({ users }) {
  const [loadingId, setLoadingId] = useState(null);
  const [localUsers, setLocalUsers] = useState(users);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pushTitle, setPushTitle] = useState('Test Bildirimi');
  const [pushBody, setPushBody] = useState('Kader\'in Sesi push servisi çalışıyor.');
  const [pushResult, setPushResult] = useState(null);
  useEffect(() => setLocalUsers(users), [users]);

  const togglePremium = async (u) => {
    setLoadingId(u.id);
    try {
      const next = !u.is_premium;
      await adminToggleUserPremium(u.id, next);
      setLocalUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_premium: next } : x)));
    } catch (err) {
      alert(err.message);
    }
    setLoadingId(null);
  };

  const toggleSuspend = async (u) => {
    setLoadingId(u.id);
    try {
      const next = !u.is_suspended;
      await adminUpdateUserSuspension(u.id, next, next ? 'Yönetici askıya aldı' : '');
      setLocalUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_suspended: next } : x)));
    } catch (err) {
      alert(err.message);
    }
    setLoadingId(null);
  };

  const sendPush = async () => {
    if (!selectedUser) return;
    setLoadingId(`push-${selectedUser.id}`);
    setPushResult(null);
    try {
      const result = await adminSendTestPush(selectedUser.id, pushTitle, pushBody);
      setPushResult(result);
    } catch (err) {
      setPushResult({ error: err.message });
    }
    setLoadingId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {localUsers.map((u) => (
        <motion.div
          key={u.id}
          whileTap={{ scale: 0.99 }}
          onClick={() => setSelectedUser(u)}
          style={{
            padding: '0.85rem',
            borderRadius: '10px',
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
              {u.is_suspended && <span style={{ fontSize: '0.65rem', color: '#ff9a8a', border: '1px solid #ff9a8a', padding: '0.05rem 0.3rem', borderRadius: '4px' }}>Askıda</span>}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif" }}>
              {u.email || 'E-posta yok'} · {u.characterCount || 0} karakter · Misafir: {u.isGuest ? 'Evet' : 'Hayır'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--gold)', fontFamily: "'Crimson Text', serif", marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={10} /> Son aktif: {formatLastActive(u.last_active_at)} · Kayıt: {u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : 'Bilinmiyor'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'monospace', background: 'rgba(0,0,0,0.25)', padding: '0.25rem 0.45rem', borderRadius: '6px' }}>
              {u.firebase_uid?.slice(0, 12)}...
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); togglePremium(u); }}
              disabled={loadingId === u.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.55rem',
                borderRadius: '7px',
                border: `1px solid ${u.is_premium ? 'rgba(180,40,30,0.5)' : 'var(--gold)'}`,
                background: u.is_premium ? 'rgba(180,40,30,0.12)' : 'rgba(201,150,58,0.12)',
                color: u.is_premium ? '#ff9a8a' : 'var(--gold)',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontFamily: "'Cinzel', serif",
              }}
            >
              {u.is_premium ? <><Power size={11} /> Kaldır</> : <><Crown size={11} /> Premium</>}
            </motion.button>
          </div>
        </motion.div>
      ))}
      {localUsers.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Kullanıcı bulunmuyor.</div>}

      {selectedUser && (
        <div
          style={{
            marginTop: '1rem',
            border: '1px solid var(--gold)',
            borderRadius: '12px',
            padding: '1rem',
            background: 'rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 className="font-fantasy" style={{ color: 'var(--gold)', margin: 0 }}>{selectedUser.username || 'İsimsiz'} — Detay</h3>
            <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>Kapat</button>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", marginBottom: '0.75rem' }}>
            <div>E-posta: {selectedUser.email || '-'}</div>
            <div>UID: {selectedUser.firebase_uid || selectedUser.id}</div>
            <div>Karakter sayısı: {selectedUser.characterCount || 0}</div>
            <div>Kayıt: {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString('tr-TR') : '-'}</div>
            <div>Premium: {selectedUser.is_premium ? 'Evet' : 'Hayır'} {selectedUser.premium_until ? `(bitiş: ${new Date(selectedUser.premium_until).toLocaleDateString('tr-TR')})` : ''}</div>
            <div>FCM Token: {(selectedUser.fcmTokens?.length || selectedUser.fcmToken ? 1 : 0) > 0 ? 'Var' : 'Yok'}</div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleSuspend(selectedUser)}
              disabled={loadingId === selectedUser.id}
              style={{
                padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontFamily: "'Cinzel', serif",
                border: `1px solid ${selectedUser.is_suspended ? 'var(--gold)' : 'rgba(180,40,30,0.5)'}`,
                background: selectedUser.is_suspended ? 'rgba(201,150,58,0.12)' : 'rgba(180,40,30,0.12)',
                color: selectedUser.is_suspended ? 'var(--gold)' : '#ff9a8a',
              }}
            >
              {selectedUser.is_suspended ? 'Hesabı Aç' : 'Hesabı Askıya Al'}
            </motion.button>
          </div>

          <div style={{ color: 'var(--gold)', fontSize: '0.8rem', fontFamily: "'Cinzel', serif", marginBottom: '0.5rem' }}>Test Push Gönder</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="Başlık" style={inputStyle} />
            <input value={pushBody} onChange={(e) => setPushBody(e.target.value)} placeholder="İçerik" style={inputStyle} />
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={sendPush}
            disabled={loadingId === `push-${selectedUser.id}`}
            className="btn-dark"
            style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Bell size={14} /> {loadingId === `push-${selectedUser.id}` ? 'Gönderiliyor...' : 'Push Gönder'}
          </motion.button>
          {pushResult && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: pushResult.error ? '#ff9a8a' : '#7fd97f', fontFamily: "'Crimson Text', serif" }}>
              {pushResult.error ? pushResult.error : `Gönderildi: ${pushResult.sent || 0}, Başarısız: ${pushResult.failed || 0}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContentTab({ title, form, setForm, bodyKey, bodyPlaceholder, submitLabel, pushKey, pushLabel, onSubmit, items, onToggle, onDelete }) {
  return (
    <div>
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1rem',
          background: 'rgba(0,0,0,0.2)',
        }}
      >
        <h3 className="font-fantasy" style={{ color: 'var(--gold)', marginTop: 0, marginBottom: '0.75rem' }}>{title} Oluştur</h3>
        <input
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Başlık"
          style={{ ...inputStyle, width: '100%', marginBottom: '0.5rem' }}
        />
        <textarea
          value={form[bodyKey]}
          onChange={(e) => setForm((prev) => ({ ...prev, [bodyKey]: e.target.value }))}
          placeholder={bodyPlaceholder}
          rows={4}
          style={{ ...inputStyle, width: '100%', resize: 'vertical', marginBottom: '0.6rem' }}
        />
        {pushKey && (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: 'var(--gold)',
              fontSize: '0.8rem',
              fontFamily: "'Crimson Text', serif",
              marginBottom: '0.7rem',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={Boolean(form[pushKey])}
              onChange={(e) => setForm((prev) => ({ ...prev, [pushKey]: e.target.checked }))}
              style={{ accentColor: 'var(--gold)', cursor: 'pointer' }}
            />
            {pushLabel}
          </label>
        )}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onSubmit}
          style={{
            width: '100%',
            padding: '0.6rem',
            borderRadius: '8px',
            background: 'rgba(201,150,58,0.2)',
            border: '1px solid var(--gold)',
            color: 'var(--gold2)',
            fontFamily: "'Cinzel', serif",
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
          }}
        >
          <Plus size={16} /> {submitLabel}
        </motion.button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              padding: '0.9rem',
              borderRadius: '10px',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ minWidth: 0 }}>
                <div className="font-fantasy" style={{ color: item.active ? 'var(--gold2)' : 'var(--text-dim)', fontSize: '0.95rem' }}>
                  {item.title}
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginTop: '0.35rem', whiteSpace: 'pre-wrap', lineHeight: 1.35, fontFamily: "'Crimson Text', serif" }}>
                  {item.content || item.description}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontFamily: "'Crimson Text', serif" }}>
                  {item.created_at ? new Date(item.created_at).toLocaleString('tr-TR') : ''} · {item.active ? 'Aktif' : 'Pasif'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <button
                  onClick={() => onToggle(item)}
                  style={{
                    ...smallBtnStyle,
                    background: item.active ? 'rgba(180,40,30,0.12)' : 'rgba(40,140,80,0.12)',
                    borderColor: item.active ? 'rgba(180,40,30,0.45)' : 'rgba(40,140,80,0.45)',
                    color: item.active ? '#ff9a8a' : '#7fd97f',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Power size={12} /> {item.active ? 'Kapat' : 'Aç'}
                </button>
                <button
                  onClick={() => onDelete(item)}
                  style={{ ...smallBtnStyle, borderColor: 'rgba(180,40,30,0.45)', color: '#ff9a8a' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Henüz kayıt yok.</div>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: '0.35rem' }}>
        <input value={v} onChange={(e) => setV(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => onChange(v)} style={smallBtnStyle}>
          <Save size={13} />
        </motion.button>
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: '0.35rem' }}>
        <select value={v} onChange={(e) => setV(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => onChange(v)} style={smallBtnStyle}>
          <Save size={13} />
        </motion.button>
      </div>
    </div>
  );
}

function NumberField({ label, value, onApply }) {
  const [v, setV] = useState(value || 0);
  useEffect(() => setV(value || 0), [value]);
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: '0.35rem' }}>
        <input type="number" value={v} onChange={(e) => setV(Number(e.target.value))} style={{ ...inputStyle, flex: 1 }} />
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => onApply(v)} style={smallBtnStyle}>
          <Plus size={13} />
        </motion.button>
      </div>
    </div>
  );
}

const labelStyle = {
  color: 'var(--text-dim)',
  fontSize: '0.7rem',
  display: 'block',
  marginBottom: '0.25rem',
  fontFamily: "'Crimson Text', serif",
};

const inputStyle = {
  padding: '0.55rem 0.7rem',
  borderRadius: '8px',
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontFamily: "'Crimson Text', serif",
  fontSize: '0.85rem',
  boxSizing: 'border-box',
};

const smallBtnStyle = {
  padding: '0.4rem 0.55rem',
  borderRadius: '7px',
  background: 'rgba(201,150,58,0.12)',
  border: '1px solid var(--gold)',
  color: 'var(--gold)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

function DashboardTab({ stats }) {
  if (!stats) return <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Yükleniyor...</div>;
  const { totals, economy, daily } = stats;
  const maxMsg = Math.max(1, ...(daily || []).map((d) => d.messages));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { label: 'Kullanıcı', value: totals.users, icon: Users },
          { label: 'Karakter', value: totals.characters, icon: Shield },
          { label: 'Premium', value: totals.premiumUsers, icon: Crown },
          { label: 'Aktif Duyuru', value: totals.activeAnnouncements, icon: Megaphone },
          { label: 'Canlı Olay', value: totals.activeWorldEvents, icon: Globe },
          { label: 'Ort. Seviye', value: economy.avgLevel, icon: Star },
        ].map((s) => (
          <div key={s.label} style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(201,150,58,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)' }}>
              <s.icon size={17} />
            </div>
            <div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1rem', color: 'var(--gold2)' }}>{s.value}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div className="stone-card" style={{ padding: '1rem' }}>
          <div style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif", fontSize: '0.85rem', marginBottom: '0.5rem' }}>Ekonomi Özeti</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", lineHeight: 1.6 }}>
            <div>Toplam altın: {economy.totalGold.toLocaleString('tr-TR')}</div>
            <div>Toplam XP: {economy.totalXp.toLocaleString('tr-TR')}</div>
            <div>Ort. altın: {economy.avgGold.toLocaleString('tr-TR')}</div>
            <div>Ort. XP: {economy.avgXp.toLocaleString('tr-TR')}</div>
            <div>Baygın: {economy.downCount} · Ölü: {economy.deadCount}</div>
          </div>
        </div>

        <div className="stone-card" style={{ padding: '1rem' }}>
          <div style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif", fontSize: '0.85rem', marginBottom: '0.5rem' }}>Son 7 Gün Mesaj</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.35rem', height: '90px' }}>
            {(daily || []).map((d) => (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <div
                  title={`${d.date}: ${d.messages} mesaj`}
                  style={{
                    width: '100%',
                    height: `${Math.max(4, (d.messages / maxMsg) * 80)}px`,
                    background: 'rgba(201,150,58,0.6)',
                    borderRadius: '3px 3px 0 0',
                    minHeight: '4px',
                  }}
                />
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', transform: 'rotate(-45deg)', transformOrigin: 'top left', marginTop: '0.4rem' }}>{d.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="stone-card" style={{ padding: '1rem' }}>
        <div style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif", fontSize: '0.85rem', marginBottom: '0.5rem' }}>Son 7 Gün Günlük Özet</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {(daily || []).map((d) => (
            <div key={d.date} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif" }}>
              <span>{d.date}</span>
              <span>👤 {d.users}</span>
              <span>🛡️ {d.characters}</span>
              <span>💬 {d.messages}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BalanceTab({ settings, draft, setDraft, onSave }) {
  if (!settings) return <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Yükleniyor...</div>;

  const fields = [
    { key: 'freeDailyTurns', label: 'Günlük Ücretsiz Hamle', helper: 'Her gün resetlenen ücretsiz hamle hakkı' },
    { key: 'bonusPerAd', label: 'Reklam Başına Bonus Hamle', helper: 'Ödüllü reklam izleyince kazanılan ekstra hamle' },
    { key: 'maxBonusAdsPerDay', label: 'Günlük Max Bonus Reklam', helper: 'Bir günde izlenebilecek maksimum ödüllü reklam' },
    { key: 'premiumDailyWheelSpins', label: 'Premium Günlük Çark Hakkı', helper: 'Premium kullanıcıların günlük çark hakları' },
    { key: 'adRewardGold', label: 'Reklam Ödülü Altın', helper: 'Her X hamlede verilen reklam ödülü altın miktarı' },
    { key: 'adRewardXp', label: 'Reklam Ödülü XP', helper: 'Reklam ödülü XP miktarı' },
    { key: 'shopPriceMultiplier', label: 'Mağaza Fiyat Çarpanı', helper: '1 = normal, 0.5 = yarım fiyat' },
    { key: 'goldRewardMin', label: 'Min Altın Ödülü', helper: 'Hikâyede verilecek minimum altın' },
    { key: 'goldRewardMax', label: 'Max Altın Ödülü', helper: 'Hikâyede verilecek maksimum altın' },
  ];

  return (
    <div className="stone-card" style={{ padding: '1rem' }}>
      <div style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif", fontSize: '0.9rem', marginBottom: '1rem' }}>Oyun Dengesi Ayarları</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {fields.map((f) => (
          <div key={f.key}>
            <label style={labelStyle}>{f.label}</label>
            <input
              type="number"
              value={draft[f.key] ?? settings[f.key] ?? 0}
              onChange={(e) => setDraft((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))}
              style={{ ...inputStyle, width: '100%' }}
            />
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: "'Crimson Text', serif", marginTop: '0.2rem' }}>{f.helper}</div>
          </div>
        ))}
      </div>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onSave}
        style={{ width: '100%', marginTop: '1rem', padding: '0.65rem', borderRadius: '8px', background: 'rgba(201,150,58,0.2)', border: '1px solid var(--gold)', color: 'var(--gold2)', fontFamily: "'Cinzel', serif", fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
      >
        <Save size={16} /> Kaydet
      </motion.button>
    </div>
  );
}

function ContentManagerTab({ items, setItems, contentType, setContentType, contentList }) {
  const [editing, setEditing] = useState(null);
  const [newItem, setNewItem] = useState({ id: '', name: '', description: '', type: 'misc', value: 0, rarity: 'Common', image: '', shopVisible: false });
  const [saving, setSaving] = useState(false);

  const saveItem = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await adminUpdateItem(editing.id, editing);
      setItems((prev) => prev.map((i) => (i.id === editing.id ? { ...editing } : i)));
      setEditing(null);
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  const createItem = async () => {
    if (!newItem.id || !newItem.name) return;
    setSaving(true);
    try {
      await adminCreateItem(newItem);
      setItems((prev) => [...prev, { ...newItem }]);
      setNewItem({ id: '', name: '', description: '', type: 'misc', value: 0, rarity: 'Common', image: '', shopVisible: false });
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {[
          { id: 'scenarios', label: 'Senaryolar' },
          { id: 'races', label: 'Irklar' },
          { id: 'classes', label: 'Sınıflar' },
          { id: 'items', label: 'Eşyalar' },
        ].map((t) => (
          <motion.button
            key={t.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => { playClick(); setContentType(t.id); setEditing(null); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '8px',
              border: `1px solid ${contentType === t.id ? 'var(--gold)' : 'var(--border)'}`,
              background: contentType === t.id ? 'rgba(201,150,58,0.15)' : 'rgba(0,0,0,0.2)',
              color: contentType === t.id ? 'var(--gold2)' : 'var(--text)',
              fontFamily: "'Cinzel', serif",
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </motion.button>
        ))}
      </div>

      {contentType !== 'items' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {(contentList || []).map((c) => (
            <div key={c.id} style={{ padding: '0.85rem', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
              <div className="font-fantasy" style={{ color: 'var(--gold2)', fontSize: '0.92rem' }}>{c.title || c.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", marginTop: '0.3rem' }}>{c.description}</div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
            {items.map((item) => (
              <div key={item.id} style={{ padding: '0.85rem', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
                {editing?.id === item.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} style={inputStyle} placeholder="Ad" />
                    <input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} style={inputStyle} placeholder="Açıklama" />
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input type="number" value={editing.value} onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })} style={inputStyle} placeholder="Değer" />
                      <select value={editing.rarity} onChange={(e) => setEditing({ ...editing, rarity: e.target.value })} style={inputStyle}>
                        {['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-dim)', fontSize: '0.78rem', fontFamily: "'Crimson Text', serif" }}>
                      <input type="checkbox" checked={!!editing.shopVisible} onChange={(e) => setEditing({ ...editing, shopVisible: e.target.checked })} /> Mağazada satılsın
                    </label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={saveItem} disabled={saving} style={{ ...smallBtnStyle, flex: 1 }}><Save size={13} /> Kaydet</motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEditing(null)} style={{ ...smallBtnStyle, background: 'transparent' }}>İptal</motion.button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="font-fantasy" style={{ color: 'var(--gold2)', fontSize: '0.92rem' }}>{item.name} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({item.id})</span></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif" }}>{item.description}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--gold)', marginTop: '0.25rem' }}>{item.rarity} · {item.value} altın · Mağaza: {item.shopVisible ? 'Evet' : 'Hayır'}</div>
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEditing({ ...item })} style={smallBtnStyle}><Save size={13} /></motion.button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="stone-card" style={{ padding: '1rem' }}>
            <div style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif", fontSize: '0.85rem', marginBottom: '0.75rem' }}>Yeni Eşya Ekle</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input value={newItem.id} onChange={(e) => setNewItem({ ...newItem, id: e.target.value })} style={{ ...inputStyle, flex: 1 }} placeholder="id" />
                <input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} style={{ ...inputStyle, flex: 2 }} placeholder="Ad" />
              </div>
              <input value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} style={inputStyle} placeholder="Açıklama" />
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input type="number" value={newItem.value} onChange={(e) => setNewItem({ ...newItem, value: Number(e.target.value) })} style={inputStyle} placeholder="Değer" />
                <select value={newItem.rarity} onChange={(e) => setNewItem({ ...newItem, rarity: e.target.value })} style={inputStyle}>
                  {['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-dim)', fontSize: '0.78rem', fontFamily: "'Crimson Text', serif" }}>
                <input type="checkbox" checked={!!newItem.shopVisible} onChange={(e) => setNewItem({ ...newItem, shopVisible: e.target.checked })} /> Mağazada satılsın
              </label>
              <motion.button whileTap={{ scale: 0.95 }} onClick={createItem} disabled={saving} style={{ ...smallBtnStyle, width: '100%', marginTop: '0.3rem' }}><Plus size={14} /> Ekle</motion.button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
