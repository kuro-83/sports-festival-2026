/* =========================================================
   体育祭しおり
   ・js/content.js(CONTENT)の中身でページを組み立てる
   ・タイムテーブル + 「いまここ」
   ・応援ボタン
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

// 文字は必ずここを通して入れる(textContent なのでタグは効かない)。\n は改行になる
function setText(node, text) {
  node.textContent = text;
  node.classList.toggle('pre-line', String(text).includes('\n'));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) setText(node, text);
  return node;
}

// 画像が設定されていれば枠の中身を <img> にする。src が空なら斜線の仮の枠のまま
function renderImage(box, image) {
  if (!image || !image.src) return;
  const img = document.createElement('img');
  img.src = image.src;
  img.alt = image.alt || '';
  box.replaceChildren(img);
}

// 空の文字なら隠す
function setOptionalText(node, text) {
  node.hidden = !text;
  if (text) setText(node, text);
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
  document.title = `${site.name} しおり | SPORTS DAY ${YEAR}`;
  document.querySelector('meta[name="description"]').content =
    `${MONTH}月${DAY}日(${WEEKDAYS_JA[WEEKDAY]}) ${site.name}のしおり。施設案内・タイムテーブル・競技説明など。`;

  setText($('site-brand'), `SPORTS DAY ${YEAR}`);
  setText($('site-day'), `${MONTH}.${pad(DAY)}`);
  setText($('site-weekday'), WEEKDAYS_EN[WEEKDAY]);
  setText($('site-name'), site.name);
  setOptionalText($('site-slogan'), site.slogan);
  setOptionalText($('site-venue'), site.venue && `会場　${site.venue}`);
  renderImage($('cover-image'), site.coverImage);
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

/* ---------- 競技説明 ---------- */
function renderEvents() {
  const events = CONTENT.events;
  $('events').hidden = events.length === 0;
  document.querySelector('#timetable .arrow-link').hidden = events.length === 0;

  $('events-list').replaceChildren(...events.map((ev, i) => {
    const article = el('article', 'event');

    const illust = el('div', 'ph event__illust', '挿絵');
    renderImage(illust, ev.image);

    const body = el('div', 'event__body');
    body.append(el('span', 'event__no', `EVENT ${pad(i + 1)}`), el('h3', '', ev.name));
    if (ev.rule) {
      const p = el('p', '', `　${ev.rule}`);
      p.prepend(el('strong', '', 'ルール'));
      body.append(p);
    }
    if (ev.highlight) {
      const p = el('p', '', `　${ev.highlight}`);
      p.prepend(el('strong', 'accent', 'みどころ'));
      body.append(p);
    }

    article.append(illust, body);
    return article;
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

/* ---------- おたのしみ ---------- */
function renderFun() {
  const { spotImages, spotText } = CONTENT.fun;
  renderImage($('spot-a'), spotImages[0]);
  renderImage($('spot-b'), spotImages[1]);
  setOptionalText($('spot-text'), spotText);
}

/* ---------- 注意事項・緊急連絡先 ---------- */
function renderNotices() {
  const { notices, emergency } = CONTENT;
  $('notice').hidden = notices.length === 0 && !emergency.text;

  const box = $('notices-list');
  box.hidden = notices.length === 0;
  box.replaceChildren(...notices.map((text) => el('p', '', text)));

  $('emergency').hidden = !emergency.text;
  setText($('emergency-title'), emergency.title);
  setText($('emergency-text'), emergency.text);
}

/* ---------- 目次と番号 ----------
   表示されているセクションだけで 01 から振り直す */
function renderNumbers() {
  let count = 0;
  let last = null;
  document.querySelectorAll('.toc__list a').forEach((link) => {
    const section = document.querySelector(link.getAttribute('href'));
    section.classList.remove('section--last');
    link.hidden = section.hidden;
    if (section.hidden) return;

    count += 1;
    setText(link.querySelector('.num'), pad(count));
    setText(section.querySelector('.section__num'), pad(count));
    last = section;
  });
  if (last) last.classList.add('section--last');
}

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

function renderTimetable() {
  const { program } = CONTENT.timetable;
  const now = getNow();
  const start = toMinutes(CONTENT.timetable.start);
  const end = toMinutes(CONTENT.timetable.end);

  let nowIndex = -1;
  let label;
  let progress = 0;

  if (now.phase === 'before') {
    label = `${MD}当日、ここでキャラが走るよ`;
  } else if (now.phase === 'after' || now.minutes >= end) {
    label = 'おつかれさま！全プログラム終了';
    progress = 1;
  } else {
    program.forEach((p, i) => {
      if (now.minutes >= toMinutes(p.start)) nowIndex = i;
    });
    label = nowIndex >= 0 ? `いまは「${program[nowIndex].label}」` : 'まだ始まってないよ';
    progress = Math.min(1, Math.max(0, (now.minutes - start) / (end - start)));
  }

  setText($('now-label'), label);

  const runner = $('runner');
  runner.style.setProperty('--progress', progress.toFixed(3));
  runner.classList.toggle('is-waiting', now.phase === 'before');

  if (now.isTest) {
    setText($('now-note'),
      `※テスト表示中:${MD} ${Math.floor(now.minutes / 60)}:${pad(now.minutes % 60)} として表示しています`);
  }

  $('program').replaceChildren(...program.map((p, i) => {
    const li = el('li', 'program__row' + (i === nowIndex ? ' is-now' : ''));
    li.append(el('span', 'program__time', p.start), el('span', 'program__name', p.label));
    if (i === nowIndex) {
      li.setAttribute('aria-current', 'step');
      li.append(el('span', 'program__badge', 'NOW'));
    }
    return li;
  }));
}

/* ---------- 入れ忘れチェック(?check の時だけ) ---------- */
const CHECK_LABELS = {
  site: '表紙', name: '名前', slogan: 'スローガン', venue: '会場', date: '日付',
  coverImage: '表紙イラスト', places: '施設案内', mapImage: '簡易マップ', list: '場所',
  text: '説明', timetable: 'タイムテーブル', start: '開始時刻', end: '終了時刻',
  program: 'プログラム', label: '名前', runnerImage: '走るキャラ', events: '競技',
  rule: 'ルール', highlight: 'みどころ', image: '挿絵', others: 'ほかの企画',
  title: '見出し', fun: 'おたのしみ', spotImages: '間違い探しの絵', spotText: '間違い探しの説明',
  notices: '注意事項', emergency: '緊急連絡先',
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
  addList('画像が未設定の場所', found.images);

  box.replaceChildren(inner);
  box.className = 'check';
  box.hidden = false;
}

/* ---------- 組み立て ---------- */
renderSite();
renderPlaces();
renderEvents();
renderOthers();
renderFun();
renderNotices();
renderImage($('runner'), CONTENT.timetable.runnerImage);
$('timetable').hidden = CONTENT.timetable.program.length === 0;
renderNumbers();
renderCheck();

if (CONTENT.timetable.program.length > 0) {
  renderTimetable();
  setInterval(renderTimetable, 60 * 1000);
}

/* ---------- 応援ボタン(保存・集計はしない) ---------- */
let cheers = 0;
const cheerCount = $('cheer-count');
$('cheer-btn').addEventListener('click', () => {
  cheers += 1;
  cheerCount.textContent = pad(cheers, 3);
});
