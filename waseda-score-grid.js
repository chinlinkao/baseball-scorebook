/**
 * Waseda Baseball Scorebook SVG Renderer
 */

(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    global.WasedaScoreGrid = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULT_OPTIONS = {
    size: 140,
    theme: 'classic',
    showGridBorder: true,
    enableHover: true,
    className: 'waseda-cell'
  };

  function renderSVG(data = {}, userOptions = {}) {
    const opts = Object.assign({}, DEFAULT_OPTIONS, userOptions);
    const theme = opts.theme || 'classic';

    const isDark = theme === 'dark';
    const isMono = theme === 'monochrome';

    const colors = {
      bg: isDark ? '#1e293b' : '#ffffff',
      border: isDark ? '#475569' : '#1e293b',
      gridSub: isDark ? '#334155' : '#cbd5e1',
      diamondBase: isDark ? '#334155' : '#e2e8f0',
      activeLine: isMono ? '#000000' : '#dc2626',
      outLine: isMono ? '#000000' : '#2563eb',
      textPrimary: isDark ? '#f8fafc' : '#0f172a',
      textSec: isDark ? '#94a3b8' : '#64748b',
      redFill: isMono ? '#000000' : '#dc2626',
      changeLine: isMono ? '#000000' : '#e11d48'
    };

    const CX = 71;
    const CY = 60;
    const HOME = { x: 71, y: 104 };
    const FIRST = { x: 109, y: 60 };
    const SECOND = { x: 71, y: 16 };
    const THIRD = { x: 33, y: 60 };

    let svgElements = [];

    svgElements.push(`<rect x="0" y="0" width="120" height="120" fill="${colors.bg}" />`);
    if (opts.showGridBorder) {
      svgElements.push(`<rect x="0.5" y="0.5" width="119" height="119" fill="none" stroke="${colors.border}" stroke-width="1" />`);
    }

    svgElements.push(`<line x1="22" y1="0" x2="22" y2="120" stroke="${colors.border}" stroke-width="0.8" />`);
    
    for (let i = 1; i < 6; i++) {
      svgElements.push(`<line x1="0" y1="${i * 20}" x2="22" y2="${i * 20}" stroke="${colors.gridSub}" stroke-dasharray="1 1" stroke-width="0.5" />`);
    }

    const pitches = data.pitches || [];
    pitches.slice(0, 6).forEach((p, idx) => {
      const py = idx * 20 + 10;
      const pSymbol = renderPitchSymbol(p, 11, py, colors);
      if (pSymbol) svgElements.push(pSymbol);
    });

    if (data.pitcherChangeAtPitch !== undefined) {
      const lineY = data.pitcherChangeAtPitch * 20;
      svgElements.push(`<line x1="0" y1="${lineY}" x2="22" y2="${lineY}" stroke="${colors.changeLine}" stroke-width="1.8" />`);
      if (data.newPitcherNumber) {
        svgElements.push(`<text x="24" y="${lineY + 4}" font-size="8" font-weight="bold" fill="${colors.changeLine}">(${data.newPitcherNumber})</text>`);
      }
    }

    svgElements.push(`
      <polygon points="${HOME.x},${HOME.y} ${FIRST.x},${FIRST.y} ${SECOND.x},${SECOND.y} ${THIRD.x},${THIRD.y}"
               fill="none" stroke="${colors.diamondBase}" stroke-width="1" stroke-dasharray="2 1.5" />
    `);

    const innerR = 14;
    svgElements.push(`
      <circle cx="${CX}" cy="${CY}" r="${innerR}" fill="none" stroke="${colors.diamondBase}" stroke-width="0.6" stroke-dasharray="1.5 1.5" />
    `);

    const paths = data.paths || {};

    if (paths.first) {
      svgElements.push(`<line x1="${HOME.x}" y1="${HOME.y}" x2="${FIRST.x}" y2="${FIRST.y}" stroke="${colors.activeLine}" stroke-width="2.4" stroke-linecap="round" />`);
    }
    if (paths.second) {
      svgElements.push(`<line x1="${FIRST.x}" y1="${FIRST.y}" x2="${SECOND.x}" y2="${SECOND.y}" stroke="${colors.activeLine}" stroke-width="2.4" stroke-linecap="round" />`);
    }
    if (paths.third) {
      svgElements.push(`<line x1="${SECOND.x}" y1="${SECOND.y}" x2="${THIRD.x}" y2="${THIRD.y}" stroke="${colors.activeLine}" stroke-width="2.4" stroke-linecap="round" />`);
    }
    if (paths.home) {
      svgElements.push(`<line x1="${THIRD.x}" y1="${THIRD.y}" x2="${HOME.x}" y2="${HOME.y}" stroke="${colors.activeLine}" stroke-width="2.4" stroke-linecap="round" />`);
    }

    if (data.interruptedPath) {
      const ip = data.interruptedPath;
      const start = getBaseCoord(ip.from, HOME, FIRST, SECOND, THIRD);
      const end = getBaseCoord(ip.to, HOME, FIRST, SECOND, THIRD);
      const midX = start.x + (end.x - start.x) * (ip.ratio || 0.5);
      const midY = start.y + (end.y - start.y) * (ip.ratio || 0.5);
      svgElements.push(`<line x1="${start.x}" y1="${start.y}" x2="${midX}" y2="${midY}" stroke="${colors.outLine}" stroke-width="2" stroke-dasharray="3 2" />`);
      svgElements.push(`<line x1="${midX - 3}" y1="${midY - 3}" x2="${midX + 3}" y2="${midY + 3}" stroke="${colors.outLine}" stroke-width="2" />`);
      svgElements.push(`<line x1="${midX + 3}" y1="${midY - 3}" x2="${midX - 3}" y2="${midY + 3}" stroke="${colors.outLine}" stroke-width="2" />`);
    }

    const notations = data.notations || {};

    if (notations.first) {
      svgElements.push(renderBattedNotation(notations.first, 92, 88, colors));
    }
    if (notations.second) {
      svgElements.push(renderBattedNotation(notations.second, 93, 34, colors));
    }
    if (notations.third) {
      svgElements.push(renderBattedNotation(notations.third, 48, 34, colors));
    }
    if (notations.home) {
      svgElements.push(renderBattedNotation(notations.home, 47, 88, colors));
    }

    const center = data.center || {};
    if (center.isRun) {
      svgElements.push(`<circle cx="${CX}" cy="${CY}" r="11" fill="${colors.redFill}" />`);
    } else if (center.isLOB) {
      svgElements.push(`<text x="${CX}" y="${CY + 5}" font-family="Brush Script MT, cursive, serif" font-style="italic" font-size="19" font-weight="bold" fill="${colors.textSec}" text-anchor="middle">ℓ</text>`);
    }

    if (center.outNumber) {
      const roman = toRoman(center.outNumber);
      const outY = center.strikeout ? CY + 9 : CY + 5;
      svgElements.push(`<text x="${CX}" y="${outY}" font-family="Times New Roman, serif" font-size="15" font-weight="900" fill="${colors.textPrimary}" text-anchor="middle">${roman}</text>`);
    }

    if (center.strikeout) {
      const kText = center.strikeout === 'looking' ? 'ꓘ' : 'K';
      const kY = center.outNumber ? CY - 4 : CY + 5;
      svgElements.push(`<text x="${CX}" y="${kY}" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${colors.textPrimary}" text-anchor="middle">${kText}</text>`);
    }

    if (data.pitcherChangeTop) {
      svgElements.push(`<line x1="22" y1="2" x2="120" y2="2" stroke="${colors.changeLine}" stroke-width="2.5" />`);
      if (data.pitcherNumber) {
        svgElements.push(`<text x="26" y="10" font-size="8.5" font-weight="bold" fill="${colors.changeLine}">(${data.pitcherNumber})</text>`);
      }
    }

    if (data.isSubstitution) {
      svgElements.push(`<path d="M 23 20 Q 25 35 23 50 T 23 80 T 23 110" fill="none" stroke="${colors.changeLine}" stroke-width="1.8" />`);
      const subLabel = data.subType || 'PH';
      svgElements.push(`<text x="24" y="18" font-size="7.5" font-weight="bold" fill="${colors.changeLine}">${subLabel}</text>`);
    }

    if (data.doublePlay) {
      svgElements.push(`<path d="M 23 25 L 20 25 L 20 95 L 23 95" fill="none" stroke="${colors.border}" stroke-width="1.2" />`);
      svgElements.push(`<text x="14" y="63" font-size="8.5" font-weight="bold" fill="${colors.textPrimary}" text-anchor="middle">DP</text>`);
    } else if (data.triplePlay) {
      svgElements.push(`<path d="M 23 15 L 18 15 L 18 105 L 23 105" fill="none" stroke="${colors.border}" stroke-width="1.2" />`);
      svgElements.push(`<text x="12" y="63" font-size="8.5" font-weight="bold" fill="${colors.textPrimary}" text-anchor="middle">TP</text>`);
    }

    if (data.isInningEnd) {
      svgElements.push(`<line x1="107" y1="117" x2="117" y2="105" stroke="${colors.textPrimary}" stroke-width="2.2" stroke-linecap="round" />`);
      svgElements.push(`<line x1="111" y1="117" x2="121" y2="105" stroke="${colors.textPrimary}" stroke-width="2.2" stroke-linecap="round" />`);
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"
           width="${opts.size}" height="${opts.size}"
           class="${opts.className}" style="user-select: none; display: inline-block; vertical-align: middle;">
        ${svgElements.join('\n')}
      </svg>
    `.trim();
  }

  function renderPitchSymbol(pitch, x, y, colors) {
    if (!pitch) return '';
    const type = typeof pitch === 'string' ? pitch : pitch.type;

    switch (type) {
      case 'ball':
      case '•':
      case '·':
      case '-':
        return `<circle cx="${x}" cy="${y}" r="2.2" fill="${colors.textPrimary}" />`;
      case 'called_strike':
      case '○':
      case 'O':
        return `<circle cx="${x}" cy="${y}" r="3.2" fill="none" stroke="${colors.textPrimary}" stroke-width="1.2" />`;
      case 'swinging_strike':
      case 'Ө':
      case '⊙':
        return `
          <circle cx="${x}" cy="${y}" r="3.2" fill="none" stroke="${colors.textPrimary}" stroke-width="1.2" />
          <line x1="${x - 3.2}" y1="${y}" x2="${x + 3.2}" y2="${y}" stroke="${colors.textPrimary}" stroke-width="1.2" />
        `;
      case 'foul':
      case '△':
      case 'Δ':
        return `
          <polygon points="${x},${y - 3.5} ${x - 3.5},${y + 3.2} ${x + 3.5},${y + 3.2}"
                   fill="none" stroke="${colors.textPrimary}" stroke-width="1.2" />
        `;
      case 'bunt_foul':
      case 'X':
      case 'Ⅹ':
        return `
          <line x1="${x - 3}" y1="${y - 3}" x2="${x + 3}" y2="${y + 3}" stroke="${colors.textPrimary}" stroke-width="1.2" />
          <line x1="${x + 3}" y1="${y - 3}" x2="${x - 3}" y2="${y + 3}" stroke="${colors.textPrimary}" stroke-width="1.2" />
        `;
      case 'in_play':
      case 'hit':
      case 'put_in_play':
        return `<circle cx="${x}" cy="${y}" r="3.5" fill="${colors.activeLine}" />`;
      case 'bunt':
      case '/':
        return `<line x1="${x - 2.5}" y1="${y + 3.5}" x2="${x + 2.5}" y2="${y - 3.5}" stroke="${colors.textPrimary}" stroke-width="1.5" />`;
      default:
        return `<text x="${x}" y="${y + 3}" font-size="8" text-anchor="middle" fill="${colors.textPrimary}">${type}</text>`;
    }
  }

  function renderBattedNotation(notation, x, y, colors) {
    if (!notation) return '';
    const conf = typeof notation === 'string' ? { text: notation } : notation;
    const text = conf.text || '';
    const traj = conf.trajectory;
    const isSac = conf.isSacrifice;
    const resp = conf.respBatter;
    const rbi = conf.rbi;

    let elements = [];
    const textLen = text.length;
    const halfW = Math.max(textLen * 3.6, 6);

    elements.push(`
      <text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif"
            font-size="9" font-weight="bold" fill="${colors.textPrimary}" text-anchor="middle">${escapeXml(text)}</text>
    `);

    if (traj === 'ground') {
      const arcY = y + 2.5;
      elements.push(`
        <path d="M ${x - halfW} ${arcY} Q ${x} ${arcY + 3.5} ${x + halfW} ${arcY}"
              fill="none" stroke="${colors.textPrimary}" stroke-width="0.9" />
      `);
    } else if (traj === 'fly') {
      const arcY = y - 9.5;
      elements.push(`
        <path d="M ${x - halfW} ${arcY} Q ${x} ${arcY - 3.5} ${x + halfW} ${arcY}"
              fill="none" stroke="${colors.textPrimary}" stroke-width="0.9" />
      `);
    } else if (traj === 'line') {
      const lineY = y - 9.5;
      elements.push(`
        <line x1="${x - halfW}" y1="${lineY}" x2="${x + halfW}" y2="${lineY}"
              stroke="${colors.textPrimary}" stroke-width="1.1" />
      `);
    }

    if (isSac) {
      elements.push(`
        <rect x="${x - halfW - 2}" y="${y - 10}" width="${(halfW + 2) * 2}" height="12.5"
              fill="none" stroke="${colors.textPrimary}" stroke-width="0.9" />
      `);
    }

    if (resp) {
      const circleR = 4.5;
      const cx = x - halfW - 6;
      const cy = y - 3;
      elements.push(`
        <circle cx="${cx}" cy="${cy}" r="${circleR}" fill="none" stroke="${colors.textPrimary}" stroke-width="0.8" />
        <text x="${cx}" y="${cy + 2.8}" font-size="6.5" font-weight="bold" fill="${colors.textPrimary}" text-anchor="middle">${resp}</text>
      `);
    }

    if (rbi) {
      const circleR = 4.5;
      const cx = x + halfW + 6;
      const cy = y - 3;
      elements.push(`
        <circle cx="${cx}" cy="${cy}" r="${circleR}" fill="${colors.activeLine}" stroke="${colors.activeLine}" stroke-width="0.8" />
        <text x="${cx}" y="${cy + 2.8}" font-size="6.5" font-weight="bold" fill="#ffffff" text-anchor="middle">${rbi}</text>
      `);
    }

    return elements.join('\n');
  }

  function getBaseCoord(name, h, f, s, t) {
    switch (name) {
      case 'home': return h;
      case 'first': return f;
      case 'second': return s;
      case 'third': return t;
      default: return h;
    }
  }

  function toRoman(num) {
    if (num === 1) return 'Ⅰ';
    if (num === 2) return 'Ⅱ';
    if (num === 3) return 'Ⅲ';
    return String(num);
  }

  function escapeXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  return {
    renderSVG,
    renderBattedNotation,
    renderPitchSymbol,
    DEFAULT_OPTIONS
  };
}));
