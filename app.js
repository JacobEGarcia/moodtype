/* MOODTYPE - dynamic text-emotion dialogue system for narrative games.
   Original scene, cast, story, and code. Homage to @JungleSilicon's text-emotion demo.
   The engine: every line carries a mood; the type layer re-skins itself live -
   family, weight, spacing, case, color, and per-letter motion all shift with emotion,
   while each speaker keeps a personality base typeface underneath. */

const CHARS = {
  vesk:    { name:'Vesk',           color:'#e06836', pitch:0.7, rate:0.98 },
  lio:     { name:'Lio',            color:'#66d1c3', pitch:1.4, rate:1.08 },
  thistle: { name:'Mother Thistle', color:'#9fc06a', pitch:0.85, rate:0.85 },
  visitor: { name:'The Visitor',    color:'#b9a8e6', pitch:0.05, rate:0.8 },
};

const MOODS = {
  neutral: { desc:'personality base typeface, no treatment' },
  calm:    { desc:'old-style serif italic, soft green-white', rate:0.9 },
  tense:   { desc:'condensed, tightened spacing, heavier weight', rate:1.1 },
  fear:    { desc:'thin and pale, letters physically shake', rate:1.2 },
  whisper: { desc:'small, wide-tracked, dimmed, dropped case', rate:0.75 },
  anger:   { desc:'black-weight sans, hot red, pulsing scale', rate:1.15 },
  menace:  { desc:'dripping horror face, violet glow, drifting letters', rate:0.7 },
  sorrow:  { desc:'faded thin italic, letters breathe in slowly', rate:0.8 },
  wonder:  { desc:'hairline serif, wide glow tracking', rate:0.85 },
  joy:     { desc:'rounded bold, warm gold, gentle bob', rate:1.1 },
  resolve: { desc:'steady tracked caps, warm bone', rate:1.0 },
};

/* The scene: three wardens find the shrine candle out. Something kept it warm. */
const SCRIPT = [
  { who:'vesk',    mood:'neutral', cast:['vesk'],                    text:"The candle's out again. Third night running." },
  { who:'lio',     mood:'neutral', cast:['vesk','lio'],              text:"Maybe the wind found that crack I told you about." },
  { who:'vesk',    mood:'tense',   cast:['vesk','lio'],              text:"Wind doesn't leave footprints, Lio." },
  { who:'thistle', mood:'calm',    cast:['thistle','lio'],           text:"Nor does it tidy the offering bowl. Something has been keeping house." },
  { who:'lio',     mood:'fear',    cast:['thistle','lio'],           text:"It's inside the shrine. I can hear it breathing." },
  { who:'vesk',    mood:'resolve', cast:['vesk','lio'],              text:"Stand behind me. Both of you." },
  { who:'visitor', mood:'menace',  cast:['vesk','visitor'],          text:"You came back." },
  { who:'visitor', mood:'menace',  cast:['vesk','visitor'],          text:"The wick was wet with rain. I kept it warm." },
  { who:'lio',     mood:'whisper', cast:['lio','visitor'],           text:"it talks like my grandmother" },
  { who:'thistle', mood:'calm',    cast:['thistle','visitor'],       text:"How long have you been tending our candle, little smoke?" },
  { who:'visitor', mood:'sorrow',  cast:['thistle','visitor'],       text:"Since the hands that lit it stopped coming." },
  { who:'vesk',    mood:'resolve', cast:['vesk','visitor'],          text:"Then it gets a longer wick, a dry roof, and a name." },
  { who:'lio',     mood:'joy',     cast:['lio','visitor'],           text:"Can we name it Cinder? I'm voting Cinder." },
  { who:'visitor', mood:'wonder',  cast:['lio','visitor'], lit:true, text:"A name. Light it, and I will keep it." },
  { who:'thistle', mood:'calm',    cast:['thistle','lio','visitor'], lit:true, text:"Then we are all keeping house now." },
];

const SLOTS = {
  vesk:    { L:'translate(110px,168px) scale(0.92)', R:'translate(860px,168px) scale(0.92)', C:'translate(485px,192px) scale(0.76)' },
  lio:     { L:'translate(120px,190px) scale(0.84)', R:'translate(890px,190px) scale(0.84)', C:'translate(500px,208px) scale(0.7)' },
  thistle: { L:'translate(60px,150px) scale(0.95)',  R:'translate(880px,150px) scale(0.95)',  C:'translate(475px,178px) scale(0.78)' },
  visitor: { L:'translate(130px,140px) scale(0.98)', R:'translate(860px,140px) scale(0.98)',  C:'translate(490px,168px) scale(0.8)' },
};
const SLOT_ORDER = ['L','R','C'];
/* narrow screens: the SVG crops to a center band, so pull the stage slots inward */
const COMPACT = matchMedia('(max-aspect-ratio: 3/4)').matches;
const COMPACT_SLOTS = {
  vesk:    { L:'translate(430px,270px) scale(0.52)', R:'translate(660px,270px) scale(0.52)', C:'translate(540px,290px) scale(0.44)' },
  lio:     { L:'translate(440px,285px) scale(0.48)', R:'translate(670px,285px) scale(0.48)', C:'translate(550px,300px) scale(0.4)' },
  thistle: { L:'translate(425px,260px) scale(0.54)', R:'translate(655px,260px) scale(0.54)', C:'translate(535px,280px) scale(0.46)' },
  visitor: { L:'translate(440px,255px) scale(0.56)', R:'translate(660px,255px) scale(0.56)', C:'translate(545px,275px) scale(0.48)' },
};

const $ = s => document.querySelector(s);
const stage = $('#stage'), dlg = $('#dialogue'), dtxt = $('#dialogueText'),
      nameEl = $('#speakerName'), chip = $('#moodChip'), moodName = $('#moodName'),
      moodDesc = $('#moodDesc'), title = $('#titlecard');

