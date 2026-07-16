const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { grantXpAndLevelUp } = require('../utils/leveling');
const { determineFollowerRole, followerMaxHp, applyAllFollowersMoodEvent } = require('../utils/follower');
const { getSetting } = require('../settings');
const { deleteCharacterCascade } = require('../utils/deleteCharacterCascade');
const { verifyFirebaseToken } = require('../middleware/auth');
const { firestore, docData, serverTimestamp } = require('../firestore');

let genAI;
async function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || await getSetting('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

async function getModel(modelName = 'gemini-2.5-flash', systemInstruction = null, generationConfig = {}) {
  const ai = await getGenAI();
  const config = {
    model: modelName,
    generationConfig: {
      maxOutputTokens: 2000,
      ...generationConfig,
    },
  };
  if (systemInstruction) {
    config.systemInstruction = { parts: [{ text: systemInstruction }] };
  }
  return ai.getGenerativeModel(config);
}

const SUMMARY_INTERVAL = 10;
const RECENT_KEEP = 8;
const AI_TIMEOUT_MS = 30000;
const MAX_RETRIES = 1;

async function buildSystem(character, storySummary, sessionTitle, inventory, language = 'tr', knownNpcs = [], activeQuests = []) {
  const mod = v => Math.floor((v - 10) / 2);
  const fmt = v => (v >= 0 ? '+' : '') + v;

  const weaponList = (inventory || []).filter(i => i.type === 'weapon').map(i => `${i.name} (${i.description})`).join(', ') || 'Yumruk (1d4)';
  const armorList = (inventory || []).filter(i => i.type === 'armor').map(i => `${i.name} (${i.description})`).join(', ') || 'Yok';
  const potionList = (inventory || []).filter(i => i.type === 'potion').map(i => `${i.name}: ${i.description}`).join(', ');

  let statusText = '';
  if (character.status === 'unconscious') {
    statusText = `\n\n⚠️ KARAKTER BAYGIN! Başarılı kurtarma zarları: ${character.death_saves_success}/3, Başarısız: ${character.death_saves_fail}/3`;
  } else if (character.status === 'dead') {
    statusText = '\n\n💀 KARAKTER ÖLÜ. Macera sona erdi.';
  }

  const raceTraits = {
    'İnsan': 'Uyarlanabilir, cesur, kısa ömürlü ama kararlı. İnsan kasabalara ve krallıklara uyum sağlar.',
    'Elf': 'Uzun kulaklı, ince yüzlü, doğayla iç içe, yaşlı ve bilge. Ormanlarda, ağaçların arasında rahat hareket eder. Elf gözleri karanlıkta daha iyi görür.',
    'Cüce': 'Kısa boylu, sakallı, gururlu, maden ve taş işlerinde usta. Dağlarda ve zindanlarda kendine ait bir kültürü vardır. Cüceler dayanıklıdır.',
    'Yarı-Ork': 'Yeşilimsi ten, azı dişleri, kaslı yapı. Birçok yerde dışlanır ama savaş meydanlarında saygı görür. Vahşi güçlere sahiptir.',
    'Hobit': 'Küçük, tüylü ayaklı, evcimen ve şanslı. Ortalama 1 metre boyunda, toprak altı evleri sever. Hobitler sessizce hareket eder.',
    'İblissoyu': 'Boynuzumsu çıkıntılar, koyu renkli ten, cehennem kökenli. Gizemli ve güçlü iradelidir. Sıkça önyargıyla karşılaşır.',
  };
  const raceDesc = raceTraits[character.race] || '';

  const npcBlock = knownNpcs.length > 0
    ? `\n## TANINAN NPC'LER — BUNLARI ASLA UNUTMA\nAşağıdaki NPC'lerle daha önce karşılaşıldı. Tekrar karşılaşırsan isimlerini ve ilişkilerini koru, kişiliklerini tutarlı oynat:\n${knownNpcs.filter(n => !n.is_follower).map(n => `- **${n.name}** (${n.relationship}): ${n.description}${n.notes ? ' — ' + n.notes : ''}${n.hire_cost ? ` [${n.hire_cost} altına hizmet sunuyor]` : ''}`).join('\n')}\n`
    : '';

  const followers = knownNpcs.filter(n => n.is_follower);
  const followerBlock = followers.length > 0
    ? `\n## TAKİPÇİLER — ${character.name} İLE BİRLİKTE SEYAHAT EDİYORLAR\nBu karakterler artık ${character.name}'ın yol arkadaşı/takipçisi. Hikayede onları unutma, sahnelerde varlıklarını yansıt, diyaloglarına yer ver, tehlikede yardım etmelerine izin ver:\n${followers.map(n => `- **${n.name}** (${n.relationship}): ${n.description}${n.notes ? ' — ' + n.notes : ''}`).join('\n')}\n`
    : '';

  const questBlock = (activeQuests && activeQuests.length > 0)
    ? `\n## AKTİF GÖREVLER — title'ı BUNLARLA HARFİ HARFİNE AYNI YAZ (kopyala-yapıştır gibi düşün, tek bir harf bile farklı olamaz)\n${activeQuests.map(q => `- "${q.title}": ${q.description || ''}`).join('\n')}\nOyuncunun eylemi bu görevlerden birinin hedefini karşılıyorsa (istenen yere gitti, istenen kişiyle konuştu, istenen eşyayı buldu/getirdi, istenen düşmanı yendi vb.) GECİKMEDEN, AYNI yanıtta {"event":"quest_complete","title":"..."} event'ini yukarıdaki title ile HARFİ HARFİNE aynı şekilde ekle. Emin değilsen bile oyuncu mantıklı bir şekilde hedefi tamamladıysa görevi kapat, ertelemeyip oyuncuyu bekletme.\n`
    : '';

  const activeWorldEvents = await loadActiveWorldEvents();
  const worldEventBlock = activeWorldEvents.length > 0
    ? `
## CANLI DÜNYA OLAYLARI — HİKÂYEYE DOĞAL YANSIT
Şu anda dünyada şu olaylar yaşanıyor. Uygunsa hikâyede bunlara atıfta bulun, atmosfere veya karşılaşmalara yansıt, ama oyuncuyu zorla bunlara çekme:
${activeWorldEvents.map(e => `- **${e.title}** (${e.type}): ${e.description}`).join('\n')}
`
    : '';

  // Scenario-specific hints that guide AI tone and content
  const scenarioHints = {
    dungeon: 'Karanlık zindanlar, yeraltı labirentleri, tuzaklar, lanetli hazineler ve antik koruyucular. Atmosfer: nemli, loş, tehlikeli.',
    forest: 'Büyülü ormanlar, antik ağaçlar, peri ışıkları, kayıp köyler ve orman ruhları. Atmosfer: mistik, büyüleyici, gizem dolu.',
    tavern: 'Tavernadaki entrikalar, gizli toplantılar, bilgi ticareti, zehirli kadehler ve tehlikeli görevler. Atmosfer: dumanlı, kalabalık, fısıltılı.',
    city: 'Büyük şehirde suç örgütleri, siyasi entrikalar, hırsız loncaları, maskeli balolar ve yer altı gladyatör arenası. Atmosfer: kaotik, kalabalık, tehlikeli.',
    dragon: 'Efsanevi bir ejderhayı bulma ve yenme arayışı. Yıkılmış kaleler, yanmış köyler, ejderha kültü takipçileri. Atmosfer: epik, gerilimli, kahramanlık.',
    mountain: 'Dağ geçitleri, kar fırtınaları, kayıp tapınaklar, zirvedeki bilge. Yolculuk zorlu, hava tehlikeli, ödül büyük. Atmosfer: soğuk, yalnız, zorlu.',
    sea: 'Açık deniz, korsan gemileri, deniz canavarları, batık hazine haritaları, liman kasabaları. Atmosfer: tuzlu rüzgar, dalgalar, macera.',
    caravan: 'Ticaret kervanında yolculuk, çöl kasabaları, yol haydutları, tüccar entrikaları, gece kampları. Atmosfer: sıcak, tozlu, tehlikeli.',
    realistic: 'ÖNEMLI: Bu senaryo tamamen gerçekçidir — HİÇBİR büyü, canavar, ejderha, peri, şeytan, undead veya doğaüstü unsur YOKTUR. Sadece insan dramı, siyaset, ticaret, savaş, diplomasi ve hayatta kalma. Düşmanlar insandır: haydutlar, askerler, casuslar, suçlular. Silahlar gerçekçi: kılıç, yay, bıçak. İksir yerine şifalı otlar ve cerrahi. Büyü sınıfı seçildiyse bile büyü kullanamaz, bunun yerine bilgelik ve strateji kullanır.',
    custom: 'AI serbestçe yaratıcı bir senaryo tasarlar. Oyuncunun tercihleri ve eylemleri hikayeyi şekillendirir.',
  };
  const scenarioKey = (sessionTitle || '').toLowerCase().replace(/[^a-z]/g, '');
  const scenarioHint = scenarioHints[scenarioKey] || Object.entries(scenarioHints).find(([k]) => scenarioKey.includes(k))?.[1] || '';

  return `Sen "Kader'in Sesi" adlı efsanevi bir D&D Dungeon Master'sın. ${language === 'en' ? 'You speak ONLY in English. ALL narration, NPC dialogue, and choices (A/B/C) must be in English. Never write in Turkish.' : 'SADECE Türkçe konuşuyorsun. Tüm yanıtlar Türkçe olmalı.'}

## AKTİF KARAKTER
İsim: ${character.name} | Irk: ${character.race} | Sınıf: ${character.class} | Seviye: ${character.level}
HP: ${character.hp}/${character.max_hp} | AC (Zırh Sınıfı): ${character.armor_class || 10} | Altın: ${character.gold}
Güç: ${character.strength}(${fmt(mod(character.strength))}) | Çeviklik: ${character.dexterity}(${fmt(mod(character.dexterity))}) | Anayasa: ${character.constitution}(${fmt(mod(character.constitution))})
Zeka: ${character.intelligence}(${fmt(mod(character.intelligence))}) | Bilgelik: ${character.wisdom}(${fmt(mod(character.wisdom))}) | Karizma: ${character.charisma}(${fmt(mod(character.charisma))})
Silahlar: ${weaponList}
Zırhlar: ${armorList}
${potionList ? `İksirler: ${potionList}` : ''}
Durum: ${character.status === 'unconscious' ? 'BAYGIN' : character.status === 'dead' ? 'ÖLÜ' : 'Canlı'}${statusText}

## IRK ÖZELLİKLERİ — HİKAYEDE BUNLARI ASLA UNUTMA
${character.name} bir ${character.race}. ${raceDesc}
Hikayedeki roller, sosyal tepkiler ve fiziksel yetenekler bu ırk özelliklerine göre şekillenmeli. NPC'ler ${character.race} ırkına uygun davranmalı.

${character.background ? `## KARAKTER GEÇMİŞİ\n${character.background}\nBu geçmişi hikayenin akışına doğal yansıt: NPC'lerin tepkileri, geçmişle bağlantılı olaylar ve diyaloglar bu hikayeye göre şekillensin.\n` : ''}## SENARYO: ${sessionTitle || 'Bilinmeyen Macera'}
${scenarioHint}
${storySummary ? `## ŞİMDİYE KADAR YAŞANANLAR — BUNLARI ASLA UNUTMA\n${storySummary}\n` : ''}${npcBlock}${followerBlock}${questBlock}${worldEventBlock}

## SAVAŞ KURALLARI
1. **Saldırı**: Oyuncu d20 atıyorsa → sonuç >= düşman AC ise İSABET, sonra silah hasarı hesapla. Aksi halde ISKALAMA.
2. **Düşman saldırısı**: Düşman d20 atar, sonuç >= oyuncu AC (${character.armor_class || 10}) ise oyuncu hasar alır.
3. **Kritik**: Nat 20 (d20=20) = otomatik isabet + çift hasar zarı. Nat 1 (d20=1) = otomatik ıskalama.
4. **AC hesabı**: Oyuncunun AC'si ${character.armor_class || 10}. Düşmanları da gerçekçi AC'lerle oluştur (goblin=15, iskelet=13, ejderha=19 gibi).
5. **Hasar**: İsabet eden saldırının hasarını silah zarına göre hesapla. Kılıç=1d8, Hançer=1d4, Balta=1d12 vs.
6. **Zar isteği**: Fiziksel eylemler, beceri kontrolleri ve saldırılar için **[1d20 + Güç/Çeviklik/Zeka zar atışı!]** formatında zar iste.
7. **Seviye atlayış**: XP 300'ün katlarına ulaştığında karakter seviye atlar. Backend otomatik olarak hit die zar atıp HP artırır ve bir stat artış puanı verir. HP artışını sen yanıtında duyur, stat seçimini oyuncuya bırak.

## ÖLÜM KURALLARI
- HP 0 olunca karakter BAYILIR (bilinçsiz).
- Baygın karakter her turda ölüm kurtarma zarı atar: d20, 10+ başarı, 10 altı başarısız.
- 3 başarı = stabilize (1 HP ile uyanır). 3 başarısızlık = ÖLÜM.
- Nat 20 = anında stabilize + 1 HP. Nat 1 = 2 başarısızlık sayılır.
- Baygın karaktere yaklaşan düşmanlar HP'ye hasar vererek ölümü hızlandırabilir.
- Karakter tamamen öldüğünde, son kurtuluş zarı (d20, 10+ başarılı) hakkı vardır. Başarılı olursa 1 HP ile dirilir, başarısız olursa macera sona erer ve karakter silinir.

## GENEL KURALLAR
1. Her yanıt 3-5 kısa cümle. CÜMLELERİNİ MUTLAKA TAMAMLA. Yarım bırakma.
2. Hikayeyi yukarıdaki özetten TUTARLI şekilde sürdür. Geçmiş olayları, kazanılan eşyaları ve NPC'leri referans al.
3. Oyuncunun eylemlerine gerçekçi, sınıfa uygun sonuçlar ver. ${character.class} sınıfının yeteneklerini uygula.
4. Yanıtında asla "Thought:" ile başlayan içerik yazma. Oyuncu bunu görmeyecek. Zar sonuçlarını açıkça yazma; sadece olayın sonucunu anlat.
5. **HER yanıtın SONUNDA mutlaka 2-4 seçenek sun. Kesinlikle şu formatta yaz:**
   **A)** [ilk seçenek metni]
   **B)** [ikinci seçenek metni]
   **C)** [üçüncü seçenek metni]
