/* =========================================================
   体育祭しおり
   ・js/content.js(CONTENT)の中身でページを組み立てる
   ・タイムテーブル + 「いまここ」
   ・競技説明(アコーディオン)・応援コール＆スローガン
   ・おたのしみ(間違い探しの答え)・隠れキャラ(線や表紙のイラストの後ろ)
   ・日本語の文の折り返し(BudouX で文節の切れ目に <wbr>)
   ・ハンバーガーメニュー
   ・入れ忘れチェック
   中身を変えたい時は js/content.js だけ書き換える。このファイルは触らなくていい
   テスト: URL の末尾に ?time=10:30 を付けると、当日のその時刻として表示する
           URL の末尾に ?check を付けると、［］のままの項目と未設定の画像の一覧を出す
           (両方使う時は ?time=10:30&check)
   ========================================================= */

const params = new URLSearchParams(location.search);

const toMinutes = (hm) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};
const pad = (n, len = 2) => String(n).padStart(len, '0');
const $ = (id) => document.getElementById(id);

// 当日の遅れ(content.js の DELAY_MIN)。プログラムの時刻を最初に全部ずらしておく
// タイムテーブル・競技説明の時刻、「いまここ」の判定(?time も)・キャラの位置は、ずらした時刻を使う
const DELAY = Number(CONTENT.timetable.delayMin) || 0;
const shiftTime = (hm) => {
  const t = toMinutes(hm) + DELAY;
  return `${Math.floor(t / 60)}:${pad(t % 60)}`;
};
if (DELAY !== 0) {
  CONTENT.timetable.program = CONTENT.timetable.program.map((p) => ({
    ...p,
    start: shiftTime(p.start),
    end: p.end && shiftTime(p.end),
  }));
}

// 文字は必ずここを通して入れる(textContent なのでタグは効かない)。\n は改行になる
function setText(node, text) {
  node.textContent = text;
  node.classList.toggle('pre-line', String(text).includes('\n'));
}

// 日本語の文を、文節の切れ目(BudouX。js/vendor/budoux)だけで折り返すようにする
// 文は textContent と同じく文字のまま入れて(タグは効かない)、切れ目に <wbr> の要素を足す。\n は <br>
// CSS の .phrases(word-break: keep-all)で、<wbr> と空白以外では折り返さない。長すぎる時だけ途中で折る
function setPhrases(node, text) {
  node.replaceChildren();
  node.classList.add('phrases');
  String(text).split('\n').forEach((row, n) => {
    if (n > 0) node.append(document.createElement('br'));
    const parts = window.budouxJa ? window.budouxJa.parse(row) : [row];
    parts.forEach((part, k) => {
      if (k > 0) node.append(document.createElement('wbr'));
      node.append(part);
    });
  });
  return node;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) setText(node, text);
  return node;
}

const phraseEl = (tag, className, text) => setPhrases(el(tag, className), text);

// 画像が設定されていれば枠の中身を <img> にする。src が空なら斜線の仮の枠のまま
// fallback があれば <picture> にして、src(WebP)が見られないブラウザでは fallback(JPGなど)を出す
// width・height があれば <img> に付けて、読み込み中も絵の大きさの場所を取っておく(レイアウトがずれない)
function renderImage(box, image, { lazy = false } = {}) {
  if (!image || !image.src) return;
  const img = document.createElement('img');
  img.alt = image.alt || '';
  if (image.width && image.height) {
    img.width = image.width;
    img.height = image.height;
  }
  if (lazy) img.loading = 'lazy';
  let node = img;
  if (image.fallback) {
    const source = document.createElement('source');
    source.srcset = image.src;
    source.type = 'image/webp';
    node = document.createElement('picture');
    node.append(source, img);
  }
  // src は <picture> に入れてから付ける(先に付けると、使わない方の画像まで読み込み始めるため)
  img.src = image.fallback || image.src;
  box.replaceChildren(node);
}

// 縦横の比率に合わせて枠の高さを変える画像(表紙・裏表紙)
// 大きさを決める入れ物(holder)に has-image と比率(--ratio = 幅 ÷ 高さ)を付ける
function renderFittedImage(holder, box, image, options) {
  if (!image || !image.src) return;
  renderImage(box, image, options);
  holder.classList.add('has-image');
  if (image.width && image.height) holder.style.setProperty('--ratio', image.width / image.height);
}

// 空の文字なら隠す
function setOptionalText(node, text) {
  node.hidden = !text;
  if (text) setText(node, text);
}

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- このブラウザに保存(隠れキャラ) ----------
   localStorage が使えない環境(プライベートモードなど)でもエラーにせず、保存なしで遊べるようにする */
const STORE_PREFIX = 'sports-festival-2026:';

function loadList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(STORE_PREFIX + key));
    return Array.isArray(value) ? value : [];
  } catch (e) {
    return [];
  }
}

function saveList(key, list) {
  try {
    localStorage.setItem(STORE_PREFIX + key, JSON.stringify(list));
  } catch (e) {
    // 保存できなくても、そのページを開いている間は遊べる
  }
}

/* ---------- 日付 ---------- */
const [YEAR, MONTH, DAY] = CONTENT.site.date.split('-').map(Number);
const WEEKDAYS_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];
const WEEKDAY = new Date(YEAR, MONTH - 1, DAY).getDay();
const MD = `${MONTH}/${DAY}`;

/* ---------- 表紙・サイト全体 ---------- */
function renderSite() {
  const site = CONTENT.site;
  document.title = `${site.name}｜SPORTS DAY ${YEAR} しおり`;
  document.querySelector('meta[name="description"]').content =
    `${MONTH}月${DAY}日(${WEEKDAYS_JA[WEEKDAY]}) ${site.name}(体育祭)のしおり。タイムテーブル・競技説明・応援コールなど。`;

  setText($('site-brand'), `SPORTS DAY ${YEAR}`);
  setText($('site-day'), `${MONTH}.${pad(DAY)}`);
  setText($('site-weekday'), WEEKDAYS_EN[WEEKDAY]);
  setText($('site-name'), site.name);
  setOptionalText($('site-venue'), site.venue && `会場　${site.venue}`);
  renderFittedImage($('frame-cover'), $('cover-image'), site.coverImage);
  // 裏表紙(注意事項の後、フッターの上)。絵だけ。空なら出さない
  const closing = site.closingImage || {};
  $('closing').hidden = !closing.src;
  renderFittedImage($('closing'), $('closing-image'), closing, { lazy: true });
  setText($('footer-name'), `${site.name}　しおり班`);
}

