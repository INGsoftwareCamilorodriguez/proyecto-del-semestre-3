/* ─── COLORES Y DATOS ─── */
const COLORS = {
  pla:   '#4d6ef5',
  abs:   '#e67e22',
  pet:   '#f1c40f',
  nylon: '#2ecc71',
  tpu:   '#1abc9c',
  pc:    '#a855f7',
};

const MATERIAL_DATA = [
  { label: 'Facilidad de impresión',  values: { pla: 0.85, abs: 0.55, pet: 0.70, nylon: 0.35, tpu: 0.45, pc: 0.20 } },
  { label: 'Calidad visual',          values: { pla: 0.80, abs: 0.60, pet: 0.65, nylon: 0.50, tpu: 0.40, pc: 0.75 } },
  { label: 'Estrés máximo',           values: { pla: 0.45, abs: 0.60, pet: 0.55, nylon: 0.70, tpu: 0.30, pc: 0.85 } },
  { label: 'Estiramiento a romperse', values: { pla: 0.20, abs: 0.45, pet: 0.40, nylon: 0.55, tpu: 0.85, pc: 0.30 } },
  { label: 'Resistencia al impacto',  values: { pla: 0.25, abs: 0.55, pet: 0.50, nylon: 0.70, tpu: 0.80, pc: 0.90 } },
  { label: 'Capa de adhesión',        values: { pla: 0.75, abs: 0.50, pet: 0.65, nylon: 0.40, tpu: 0.55, pc: 0.35 } },
  { label: 'Resistencia al calor',    values: { pla: 0.25, abs: 0.60, pet: 0.50, nylon: 0.75, tpu: 0.30, pc: 0.90 } },
];

/* ─── CONSTRUIR CARD DE MATERIAL ─── */
const rowsEl = document.getElementById('material-rows');
MATERIAL_DATA.forEach(row => {
  const div = document.createElement('div');
  div.className = 'material-row';
  div.innerHTML = `
    <div class="material-label">${row.label}</div>
    <div class="dots-track"><div class="track-line"></div></div>
  `;
  rowsEl.appendChild(div);
  const track = div.querySelector('.dots-track');

  Object.entries(row.values).forEach(([mat, pos]) => {
    const dot = document.createElement('div');
    dot.className = `dot ${mat}`;
    dot.style.left = (pos * 100) + '%';
    dot.dataset.label = `${mat.toUpperCase()}: ${row.label}`;
    dot.dataset.value = pos < 0.34 ? 'Bajo' : pos < 0.67 ? 'Medio' : 'Alto';
    track.appendChild(dot);
    dot.addEventListener('mousemove', showTooltip);
    dot.addEventListener('mouseleave', hideTooltip);
  });
});

const legendEl = document.getElementById('material-legend');
Object.entries(COLORS).forEach(([mat, color]) => {
  legendEl.innerHTML += `
    <div class="legend-item">
      <div class="legend-dot" style="background:${color}"></div>
      <span>${mat.toUpperCase()}</span>
    </div>
  `;
});

/* ─── TOOLTIP ─── */
const tooltip = document.getElementById('tooltip');

function showTooltip(e) {
  tooltip.textContent = `${e.target.dataset.label} — ${e.target.dataset.value}`;
  tooltip.style.opacity = '1';
  tooltip.style.left = (e.clientX + 12) + 'px';
  tooltip.style.top  = (e.clientY - 28) + 'px';
}

function hideTooltip() {
  tooltip.style.opacity = '0';
}

/* ─── SVG ESCALERAS (Resolución) ─── */
function buildStair(containerId, steps) {
  const wrap = document.getElementById(containerId);
  const NS   = 'http://www.w3.org/2000/svg';
  const svg  = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const bg = document.createElementNS(NS, 'polygon');
  bg.setAttribute('points', '0,100 100,0 100,100');
  bg.setAttribute('fill', '#fdbb2d');
  svg.appendChild(bg);

  const stepH = 100 / steps;
  const stepW = 100 / steps;
  for (let i = 0; i < steps; i++) {
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x',            100 - (i + 1) * stepW);
    rect.setAttribute('y',            i * stepH);
    rect.setAttribute('width',        stepW);
    rect.setAttribute('height',       (steps - i) * stepH);
    rect.setAttribute('fill',         '#b21f1f');
    rect.setAttribute('stroke',       '#fdbb2d');
    rect.setAttribute('stroke-width', '0.5');
    svg.appendChild(rect);
  }

  const cx    = 82, cy = 12, r = 10;
  const frac  = steps <= 5 ? 0.25 : steps <= 10 ? 0.55 : 0.85;
  const angle = frac * 2 * Math.PI - Math.PI / 2;
  const x2    = cx + r * Math.cos(angle);
  const y2    = cy + r * Math.sin(angle);
  const large = frac > 0.5 ? 1 : 0;

  const circle = document.createElementNS(NS, 'circle');
  circle.setAttribute('cx',           cx);
  circle.setAttribute('cy',           cy);
  circle.setAttribute('r',            r);
  circle.setAttribute('fill',         'rgba(255,255,255,0.15)');
  circle.setAttribute('stroke',       'rgba(255,255,255,0.4)');
  circle.setAttribute('stroke-width', '0.8');
  svg.appendChild(circle);

  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d',    `M${cx},${cy} L${cx},${cy - r} A${r},${r} 0 ${large},1 ${x2},${y2} Z`);
  path.setAttribute('fill', 'rgba(255,255,255,0.7)');
  svg.appendChild(path);

  wrap.appendChild(svg);
}

buildStair('stair-high', 5);
buildStair('stair-mid',  10);
buildStair('stair-low',  18);

/* ─── CANVAS RELLENO ─── */
function drawFill(containerId, density) {
  const box    = document.getElementById(containerId);
  const canvas = document.createElement('canvas');
  canvas.width  = 200;
  canvas.height = 200;
  box.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1a2a6c';
  ctx.fillRect(0, 0, 200, 200);

  if (density < 1) {
    const spacing = density < 0.2 ? 28 : density < 0.6 ? 18 : 10;
    ctx.strokeStyle = 'rgba(253,187,45,0.45)';
    ctx.lineWidth   = 1.5;

    for (let i = -200; i < 400; i += spacing) {
      ctx.beginPath(); ctx.moveTo(i,       0); ctx.lineTo(i + 200, 200); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + 200, 0); ctx.lineTo(i,       200); ctx.stroke();
    }

    const dotR = density < 0.2 ? 5 : density < 0.6 ? 3.5 : 2;
    ctx.fillStyle = 'rgba(253,187,45,0.6)';
    for (let x = 0; x < 200; x += spacing) {
      for (let y = 0; y < 200; y += spacing) {
        const ox = (y / spacing % 2 === 0) ? 0 : spacing / 2;
        ctx.beginPath();
        ctx.arc(x + ox, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    const grad = ctx.createLinearGradient(0, 0, 200, 200);
    grad.addColorStop(0, '#fdbb2d');
    grad.addColorStop(1, '#b21f1f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 200, 200);
  }
}

drawFill('fill-10',  0.10);
drawFill('fill-50',  0.50);
drawFill('fill-100', 1.00);