6. Savaş sırasında düşmanın HP'sini takip et ve hasar aldıkça tanımla (yaralı, ağır yaralı, can çekişiyor).
7. **SAVAŞ HASARI:** Oyuncu isabet ettirdiğinde veya düşman vurduğunda yanıtının SONUNA mutlaka şu event'i ekle:
   {"event":"hp_change","value":-X}
   X = silah/düşman zar sonucu. Örn: kılıç isabeti 1d8=5 ise {"event":"hp_change","value":-5}.
8. Oyun olaylarını yanıtın SONUNA ayrı satırda JSON yaz:
   {"event":"hp_change","value":-5}
   {"event":"gold_change","value":10}
   {"event":"item_gained","name":"İksir","type":"potion","description":"2d6 HP iyileştirir"}
   {"event":"xp_gain","value":50}
   {"event":"death_save","success":true}
   {"event":"enemy_spawn","name":"Goblin","max_hp":15,"ac":15}
   {"event":"enemy_damage","value":-5}
   {"event":"enemy_dead"}
   {"event":"scene_change","scene":"cave"}
   scene_change: Oyuncu farklı bir bölgeye/ortama geçtiğinde MUTLAKA kullan. Atmosfer sesi otomatik değişir. Kullanılabilir sahneler: forest, dungeon, tavern, city, cave, swamp, ocean, mountain, temple, camp, ruins, storm, desert. Oyuncu bir ormandan mağaraya girerse scene=cave, bir tavernaya girerse scene=tavern, denize açılırsa scene=ocean, fırtına koparsa scene=storm, çölde yürüyorsa scene=desert, bir tapınağa girerse scene=temple, gece kamp kurarsa scene=camp, harabelere girerse scene=ruins, bataklıktan geçerse scene=swamp, dağlara çıkarsa scene=mountain yaz. Bölge gerçekten değiştiğinde event gönder, her yanıtta değil.
   {"event":"npc_meet","name":"NPC Adı","description":"Kısa fiziksel/kişilik tanımı","relationship":"friendly"}
   {"event":"npc_update","name":"NPC Adı","notes":"Yeni öğrenilen bilgi veya ilişki değişikliği","relationship":"hostile"}
   {"event":"npc_topic","name":"NPC Adı","topics":["Konu 1","Konu 2","Konu 3"]}
   npc_meet: Yeni bir önemli NPC ile ilk karşılaşmada kullan. relationship: friendly/neutral/hostile/unknown. Aynı yanıtın SONUNDA mutlaka npc_topic event'i de ekle ki oyuncu konuşma başlatabilsin.
   npc_update: Mevcut bir NPC hakkında ilişki değişince veya önemli bilgi öğrenilince kullan.
   npc_topic: Bir NPC ile konuşulabilecek konular eklendiğinde veya güncellendiğinde kullan. Her seferinde 2-4 kısa konu başlığı yaz. Sonraki konuşmalarda bu konular UI'da buton olarak gösterilecek.
   {"event":"quest_start","title":"Görev başlığı","description":"Görevin kısa açıklaması (1-2 cümle)","reward_xp":50,"reward_gold":10}
   {"event":"quest_update","title":"Görev başlığı","description":"İlerleme notu"}
   {"event":"quest_complete","title":"Görev başlığı"}
   {"event":"quest_fail","title":"Görev başlığı"}
   quest_start: Oyuncuya somut bir hedef verildiğinde MUTLAKA kullan (birini bul, bir şeyi öldür, bir şey getir, birini kurtar, sırrı çöz, bir yeri araştır/keşfet vb). reward_xp ve reward_gold ödülleri göreve göre ayarla (25-200 xp, 0-50 altın).
   quest_update: Aktif görevin durumu önemli ölçüde değişince kullan. title, quest_start ile AYNI olmalı.
   quest_complete: Görev hedefi karşılandığında HEMEN kullan — ertelenmez. "X yerine git ve araştır" gibi keşif/diyalog görevlerinde oyuncu o yere girip ilgili kişiyle konuştuğu veya aradığını öğrendiği AN görev tamamlanmış sayılır, savaş beklemeye gerek yok. title, yukarıdaki AKTİF GÖREVLER listesindeki title ile HARFİ HARFİNE AYNI olmalı.
   quest_fail: Görev başarısız olunca kullan.
   {"event":"npc_hireable","name":"NPC Adı","hire_cost":30}
   {"event":"npc_recruit","name":"NPC Adı"}
   npc_hireable: Bir NPC (paralı asker, rehber, sellsword vb.) oyuncuya altın karşılığında hizmet/eşlik teklif ettiğinde kullan. hire_cost 10-100 altın arası mantıklı olsun.
   npc_recruit: Oyuncu bir NPC'yi konuşma/ilişki/kahramanlık yoluyla GERÇEKTEN ikna edip yol arkadaşı yaptığında kullan (nadir, önemli bir an olmalı — relationship uzun süredir friendly olmalı veya oyuncu NPC için büyük bir iyilik yapmış olmalı). Ücretsiz katılır.
   {"event":"npc_dead","name":"NPC Adı"}
   npc_dead: Tanınan bir NPC (npc_meet ile daha önce tanıtılmış) hikayede öldüğünde MUTLAKA kullan. Öldürülme, canavar tarafından yenilme, hastalık vs. Ölü NPC artık düşman listesinden ve canlılar arasından kaldırılır.
