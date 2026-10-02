/**
 * Waseda Baseball Scorebook SVG Renderer
 * 早稻田式棒球紀錄表 SVG 菱形格元件庫
 * 
 * 參考規格：Waseda_Baseball_Scorebook_KB.md
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

  // 預設樣式常數
  const DEFAULT_OPTIONS = {
    size: 140,              // SVG 輸出寬高 (px)
    theme: 'classic',       // 'classic' (紅黑紙本風) | 'dark' | 'monochrome'
    showGridBorder: true,   // 是否顯示最外層方框
    enableHover: true,      // 是否啟用 hover 效果
    className: 'waseda-cell'
  };

  /**
   * 建立單一打席早稻田 SVG 字串
   * @param {Object} data 打席資料物件
   * @param {Object} userOptions 自訂選項
   * @returns {string} SVG HTML 字串
   */
  function renderSVG(data = {}, userOptions = {}) {
    const opts = Object.assign({}, DEFAULT_OPTIONS, userOptions);
    const theme = opts.theme || 'classic';

    // 顏色定義
    const isDark = theme === 'dark';
    const isMono = theme === 'monochrome';

    const colors = {
      bg: isDark ? '#1e293b' : '#ffffff',
      border: isDark ? '#475569' : '#1e293b',
      gridSub: isDark ? '#334155' : '#cbd5e1',
      diamondBase: isDark ? '#334155' : '#e2e8f0',
      activeLine: isMono ? '#000000' : '#dc2626',      // 早稻田經典紅筆進壘線
      outLine: isMono ? '#000000' : '#2563eb',         // 出局/守備輔助線
      textPrimary: isDark ? '#f8fafc' : '#0f172a',
      textSec: isDark ? '#94a3b8' : '#64748b',
      redFill: isMono ? '#000000' : '#dc2626',         // 得分實心紅點
      changeLine: isMono ? '#000000' : '#e11d48'       // 換投換人標記線
    };

    // 幾何座標系統 (基準 120 x 120)
    // 左側球數欄: x: 0 ~ 22
    // 菱形區域: x: 22 ~ 120 (中心 x = 71, y = 60)
    const CX = 71;
    const CY = 60;
    const HOME = { x: 71, y: 104 };
    const FIRST = { x: 109, y: 60 };
    const SECOND = { x: 71, y: 16 };
    const THIRD = { x: 33, y: 60 };

    let svgElements = [];

    // 1. 背景與邊框
    svgElements.push(`<rect x="0" y="0" width="120" height="120" fill="${colors.bg}" />`);
    if (opts.showGridBorder) {
      svgElements.push(`<rect x="0.5" y="0.5" width="119" height="119" fill="none" stroke="${colors.border}" stroke-width="1" />`);
    }

    // 2. 左側球數欄 (Pitch Count Column)
    svgElements.push(`<line x1="22" y1="0" x2="22" y2="120" stroke="${colors.border}" stroke-width="0.8" />`);
    
    // 球數欄分隔細線 (最多 6 球)
    for (let i = 1; i < 6; i++) {
      svgElements.push(`<line x1="0" y1="${i * 20}" x2="22" y2="${i * 20}" stroke="${colors.gridSub}" stroke-dasharray="1 1" stroke-width="0.5" />`);
    }

    // 繪製逐球符號 (Pitches: array of string or objects)
    const pitches = data.pitches || [];
    pitches.slice(0, 6).forEach((p, idx) => {
      const py = idx * 20 + 10;
      const pSymbol = renderPitchSymbol(p, 11, py, colors);
      if (pSymbol) svgElements.push(pSymbol);
    });

    // 打席中換投手線 (若在特定球數更換)
    if (data.pitcherChangeAtPitch !== undefined) {
      const lineY = data.pitcherChangeAtPitch * 20;
      svgElements.push(`<line x1="0" y1="${lineY}" x2="22" y2="${lineY}" stroke="${colors.changeLine}" stroke-width="1.8" />`);
      if (data.newPitcherNumber) {
        svgElements.push(`<text x="24" y="${lineY + 4}" font-size="8" font-weight="bold" fill="${colors.changeLine}">(${data.newPitcherNumber})</text>`);
      }
    }

    // 3. 基礎菱形底線 (淺色虛線或細線)
    svgElements.push(`
      <polygon points="${HOME.x},${HOME.y} ${FIRST.x},${FIRST.y} ${SECOND.x},${SECOND.y} ${THIRD.x},${THIRD.y}"
               fill="none" stroke="${colors.diamondBase}" stroke-width="1" stroke-dasharray="2 1.5" />
    `);

    // 4. 內圈格底線 (微型菱形或圓形，供出局數/得分/殘壘填寫)
    const innerR = 14;
    svgElements.push(`
      <circle cx="${CX}" cy="${CY}" r="${innerR}" fill="none" stroke="${colors.diamondBase}" stroke-width="0.6" stroke-dasharray="1.5 1.5" />
    `);

    // 5. 進壘路線 (外圈格 Outer Grid 推進紅線)
    // paths 結構：{ first: true/false, second: true/false, third: true/false, home: true/false }
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

    // 特殊進壘中斷 (例如盜壘刺 CS、牽制出局 PO)
    if (data.interruptedPath) {
      // { from: 'first', to: 'second', ratio: 0.6 }
      const ip = data.interruptedPath;
      const start = getBaseCoord(ip.from, HOME, FIRST, SECOND, THIRD);
      const end = getBaseCoord(ip.to, HOME, FIRST, SECOND, THIRD);
      const midX = start.x + (end.x - start.x) * (ip.ratio || 0.5);
      const midY = start.y + (end.y - start.y) * (ip.ratio || 0.5);
      svgElements.push(`<line x1="${start.x}" y1="${start.y}" x2="${midX}" y2="${midY}" stroke="${colors.outLine}" stroke-width="2" stroke-dasharray="3 2" />`);
      svgElements.push(`<line x1="${midX - 3}" y1="${midY - 3}" x2="${midX + 3}" y2="${midY + 3}" stroke="${colors.outLine}" stroke-width="2" />`);
      svgElements.push(`<line x1="${midX + 3}" y1="${midY - 3}" x2="${midX - 3}" y2="${midY + 3}" stroke="${colors.outLine}" stroke-width="2" />`);
    }

    // 6. 標記符號 (一、二、三、本壘區文字與軌跡裝飾)
    const notations = data.notations || {};

    // (A) 一壘區標記 (右下方: 打者擊球結果、上壘方式或防守刺殺)
    if (notations.first) {
      svgElements.push(renderBattedNotation(notations.first, 92, 88, colors));
    }

    // (B) 二壘區標記 (東北區: 推進、2B、SB、暴投、責任棒次)
    if (notations.second) {
      svgElements.push(renderBattedNotation(notations.second, 93, 34, colors));
    }

    // (C) 三壘區標記 (西北區: 推進、3B、SB、責任棒次)
    if (notations.third) {
      svgElements.push(renderBattedNotation(notations.third, 48, 34, colors));
    }

    // (D) 本壘區標記 (西南區: 得分打點 ③、回本壘推進責任)
    if (notations.home) {
      svgElements.push(renderBattedNotation(notations.home, 47, 88, colors));
    }

    // 7. 內圈格結果 (出局數、得分、殘壘、三振)
    const center = data.center || {};
    // (A) 得分：中央實心大紅點
    if (center.isRun) {
      svgElements.push(`<circle cx="${CX}" cy="${CY}" r="11" fill="${colors.redFill}" />`);
    }
    // (B) 殘壘：草書 ℓ
    else if (center.isLOB) {
      svgElements.push(`<text x="${CX}" y="${CY + 5}" font-family="Brush Script MT, cursive, serif" font-style="italic" font-size="19" font-weight="bold" fill="${colors.textSec}" text-anchor="middle">ℓ</text>`);
    }
    // (C) 出局數 (羅馬數字 Ⅰ, Ⅱ, Ⅲ) 或直接出局記號
    if (center.outNumber) {
      const roman = toRoman(center.outNumber);
      // 若已有紅點或中央佔用，偏移出局數字
      const outY = center.strikeout ? CY + 9 : CY + 5;
      svgElements.push(`<text x="${CX}" y="${outY}" font-family="Times New Roman, serif" font-size="15" font-weight="900" fill="${colors.textPrimary}" text-anchor="middle">${roman}</text>`);
    }
    // (D) 三振出局 (K 或 ꓘ 見振)
    if (center.strikeout) {
      const kText = center.strikeout === 'looking' ? 'ꓘ' : 'K';
      const kY = center.outNumber ? CY - 4 : CY + 5;
      svgElements.push(`<text x="${CX}" y="${kY}" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${colors.textPrimary}" text-anchor="middle">${kText}</text>`);
    }

    // 8. 特殊事件外側修飾
    // (A) 換投手粗紅線 (橫跨頂部)
    if (data.pitcherChangeTop) {
      svgElements.push(`<line x1="22" y1="2" x2="120" y2="2" stroke="${colors.changeLine}" stroke-width="2.5" />`);
      if (data.pitcherNumber) {
        svgElements.push(`<text x="26" y="10" font-size="8.5" font-weight="bold" fill="${colors.changeLine}">(${data.pitcherNumber})</text>`);
      }
    }

    // (B) 代打/代跑波浪線 (格左垂直)
    if (data.isSubstitution) {
      svgElements.push(`<path d="M 23 20 Q 25 35 23 50 T 23 80 T 23 110" fill="none" stroke="${colors.changeLine}" stroke-width="1.8" />`);
      const subLabel = data.subType || 'PH';
      svgElements.push(`<text x="24" y="18" font-size="7.5" font-weight="bold" fill="${colors.changeLine}">${subLabel}</text>`);
    }

    // (C) 雙殺 / 三殺標記 (DP / TP)
    if (data.doublePlay) {
      svgElements.push(`<path d="M 23 25 L 20 25 L 20 95 L 23 95" fill="none" stroke="${colors.border}" stroke-width="1.2" />`);
      svgElements.push(`<text x="14" y="63" font-size="8.5" font-weight="bold" fill="${colors.textPrimary}" text-anchor="middle">DP</text>`);
    } else if (data.triplePlay) {
      svgElements.push(`<path d="M 23 15 L 18 15 L 18 105 L 23 105" fill="none" stroke="${colors.border}" stroke-width="1.2" />`);
      svgElements.push(`<text x="12" y="63" font-size="8.5" font-weight="bold" fill="${colors.textPrimary}" text-anchor="middle">TP</text>`);
    }

    // (D) 半局結束雙斜線 (// 右下角)
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

  /**
   * 繪製球數欄單顆球符號
   */
  function renderPitchSymbol(pitch, x, y, colors) {
    if (!pitch) return '';
    // 支援直接傳入字串代碼，或物件 { type: 'ball', ... }
    const type = typeof pitch === 'string' ? pitch : pitch.type;

    switch (type) {
      case 'ball':
      case '•':
      case '·':
      case '-': // 壞球 (黑點或短線)
        return `<circle cx="${x}" cy="${y}" r="2.2" fill="${colors.textPrimary}" />`;
      
      case 'called_strike':
      case '○':
      case 'O': // 未揮棒好球 (空心圓)
        return `<circle cx="${x}" cy="${y}" r="3.2" fill="none" stroke="${colors.textPrimary}" stroke-width="1.2" />`;
      
      case 'swinging_strike':
      case 'Ө':
      case '⊙': // 揮空好球 (帶核或帶橫線圓)
        return `
          <circle cx="${x}" cy="${y}" r="3.2" fill="none" stroke="${colors.textPrimary}" stroke-width="1.2" />
          <line x1="${x - 3.2}" y1="${y}" x2="${x + 3.2}" y2="${y}" stroke="${colors.textPrimary}" stroke-width="1.2" />
        `;
      
      case 'foul':
      case '△':
      case 'Δ': // 界外球 (空心三角形)
        return `
          <polygon points="${x},${y - 3.5} ${x - 3.5},${y + 3.2} ${x + 3.5},${y + 3.2}"
                   fill="none" stroke="${colors.textPrimary}" stroke-width="1.2" />
        `;
      
      case 'bunt_foul':
      case 'X':
      case 'Ⅹ': // 觸擊界外 (X)
        return `
          <line x1="${x - 3}" y1="${y - 3}" x2="${x + 3}" y2="${y + 3}" stroke="${colors.textPrimary}" stroke-width="1.2" />
          <line x1="${x + 3}" y1="${y - 3}" x2="${x - 3}" y2="${y + 3}" stroke="${colors.textPrimary}" stroke-width="1.2" />
        `;
      
      case 'in_play':
      case 'hit':
      case 'put_in_play': // 擊成場內球 (實心大黑點)
        return `<circle cx="${x}" cy="${y}" r="3.5" fill="${colors.activeLine}" />`;
      
      case 'bunt':
      case '/': // 觸擊動作
        return `<line x1="${x - 2.5}" y1="${y + 3.5}" x2="${x + 2.5}" y2="${y - 3.5}" stroke="${colors.textPrimary}" stroke-width="1.5" />`;

      default:
        return `<text x="${x}" y="${y + 3}" font-size="8" text-anchor="middle" fill="${colors.textPrimary}">${type}</text>`;
    }
  }

  /**
   * 繪製打擊/推進標記與物理軌跡符號 (滾飛平短)
   */
  function renderBattedNotation(notation, x, y, colors) {
    if (!notation) return '';
    // notation 可為單純字串如 "1B", "5-3" 或物件 { text: '8', trajectory: 'fly', rbi: 1, respBatter: 2, isSacrifice: true }
    const conf = typeof notation === 'string' ? { text: notation } : notation;
    const text = conf.text || '';
    const traj = conf.trajectory; // 'ground' (滾) | 'fly' (飛) | 'line' (平)
    const isSac = conf.isSacrifice; // 犧牲打方框 [ ]
    const resp = conf.respBatter; // 推進責任棒次圈號 ②
    const rbi = conf.rbi; // 打點圈號 ①, ②, ③

    let elements = [];
    const textLen = text.length;
    const halfW = Math.max(textLen * 3.6, 6);

    // 1. 主要文字
    elements.push(`
      <text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif"
            font-size="9" font-weight="bold" fill="${colors.textPrimary}" text-anchor="middle">${escapeXml(text)}</text>
    `);

    // 2. 軌跡裝飾符號
    // (A) 滾地球：文字下方弧線 ⌒
    if (traj === 'ground') {
      const arcY = y + 2.5;
      elements.push(`
        <path d="M ${x - halfW} ${arcY} Q ${x} ${arcY + 3.5} ${x + halfW} ${arcY}"
              fill="none" stroke="${colors.textPrimary}" stroke-width="0.9" />
      `);
    }
    // (B) 高飛球：文字上方弧線 ⁀
    else if (traj === 'fly') {
      const arcY = y - 9.5;
      elements.push(`
        <path d="M ${x - halfW} ${arcY} Q ${x} ${arcY - 3.5} ${x + halfW} ${arcY}"
              fill="none" stroke="${colors.textPrimary}" stroke-width="0.9" />
      `);
    }
    // (C) 平飛球：文字上方水平線 ──
    else if (traj === 'line') {
      const lineY = y - 9.5;
      elements.push(`
        <line x1="${x - halfW}" y1="${lineY}" x2="${x + halfW}" y2="${lineY}"
              stroke="${colors.textPrimary}" stroke-width="1.1" />
      `);
    }

    // 3. 犧牲觸擊方框 [1-3]
    if (isSac) {
      elements.push(`
        <rect x="${x - halfW - 2}" y="${y - 10}" width="${(halfW + 2) * 2}" height="12.5"
              fill="none" stroke="${colors.textPrimary}" stroke-width="0.9" />
      `);
    }

    // 4. 推進責任棒次圈號 (如 ②)
    if (resp) {
      const circleR = 4.5;
      const cx = x - halfW - 6;
      const cy = y - 3;
      elements.push(`
        <circle cx="${cx}" cy="${cy}" r="${circleR}" fill="none" stroke="${colors.textPrimary}" stroke-width="0.8" />
        <text x="${cx}" y="${cy + 2.8}" font-size="6.5" font-weight="bold" fill="${colors.textPrimary}" text-anchor="middle">${resp}</text>
      `);
    }

    // 5. 打點圈號 (如 ③)
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
