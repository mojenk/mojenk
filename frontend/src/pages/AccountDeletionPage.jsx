import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Particles from '../components/Particles';
import { ArrowLeft, Trash2 } from 'lucide-react';

export default function AccountDeletionPage() {
  const navigate = useNavigate();

  const sectionStyle = {
    marginBottom: '1.5rem',
  };

  const headingStyle = {
    color: 'var(--gold)',
    fontFamily: "'Cinzel', serif",
    fontSize: '1rem',
    marginBottom: '0.5rem',
  };

  const textStyle = {
    color: 'var(--text-muted)',
    fontFamily: "'Crimson Text', serif",
    fontSize: '0.95rem',
    lineHeight: 1.6,
  };

  const linkStyle = {
    color: 'var(--gold)',
    textDecoration: 'underline',
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Particles type="ember" count={10} />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate(-1)}
          style={{
            width: '2.2rem',
            height: '2.2rem',
            borderRadius: '8px',
            background: 'rgba(92,74,42,0.2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={20} />
        </motion.button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Trash2 size={22} style={{ color: 'var(--gold)' }} />
          <span
            className="font-fantasy"
            style={{ fontSize: '1.1rem', color: 'var(--text)', letterSpacing: '0.05em' }}
          >
            Hesap ve Veri Silme
          </span>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem',
          maxWidth: '720px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(20,16,12,0.85)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.25rem',
          }}
        >
          <p style={{ ...textStyle, marginBottom: '1rem' }}>
            Uygulama: <strong style={{ color: 'var(--text)' }}>Kader'in Sesi</strong> — Geliştirici: Kader'in Sesi
          </p>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>Uygulama İçinden Silme</h2>
            <p style={textStyle}>
              Kader'in Sesi uygulamasına giriş yaptıktan sonra:
            </p>
            <ol style={{ ...textStyle, paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
              <li>Ana ekrandan <strong>Ayarlar</strong> sayfasına git</li>
              <li>En altta <strong>"Tehlikeli Bölge"</strong> bölümündeki <strong>"Hesabımı Sil"</strong> butonuna dokun</li>
              <li>Onay adımlarını tamamla</li>
            </ol>
            <p style={textStyle}>
              Bu işlem hesabınızı ve tüm ilişkili verileri <strong>anında ve kalıcı olarak</strong> siler.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>Uygulamaya Erişemiyorsanız (Web Üzerinden Talep)</h2>
            <p style={textStyle}>
              Uygulamayı silmiş veya hesabınıza erişemiyor olsanız bile, hesap e-postanızı belirterek aşağıdaki adrese talep gönderebilirsiniz:
            </p>
            <p style={textStyle}>
              E-posta: <a href="mailto:destek@kaderinsesi.app?subject=Hesap%20Silme%20Talebi" style={linkStyle}>destek@kaderinsesi.app</a>
            </p>
            <p style={textStyle}>
              Talebiniz en geç <strong>30 gün</strong> içinde işleme alınır ve verileriniz silinir.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>Silinen Veriler</h2>
            <ul style={{ ...textStyle, paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
              <li>Hesap bilgileri (kullanıcı adı, e-posta, benzersiz kimlik)</li>
              <li>Tüm karakterler, envanter, NPC ve görev verileri</li>
              <li>Tüm oyun oturumları ve mesaj geçmişi</li>
              <li>Google/Firebase kimlik doğrulama kaydı</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>Saklanan Veriler</h2>
            <p style={textStyle}>
              Yasal yükümlülükler veya dolandırıcılık önleme amacıyla bazı anonimleştirilmiş kayıtlar (ör. reklam/istatistik logları) sınırlı bir süre için saklanabilir; bu veriler kişisel kimlikle ilişkilendirilmez.
            </p>
          </div>
        </motion.div>

        <div style={{ height: '2rem' }} />
      </div>
    </div>
  );
}
