// Macera paylaşım kartı: canvas ile 1080x1350 (4:5) görsel üretir.
// Harici kütüphane yok; sayfadaki Cinzel/Crimson Text fontları kullanılır.

const STORE_URL = 'https://play.google.com/store/apps/details?id=com.kaderinsesi.app';

const STR = {
  tr: {
    gameTitle: "KADER'İN SESİ",
    tagline: 'AI Destekli Macera RPG',
    cta: 'Sen de kaderini yaz — ücretsiz oyna',
    storyLabel: 'MACERADAN BİR AN',
  },
  en: {
    gameTitle: 'VOICE OF DESTINY',
    tagline: 'AI-Powered Adventure RPG',
    cta: 'Write your own fate — play for free',
    storyLabel: 'A MOMENT FROM THE ADVENTURE',
  },
};

function wrapText(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Alıntıyı karta sığacak şekilde kırp (son cümleyi korumaya çalışır)
function trimQuote(text, maxChars = 320) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const lastDot = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
  if (lastDot > maxChars * 0.5) return cut.slice(0, lastDot + 1);
  return `${cut.trimEnd()}…`;
}

export async function generateShareCardBlob({ quote, characterName, lang = 'tr' }) {
  await document.fonts.ready.catch(() => {});
  const s = STR[lang] || STR.tr;

  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Arka plan
  ctx.fillStyle = '#0d0a06';
  ctx.fillRect(0, 0, W, H);

  // İnce altın çerçeve
  ctx.strokeStyle = 'rgba(201,162,39,0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.strokeStyle = 'rgba(201,162,39,0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(52, 52, W - 104, H - 104);

  // Vinyet
  const grad = ctx.createRadialGradient(W / 2, H * 0.42, 120, W / 2, H * 0.42, H * 0.75);
  grad.addColorStop(0, 'rgba(201,162,39,0.07)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;

  // Başlık
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8c15a';
  ctx.font = '700 84px Cinzel, serif';
  ctx.fillText(s.gameTitle, cx, 200);

  // Zar ikonu yerine basit d20 işareti
  ctx.font = '400 52px serif';
  ctx.fillStyle = 'rgba(232,193,90,0.9)';
  ctx.fillText('⚄', cx, 292);

  ctx.fillStyle = '#b9a26a';
  ctx.font = 'italic 400 38px "Crimson Text", serif';
  ctx.fillText(s.tagline, cx, 356);

  // Ayraç
  ctx.fillStyle = 'rgba(201,162,39,0.7)';
  ctx.fillRect(cx - 90, 402, 180, 3);

  // Hikaye etiketi
  ctx.fillStyle = 'rgba(216,201,168,0.75)';
  ctx.font = '600 30px Cinzel, serif';
  ctx.fillText(s.storyLabel, cx, 472);

  // Alıntı
  const body = trimQuote(quote);
  ctx.font = 'italic 400 46px "Crimson Text", serif';
  ctx.fillStyle = '#efe6cf';
  const lines = wrapText(ctx, `“${body}”`, W - 220);
  const lineHeight = 66;
  let y = 560;
  for (const line of lines) {
    ctx.fillText(line, cx, y);
    y += lineHeight;
  }

  // Kahraman adı
  if (characterName) {
    ctx.font = '600 34px Cinzel, serif';
    ctx.fillStyle = '#c9a227';
    ctx.fillText(`— ${characterName} —`, cx, y + 60);
    y += 60;
  }

  // Alt CTA alanı
  const ctaY = H - 210;
  ctx.fillStyle = 'rgba(201,162,39,0.7)';
  ctx.fillRect(cx - 90, ctaY, 180, 3);

  ctx.font = 'italic 400 40px "Crimson Text", serif';
  ctx.fillStyle = '#d8c9a8';
  ctx.fillText(s.cta, cx, ctaY + 74);

  ctx.font = '600 30px Cinzel, serif';
  ctx.fillStyle = 'rgba(232,193,90,0.85)';
  ctx.fillText('play.google.com → Kader’in Sesi', cx, ctaY + 136);

  return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

// Kartı paylaş: Web Share API (dosyalı) → metin paylaşımı → indirme fallback.
export async function shareAdventureCard({ quote, characterName, lang = 'tr' }) {
  const blob = await generateShareCardBlob({ quote, characterName, lang });
  if (!blob) return { ok: false, method: 'none' };

  const file = new File([blob], 'kaderin-sesi-macera.png', { type: 'image/png' });
  const shareText = lang === 'en'
    ? `My adventure in Voice of Destiny — an AI RPG. ${STORE_URL}`
    : `Kader'in Sesi'ndeki maceram — AI destekli RPG. ${STORE_URL}`;

  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text: shareText, title: STR[lang]?.gameTitle || STR.tr.gameTitle });
      return { ok: true, method: 'share-file' };
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return { ok: false, method: 'aborted' };
  }

  try {
    if (navigator.share) {
      await navigator.share({ text: shareText, title: STR[lang]?.gameTitle || STR.tr.gameTitle });
      return { ok: true, method: 'share-text' };
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return { ok: false, method: 'aborted' };
  }

  // Fallback: görseli indir
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kaderin-sesi-macera.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return { ok: true, method: 'download' };
}