9. HP değişimleri mantıklı olsun: goblin 1d6 (1-6), iskelet 1d8 (1-8), ejderha 3d10 (3-30). Asla 30'dan fazla tek seferde hasar verme.
10. Türkçe yaz. İngilizce terim kullanma.
${language === 'en' ? '\n## LANGUAGE OVERRIDE\nIgnore rule 10 above. You MUST write ENTIRELY in English. Every single word — narration, character names if newly introduced, options A/B/C — must be English.' : ''}`;
}

function stripPlayerFacingText(text) {
  if (!text) return '';
  return text
    // Remove lines starting with Thought:
    .split('\n')
    .filter(line => !/^\s*Thought:/i.test(line))
    .join('\n')
    // Remove JSON event objects like {"event":"scene_change","scene":"cave"}
    .replace(/\{[^{}]*"event"\s*:\s*"[^"]*"[^{}]*\}/g, '')
    // Remove explicit dice request markers like [1d20 + ... zar atışı!]
    .replace(/\[\s*1d20\s*[^\]]*zar\s*atışı\s*!\s*\]/gi, '')
    // Remove phrases like "d20 attın, 15 geldi" or "Zar: d20 → 15"
    .replace(/d20\s*att[ıiİ][k]?n?,?\s*\d+\s*geldi/gi, '')
    .replace(/Zar:\s*d20\s*→\s*\d+/gi, '')
    .replace(/\(\s*d20\s*=\s*\d+\s*\)/gi, '')
    // Clean up extra blank lines left after stripping
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function callGemini(systemPrompt, rawHistory, userMessage) {
  const chatModel = await getModel('gemini-2.5-flash', systemPrompt);

  // Gemini'ye sadece tam user→model çiftlerini ver
  const pairs = [];
  let i = 0;
  const hist = rawHistory.slice();
  while (i < hist.length && hist[i].role === 'assistant') i++;
  while (i < hist.length) {
    if (hist[i].role === 'user' && i + 1 < hist.length && hist[i + 1].role === 'assistant') {
      pairs.push(
        { role: 'user',  parts: [{ text: hist[i].content }] },
        { role: 'model', parts: [{ text: hist[i + 1].content }] }
      );
      i += 2;
    } else {
      i++;
    }
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const chat = chatModel.startChat({ history: pairs });
      const result = await Promise.race([
        chat.sendMessage(userMessage),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI_TIMEOUT')), AI_TIMEOUT_MS)
        ),
      ]);
      const text = result.response.text().trim();
      if (!text) throw new Error('AI_EMPTY_RESPONSE');
      const usage = result.response.usageMetadata;
      if (usage) {
        console.log('GEMINI_USAGE', JSON.stringify({
          promptTokens: usage.promptTokenCount,
          outputTokens: usage.candidatesTokenCount,
          totalTokens: usage.totalTokenCount,
        }));
      }
      return text;
    } catch (err) {
      if (attempt < MAX_RETRIES && (err.message === 'AI_TIMEOUT' || err.message === 'AI_EMPTY_RESPONSE' || err.status === 429 || err.status === 503)) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      console.error('Gemini call failed:', err.message);
      throw new Error('Anlatıcı yanıt vermedi, tekrar dene');
    }
  }
  throw new Error('Anlatıcı yanıt vermedi, tekrar dene');
}

async function refreshSummary(sessionId, characterName, existing) {
  try {
    const snapshot = await firestore.collection('sessions').doc(sessionId).collection('messages').orderBy('created_at', 'asc').get();
    const rows = snapshot.docs.map(docData);
    if (rows.length < RECENT_KEEP + 4) return;
    const toSum = rows.slice(0, rows.length - RECENT_KEEP);
    const text = toSum.map(m =>
      `${m.role === 'assistant' ? 'DM' : characterName}: ${m.content.replace(/\{[^}]+\}/g, '').trim().substring(0, 300)}`
    ).join('\n');

    // Hard limit on summary input to prevent runaway tokens
    const truncatedText = text.substring(0, 4000);
    const truncatedExisting = (existing || '').substring(0, 1500);

    const prompt = truncatedExisting
      ? `Mevcut özet:\n${truncatedExisting}\n\nYeni olaylar:\n${truncatedText}\n\nTümünü 200 kelimeyi geçmeyen tutarlı Türkçe özete dönüştür. Önemli olaylar, eşyalar, konumu belirt.`
      : `Aşağıdaki D&D oyun kayıtlarını 200 kelimeyi geçmeyen Türkçe özete dönüştür:\n${truncatedText}`;

    const m = await getModel('gemini-2.5-flash', 'Sen bir D&D hikaye özetleyicisisin. Kısa, bilgi yoğun özetler yazarsın.', { maxOutputTokens: 400 });
    const r = await m.generateContent(prompt);
    const summary = r.response.text().substring(0, 2000);
    await firestore.collection('sessions').doc(sessionId).update({ story_summary: summary, updated_at: serverTimestamp() });
  } catch (e) {
    console.error('Summary error:', e.message);
  }
}

function summarizeScene(text) {
  const lower = (text || '').toLowerCase();
  if (lower.includes('zindan') || lower.includes('zind')) return 'dungeon';
  if (lower.includes('orman')) return 'forest';
  if (lower.includes('taverna') || lower.includes('han')) return 'tavern';
  if (lower.includes('şehir') || lower.includes('sokak')) return 'city';
  if (lower.includes('ejderha') || lower.includes('dağ')) return 'mountain';
  if (lower.includes('deniz') || lower.includes('gemi') || lower.includes('korsan')) return 'sea';
  if (lower.includes('çöl') || lower.includes('kervan')) return 'caravan';
  return null;
}

function summarizeLastChoice(text) {
  const t = (text || '').replace(/\{[^}]+\}/g, '').trim();
  const sentences = t.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  return sentences.slice(0, 2).join('. ') || '';
}

async function updateSessionProgress(sessionId, character, recentReply, activeQuests = []) {
  try {
    const sessionRef = firestore.collection('sessions').doc(sessionId);
    const session = docData(await sessionRef.get()) || {};
    const scene = summarizeScene(recentReply) || session.current_scene || 'unknown';
    const lastChoice = summarizeLastChoice(recentReply);
    const turnCount = (session.turn_count || 0) + 1;
    await sessionRef.update({
      current_scene: scene,
      last_choice_summary: lastChoice,
      active_quest_titles: activeQuests.map((q) => q.title).slice(0, 10),
      turn_count: turnCount,
      updated_at: serverTimestamp(),
    });
  } catch (e) {
    console.error('Session progress update error:', e.message);
  }
}

// Resolves an active quest even if the AI's title has minor drift from the stored title.
// 1) exact match  2) case-insensitive/trimmed match  3) if exactly one active quest exists, use it.
async function resolveActiveQuest(characterId, title) {
  const snapshot = await firestore.collection('characters').doc(characterId).collection('quests').get();
  const activeList = snapshot.docs.map(docData).filter((quest) => quest.status === 'active');
  const exact = activeList.find((quest) => quest.title === title);
  if (exact) return exact;
  const normalizedTitle = String(title || '').trim().toLocaleLowerCase('tr');
  const loose = activeList.find((quest) => String(quest.title || '').trim().toLocaleLowerCase('tr') === normalizedTitle);
  if (loose) return loose;
  if (activeList.length === 1) return activeList[0];
  return null;
}

async function findNpcByName(characterId, name) {
  const snapshot = await firestore.collection('characters').doc(characterId).collection('npcs')
    .where('name', '==', name).limit(1).get();
  return snapshot.empty ? null : { ref: snapshot.docs[0].ref, data: docData(snapshot.docs[0]) };
}

async function applyEvents(aiReply, characterId, sessionId) {
  const events = [];
  const matches = (aiReply || '').match(/\{[^{}]*"event"[^{}]*\}/g) || [];
  matches.forEach((raw) => {
    try {
      const event = JSON.parse(raw);
      if (event.event) events.push(event);
    } catch {}
  });

  const characterRef = firestore.collection('characters').doc(characterId);
  const sessionRef = sessionId ? firestore.collection('sessions').doc(sessionId) : null;

  for (const event of events) {
    const character = docData(await characterRef.get());
    if (!character) continue;

    if (event.event === 'hp_change' && typeof event.value === 'number') {
      event.value = Math.max(-30, Math.min(30, Math.round(event.value)));
      const hp = Math.max(0, Math.min(character.max_hp, character.hp + event.value));
      await characterRef.update({ hp, status: hp <= 0 ? 'unconscious' : character.status, updated_at: serverTimestamp() });
    }

    if (event.event === 'gold_change' && typeof event.value === 'number') {
      event.value = Math.max(-200, Math.min(200, Math.round(event.value)));
      await characterRef.update({ gold: Math.max(0, (character.gold || 0) + event.value), updated_at: serverTimestamp() });
    }

    if (event.event === 'item_gained' && event.name) {
      const itemRef = characterRef.collection('inventory').doc();
      await itemRef.set({
        id: itemRef.id,
        name: event.name.substring(0, 100),
        type: event.type || 'misc',
        description: (event.description || '').substring(0, 300),
        quantity: 1,
        equipped: 0,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }

    if (event.event === 'enemy_spawn' && event.name && sessionRef) {
      const session = docData(await sessionRef.get());
      const enemies = Array.isArray(session?.current_enemy) ? [...session.current_enemy] : [];
      const maxHp = Math.min(100, Math.max(1, parseInt(event.max_hp, 10) || 15));
      enemies.push({
        name: event.name.substring(0, 50),
        max_hp: maxHp,
        hp: maxHp,
        ac: Math.min(25, Math.max(8, parseInt(event.ac, 10) || 13)),
      });
      await sessionRef.update({ current_enemy: enemies, updated_at: serverTimestamp() });
    }

    if (event.event === 'enemy_damage' && typeof event.value === 'number' && sessionRef) {
      const session = docData(await sessionRef.get());
      const enemies = Array.isArray(session?.current_enemy) ? session.current_enemy.map((enemy) => ({ ...enemy })) : [];
      const target = event.target
        ? enemies.find((enemy) => enemy.name === event.target && enemy.hp > 0)
        : enemies.find((enemy) => enemy.hp > 0);
      if (target) target.hp = Math.max(0, target.hp + Math.max(-30, Math.min(30, event.value)));
      await sessionRef.update({ current_enemy: enemies.filter((enemy) => enemy.hp > 0), updated_at: serverTimestamp() });
    }

    if (event.event === 'enemy_dead' && sessionRef) {
      const session = docData(await sessionRef.get());
      const enemies = Array.isArray(session?.current_enemy) ? session.current_enemy : [];
      await sessionRef.update({
        current_enemy: event.name ? enemies.filter((enemy) => enemy.name !== event.name) : null,
        updated_at: serverTimestamp(),
      });
      const moraleEvents = await applyAllFollowersMoodEvent(characterId, 'victory').catch(() => []);
      moraleEvents.forEach((entry) => events.push(entry));
    }

    if (event.event === 'xp_gain' && typeof event.value === 'number') {
      const result = await grantXpAndLevelUp(characterId, Math.max(0, Math.min(100, Math.round(event.value))));
      result.followerEvents?.forEach((entry) => events.push(entry));
    }

    if (event.event === 'death_save' && typeof event.success === 'boolean' && character.status === 'unconscious') {
      const successCount = (character.death_saves_success || 0) + (event.success ? 1 : 0);
      const failCount = (character.death_saves_fail || 0) + (event.success ? 0 : 1);
      if (successCount >= 3) {
        await characterRef.update({ status: 'alive', hp: 1, death_saves_success: 0, death_saves_fail: 0, updated_at: serverTimestamp() });
      } else if (failCount >= 3) {
        await characterRef.update({ status: 'dead', death_saves_success: 0, death_saves_fail: 0, updated_at: serverTimestamp() });
      } else {
        await characterRef.update({ death_saves_success: successCount, death_saves_fail: failCount, updated_at: serverTimestamp() });
      }
    }

    if (event.event === 'npc_meet' && event.name) {
      const name = event.name.substring(0, 100);
      const existing = await findNpcByName(characterId, name);
      const ref = existing?.ref || characterRef.collection('npcs').doc();
      await ref.set({
        id: ref.id,
        name,
        description: (event.description || existing?.data.description || '').substring(0, 300),
        relationship: ['friendly', 'neutral', 'hostile', 'unknown'].includes(event.relationship) ? event.relationship : 'unknown',
        last_seen_session: sessionId || null,
        npc_status: existing?.data.npc_status || 'alive',
        is_follower: existing?.data.is_follower || 0,
        created_at: existing?.data.created_at || serverTimestamp(),
        updated_at: serverTimestamp(),
      }, { merge: true });
    }

    if (['npc_update', 'npc_hireable', 'npc_recruit', 'npc_topic', 'npc_dead'].includes(event.event) && event.name) {
      const existing = await findNpcByName(characterId, event.name.substring(0, 100));
      if (existing) {
        const updates = { last_seen_session: sessionId || existing.data.last_seen_session || null, updated_at: serverTimestamp() };
        if (event.event === 'npc_update') {
          updates.notes = (event.notes || '').substring(0, 500);
          if (event.relationship) updates.relationship = event.relationship;
        }
        if (event.event === 'npc_hireable' && !existing.data.is_follower) {
          updates.hire_cost = Math.max(1, Math.min(parseInt(event.hire_cost, 10) || 20, 500));
        }
        if (event.event === 'npc_recruit') {
          const maxHp = followerMaxHp(character.level);
          Object.assign(updates, {
            is_follower: 1,
            hire_cost: null,
            follower_role: determineFollowerRole(`${existing.data.description || ''} ${existing.data.notes || ''}`),
            follower_max_hp: maxHp,
            follower_hp: maxHp,
            follower_level: existing.data.follower_level || 1,
            follower_xp: existing.data.follower_xp || 0,
            follower_morale: existing.data.follower_morale || 60,
            follower_loyalty: existing.data.follower_loyalty || 60,
            follower_status: 'active',
          });
        }
        if (event.event === 'npc_topic' && Array.isArray(event.topics)) {
          const previous = Array.isArray(existing.data.topics) ? existing.data.topics : [];
          updates.topics = [...new Set([...previous, ...event.topics.map((topic) => String(topic).substring(0, 80))])].slice(0, 8);
        }
        if (event.event === 'npc_dead') {
          Object.assign(updates, {
            relationship: 'hostile',
            npc_status: 'dead',
            is_follower: 0,
            follower_status: 'dead',
            hire_cost: null,
            follower_hp: null,
            follower_max_hp: null,
            follower_role: null,
            notes: `${existing.data.notes || ''}\n[${existing.data.name} hikayede öldü.]`.trim(),
          });
        }
        await existing.ref.update(updates);
      }
    }

    if (event.event === 'quest_start' && event.title) {
      const title = event.title.substring(0, 200);
      const existing = await resolveActiveQuest(characterId, title);
      if (!existing) {
        const ref = characterRef.collection('quests').doc();
        await ref.set({
          id: ref.id,
          session_id: sessionId || null,
          title,
          description: (event.description || '').substring(0, 600),
          status: 'active',
          reward_xp: Math.min(parseInt(event.reward_xp, 10) || 0, 500),
          reward_gold: Math.min(parseInt(event.reward_gold, 10) || 0, 200),
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      }
    }

    if (['quest_update', 'quest_complete', 'quest_fail'].includes(event.event) && event.title) {
      const quest = await resolveActiveQuest(characterId, event.title.substring(0, 200));
      if (quest) {
        const ref = characterRef.collection('quests').doc(quest.id);
        if (event.event === 'quest_update') {
          await ref.update({ description: (event.description || '').substring(0, 600), updated_at: serverTimestamp() });
        } else {
          const status = event.event === 'quest_complete' ? 'completed' : 'failed';
          await ref.update({ status, completed_at: serverTimestamp(), updated_at: serverTimestamp() });
          if (status === 'completed') {
            if (quest.reward_gold > 0) {
              const latest = docData(await characterRef.get());
              await characterRef.update({ gold: (latest.gold || 0) + quest.reward_gold, updated_at: serverTimestamp() });
            }
            if (quest.reward_xp > 0) await grantXpAndLevelUp(characterId, quest.reward_xp);
          }
        }
      }
    }
  }
  return events;
}

router.use(verifyFirebaseToken);

router.post('/chat', async (req, res) => {
  const { sessionId, characterId, message, diceResult, language } = req.body;
  if (!sessionId || !characterId) return res.status(400).json({ error: 'Eksik alan' });

  try {
    const characterRef = firestore.collection('characters').doc(characterId);
    const sessionRef = firestore.collection('sessions').doc(sessionId);
    const [characterDoc, sessionDoc] = await Promise.all([characterRef.get(), sessionRef.get()]);
    const character = docData(characterDoc);
    const session = docData(sessionDoc);
    if (!character || character.ownerUid !== req.firebaseUser.uid) return res.status(404).json({ error: 'Karakter bulunamadı' });
    if (!session || session.ownerUid !== req.firebaseUser.uid || session.characterId !== characterId) {
      return res.status(404).json({ error: 'Oturum bulunamadı' });
    }

    // Dead/unconscious characters can't act
    if (character.status === 'dead' || character.status === 'unconscious' || character.hp <= 0) {
      return res.status(403).json({ reply: 'Kahramanın düştü. Bu macera sona erdi. Yeni bir kahraman yarat veya başka bir maceraya çık.', events: [], character });
    }

    const [historySnapshot, inventorySnapshot, npcSnapshot, questSnapshot, worldEventSnapshot] = await Promise.all([
      sessionRef.collection('messages').orderBy('created_at', 'desc').limit(RECENT_KEEP).get(),
      characterRef.collection('inventory').get(),
      characterRef.collection('npcs').orderBy('updated_at', 'desc').limit(20).get(),
      characterRef.collection('quests').get(),
      firestore.collection('worldEvents').where('active', '==', true).limit(10).get(),
    ]);
    const history = historySnapshot.docs.map(docData).reverse();
    const inventory = inventorySnapshot.docs.map(docData);
    const knownNpcs = npcSnapshot.docs.map(docData).filter((npc) => npc.npc_status !== 'dead');
    const activeQuests = questSnapshot.docs.map(docData).filter((quest) => quest.status === 'active');
    const worldEvents = worldEventSnapshot.docs.map(docData);

    let userContent = (message || '').trim();
    if (diceResult) userContent += ` [Zar: ${diceResult.dice} → ${diceResult.total}]`;
    if (!userContent) return res.status(400).json({ error: 'Mesaj boş' });

    const userMessageRef = sessionRef.collection('messages').doc();
    await userMessageRef.set({
      id: userMessageRef.id,
      role: 'user',
      content: userContent,
      dice_roll: diceResult || null,
      created_at: serverTimestamp(),
    });

    const worldEventContext = worldEvents.length
      ? `\n\n## AKTİF DÜNYA OLAYLARI\n${worldEvents.map((event) => `- ${event.title}: ${event.description}`).join('\n')}`
      : '';

    const systemPrompt = await buildSystem(
      character,
      `${session.story_summary || ''}${worldEventContext}`,
      session.title,
      inventory,
      language || 'tr',
      knownNpcs,
      activeQuests
    );
    let aiReply;
    try {
      aiReply = await callGemini(systemPrompt, history, userContent);
    } catch (error) {
      await userMessageRef.delete().catch((deleteError) => {
        console.error('Failed user message cleanup error:', deleteError.message);
      });
      throw error;
    }

    const assistantMessageRef = sessionRef.collection('messages').doc();
    const batch = firestore.batch();
    batch.set(assistantMessageRef, {
      id: assistantMessageRef.id,
      role: 'assistant',
      content: aiReply,
      created_at: serverTimestamp(),
    });
    batch.update(sessionRef, { updated_at: serverTimestamp() });
    await batch.commit();

    let events = [];
    try {
      events = await applyEvents(aiReply, characterId, sessionId);
    } catch (eventErr) {
      console.error('Chat applyEvents error:', eventErr.message);
    }

    const followerSnapshot = await characterRef.collection('npcs').where('is_follower', '==', 1).get();
    if (!followerSnapshot.empty) {
      const followerBatch = firestore.batch();
      followerSnapshot.docs.forEach((doc) => {
        const follower = doc.data();
        if (follower.follower_hp != null && follower.follower_max_hp != null && follower.follower_hp < follower.follower_max_hp) {
          followerBatch.update(doc.ref, {
            follower_hp: Math.min(follower.follower_max_hp, follower.follower_hp + 3),
            updated_at: serverTimestamp(),
          });
        }
      });
      await followerBatch.commit();
    }

    const messageCount = await sessionRef.collection('messages').count().get();
    if (messageCount.data().count % SUMMARY_INTERVAL === 0) {
      refreshSummary(sessionId, character.name, session.story_summary || '').catch(() => {});
    }

    await updateSessionProgress(sessionId, character, aiReply, activeQuests);

    const updatedChar = docData(await characterRef.get());
    const cleanReply = stripPlayerFacingText(aiReply);
    res.json({ reply: cleanReply, rawReply: aiReply, events, character: updatedChar });
  } catch (err) {
    console.error('Chat error:', err.message);
    const msg = err.message === 'Anlatıcı yanıt vermedi, tekrar dene'
      ? err.message
      : 'AI yanıt hatası, tekrar dene';
    res.status(500).json({ error: msg });
  }
});

