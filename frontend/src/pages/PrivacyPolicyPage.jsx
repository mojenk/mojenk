import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Particles from '../components/Particles';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
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

      {/* Header */}
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
          <Shield size={22} style={{ color: 'var(--gold)' }} />
          <span
            className="font-fantasy"
            style={{ fontSize: '1.1rem', color: 'var(--text)', letterSpacing: '0.05em' }}
          >
            Gizlilik Politikası
          </span>
        </div>
      </div>

      {/* Content */}
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
            Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
          </p>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>1. Genel Bilgi</h2>
            <p style={textStyle}>
              Kader'in Sesi uygulamasını kullandığınızda, kişisel verilerinizin gizliliği bizim için önemlidir. Bu politika, hangi verileri topladığımızı, nasıl kullandığımızı ve haklarınızı açıklar.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>2. Toplanan Veriler</h2>
            <p style={textStyle}>
              Uygulama aşağıdaki verileri toplayabilir:
            </p>
            <ul style={{ ...textStyle, paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
              <li>Google hesap bilgileri (oturum açmak için e-posta adresi ve benzersiz kullanıcı ID)</li>
              <li>Oyun içi karakter, oturum ve mesaj verileri</li>
              <li>Cihaz modeli, işletim sistemi sürümü ve hata raporları</li>
              <li>Reklam performansı ve etkileşim verileri</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>3. Verilerin Kullanımı</h2>
            <p style={textStyle}>
              Toplanan veriler şu amaçlarla kullanılır:
            </p>
            <ul style={{ ...textStyle, paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
              <li>Oyun hesabınızı oluşturmak ve yönetmek</li>
              <li>Oyun ilerlemenizi kaydetmek ve senkronize etmek</li>
              <li>Uygulama performansını izlemek ve hataları düzeltmek</li>
              <li>Kişiselleştirilmiş reklamlar göstermek (tercihlerinize bağlı)</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>4. Üçüncü Taraf Hizmetleri</h2>
            <p style={textStyle}>
              Uygulama aşağıdaki üçüncü taraf hizmetlerini kullanır:
            </p>
            <ul style={{ ...textStyle, paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
              <li><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" style={linkStyle}>Google Firebase</a> (kimlik doğrulama, veritabanı, analiz)</li>
              <li><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" style={linkStyle}>Google AdMob</a> (reklam gösterimi)</li>
              <li><a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer" style={linkStyle}>Google Gemini API</a> (AI destekli anlatı)</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>5. Çocukların Gizliliği</h2>
            <p style={textStyle}>
              Bu uygulama 13 yaş altı çocuklar için tasarlanmamıştır. 13 yaş altı bir kullanıcıdan bilerek veri toplamayız. Eğer böyle bir durum fark ederseniz bizimle iletişime geçin.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>6. Veri Saklama ve Silme</h2>
            <p style={textStyle}>
              Oyun verileriniz Firebase sunucularında saklanır. Hesabınızı ve verilerinizi silmek isterseniz uygulama içindeki ayarlardan veya bizimle iletişime geçerek talepte bulunabilirsiniz.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>7. Haklarınız</h2>
            <p style={textStyle}>
              Kullanıcı olarak verilerinize erişim, düzeltme ve silme hakkına sahipsiniz. GDPR veya KVKK kapsamında haklarınızı kullanmak için bizimle iletişime geçebilirsiniz.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>8. İletişim</h2>
            <p style={textStyle}>
              Sorularınız veya talepleriniz için:
              <br />
              E-posta: <a href="mailto:destek@kaderinsesi.app" style={linkStyle}>destek@kaderinsesi.app</a>
            </p>
          </div>
        </motion.div>

        <div style={{ height: '2rem' }} />
      </div>
    </div>
  );
}
