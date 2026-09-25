/* ============================================================
   PRODUCT IMAGES
   Drop image files into assets/candle-products/
   Supported: jpg jpeg png webp gif avif
   Auto-detected: no fixed limit — scans sequential filenames
   (1, 01, product1, product-01 ...) until it hits several misses
   in a row, so any number of images works. To force an exact
   list instead, just fill EXPLICIT_IMAGES with filenames.
   ============================================================ */
const EXPLICIT_IMAGES = ['product-01.jpg']; // e.g. ['cake.jpg','cupcake.png']
const FOLDER = 'assets/candle-products/';
const EXTENSIONS = ['jpg','jpeg','png','webp','gif','avif'];
const GAP_STOP = 6;     // consecutive missing indexes before we stop looking
const SAFETY_CEILING = 2000; // runaway-loop guard only, not a real limit

function loadOne(src){
  return new Promise(resolve=>{
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function probeImages(){
  const found = [];
  let miss = 0, i = 1;
  while (miss < GAP_STOP && i <= SAFETY_CEILING){
    const names = [String(i), String(i).padStart(2,'0'), `product${i}`, `product-${String(i).padStart(2,'0')}`];
    const candidates = [];
    names.forEach(n => EXTENSIONS.forEach(ext => candidates.push(`${FOLDER}${n}.${ext}`)));
    const hits = (await Promise.all(candidates.map(loadOne))).filter(Boolean);
    if (hits.length){ found.push(...hits); miss = 0; } else { miss++; }
    i++;
  }
  const all = EXPLICIT_IMAGES.map(f => FOLDER + f).concat(found);
  return [...new Set(all)]; // dedupe in case explicit + probe overlap
}

/* ---------------- candle toggle ---------------- */
const scene = document.getElementById('scene');
const flameWrap = document.getElementById('flameWrap');
const candle = document.getElementById('candle');
const smoke = document.getElementById('smoke');
let lit = false;

function ignite(){
  lit = true;
  candle.classList.add('igniting');
  setTimeout(()=>{
    scene.dataset.state = 'on';
    candle.classList.remove('igniting');
  }, 200); // spark, then flame grows in
}

function extinguish(){
  lit = false;
  scene.dataset.state = 'off';
  smoke.classList.remove('smoking');
  void smoke.offsetWidth; // restart animation
  smoke.classList.add('smoking');
  setTimeout(()=> smoke.classList.remove('smoking'), 10800);
}

function toggleCandle(){ lit ? extinguish() : ignite(); }

candle.addEventListener('click', toggleCandle);
candle.addEventListener('keydown', e=>{
  if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggleCandle(); }
});

/* ---------------- product shelf (bounded, no infinite loop) ---------------- */
const track = document.getElementById('track');
const shelfEl = document.getElementById('shelf');

function buildShelf(paths){
  track.innerHTML = '';
  if (!paths.length){
    const note = document.createElement('div');
    note.className = 'empty-note';
    note.textContent = 'add images to assets/candle-products/ to fill this shelf';
    track.appendChild(note);
  } else {
    paths.forEach(src=>{
      const card = document.createElement('div');
      card.className = 'card';
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.onerror = () => { // don't leave a blank slide for a broken image
        card.remove();
        computeBounds();
        posX = clamp(posX);
        applyTransform();
      };
      card.appendChild(img);
      track.appendChild(card);
    });
  }
  computeBounds();
  posX = clamp(0);
  applyTransform();
}

let posX = 0, velX = 0, isDown = false, lastX = 0, lastT = 0;
let minX = 0, maxX = 0;

function computeBounds(){
  const containerW = shelfEl.clientWidth;
  const contentW = track.scrollWidth;
  if (contentW <= containerW){
    minX = maxX = (containerW - contentW) / 2;
    track.classList.add('fits');
  } else {
    maxX = 0;
    minX = containerW - contentW;
    track.classList.remove('fits');
  }
}
function clamp(v){ return Math.min(maxX, Math.max(minX, v)); }
function applyTransform(){
  track.style.transform = `translateX(${posX}px)`;
  const atStart = posX >= maxX - 0.5;
  const atEnd = posX <= minX + 0.5;
  shelfEl.style.setProperty('--mask-l', atStart ? '0%' : '12%');
  shelfEl.style.setProperty('--mask-r', atEnd ? '100%' : '88%');
}

track.addEventListener('pointerdown', e=>{
  if (minX === maxX) return; // nothing to drag
  isDown = true; velX = 0;
  lastX = e.clientX; lastT = performance.now();
  track.classList.add('dragging');
  scene.classList.add('dragging-slider');
  track.setPointerCapture(e.pointerId);
});
track.addEventListener('pointermove', e=>{
  if (!isDown) return;
  const now = performance.now();
  const dx = e.clientX - lastX;
  posX = clamp(posX + dx);
  const dt = Math.max(now - lastT, 1);
  velX = dx / dt;
  lastX = e.clientX; lastT = now;
  applyTransform();
  flameWrap.style.setProperty('--lean', `${Math.max(-12, Math.min(12, dx * 1.6))}deg`);
});
function endDrag(){
  if (!isDown) return;
  isDown = false;
  track.classList.remove('dragging');
  scene.classList.remove('dragging-slider');
  flameWrap.style.setProperty('--lean', '0deg');
  inertia();
}
track.addEventListener('pointerup', endDrag);
track.addEventListener('pointercancel', endDrag);
track.addEventListener('pointerleave', ()=>{ if(isDown) endDrag(); });

function inertia(){
  if (Math.abs(velX) < 0.02) return;
  const next = clamp(posX + velX * 16);
  if (next === posX){ velX = 0; return; } // hit a boundary, stop cleanly
  posX = next;
  velX *= 0.93;
  applyTransform();
  requestAnimationFrame(inertia);
}

/* ---------------- init ---------------- */
probeImages().then(buildShelf);
window.addEventListener('resize', ()=>{
  computeBounds();
  posX = clamp(posX);
  applyTransform();
});