/* ---------- 施設案内 ---------- */
function renderPlaces() {
  const { mapImage, list } = CONTENT.places;
  $('map').hidden = list.length === 0 && !mapImage.src;
  renderImage($('map-image'), mapImage);

  const box = $('places-list');
  box.hidden = list.length === 0;
  box.replaceChildren(...list.map((p) => {
    const item = el('div', 'place');
    item.append(el('strong', '', p.name));
    if (p.text) item.append(el('span', '', p.text));
    return item;
  }));
}

/* ---------- 競技説明 ----------
   一覧(時刻・ガチ/ゆる・競技名)を押すと、その競技の説明が開く(アコーディオン。1つずつ開け閉めできる)
   開いた中身:ABOUT(ひとこと → ルール) → HIGHLIGHT → Q&A。説明が全部空の競技は eventsEmptyText だけ
   色は担当キャンパスの色(campusColors)。時刻はタイムテーブルの同じ名前のプログラムから取る
   (タイムテーブルでの名前が違う競技は timetableName で探す) */
const EVENT_CATEGORIES = { gachi: 'ガチ競技', yuru: 'ゆる競技' };

// 見どころの行。[ '1行目', '2行目' ] でも '1行目\n2行目' でもいい
const highlightLines = (h) => (Array.isArray(h) ? h : String(h || '').split('\n')).filter((line) => line);
const isEmptyEvent = (ev) => !ev.summary && !(ev.rules || []).length
  && highlightLines(ev.highlight).length === 0 && !(ev.qa || []).length;

// 競技の場所の id。タイムテーブルからのリンクと URL の #event-競技名 に使う
const eventId = (name) => `event-${name}`;
// タイムテーブルでの名前(timetableName。なければ name)→ 競技名
const timetableName = (ev) => ev.timetableName || ev.name;
const eventByLabel = new Map(CONTENT.events.map((ev) => [timetableName(ev), ev.name]));

// 小見出し(ABOUT・HIGHLIGHT・Q&A)と中身のまとまり
function eventBlock(label, ...content) {
  const block = el('div', 'event__block');
  block.append(el('p', 'event__label', label), ...content);
  return block;
}

// ルールなどの箇条書き。番号つきは2列で「1 けんけん」、ふつうは1列で「— 〇〇」
function ruleList(items, numbered) {
  const list = el(numbered ? 'ol' : 'ul', `event__rules${numbered ? ' event__rules--numbered' : ''}`);
  list.setAttribute('role', 'list');
  list.append(...items.map((item, n) => {
    const li = el('li');
    const mark = el('span', 'event__rule-mark', numbered ? String(n + 1) : '—');
    mark.setAttribute('aria-hidden', 'true');
    li.append(mark, phraseEl('span', '', item));
    return li;
  }));
  return list;
}

// Q&A の答え。'文' か { text: '文', list: [ ... ], numbered: true }(リスト → 文の順)
function qaAnswer(a) {
  const box = el('div', 'qa__a');
  if (!a || typeof a !== 'object') return setPhrases(box, a || '');
  if ((a.list || []).length > 0) box.append(ruleList(a.list, a.numbered));
  if (a.text) box.append(phraseEl('p', '', a.text));
  return box;
}

function eventDetail(ev) {
  const inner = el('div', 'event__inner');
  if (isEmptyEvent(ev)) {
    if (CONTENT.eventsEmptyText) inner.append(el('p', 'event__empty', CONTENT.eventsEmptyText));
    return inner;
  }
  // ABOUT = ひとこと(太字)の下にルール
  const about = [];
  if (ev.summary) about.push(phraseEl('p', 'event__summary', ev.summary));
  const rules = ev.rules || [];
  if (rules.length > 0) about.push(ruleList(rules, ev.rulesNumbered));
  if (about.length > 0) inner.append(eventBlock('ABOUT', ...about));

  // 見どころ。1行ずつ、文字の下半分にキャンパスの色の薄いマーカー
  const highlight = highlightLines(ev.highlight);
  if (highlight.length > 0) {
    inner.append(eventBlock('HIGHLIGHT', ...highlight.map((line) => {
      const p = el('p', 'event__highlight');
      p.append(phraseEl('span', '', line));
      return p;
    })));
  }

  // Q&A。「Q」「A」の後ろの文の行頭をそろえる(2列のグリッド)
  const qa = ev.qa || [];
  if (qa.length > 0) {
    inner.append(eventBlock('Q&A', ...qa.map((item) => {
      const row = el('div', 'qa');
      row.append(el('span', 'qa__mark', 'Q'), phraseEl('p', 'qa__q', item.q),
        el('span', 'qa__mark qa__mark--a', 'A'), qaAnswer(item.a));
      return row;
    })));
  }
  return inner;
}

function setEventOpen(item, open) {
  const btn = item.querySelector('.event__btn');
  btn.setAttribute('aria-expanded', String(open)); // 右端の「＋」「−」もこれで切り替わる(CSS)
  item.querySelector('.event__body').hidden = !open;
}