const params = new URLSearchParams(location.search);
const INSTANT = params.has('instant');
const NOVOICE = params.has('mute');
let voicesOn = !NOVOICE;
let auto = params.has('auto');
let idx = -1, typing = false, typeTimer = null, started = false, autoTimer = null;

/* ---------- voices (Web Speech API, free + offline) ---------- */
function speak(who, mood, text){
  if (!voicesOn || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const c = CHARS[who], m = MOODS[mood] || {};
  const u = new SpeechSynthesisUtterance(text);
  u.pitch = c.pitch; u.rate = (c.rate || 1) * (m.rate || 1); u.volume = 1;
  speechSynthesis.speak(u);
}

/* ---------- typewriter with per-letter spans for animated moods ---------- */
const LETTER_ANIM = new Set(['fear','menace','sorrow','wonder','joy']);
function typeLine(line){
  typing = true; dlg.classList.add('typing');
  dtxt.innerHTML = '';
  const text = line.text;
  const speed = INSTANT ? 0 : ({menace:66, sorrow:60, whisper:58}[line.mood] || 34);
  let i = 0;
  function step(){
    if (i < text.length){
      const ch = text[i];
      const span = document.createElement('span');
      if (LETTER_ANIM.has(line.mood)){ span.className = 'ltr'; span.style.animationDelay = (i * 0.045) + 's'; }
      span.textContent = ch;
      if (ch === ' ') span.style.whiteSpace = 'pre';
      dtxt.appendChild(span);
      i++;
      if (speed === 0){ step(); } else { typeTimer = setTimeout(step, speed); }
    } else { typing = false; dlg.classList.remove('typing'); scheduleAuto(); }
  }
  step();
}
function finishTyping(){
  clearTimeout(typeTimer);
  const line = SCRIPT[idx];
  dtxt.innerHTML = '';
  [...line.text].forEach((ch, k) => {
    const span = document.createElement('span');
    if (LETTER_ANIM.has(line.mood)){ span.className = 'ltr'; span.style.animationDelay = (k * 0.045) + 's'; }
    span.textContent = ch; if (ch === ' ') span.style.whiteSpace = 'pre';
    dtxt.appendChild(span);
  });
  typing = false; dlg.classList.remove('typing'); scheduleAuto();
}

/* ---------- beat control ---------- */
function showBeat(n){
  idx = n;
  const line = SCRIPT[n];
  const c = CHARS[line.who];
  ['vesk','lio','thistle','visitor'].forEach(k => {
    const el = $('#char-' + k);
    const ci = line.cast.indexOf(k);
    el.classList.toggle('on', ci !== -1);
    if (ci !== -1) el.style.transform = (COMPACT ? COMPACT_SLOTS : SLOTS)[k][SLOT_ORDER[Math.min(ci, 2)]];
  });
  stage.classList.toggle('lit', !!line.lit);
  nameEl.textContent = c.name; nameEl.style.color = c.color;
  dlg.className = 'font-' + line.who + ' mood-' + line.mood;
  moodName.textContent = 'mood: ' + line.mood;
  moodDesc.textContent = (MOODS[line.mood] || {}).desc || '';
  dlg.classList.remove('hidden'); chip.classList.remove('hidden');
  speak(line.who, line.mood, line.text);
  typeLine(line);
  if (params.has('instant')) finishTyping();
}
function advance(){
  if (!started) return;
  if (typing){ finishTyping(); return; }
  if (idx + 1 < SCRIPT.length) showBeat(idx + 1);
  else endScene();
}
function endScene(){
  auto = false; clearTimeout(autoTimer);
  speechSynthesis.cancel();
  dlg.classList.add('hidden');
  moodName.textContent = 'scene complete';
  moodDesc.textContent = '15 beats · 9 mood treatments · 4 personality typefaces';
  title.querySelector('.title-word').textContent = 'THE CANDLE WARDENS';
  title.querySelector('.title-sub').textContent = 'the font shifts with the mood - the mood shifts with the story';
  title.querySelector('.title-scene').textContent = 'moodtype - click to replay';
  title.querySelector('.title-hint').textContent = 'click to replay';
  title.classList.remove('gone');
  started = 'ended';
}
function scheduleAuto(){
  clearTimeout(autoTimer);
  if (auto){ autoTimer = setTimeout(advance, INSTANT ? 120 : 2100); }
}

/* ---------- input ---------- */
stage.addEventListener('click', e => {
  if (e.target.closest('#controls')) return;
  if (!started || started === 'ended') start();
  else advance();
});
addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowRight'){ e.preventDefault();
    if (!started || started === 'ended') start(); else advance(); }
});
function start(){
  speechSynthesis.cancel();
  title.classList.add('gone');
  started = true;
  const jump = parseInt(params.get('beat') || '0', 10);
  showBeat(Math.min(Math.max(jump, 0), SCRIPT.length - 1));
}
$('#btnReplay').addEventListener('click', e => { e.stopPropagation(); start(); });
$('#btnVoice').addEventListener('click', e => { e.stopPropagation();
  voicesOn = !voicesOn; if (!voicesOn) speechSynthesis.cancel();
  e.target.classList.toggle('on', voicesOn); });
$('#btnAuto').addEventListener('click', e => { e.stopPropagation();
  auto = !auto; e.target.classList.toggle('on', auto);
  if (auto && started === true && !typing) scheduleAuto(); });
if (auto) $('#btnAuto').classList.add('on');
if (NOVOICE) $('#btnVoice').classList.remove('on');

/* screenshot hook: ?beat=N&instant=1 jumps straight to a fully-typed beat */
if (params.has('beat')) start();