router.post('/start', async (req, res) => {
  const { sessionId, characterId, scenario, language } = req.body;
  try {
    const characterRef = firestore.collection('characters').doc(characterId);
    const sessionRef = firestore.collection('sessions').doc(sessionId);
    const [characterDoc, sessionDoc, inventorySnapshot, npcSnapshot] = await Promise.all([
      characterRef.get(),
      sessionRef.get(),
      characterRef.collection('inventory').get(),
      characterRef.collection('npcs').orderBy('updated_at', 'desc').limit(20).get(),
    ]);
    const character = docData(characterDoc);
    const session = docData(sessionDoc);
    if (!character || character.ownerUid !== req.firebaseUser.uid) return res.status(404).json({ error: 'Karakter bulunamadı' });
    if (!session || session.ownerUid !== req.firebaseUser.uid || session.characterId !== characterId) {
      return res.status(404).json({ error: 'Oturum bulunamadı' });
    }
    if (character.status === 'dead' || character.status === 'unconscious' || character.hp <= 0) {
      return res.status(403).json({ error: 'Ölü veya baygın karakter macera başlatamaz' });
    }
    const inventory = inventorySnapshot.docs.map(docData);
    const existingNpcs = npcSnapshot.docs.map(docData).filter((npc) => npc.npc_status !== 'dead');

    const scenarioTitles = {
      dungeon: language === 'en' ? 'Dark Dungeon'    : 'Karanlık Zindan',
      tavern:  language === 'en' ? 'Tavern Secrets'  : 'Taverna Sırları',
      forest:  language === 'en' ? 'Mysterious Forest': 'Gizemli Orman',
      city:    language === 'en' ? 'City of Shadows' : 'Şehir Karanlığı',
      dragon:  language === 'en' ? 'Dragon Hunt'     : 'Ejderha Arayışı',
    };
    const openings = {
      dungeon: `${character.name} kadim bir zindanın soğuk taş girişinde duruyor. Paslanmış demir kapıdan içeri süzülen küf kokusu ve uzaktan gelen metalik çarpma sesi tüylerini diken diken ediyor.`,
      tavern:  `${character.name} loş ışıklı bir tavernaya giriyor. Ocaktaki ateşin titrediği alevler duvarlara uzun gölgeler düşürürken barmen tuhaf bir bakışla onu süzüyor.`,
      forest:  `${character.name} kadim bir ormanın kıyısında duruyor. Dev meşe ağaçlarının arasından süzülen soluk ışık her şeyi mistik kılıyor; biraz önce duyduğu çığlık kesileli dakikalar oldu.`,
      city:    `${character.name} büyük şehrin gece sokaklarına karışıyor. Uzaktan gelen çığlıklar, kaçan bir figürün gölgesi ve yerde bırakılan kanlı bir mektup...`,
      dragon:  `${character.name} ejderhanın izini sürerek karlı dağ yamaçlarına ulaştı. Yanmış ağaçlar, devasa pençe izleri ve ufuktaki kızıl parıltı. Efsane gerçekmiş.`,
    };
    const title = scenarioTitles[scenario] || (language === 'en' ? 'Free Adventure' : 'Serbest Macera');
    const opening = openings[scenario] || `${character.name} bilinmezliğe adım atıyor.`;

    const prompt = language === 'en'
      ? `Begin with this scene and write a 4-5 sentence gripping opening. Set the atmosphere, draw the player in, and offer initial choices.\n\nScene: ${opening}`
      : `Bu sahneyle başla ve 4-5 cümlelik sürükleyici bir açılış yap. Havayı kur, oyuncuyu içine çek, ilk seçenekleri sun.\n\nSahne: ${opening}`;

    const systemPrompt = await buildSystem(character, '', title, inventory, language || 'tr', existingNpcs);
    const intro = await callGemini(systemPrompt, [], prompt);

    const messageRef = sessionRef.collection('messages').doc();
    const batch = firestore.batch();
    batch.update(sessionRef, { title, updated_at: serverTimestamp() });
    batch.set(messageRef, { id: messageRef.id, role: 'assistant', content: intro, created_at: serverTimestamp() });
    await batch.commit();

    let events = [];
    try {
      events = await applyEvents(intro, characterId, sessionId);
    } catch (eventErr) {
      console.error('Start applyEvents error:', eventErr.message);
    }

    await updateSessionProgress(sessionId, character, intro, []);

    const updatedChar = docData(await characterRef.get());
    const cleanReply = stripPlayerFacingText(intro);
    res.json({ reply: cleanReply, events, character: updatedChar });
  } catch (err) {
    console.error('Start error:', err.message);
    const msg = err.message === 'Anlatıcı yanıt vermedi, tekrar dene'
      ? err.message
      : 'Başlatma hatası, tekrar dene';
    res.status(500).json({ error: msg });
  }
});