function renderEvents() {
  const events = CONTENT.events;
  $('events').hidden = events.length === 0;
  const program = CONTENT.timetable.program;

  $('events-list').replaceChildren(...events.map((ev, i) => {
    const item = el('div', 'event');
    item.id = eventId(ev.name);
    const colors = (CONTENT.campusColors || {})[ev.campus];
    if (colors) {
      item.style.setProperty('--ev-color', colors.color);
      item.style.setProperty('--ev-ink', colors.ink);
      item.style.setProperty('--ev-marker', colors.marker);
    }

    // 閉じている時の1行(行全体がボタン)
    const btn = el('button', 'event__btn');
    btn.type = 'button';
    btn.setAttribute('aria-controls', `event-body-${i + 1}`);

    const time = el('span', 'event__time');
    const slot = program.find((p) => p.label === timetableName(ev));
    if (slot) {
      time.append(el('span', 'event__start', slot.start));
      if (slot.end) time.append(el('span', 'event__end', `〜${slot.end}`));
    }

    const title = el('span', 'event__title');
    if (EVENT_CATEGORIES[ev.category] || colors) {
      const cat = el('span', 'event__cat', EVENT_CATEGORIES[ev.category] || '');
      if (colors) cat.prepend(el('span', 'event__square'));
      title.append(cat);
    }
    title.append(el('span', 'event__name', ev.name));

    const sign = el('span', 'event__sign');
    sign.setAttribute('aria-hidden', 'true');
    btn.append(time, title, sign);

    const head = el('h3', 'event__head');
    head.append(btn);

    const body = el('div', 'event__body');
    body.id = `event-body-${i + 1}`;
    body.append(eventDetail(ev));

    item.append(head, body);
    setEventOpen(item, false);
    btn.addEventListener('click', () => setEventOpen(item, btn.getAttribute('aria-expanded') !== 'true'));
    return item;
  }));
}

// URL の #event-競技名 の競技を開いて、そこまでスクロールする(固定ヘッダーの分は scroll-margin で空く)
function openEventFromHash(scroll) {
  let name = '';
  try {
    name = decodeURIComponent(location.hash.slice(1));
  } catch (e) {
    return;
  }
  const item = name.startsWith('event-') ? document.getElementById(name) : null;
  if (!item || !item.classList.contains('event')) return;
  setEventOpen(item, true);
  if (scroll) item.scrollIntoView({ behavior: 'instant', block: 'start' });
}

/* ---------- 応援コール＆スローガン ----------
   コール(「応援団」「みんな」の小さい見出し + 文)→ 応援歌の1行 → スローガン(見出し + 線 → 一文 → 画像)
   イラストは1つめのコール名の横。グッズの一覧(cheer.goods)は、空でなければ一番下に出る
   コール・応援歌・スローガン・グッズが全部空なら、セクションごと隠す */
// コールの文。空白(全角・半角)で区切ったまとまり(「ま・つ・ど」など)の途中では折り返さない
// まとまりが1行に入らないほど長い時は、文節の切れ目(BudouX)で折る。\n は改行
function callText(text) {
  const dd = el('dd', 'call__text phrases');
  text.split('\n').forEach((row, n) => {
    if (n > 0) dd.append(document.createElement('br'));
    row.split(/([　 ]+)/).forEach((part) => {
      if (!part) return;
      dd.append(/^[　 ]+$/.test(part) ? part : phraseEl('span', 'call__chunk', part));
    });
  });
  return dd;
}

function renderCheer() {
  const { calls = [], song = {}, goods = [], image, sloganText } = CONTENT.cheer || {};
  const { slogan, sloganImage = {} } = CONTENT.site;
  const hasSlogan = Boolean(slogan || sloganImage.src);
  $('cheer').hidden = calls.length === 0 && !song.text && !hasSlogan && goods.length === 0;

  $('cheer-calls').hidden = calls.length === 0 && !song.text;
  $('cheer-calls-list').replaceChildren(...calls.map((call, n) => {
    const item = el('div', 'call');
    // 1つめのコールは、名前の行の右にイラスト
    const head = el('div', 'call__head');
    if (call.title) head.append(el('h3', 'call__title', call.title));
    if (n === 0 && image && image.src) {
      const deco = el('div', 'call__image');
      renderImage(deco, image, { lazy: true });
      head.append(deco);
    }
    if (head.childElementCount > 0) item.append(head);
    const lines = el('dl', 'call__lines');
    (call.lines || []).forEach((line) => {
      lines.append(el('dt', 'call__who', line.who || ''), callText(line.text || ''));
    });
    item.append(lines);
    return item;
  }));
  setOptionalText($('cheer-song'), song.text);

  // スローガン:一文の {slogan} に site.slogan を入れる。site.slogan が空なら一文は出さない
  $('cheer-slogan').hidden = !hasSlogan;
  const sloganLine = slogan && sloganText ? sloganText.replace('{slogan}', slogan) : '';
  $('cheer-slogan-text').hidden = !sloganLine;
  if (sloganLine) setPhrases($('cheer-slogan-text'), sloganLine);
  $('cheer-slogan-image').hidden = !sloganImage.src;
  renderImage($('cheer-slogan-image'), { ...sloganImage, alt: sloganImage.alt || (slogan ? `スローガン『${slogan}』` : 'スローガン') }, { lazy: true });

  $('cheer-goods').hidden = goods.length === 0;
  $('cheer-goods-list').replaceChildren(...goods.map((g) => {
    const item = el('div', 'good');
    item.append(el('strong', '', g.name));
    if (g.desc) item.append(el('span', '', g.desc));
    return item;
  }));
}

/* ---------- ほかの企画 ---------- */
function renderOthers() {
  const others = CONTENT.others;
  $('others').hidden = others.length === 0;
  $('others-list').replaceChildren(...others.map((o) => {
    const item = el('div', 'other');
    if (o.title) item.append(el('strong', '', o.title));
    if (o.text) item.append(el('p', '', o.text));
    return item;
  }));
}

/* ---------- おたのしみ:間違い探しの答え ---------- */
// 説明も答えの画像も空なら欄ごと隠す
function renderSpot() {
  const { spotText, spotAnswerImage } = CONTENT.fun;
  $('spot').hidden = !spotText && !spotAnswerImage.src;
  // 答えの画像がまだ無い時は、斜線の枠の代わりに「答えは準備中！」の1行
  if (!spotAnswerImage.src) {
    spotAnswer.className = 'spot__pending';
    setText(spotAnswer, CONTENT.fun.spotPendingText || '');
  }
  setOptionalText($('spot-text'), spotText);
}

