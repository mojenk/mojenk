import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  adminListCharacters, adminCheatCharacter, adminUpdateCharacter,
  adminDeleteCharacter, adminListUsers,
  adminListAnnouncements, adminCreateAnnouncement, adminToggleAnnouncement, adminDeleteAnnouncement,
  adminListWorldEvents, adminCreateWorldEvent, adminToggleWorldEvent, adminDeleteWorldEvent,
} from '../utils/api';
import { playClick, playMagic } from '../utils/sounds';

const RACES = ['İnsan', 'Elf', 'Cüce', 'Yarı-Ork', 'Hobit', 'İblissoyu'];
const CLASSES = ['Savaşçı', 'Büyücü', 'Hırsız', 'Rahip', 'Avcı', 'Barbar'];
const STATS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const ITEMS = [
  { id: 'small_healing_potion', name: 'Küçük İksir', description: '2d4+2 iyileştirir', type: 'potion', value: 25 },
  { id: 'great_healing_potion', name: 'Büyük İksir', description: '4d4+4 iyileştirir', type: 'potion', value: 75 },
  { id: 'gold_bag', name: 'Altın Torbası', description: '100 altın', type: 'misc', value: 100 },
];

export default function AdminPage({ user }) {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('characters');
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({ race: '', class: '', status: '', minLevel: '' });
  const [announcements, setAnnouncements] = useState([]);
  const [worldEvents, setWorldEvents] = useState([]);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', type: 'info' });
  const [worldEventForm, setWorldEventForm] = useState({ title: '', description: '', type: 'event' });

  const loadCharacters = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListCharacters({ username: search, ...filters });
      setCharacters(data.characters || []);
    } catch (err) { setError(err.message); }
    setLoading(false);
  }, [search, filters]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await adminListUsers();
      setUsers(data.users || []);
    } catch (err) { setError(err.message); }
  }, []);

  useEffect(() => { loadCharacters(); }, [loadCharacters]);
  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => {
    Promise.all([adminListAnnouncements(), adminListWorldEvents()])
      .then(([announcementData, eventData]) => {
        setAnnouncements(announcementData.announcements || []);
        setWorldEvents(eventData.events || []);
      })
      .catch((err) => setError(err.message));
  }, []);

  const loadAdminContent = async () => {
    const [announcementData, eventData] = await Promise.all([adminListAnnouncements(), adminListWorldEvents()]);
    setAnnouncements(announcementData.announcements || []);
    setWorldEvents(eventData.events || []);
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) return;
    await adminCreateAnnouncement(announcementForm);
    setAnnouncementForm({ title: '', content: '', type: 'info' });
    setMessage('Sistem duyurusu yayınlandı');
    await loadAdminContent();
  };

  const handleCreateWorldEvent = async () => {
    if (!worldEventForm.title.trim() || !worldEventForm.description.trim()) return;
    await adminCreateWorldEvent(worldEventForm);
    setWorldEventForm({ title: '', description: '', type: 'event' });
    setMessage('Dünya olayı etkinleştirildi');
    await loadAdminContent();
  };

  const handleCheat = async (payload) => {
    if (!selected) return;
    try {
      await adminCheatCharacter(selected.id, payload);
      playMagic();
      setMessage('İşlem başarılı');
      loadCharacters();
    } catch (err) { setError(err.message); }
  };

  const handleUpdate = async (payload) => {
    if (!selected) return;
    try {
      await adminUpdateCharacter(selected.id, payload);
      playMagic();
      setMessage('Karakter güncellendi');
      loadCharacters();
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`${selected.name} karakterini kalıcı olarak sil?`)) return;
    try {
      await adminDeleteCharacter(selected.id);
      setSelected(null);
      loadCharacters();
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="stone-bg" style={{ minHeight: '100dvh', padding: '1rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h1 className="font-fantasy gold-text" style={{ margin: 0, fontSize: '1.3rem' }}>Tanrı Modu</h1>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => { playClick(); navigate('/'); }} style={btnStyle}>
          Geri
        </motion.button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {[
          { id: 'characters', label: 'Karakterler' },
          { id: 'users', label: 'Kullanıcılar' },
          { id: 'announcements', label: 'Duyurular' },
          { id: 'world-events', label: 'Dünya Olayları' },
        ].map(t => (
          <motion.button
            key={t.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => { playClick(); setActiveTab(t.id); }}
            style={{
              ...btnStyle,
              background: activeTab === t.id ? 'rgba(201,150,58,0.25)' : 'rgba(30,25,20,0.5)',
              borderColor: activeTab === t.id ? 'var(--gold)' : 'var(--border)',
            }}
          >
            {t.label}
          </motion.button>
        ))}
      </div>

      {error && <div style={msgStyle('#e57373')}>{error}</div>}
      {message && <div style={msgStyle('#7fd97f')}>{message}</div>}

      {activeTab === 'characters' && (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Karakter veya kullanıcı ara..."
            style={{
              width: '100%', padding: '0.6rem', borderRadius: '8px',
              background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)',
              color: 'var(--text)', fontFamily: "'Crimson Text', serif", marginBottom: '0.75rem',
            }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
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
            <input type="number" min="1" placeholder="Min. seviye" value={filters.minLevel} onChange={(e) => setFilters((prev) => ({ ...prev, minLevel: e.target.value }))} style={inputStyle} />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>Yükleniyor...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {characters.map(c => (
                <motion.button
                  key={c.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { playClick(); setSelected(c); }}
                  style={{
                    textAlign: 'left', padding: '0.6rem 0.8rem', borderRadius: '8px',
                    background: selected?.id === c.id ? 'rgba(201,150,58,0.15)' : 'rgba(30,25,20,0.4)',
                    border: `1px solid ${selected?.id === c.id ? 'var(--gold)' : 'var(--border)'}`,
                    color: 'var(--text)', cursor: 'pointer',
                  }}
                >
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.85rem' }}>{c.name} <span style={{ color: 'var(--text-dim)' }}>({c.owner_username})</span></div>
                  <div style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    {c.race} {c.class} · L{c.level} · {c.gold}🪙 · {c.hp}/{c.max_hp} HP
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {selected && (
            <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
              <h3 className="font-fantasy" style={{ color: 'var(--gold)', marginTop: 0 }}>{selected.name} — Düzenle</h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Field key={selected.id + '-name'} label="İsim" value={selected.name} onChange={(v) => handleUpdate({ name: v })} />
                <Select key={selected.id + '-race'} label="Irk" value={selected.race} options={RACES} onChange={(v) => handleUpdate({ race: v })} />
                <Select key={selected.id + '-class'} label="Sınıf" value={selected.class} options={CLASSES} onChange={(v) => handleUpdate({ class: v })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {STATS.map(s => (
                  <NumberField
                    key={selected.id + '-' + s}
                    label={s.charAt(0).toUpperCase() + s.slice(1)}
                    value={selected[s]}
                    onApply={(v) => handleUpdate({ [s]: v })}
                  />
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <NumberField label="Altın (+)" value={0} onApply={(v) => handleCheat({ gold: v })} />
                <NumberField label="XP (+)" value={0} onApply={(v) => handleCheat({ xp: v })} />
                <NumberField label="Seviye (+)" value={0} onApply={(v) => handleCheat({ level: v })} />
                <NumberField label="Perk Puanı (+)" value={0} onApply={(v) => handleCheat({ perkPoint: v })} />
                <NumberField label="HP (+)" value={0} onApply={(v) => handleCheat({ hp: v })} />
                <NumberField label="Max HP (+)" value={0} onApply={(v) => handleCheat({ maxHp: v })} />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem', marginBottom: '0.35rem' }}>Eşya Ver</div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {ITEMS.map(item => (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCheat({ item })}
                      style={btnStyle}
                    >
                      {item.name}
                    </motion.button>
                  ))}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleDelete}
                style={{ ...btnStyle, background: 'rgba(229,57,53,0.15)', borderColor: '#e53935', color: '#ff8a80', width: '100%' }}
              >
                Karakteri Sil
              </motion.button>
            </div>
          )}
        </>
      )}

      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {users.map(u => (
            <div key={u.id} style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', background: 'rgba(30,25,20,0.4)', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.82rem' }}>{u.username}</div>
              <div style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                {u.email || 'E-posta yok'} · {u.firebase_uid?.slice(0, 12)}...
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'announcements' && (
        <AdminContentPanel
          title="Sistem Duyurusu"
          form={announcementForm}
          setForm={setAnnouncementForm}
          bodyKey="content"
          bodyPlaceholder="Oyunculara gösterilecek duyuru..."
          submitLabel="Duyuruyu Yayınla"
          onSubmit={handleCreateAnnouncement}
          items={announcements}
          onToggle={async (item) => { await adminToggleAnnouncement(item.id, !item.active); await loadAdminContent(); }}
          onDelete={async (item) => { await adminDeleteAnnouncement(item.id); await loadAdminContent(); }}
        />
      )}

      {activeTab === 'world-events' && (
        <AdminContentPanel
          title="Dünya Olayı"
          form={worldEventForm}
          setForm={setWorldEventForm}
          bodyKey="description"
          bodyPlaceholder="Bu olay aktif maceraların AI bağlamına eklenecek..."
          submitLabel="Dünya Olayını Başlat"
          onSubmit={handleCreateWorldEvent}
          items={worldEvents}
          onToggle={async (item) => { await adminToggleWorldEvent(item.id, !item.active); await loadAdminContent(); }}
          onDelete={async (item) => { await adminDeleteWorldEvent(item.id); await loadAdminContent(); }}
        />
      )}
    </div>
  );
}

function AdminContentPanel({ title, form, setForm, bodyKey, bodyPlaceholder, submitLabel, onSubmit, items, onToggle, onDelete }) {
  return (
    <div>
      <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)' }}>
        <h3 className="font-fantasy" style={{ color: 'var(--gold)', marginTop: 0 }}>{title} Oluştur</h3>
        <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Başlık" style={{ ...inputStyle, width: '100%', marginBottom: '0.5rem' }} />
        <textarea value={form[bodyKey]} onChange={(e) => setForm((prev) => ({ ...prev, [bodyKey]: e.target.value }))} placeholder={bodyPlaceholder} rows={5} style={{ ...inputStyle, width: '100%', resize: 'vertical', marginBottom: '0.5rem' }} />
        <motion.button whileTap={{ scale: 0.96 }} onClick={onSubmit} style={{ ...btnStyle, width: '100%', borderColor: 'var(--gold)', color: 'var(--gold)' }}>
          {submitLabel}
        </motion.button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {items.map((item) => (
          <div key={item.id} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(30,25,20,0.45)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div>
                <div className="font-fantasy" style={{ color: item.active ? 'var(--gold)' : 'var(--text-dim)' }}>{item.title}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '0.3rem', whiteSpace: 'pre-wrap' }}>{item.content || item.description}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button onClick={() => onToggle(item)} style={smallBtnStyle}>{item.active ? 'Pasifleştir' : 'Aktifleştir'}</button>
                <button onClick={() => onDelete(item)} style={{ ...smallBtnStyle, borderColor: '#e57373', color: '#e57373' }}>Sil</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  const [v, setV] = useState(value);
  return (
    <div>
      <label style={{ color: 'var(--text-dim)', fontSize: '0.68rem', display: 'block', marginBottom: '0.2rem' }}>{label}</label>
      <div style={{ display: 'flex', gap: '0.3rem' }}>
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          style={{
            flex: 1, padding: '0.35rem', borderRadius: '6px',
            background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)', color: 'var(--text)',
          }}
        />
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => onChange(v)} style={smallBtnStyle}>Kaydet</motion.button>
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange }) {
  const [v, setV] = useState(value);
  return (
    <div>
      <label style={{ color: 'var(--text-dim)', fontSize: '0.68rem', display: 'block', marginBottom: '0.2rem' }}>{label}</label>
      <div style={{ display: 'flex', gap: '0.3rem' }}>
        <select
          value={v}
          onChange={(e) => setV(e.target.value)}
          style={{
            flex: 1, padding: '0.35rem', borderRadius: '6px',
            background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)', color: 'var(--text)',
          }}
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => onChange(v)} style={smallBtnStyle}>Kaydet</motion.button>
      </div>
    </div>
  );
}

function NumberField({ label, value, onApply }) {
  const [v, setV] = useState(value);
  return (
    <div>
      <label style={{ color: 'var(--text-dim)', fontSize: '0.68rem', display: 'block', marginBottom: '0.2rem' }}>{label}</label>
      <div style={{ display: 'flex', gap: '0.3rem' }}>
        <input
          type="number"
          value={v}
          onChange={(e) => setV(Number(e.target.value))}
          style={{
            flex: 1, padding: '0.35rem', borderRadius: '6px',
            background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)', color: 'var(--text)',
          }}
        />
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => onApply(v)} style={smallBtnStyle}>+</motion.button>
      </div>
    </div>
  );
}

const btnStyle = {
  padding: '0.45rem 0.8rem', borderRadius: '8px',
  background: 'rgba(30,25,20,0.6)', border: '1px solid var(--border)',
  color: 'var(--text)', fontFamily: "'Cinzel', serif", fontSize: '0.72rem',
  cursor: 'pointer',
};

const smallBtnStyle = {
  padding: '0.3rem 0.5rem', borderRadius: '6px',
  background: 'rgba(201,150,58,0.15)', border: '1px solid var(--gold)',
  color: 'var(--gold)', fontFamily: "'Crimson Text', serif", fontSize: '0.7rem',
  cursor: 'pointer',
};

const inputStyle = {
  padding: '0.55rem',
  borderRadius: '7px',
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontFamily: "'Crimson Text', serif",
  boxSizing: 'border-box',
};

function msgStyle(color) {
  return {
    padding: '0.5rem', borderRadius: '6px', marginBottom: '0.75rem',
    background: color + '15', border: `1px solid ${color}40`, color,
    fontFamily: "'Crimson Text', serif", fontSize: '0.85rem', textAlign: 'center',
  };
}