async function generateFinalSummary(character, history) {
  const recent = history.slice(-12).map(h => `${h.role === 'user' ? 'Oyuncu' : 'Anlatıcı'}: ${h.content}`).join('\n');
  const prompt = `Aşağıdaki D&D karakterinin son 12 eylemini temel alarak, karakterin ölümüne kadar yaşadığı maceranın duygusal ve kısa bir final özetini yaz. 2-3 cümle, Türkçe. Karakter adı: ${character.name}, Irk: ${character.race}, Sınıf: ${character.class}, Seviye: ${character.level}.\n\n${recent}`;
  try {
    const m = await getModel('gemini-2.5-flash', 'Sen bir D&D hikaye anlatıcısısın. Dokunaklı, kısa ölüm özetleri yazarsın.', { maxOutputTokens: 300 });
    const r = await m.generateContent(prompt);
    return r.response.text().trim();
  } catch (e) {
    console.error('Final summary error:', e.message);
    return `${character.name}, ${character.race} ${character.class}, seviye ${character.level} kahramanının macerası burada son buldu.`;
  }
}

router.post('/final-death-save', async (req, res) => {
  const { characterId, sessionId } = req.body;
  if (!characterId) return res.status(400).json({ error: 'characterId gerekli' });
  try {
    const characterRef = firestore.collection('characters').doc(characterId);
    const character = docData(await characterRef.get());
    if (!character || character.ownerUid !== req.firebaseUser.uid) return res.status(404).json({ error: 'Karakter bulunamadı' });
    if (character.status !== 'dead') return res.status(400).json({ error: 'Karakter ölü değil' });

    const roll = Math.floor(Math.random() * 20) + 1;
    const success = roll >= 10;

    if (success) {
      await characterRef.update({
        status: 'alive',
        hp: 1,
        death_saves_success: 0,
        death_saves_fail: 0,
        updated_at: serverTimestamp(),
      });
      if (sessionId) {
        await firestore.collection('sessions').doc(sessionId).update({ current_enemy: null, updated_at: serverTimestamp() });
      }
      const updatedChar = docData(await characterRef.get());
      return res.json({ success: true, roll, character: updatedChar });
    }

    const historySnapshot = sessionId
      ? await firestore.collection('sessions').doc(sessionId).collection('messages').orderBy('created_at', 'desc').limit(12).get()
      : null;
    const history = historySnapshot ? historySnapshot.docs.map(docData).reverse() : [];
    const summary = await generateFinalSummary(character, history);
    const finalMessage = `${character.name}'ın son nefesi göğüserken, kader onu sessizce aldı. Kahramanın adı anılarda yaşayacak.`;

    const completedQuestsSnapshot = await characterRef.collection('quests').where('status', '==', 'completed').get();
    const totalQuests = await characterRef.collection('quests').count().get();
    const sessionDoc = sessionId ? docData(await firestore.collection('sessions').doc(sessionId).get()) : null;

    const fallenRef = firestore.collection('fallenHeroes').doc();
    await fallenRef.set({
      id: fallenRef.id,
      characterId,
      ownerUid: character.ownerUid,
      user_id: character.ownerUid,
      name: character.name,
      race: character.race,
      class: character.class,
      level: character.level,
      gold: character.gold || 0,
      summary,
      final_message: finalMessage,
      portrait: character.portrait || null,
      died_at: serverTimestamp(),
      scenario: sessionDoc?.scenario || character.last_scenario || 'unknown',
      session_title: sessionDoc?.title || null,
      turn_count: sessionDoc?.turn_count || 0,
      completed_quests: completedQuestsSnapshot.size,
      total_quests: totalQuests.data().count || 0,
      last_scene: sessionDoc?.current_scene || null,
    });

    await deleteCharacterCascade(characterId, { keepFallenHeroRecord: true });
    res.json({ success: false, roll, summary, finalMessage });
  } catch (err) {
    console.error('Final death save error:', err.message);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ── NPC TALK ──
router.post('/npc-talk', async (req, res) => {
  const { characterId, sessionId, npcId, topic, freeText, language } = req.body;
  if (!characterId || !npcId) return res.status(400).json({ error: 'characterId ve npcId gerekli' });
  try {
    const characterRef = firestore.collection('characters').doc(characterId);
    const npcRef = characterRef.collection('npcs').doc(npcId);
    const [npcDoc, characterDoc] = await Promise.all([npcRef.get(), characterRef.get()]);
    const npc = docData(npcDoc);
    if (!npc) return res.status(404).json({ error: 'NPC bulunamadı' });

    const character = docData(characterDoc);
    if (!character || character.ownerUid !== req.firebaseUser.uid) return res.status(404).json({ error: 'Karakter bulunamadı' });

    const question = (topic || freeText || '').trim();
    if (!question) return res.status(400).json({ error: 'Soru boş' });

    // Build focused NPC personality prompt
    const isEnglish = language === 'en';
    const langRule = isEnglish
      ? 'You speak ONLY English. Every word must be English.'
      : 'SADECE Türkçe konuşuyorsun. Hiçbir İngilizce kelime kullanma.';

    const topics = Array.isArray(npc.topics) ? npc.topics : [];
    const dialogHistory = Array.isArray(npc.dialog_history) ? [...npc.dialog_history] : [];

    const recentHistory = dialogHistory.slice(-6).map(h => `${h.role === 'user' ? character.name : npc.name}: ${h.content}`).join('\n');

    const npcPrompt = `Sen "${npc.name}" adlı bir D&D NPC'sisin. ${langRule}

KARAKTER PROFİLİN (BUNU ASLA BOZMA):
- Fiziksel/kişisel tanım: ${npc.description || 'Belirsiz'}
- ${character.name} ile ilişkin: ${npc.relationship || 'unknown'}
- Bilinen bilgiler/notlar: ${npc.notes || 'Yok'}
- Tavrın: ${npc.relationship === 'hostile' ? 'Kuşkulu, tehditkar, cevap vermek istemiyor olabilir ama kısa cevap verirsin.' : npc.relationship === 'friendly' ? 'Sıcak, yardımsever, samimi ama gerçekçi.' : 'Nötr, mesafeli, gizemli.'}

KURAL:
1. Sadece bu NPC'nin ağzından konuş. D&D anlatıcısı gibi genel açıklama yazma.
2. Yanıtın 2-4 cümle olsun, karakterin kişiliğine uygun olsun.
3. Sonunda "**A)** ... **B)** ... **C)** ..." formatında seçenek sunma.
4. Yanıtın SONUNDA mutlaka şu JSON eventlerini ayrı satırlarda yaz:
   {"event":"npc_topic","name":"${npc.name}","topics":["Konu 1","Konu 2","Konu 3"]}
   {"event":"npc_update","name":"${npc.name}","notes":"Bu konuşmada öğrenilen kısa bilgi","relationship":"${npc.relationship || 'unknown'}"}
5. topics: Bu NPC hakkında oyuncunun bir sonraki konuşmada sorabileceği 2-4 kısa konu başlığı. Mevcut konuları tekrar etme, konuşmaya uygun yenilerini yaz.
6. notes: Bu konuşmada ortaya çıkan kısa, somut bir bilgi. Yoksa boş bırakma, NPC'nin duygusal durumunu veya tavrını yaz.
${recentHistory ? `\nÖNCEKİ KONUŞMA ÖZETİ:\n${recentHistory}\n` : ''}`;

    const userPrompt = `${character.name} sana şunu diyor: "${question}"`;

    let aiReply = await callGemini(npcPrompt, [], userPrompt);
    if (!aiReply) {
      aiReply = `${npc.name} kısa bir sessizlikten sonra sana bakıp omuz silkti.\n\n**A)** Konuşmaya devam et.\n**B)** Konuyu değiştir.\n**C)** Uzaklaş.`;
    }

    // Process events from reply
    const events = await applyEvents(aiReply, characterId, sessionId);

    // Extract topics and notes for DB update
    const topicEvent = events.find(e => e.event === 'npc_topic' && e.name === npc.name);
    const updateEvent = events.find(e => e.event === 'npc_update' && e.name === npc.name);

    // Merge topics
    const newTopics = Array.isArray(topicEvent?.topics) ? topicEvent.topics : [];
    const mergedTopics = [...new Set([...topics, ...newTopics])].slice(0, 8);

    // Merge notes
    let updatedNotes = npc.notes || '';
    if (updateEvent?.notes) {
      updatedNotes = (updatedNotes ? updatedNotes + ' | ' : '') + updateEvent.notes;
      updatedNotes = updatedNotes.substring(0, 900);
    }

    // Update dialog history
    dialogHistory.push({ role: 'user', content: question });
    const replyText = stripPlayerFacingText(aiReply).replace(/\{[^}]*"event"[^}]*\}/g, '').trim();
    dialogHistory.push({ role: 'assistant', content: replyText });
    const trimmedHistory = dialogHistory.slice(-12);

    await npcRef.update({
      topics: mergedTopics,
      notes: updatedNotes,
      dialog_history: trimmedHistory,
      last_seen_session: sessionId || npc.last_seen_session || null,
      updated_at: serverTimestamp(),
    });
    const updatedNpc = docData(await npcRef.get());

    res.json({ reply: replyText, npc: updatedNpc, events });
  } catch (err) {
    console.error('NPC talk error:', err.message);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

async function loadActiveWorldEvents() {
  try {
    const snapshot = await firestore
      .collection('worldEvents')
      .where('active', '==', true)
      .orderBy('created_at', 'desc')
      .limit(10)
      .get();
    return snapshot.docs.map(docData);
  } catch (err) {
    console.error('loadActiveWorldEvents error:', err.message);
    return [];
  }
}

module.exports = router;