// 答えの画像を組み立てる。画像は新しいタブで開くリンクにして、スマホでもピンチで大きく見られるようにする
// (丸が小さいので)。リンク先は JPG(どのブラウザでも開ける)
function renderSpotAnswer() {
  const image = CONTENT.fun.spotAnswerImage;
  const link = el('a', 'spot__link');
  link.href = image.fallback || image.src;
  link.target = '_blank';
  link.rel = 'noopener';
  renderImage(link, image);
  link.setAttribute('aria-label', `${image.alt || '間違い探しの答え'}(新しいタブで大きく開く)`);
  spotAnswer.className = 'spot__answer';
  spotAnswer.replaceChildren(link, el('p', 'spot__hint', 'タップで大きく見られるよ'));
}

// 「答えを見る」で答えの画像を出す。もう一度押すと隠れる
// ネタバレしないよう、画像は最初に押した時に読み込む
const spotBtn = $('spot-btn');
const spotAnswer = $('spot-answer');
spotBtn.addEventListener('click', () => {
  const open = spotAnswer.hidden;
  if (open && CONTENT.fun.spotAnswerImage.src && !spotAnswer.querySelector('img')) renderSpotAnswer();
  spotAnswer.hidden = !open;
  spotBtn.setAttribute('aria-expanded', String(open));
  setText(spotBtn, open ? '答えをかくす' : '答えを見る');
});

/* ---------- 隠れキャラ ----------
   隠れ場所は3種類。どれも、タップすると前に出てきてセリフを言い、数秒で元に戻る
   ・イラストの枠(.frame。表紙など):枠(.ph)の後ろに隠れて、ふちから顔だけ出す
   ・黒い線(セクションの下の線・コール名の下の線):線を地面にして、線の下から頭だけ出す
       線の位置に高さ0の入れ物(.frame--line)を置いて、その下を切る(clip-path)。キャラはその中
   ・セクションの大きい番号('num-1'…。今は使っていない):数字の後ろに隠れて、上から顔を出す
   3体全部見つけたら紙吹雪(おたのしみに欄は出さない) */
const HIDDEN_KEY = 'hidden-chars-v16'; // 線に隠れる形になったので、前の保存データ(v6)は使わない
const PEEK_SIDES = ['top', 'left', 'right'];
const PEEK_AT = { start: '18%', center: '50%', end: '82%' };
const POS_NAMES = Object.keys(PEEK_AT);
const hiddenFound = new Set(loadList(HIDDEN_KEY));
let hiddenPlaced = [];   // 実際に隠せたキャラの番号
let hiddenUnplaced = []; // 隠れる枠が無い・非表示で隠せなかったもの(?check で出す)
let hiddenShort = false;  // ランダムで、候補の場所がキャラの数より少なかった

function markFound(peek, btn, i) {
  peek.classList.add('is-found');
  btn.setAttribute('aria-label', `隠れキャラ ${i + 1}(見つけた)`);
  if (!peek.querySelector('img')) peek.textContent = '✓';
}

// 表示されている枠だけ(セクションが空で消えている枠は使えない)
function visibleFrame(name) {
  const frame = document.getElementById(`frame-${name}`);
  return frame && !frame.closest('[hidden]') ? frame : null;
}

// 線の上の、キャラが出てもいい位置(左寄り・真ん中・右寄り)。線のすぐ上にある文字・イラスト(obstacles)と横に重なる位置は外す
const PEEK_HALF = 28; // キャラの横幅の半分(48px ÷ 2)+ すき間
function freePositions(host, obstacles) {
  const box = host.getBoundingClientRect();
  const blocked = obstacles.filter(Boolean).map((r) => [r.left - PEEK_HALF, r.right + PEEK_HALF]);
  return POS_NAMES.filter((pos) => {
    const x = box.left + box.width * parseFloat(PEEK_AT[pos]) / 100;
    return !blocked.some(([l, r]) => x > l && x < r);
  });
}

// 文字の部分だけの大きさ(見出しは横幅いっぱいの箱なので、文字の所だけ測る)
function textRect(node) {
  if (!node) return null;
  const range = document.createRange();
  range.selectNodeContents(node);
  return range.getBoundingClientRect();
}

// ランダムの時の隠れ場所の候補。{ frame(枠) か host(線を持つ要素), positions(出てもいい位置), fixed(必ず使う) }
//   'lines'     = 表示されているセクションの下の黒い線(最後のセクションは線が無いので外す)
//   'callLines' = 各コール名の下の線(線の上のコール名・イラストに重ならない位置だけ)
//   'nums'      = セクションの大きい番号(renderNumbers が表示中の番号にだけ id を付ける)
//   それ以外    = イラストの枠の名前('cover' など)。必ず1体入る
function hiddenSpots() {
  return (CONTENT.hiddenCharFrames || []).flatMap((name) => {
    if (name === 'lines') {
      return [...document.querySelectorAll('main > .section:not([hidden]):not(.section--last)')]
        .map((host) => ({ host, positions: POS_NAMES }));
    }
    if (name === 'callLines') {
      return [...document.querySelectorAll('#cheer:not([hidden]) .call__lines')].map((host) => {
        const head = host.previousElementSibling;
        const obstacles = head ? [textRect(head.querySelector('.call__title')), head.querySelector('.call__image')?.getBoundingClientRect()] : [];
        return { host, positions: freePositions(host, obstacles) };
      });
    }
    if (name === 'nums') {
      return [...document.querySelectorAll('[id^="frame-num-"]')].map((frame) => ({ frame, positions: ['center'] }));
    }
    const frame = visibleFrame(name);
    return frame ? [{ frame, positions: POS_NAMES, fixed: true }] : [];
  }).filter((spot) => spot.positions.length > 0);
}

function shuffle(list) {
  for (let n = list.length - 1; n > 0; n--) {
    const m = Math.floor(Math.random() * (n + 1));
    [list[n], list[m]] = [list[m], list[n]];
  }
  return list;
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

const overlaps = (a, b) => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
const overlapArea = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
  * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

// 線に隠れたキャラの吹き出しの場所。キャラの横(1行)→ キャラの上 → キャラの横(2行まで)の順に試して、
// 線のあるセクションの文字・イラストに重ならず、画面からはみ出さない最初の場所にする
// 全部だめなら、一番ましな所(文字に重なる・はみ出すのは重く、イラストは箱(まわりは透明)にかかる面積で軽く数える)
function placeLineBubble(frame, bubble, pos) {
  const line = frame.getBoundingClientRect();
  const x = line.left + line.width * parseFloat(PEEK_AT[pos]) / 100;
  const texts = [{ left: x - 24, right: x + 24, top: line.top - 52, bottom: line.top - 4 }]; // 出てきたキャラも文字と同じ扱い
  const area = frame.closest('section') || document.body;
  const walker = document.createTreeWalker(area, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.data.trim() || t.parentElement.closest('.frame--line, [hidden]')) continue;
    const range = document.createRange();
    range.selectNodeContents(t);
    texts.push(...range.getClientRects());
  }
  const images = [...area.querySelectorAll('img')].filter((img) => !img.closest('.frame--line'))
    .map((img) => img.getBoundingClientRect());
  const side = pos === 'start' ? ['right', 'left'] : ['left', 'right'];
  const screenW = document.documentElement.clientWidth;
  const oneLine = parseFloat(getComputedStyle(bubble).lineHeight) || 20;
  let best = null;
  for (const spot of [...side, 'top', ...side.map((s) => `${s}-wrap`)]) {
    bubble.dataset.spot = spot;
    const box = bubble.getBoundingClientRect();
    const bad = (box.left < 0 || box.right > screenW ? 100 : 0)
      + (box.height > oneLine * 2 + 8 ? 100 : 0) // 3行以上
      + texts.filter((o) => overlaps(o, box)).length * 10
      + images.reduce((sum, o) => sum + overlapArea(o, box) / 1000, 0);
    if (!best || bad < best.bad) best = { spot, bad };
    if (bad === 0) break;
  }
  bubble.dataset.spot = best.spot;
}

// 1体分を枠(または線)に入れる
function placeHiddenChar(c, i, frame, side, pos) {
  // 番号は小さいので、いつも上の真ん中から。吹き出しは画面の左にはみ出ないよう番号の左にそろえる
  const isNum = frame.classList.contains('frame--num');
  const bubblePos = isNum ? 'start' : pos;
  frame.dataset.hiddenChar = `${i + 1}:${pos}`; // 確認用(どの枠に何体目がいるか)

  // キャラ本体(枠の後ろ・線の下)
  // 画像の時は、キャラの高さの show(0〜1)だけ見せる(絵によって目の位置が違うので、キャラごとに決められる)
  const hasImage = Boolean(c.image && c.image.src);
  const imgClass = hasImage ? ' is-img' : '';
  const peek = el('span', `peek peek--${side}${imgClass}`, '?');
  peek.setAttribute('aria-hidden', 'true');
  renderImage(peek, c.image);

  // タップする所(見えている所のまわりに広げた透明なボタン)
  const btn = el('button', `peek__hit peek__hit--${side}${imgClass}`);
  btn.type = 'button';
  btn.setAttribute('aria-label', `隠れキャラ ${i + 1}`);

  const bubble = el('span', `peek__bubble peek__bubble--${side} peek__bubble--${bubblePos}${imgClass}`);
  bubble.setAttribute('aria-live', 'polite');
  bubble.hidden = true;

  [peek, btn, bubble].forEach((node) => {
    node.style.setProperty('--at', PEEK_AT[pos]);
    if (hasImage && c.show > 0 && c.show < 1) node.style.setProperty('--show', c.show);
  });

  let timer;
  btn.addEventListener('click', () => {
    const first = !hiddenFound.has(i);
    if (first) {
      hiddenFound.add(i);
      saveList(HIDDEN_KEY, [...hiddenFound]);
      markFound(peek, btn, i);
    }
    // 今ちょうど全部そろった時は紙吹雪。hiddenCharsDone があれば、そのセリフを言う
    const done = first && hiddenPlaced.every((n) => hiddenFound.has(n));
    peek.classList.add('is-out');
    setOptionalText(bubble, (done && CONTENT.hiddenCharsDone) || c.line);
    if (frame.classList.contains('frame--line')) placeLineBubble(frame, bubble, pos);
    clearTimeout(timer);
    timer = setTimeout(() => {
      peek.classList.remove('is-out');
      bubble.hidden = true;
    }, 2800);
    if (done) confetti();
  });

  frame.append(peek, btn, bubble);
  if (hiddenFound.has(i)) markFound(peek, btn, i);
  hiddenPlaced.push(i);
}

function renderHiddenChars() {
  hiddenPlaced = [];
  hiddenUnplaced = [];
  hiddenShort = false;
  const chars = CONTENT.hiddenChars;

  if (!CONTENT.hiddenCharsRandom) {
    chars.forEach((c, i) => {
      const frame = visibleFrame(c.frame);
      if (!frame) {
        hiddenUnplaced.push(i);
        return;
      }
      const isNum = frame.classList.contains('frame--num');
      const side = isNum ? 'top' : (PEEK_SIDES.includes(c.side) ? c.side : 'top');
      const pos = isNum ? 'center' : (PEEK_AT[c.pos] ? c.pos : 'center');
      placeHiddenChar(c, i, frame, side, pos);
    });
    return;
  }

  // ランダム:イラストの枠('cover' など)を先に、残りは線・番号を混ぜて、1か所に1体ずつ配る(向きは上だけ)
  // どのキャラがどこに入るかも混ぜる
  const spots = hiddenSpots();
  const pool = [...spots.filter((s) => s.fixed), ...shuffle(spots.filter((s) => !s.fixed))];
  shuffle(chars.map((_, i) => i)).forEach((i, k) => {
    const spot = pool[k];
    if (!spot) {
      hiddenUnplaced.push(i);
      hiddenShort = true;
      return;
    }
    let frame = spot.frame;
    if (!frame) {
      frame = el('span', 'frame frame--line');
      spot.host.append(frame);
    }
    placeHiddenChar(chars[i], i, frame, 'top', pick(spot.positions));
  });
  hiddenUnplaced.sort((a, b) => a - b);
}

// 軽い紙吹雪(動きを減らす設定の時は出さない)
function confetti() {
  if (REDUCED_MOTION) return;
  const colors = ['var(--c-accent)', 'var(--c-ink)', 'var(--c-now-bg)', 'var(--c-rule)'];
  const box = el('div', 'confetti');
  box.setAttribute('aria-hidden', 'true');
  for (let n = 0; n < 40; n += 1) {
    const piece = el('span');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[n % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.5}s`;
    piece.style.animationDuration = `${1.6 + Math.random() * 1}s`;
    piece.style.setProperty('--spin', `${Math.round(Math.random() * 720 - 360)}deg`);
    box.append(piece);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 3500);
}

/* ---------- 注意事項 ----------
   左に 01・02… の番号、右に文。strong の言葉だけ太字＋薄い緑のマーカー */
// 文の strong の言葉だけ <strong> にする(文字は textContent と同じく文字のまま)
// 折り返しは文全体を BudouX で区切った文節の切れ目(<wbr>)。強調の境目では区切らない
function noticeText(notice) {
  const { text = '', strong } = typeof notice === 'string' ? { text: notice } : notice;
  // 強調する所 [始まり, 終わり)。同じ言葉が何回出てきても全部
  const ranges = [];
  (Array.isArray(strong) ? strong : [strong]).filter(Boolean).forEach((word) => {
    for (let at = text.indexOf(word); at >= 0; at = text.indexOf(word, at + word.length)) {
      ranges.push([at, at + word.length]);
    }
  });
  const breaks = new Set();
  let offset = 0;
  (window.budouxJa ? window.budouxJa.parse(text) : [text]).forEach((part, k) => {
    if (k > 0) breaks.add(offset);
    offset += part.length;
  });
  // 文節の切れ目と強調の始まり・終わりで文を細かく切って、順に並べる
  const cuts = [...new Set([0, text.length, ...breaks, ...ranges.flat()])].sort((a, b) => a - b);
  const p = el('p', 'notice__text phrases');
  let strongEl = null;
  for (let k = 0; k < cuts.length - 1; k++) {
    const [from, to] = [cuts[k], cuts[k + 1]];
    const range = ranges.find(([a, b]) => from >= a && to <= b);
    if (!range) strongEl = null;
    else if (from === range[0]) strongEl = p.appendChild(el('strong', 'notice__strong'));
    const target = strongEl || p;
    if (breaks.has(from)) target.append(document.createElement('wbr'));
    target.append(text.slice(from, to));
  }
  return p;
}

function renderNotices() {
  const { notices } = CONTENT;
  $('notice').hidden = notices.length === 0;
  $('notices-list').replaceChildren(...notices.map((notice, n) => {
    const li = el('li', 'notice');
    const num = el('span', 'notice__num', pad(n + 1));
    num.setAttribute('aria-hidden', 'true');
    li.append(num, noticeText(notice));
    return li;
  }));
}

/* ---------- 目次・メニューと番号 ----------
   表示されているセクションだけで 01 から振り直す。ハンバーガーメニューにも同じ項目を並べる */
function renderNumbers() {
  let count = 0;
  let last = null;
  const menuItems = [];
  document.querySelectorAll('.toc__list a').forEach((link) => {
    const section = document.querySelector(link.getAttribute('href'));
    section.classList.remove('section--last');
    link.hidden = section.hidden;
    // 大きい番号も隠れキャラの枠('nums'。今は使っていない)。表示中のものだけ 'frame-num-3' のような id を付ける
    const frame = section.querySelector('.section__num');
    frame.removeAttribute('id');
    if (section.hidden) return;

    count += 1;
    const num = pad(count);
    setText(link.querySelector('.num'), num);
    // 数字は中の .section__digits に入れる(隠れキャラが入っていても消さない)。'num-3' = 03 の番号
    setText(frame.querySelector('.section__digits'), num);
    frame.id = `frame-num-${count}`;
    last = section;

    const item = el('a', '', link.lastChild.textContent);
    item.href = link.getAttribute('href');
    item.prepend(el('span', 'num', num));
    menuItems.push(item);
  });
  if (last) last.classList.add('section--last');
  $('menu-list').replaceChildren(...menuItems);
}

/* ---------- ハンバーガーメニュー ---------- */
const menu = $('menu');
const menuBtn = $('menu-btn');

function setMenuOpen(open) {
  menu.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  document.documentElement.classList.toggle('is-menu-open', open);
}

menuBtn.addEventListener('click', () => {
  const open = menu.hidden;
  setMenuOpen(open);
  if (open) menu.querySelector('a')?.focus({ preventScroll: true });
});

// 項目をタップしたら閉じる(移動はリンクのふつうの動きにまかせる)
menu.addEventListener('click', (e) => {
  if (e.target.closest('a')) setMenuOpen(false);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !menu.hidden) {
    setMenuOpen(false);
    menuBtn.focus({ preventScroll: true });
  }
});

/* ---------- タイムテーブル + 「いまここ」 ---------- */

// 今の状態を返す。phase: 'before'(当日より前) / 'day'(当日) / 'after'(翌日以降)
function getNow() {
  const testTime = params.get('time');
  if (testTime && /^\d{1,2}:\d{2}$/.test(testTime)) {
    return { phase: 'day', minutes: toMinutes(testTime), isTest: true };
  }
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const eventDate = `${YEAR}-${pad(MONTH)}-${pad(DAY)}`;
  if (today < eventDate) return { phase: 'before' };
  if (today > eventDate) return { phase: 'after' };
  return { phase: 'day', minutes: now.getHours() * 60 + now.getMinutes() };
}

// プログラムの開始・終了(分)。end を書き忘れた行は、次の行の start まで
function programSpans(program) {
  return program.map((p, i) => {
    const start = toMinutes(p.start);
    const next = program[i + 1];
    const end = p.end ? toMinutes(p.end) : (next ? toMinutes(next.start) : start);
    return { start, end };
  });
}

// 走るキャラ。コマを全部重ねて置いて(最初に4枚とも読み込む)、見せる1枚を順番に切り替える
// コマが無い時は点線の丸のまま
let runnerTimer = null;
// 止まっている時に見せるコマ = 2コマ目(足をそろえたコマ。足が線に乗る)。コマが1枚だけならそれ
const runnerStopFrame = (count) => Math.min(1, count - 1);

function renderRunner() {
  const { runnerFrames = [], runnerAlt = '' } = CONTENT.timetable;
  if (runnerFrames.length === 0) return;
  const runner = $('runner');
  runner.classList.add('has-frames');
  runner.replaceChildren(...runnerFrames.map((src, i) => {
    const img = el('img', 'track__frame' + (i === runnerStopFrame(runnerFrames.length) ? ' is-shown' : ''));
    img.src = src;
    img.alt = i === 0 ? runnerAlt : '';
    return img;
  }));
}

// プログラムの時間中だけ走る。それ以外(始まる前・すき間・終わった後)と、動きを減らす設定の時は2コマ目で止まる
function setRunnerRunning(running) {
  const frames = $('runner').querySelectorAll('.track__frame');
  const run = running && frames.length > 1 && !REDUCED_MOTION;
  if (run === Boolean(runnerTimer)) return;
  clearInterval(runnerTimer);
  runnerTimer = null;
  let shown = 0;
  const show = (i) => {
    frames.forEach((f, j) => f.classList.toggle('is-shown', j === i));
    shown = i;
  };
  show(runnerStopFrame(frames.length));
  if (run) {
    runnerTimer = setInterval(() => show((shown + 1) % frames.length),
      CONTENT.timetable.runnerFrameMs || 330);
  }
}

function renderTimetable() {
  const { program } = CONTENT.timetable;
  const spans = programSpans(program);
  const now = getNow();
  // キャラが走るのは、最初のプログラムの開始〜最後のプログラムの終了
  const start = spans[0].start;
  const end = spans[spans.length - 1].end;

  let nowIndex = -1;
  let label;
  let progress = 0;

  if (now.phase === 'before') {
    label = `${MD}当日、ここでキャラが走るよ`;
  } else if (now.phase === 'after' || now.minutes >= end) {
    label = 'おつかれさま！全プログラム終了';
    progress = 1;
  } else {
    nowIndex = spans.findIndex((sp) => now.minutes >= sp.start && now.minutes < sp.end);
    if (nowIndex >= 0) {
      label = `いまは「${program[nowIndex].label}」`;
    } else {
      // どのプログラムにも入らない時間(始まる前・すき間)は、次のプログラムを出す
      const next = program[spans.findIndex((sp) => sp.start > now.minutes)];
      label = now.minutes < start
        ? `まだ始まってないよ(${next.start}から「${next.label}」)`
        : `次は「${next.label}」(${next.start}から)`;
    }
    progress = Math.min(1, Math.max(0, (now.minutes - start) / (end - start)));
  }

  setText($('now-label'), label);

  const runner = $('runner');
  runner.style.setProperty('--progress', progress.toFixed(3));
  runner.classList.toggle('is-waiting', now.phase === 'before');
  setRunnerRunning(nowIndex >= 0);

  // 遅れている時だけ「※いま、予定より約15分遅れて進んでいます」
  setOptionalText($('now-delay'),
    DELAY === 0 ? '' : `※いま、予定より約${Math.abs(DELAY)}分${DELAY > 0 ? '遅れて' : '早く'}進んでいます`);

  if (now.isTest) {
    $('now-note').hidden = false;
    setText($('now-note'),
      `※テスト表示中:${MD} ${Math.floor(now.minutes / 60)}:${pad(now.minutes % 60)} として表示しています`);
  }

  // 時刻は「10:00〜10:30」。終わりの時刻は少し小さく
  // 競技説明に同じ名前の競技がある行は、行全体がその競技へのリンク(右端に「→」)
  $('program').replaceChildren(...program.map((p, i) => {
    const li = el('li', 'program__row' + (i === nowIndex ? ' is-now' : ''));
    const eventName = eventByLabel.get(p.label);
    const linked = Boolean(eventName) && !$('events').hidden;
    const row = el(linked ? 'a' : 'div', 'program__inner');
    const time = el('span', 'program__time', p.start);
    if (p.end) time.append(el('span', 'program__end', `〜${p.end}`));
    row.append(time, el('span', 'program__name', p.label));
    if (i === nowIndex) {
      li.setAttribute('aria-current', 'step');
      row.append(el('span', 'program__badge', 'NOW'));
    }
    if (linked) {
      row.href = `#${eventId(eventName)}`;
      const go = el('span', 'program__go', '→');
      go.setAttribute('aria-hidden', 'true');
      row.append(go);
      // 同じリンクをもう一度押した時(URL が変わらない時)も開く
      row.addEventListener('click', () => {
        const item = document.getElementById(eventId(eventName));
        if (item) setEventOpen(item, true);
      });
    }
    li.append(row);
    return li;
  }));
}

/* ---------- 入れ忘れチェック(?check の時だけ) ---------- */
const CHECK_LABELS = {
  site: '表紙', name: '名前', slogan: 'スローガン', sloganImage: 'スローガンの画像', venue: '会場', date: '日付',
  coverImage: '表紙イラスト', closingImage: '裏表紙イラスト', fallback: '予備の画像(JPG)', places: '施設案内', mapImage: '簡易マップ', list: '場所',
  text: '説明', timetable: 'タイムテーブル', start: '開始時刻', end: '終了時刻',
  program: 'プログラム', delayMin: '遅れ(分)', label: '名前', runnerFrames: '走るキャラのコマ', events: '競技',
  timetableName: 'タイムテーブルでの名前', campus: 'キャンパスの色', campusColors: 'キャンパスの色', category: 'ガチ/ゆる', summary: 'ひとこと', rules: 'ルール', rulesNumbered: 'ルールの番号',
  highlight: '見どころ', qa: 'Q&A', q: '質問', a: '答え', numbered: '番号つき', eventsEmptyText: '説明が空の競技に出る文',
  image: '画像', others: 'ほかの企画',
  title: '見出し', fun: 'おたのしみ', spotText: '間違い探しの説明', spotAnswerImage: '間違い探しの答え',
  spotPendingText: '答えが準備中の時の文',
  cheer: '応援', calls: 'コール', lines: 'セリフ', who: 'だれが', song: '応援歌', sloganText: 'スローガンの一文', note: '説明', goods: 'グッズ', desc: '説明',
  notices: '注意事項', strong: '太字の言葉',
  hiddenChars: '隠れキャラ', frame: '隠れる枠', line: 'セリフ',
  hiddenCharsDone: '全部見つけた時のセリフ',
  hiddenCharsRandom: '隠れキャラをランダムに', hiddenCharFrames: '隠れてよい場所',
};

// 「競技 2 › ルール」のような読める名前と、「events[1].rule」のようなファイル上の場所
function describePath(path) {
  const words = [];
  let code = '';
  path.forEach((key) => {
    if (typeof key === 'number') {
      words[words.length - 1] += ` ${key + 1}`;
      code += `[${key}]`;
    } else {
      words.push(CHECK_LABELS[key] || key);
      code += code ? `.${key}` : key;
    }
  });
  return { words: words.join(' › '), code };
}

function collectMissing(value, path, found) {
  if (typeof value === 'string') {
    if (/［[^］]*］/.test(value)) found.placeholders.push({ path, value });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => collectMissing(v, [...path, i], found));
  } else if (value && typeof value === 'object') {
    if ('src' in value && !value.src) found.images.push({ path });
    Object.entries(value).forEach(([k, v]) => collectMissing(v, [...path, k], found));
  }
  return found;
}

function renderCheck() {
  if (!params.has('check')) return;
  const found = collectMissing(CONTENT, [], { placeholders: [], images: [] });

  const box = $('check');
  const inner = el('div', 'check__inner wrap');
  inner.append(el('p', 'check__title', '入れ忘れチェック(js/content.js)'));

  const addList = (heading, items, toText) => {
    inner.append(el('p', 'check__heading', `${heading}:${items.length}件`));
    if (items.length === 0) return;
    const ul = el('ul', 'check__list');
    items.forEach((item) => {
      const { words, code } = describePath(item.path);
      const li = el('li', '', words);
      if (toText) li.append(el('span', 'check__value', toText(item)));
      li.append(el('code', '', code));
      ul.append(li);
    });
    inner.append(ul);
  };
  addList('まだ［］のまま残っている項目', found.placeholders, (item) => item.value);
  // 走るキャラのコマ(runnerFrames)が空の時も、画像が未設定として出す
  if ((CONTENT.timetable.runnerFrames || []).length === 0) found.images.push({ path: ['timetable', 'runnerFrames'] });
  // 施設案内が非表示(場所の一覧も地図も空 = わざと使っていない)の時は、簡易マップを未設定に数えない
  if ($('map').hidden) found.images = found.images.filter((item) => item.path[0] !== 'places');
  addList('画像が未設定の場所', found.images);
  // ひとこと・ルール・見どころ・Q&A が全部空の競技(サイトには「準備中」の文が出ている)
  addList('説明が空の競技',
    CONTENT.events.flatMap((ev, i) => (isEmptyEvent(ev) ? [{ path: ['events', i], value: ev.name }] : [])),
    (item) => item.value);
  // 時刻が入らない競技(タイムテーブルに同じ名前のプログラムがない)・キャンパスの色が無い競技。ある時だけ出す
  const program = CONTENT.timetable.program;
  const noTime = CONTENT.events.flatMap((ev, i) => (program.some((p) => p.label === timetableName(ev))
    ? [] : [{ path: ['events', i, ev.timetableName ? 'timetableName' : 'name'], value: timetableName(ev) }]));
  if (noTime.length > 0) addList('タイムテーブルに同じ名前がない競技(時刻が出ない)', noTime, (item) => item.value);
  const noColor = CONTENT.events.flatMap((ev, i) => ((CONTENT.campusColors || {})[ev.campus]
    ? [] : [{ path: ['events', i, 'campus'], value: `${ev.name} '${ev.campus || ''}'` }]));
  if (noColor.length > 0) addList('キャンパスの色が見つからない競技', noColor, (item) => item.value);
  // 隠れる枠が無い(またはセクションが空で非表示の)隠れキャラ。ある時だけ出す
  if (hiddenShort) {
    addList(`隠れる場所の候補(hiddenCharFrames)が足りず出せなかった隠れキャラ(候補 ${hiddenPlaced.length}個)`,
      hiddenUnplaced.map((i) => ({ path: ['hiddenChars', i] })));
  } else if (hiddenUnplaced.length > 0) {
    addList('隠れる枠が見つからない隠れキャラ',
      hiddenUnplaced.map((i) => ({ path: ['hiddenChars', i, 'frame'], value: CONTENT.hiddenChars[i].frame })),
      (item) => `'${item.value}'`);
  }

  // OGP(index.html に直接書いてある)のタイトルに、決まった体育祭の名前が入っているか
  const name = CONTENT.site.name;
  const ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';
  if (name && !/［[^］]*］/.test(name) && !ogTitle.includes(name)) {
    inner.append(el('p', 'check__heading', 'OGPのタイトルに体育祭の名前が入っていない'));
    const ul = el('ul', 'check__list');
    const li = el('li', '', 'content.js の名前が決まったら、index.html の og:title も直す');
    li.append(el('span', 'check__value', `今: ${ogTitle}`));
    ul.append(li);
    inner.append(ul);
  }

  box.replaceChildren(inner);
  box.className = 'check';
  box.hidden = false;
}

/* ---------- 組み立て ---------- */
renderSite();
renderPlaces();
renderEvents();
renderCheer();
renderOthers();
renderNotices();
renderRunner();
$('timetable').hidden = CONTENT.timetable.program.length === 0;
renderSpot();
// おたのしみは間違い探しだけ。出ないなら、おたのしみごと隠す
$('fun').hidden = $('spot').hidden;
// 番号と「最後のセクション」(下の線が無い)が決まってから、隠れキャラを線に隠す
renderNumbers();
renderHiddenChars();
renderCheck();

if (CONTENT.timetable.program.length > 0) {
  renderTimetable();
  setInterval(renderTimetable, 60 * 1000);
}

// #event-競技名 つきの URL で開いた時・タイムテーブルから飛んだ時は、その競技を開く
// (最初は文字のフォントが読み込まれて位置がずれるので、読み込み後にもう一度合わせる)
if (location.hash.startsWith('#event-')) {
  openEventFromHash(true);
  document.fonts?.ready.then(() => openEventFromHash(true));
}
window.addEventListener('hashchange', () => openEventFromHash(false));
