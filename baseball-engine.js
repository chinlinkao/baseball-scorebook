/**
 * Baseball Scoring Engine (棒球計分與規則狀態機)
 * 完整支援早稻田式計分規範、跑者進壘邏輯、打擊/投手數據自動統計、雙重平衡檢核
 */

(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    global.BaseballEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * 建立一場新賽事狀態物件
   */
  function createNewGame(options = {}) {
    const defaultAwayLineup = options.awayLineup || [];
    const defaultHomeLineup = options.homeLineup || [];

    return {
      id: "GAME_" + Date.now(),
      meta: {
        title: options.title || "2026年台中市棒球聯賽",
        date: options.date || new Date().toISOString().split('T')[0],
        field: options.field || "台中太原棒球場",
        umpire: options.umpire || "紀華文",
        scorer: options.scorer || "記錄員",
        weather: "晴朗",
        wind: "無風"
      },
      // 球隊資訊
      teams: {
        away: {
          name: options.awayName || "台中小海盜大叔隊",
          lineup: defaultAwayLineup, // 先發 9 人
          bench: options.awayBench || [],
          pitchers: options.awayPitchers || [],
          currentPitcherIdx: 0,
          stats: {} // 各球員統計
        },
        home: {
          name: options.homeName || "台中獵犬棒球隊",
          lineup: defaultHomeLineup,
          bench: options.homeBench || [],
          pitchers: options.homePitchers || [],
          currentPitcherIdx: 0,
          stats: {}
        }
      },
      // 比賽即時狀態
      status: {
        inning: 1,
        isTop: true,          // true: 上半局 (Away攻), false: 下半局 (Home攻)
        outs: 0,
        balls: 0,
        strikes: 0,
        scoreAway: 0,
        scoreHome: 0,
        awayOrderIdx: 0,      // 客隊當前棒次 (0~8)
        homeOrderIdx: 0,      // 主隊當前棒次 (0~8)
        bases: { 1: null, 2: null, 3: null }, // 各壘跑者: { player, fromBase, paId }
        currentPitches: [],   // 本打席逐球 ['ball', 'called_strike', ...]
        currentPitcherBF: 0   // 當前投手面對打席數
      },
      // 局得分板
      lineScore: {
        away: { innings: [0], runs: 0, hits: 0, errors: 0, lobs: 0 },
        home: { innings: [0], runs: 0, hits: 0, errors: 0, lobs: 0 }
      },
      // 菱形格矩陣資料: matrix[teamKey][playerIdx][inning] = [cellData1, cellData2...]
      scoreMatrix: {
        away: {},
        home: {}
      },
      // 逐打席流水事件 (Play-by-Play Logs)
      pbpEvents: [],
      // 歷史操作堆疊 (供 Undo 功能)
      historyStack: []
    };
  }

  /**
   * 計算智慧跑者預設推進 (Default Runner Advancement Inference)
   */
  function inferAdvancement(bases, hitType, isWalk) {
    const adv = {
      batter: 'OUT',
      runners: { 1: 'STAY', 2: 'STAY', 3: 'STAY' }
    };

    if (isWalk) {
      adv.batter = '1B';
      // 滿壘擠回得分，連環推進
      if (bases[1] && bases[2] && bases[3]) {
        adv.runners[3] = 'SCORE';
        adv.runners[2] = 'ADV_3';
        adv.runners[1] = 'ADV_2';
      } else if (bases[1] && bases[2]) {
        adv.runners[2] = 'ADV_3';
        adv.runners[1] = 'ADV_2';
      } else if (bases[1]) {
        adv.runners[1] = 'ADV_2';
      }
      return adv;
    }

    switch (hitType) {
      case '1B':
        adv.batter = '1B';
        if (bases[3]) adv.runners[3] = 'SCORE';
        if (bases[2]) adv.runners[2] = 'ADV_3';
        if (bases[1]) adv.runners[1] = 'ADV_2';
        break;
      case '2B':
        adv.batter = '2B';
        if (bases[3]) adv.runners[3] = 'SCORE';
        if (bases[2]) adv.runners[2] = 'SCORE';
        if (bases[1]) adv.runners[1] = 'ADV_3';
        break;
      case '3B':
        adv.batter = '3B';
        if (bases[3]) adv.runners[3] = 'SCORE';
        if (bases[2]) adv.runners[2] = 'SCORE';
        if (bases[1]) adv.runners[1] = 'SCORE';
        break;
      case 'HR':
        adv.batter = 'HR';
        if (bases[3]) adv.runners[3] = 'SCORE';
        if (bases[2]) adv.runners[2] = 'SCORE';
        if (bases[1]) adv.runners[1] = 'SCORE';
        break;
      case 'SAC': // 犧牲短打護送前位跑者
        adv.batter = 'OUT';
        if (bases[3]) adv.runners[3] = 'SCORE';
        if (bases[2]) adv.runners[2] = 'ADV_3';
        if (bases[1]) adv.runners[1] = 'ADV_2';
        break;
      case 'SF': // 高飛犧牲打
        adv.batter = 'OUT';
        if (bases[3]) adv.runners[3] = 'SCORE';
        break;
      case 'Ʞ': // 不死三振 (Uncaught 3rd strike)
        adv.batter = '1B';
        if (bases[1]) adv.runners[1] = 'ADV_2';
        if (bases[2]) adv.runners[2] = 'ADV_3';
        if (bases[3]) adv.runners[3] = 'SCORE';
        break;
      default: // 刺殺、接殺、三振
        adv.batter = 'OUT';
        break;
    }

    return adv;
  }

  /**
   * 執行並記錄一個完整打席事件
   * @param {Object} game 賽事物件
   * @param {Object} playPayload 打席結果參數
   */
  function recordPlay(game, playPayload) {
    // 儲存 Undo 快照
    saveSnapshot(game);

    const s = game.status;
    const battingTeamKey = s.isTop ? 'away' : 'home';
    const fieldingTeamKey = s.isTop ? 'home' : 'away';
    const battingTeam = game.teams[battingTeamKey];
    const fieldingTeam = game.teams[fieldingTeamKey];
    const currentOrderIdx = s.isTop ? s.awayOrderIdx : s.homeOrderIdx;
    const batter = battingTeam.lineup[currentOrderIdx];
    const pitcher = fieldingTeam.pitchers[fieldingTeam.currentPitcherIdx] || { name: "先發投手", number: "1" };

    const {
      resultType,        // '1B', '2B', '3B', 'HR', 'BB', 'IBB', 'HBP', 'K', 'ꓘ', 'Ʞ', 'GO', 'FO', 'E', 'SAC', 'SF', 'FC'
      direction = 8,     // 守備位置 1~9 (例如 8 中外野)
      trajectory = 'none',// 'line', 'fly', 'ground'
      fieldCode = '',    // 如 '6-3', '4-3', '3A', '6E-3'
      customRBI = null,  // 手動覆寫打點數
      advances = {}      // 跑者推進判定: { batter: '1B'|'2B'|'3B'|'HR'|'OUT', runners: { 1: ..., 2: ..., 3: ... } }
    } = playPayload;

    let runsScoredThisPlay = 0;
    let rbiCount = 0;
    let isHit = false;
    let isAB = true;
    let isBB = false;
    let isHBP = false;
    let isSAC = false;
    let isSF = false;
    let isStrikeout = false;
    let isError = false;

    // 1. 打者上壘路徑與標記準備
    let cellPaths = {};
    let cellNotations = {};
    let cellCenter = {};

    // 判斷打擊性質
    if (['1B', '2B', '3B', 'HR'].includes(resultType)) {
      isHit = true;
      if (resultType === '1B') cellPaths.first = true;
      if (resultType === '2B') { cellPaths.first = true; cellPaths.second = true; }
      if (resultType === '3B') { cellPaths.first = true; cellPaths.second = true; cellPaths.third = true; }
      if (resultType === 'HR') { cellPaths = { first: true, second: true, third: true, home: true }; cellCenter.isRun = true; }
    } else if (resultType === 'BB' || resultType === 'IBB') {
      isBB = true;
      isAB = false;
      cellPaths.first = true;
    } else if (resultType === 'HBP') {
      isHBP = true;
      isAB = false;
      cellPaths.first = true;
    } else if (resultType === 'SAC') {
      isSAC = true;
      isAB = false;
    } else if (resultType === 'SF') {
      isSF = true;
      isAB = false;
    } else if (resultType === 'E') {
      isError = true;
      cellPaths.first = true;
    } else if (resultType === 'K' || resultType === 'ꓘ') {
      isStrikeout = true;
    } else if (resultType === 'Ʞ') {
      // 不死三振：計投手三振、計打者打數、不計安打、打者進佔一壘
      isStrikeout = true;
      isAB = true;
      cellPaths.first = true;
    }

    // 2. 跑者推進與得分統計
    const nextBases = { 1: null, 2: null, 3: null };
    const runnersAdv = advances.runners || {};

    // 檢查現有壘包跑者
    [3, 2, 1].forEach(base => {
      const runner = s.bases[base];
      if (!runner) return;
      const act = runnersAdv[base] || 'STAY';

      if (act === 'SCORE') {
        runsScoredThisPlay++;
        rbiCount++;
        // 註記該跑者得分
        updateRunnerScoredInMatrix(game, battingTeamKey, runner.playerIdx, runner.startInning, batter.order);
      } else if (act === 'ADV_3') {
        nextBases[3] = runner;
      } else if (act === 'ADV_2') {
        nextBases[2] = runner;
      } else if (act === 'STAY') {
        nextBases[base] = runner;
      } else if (act === 'OUT') {
        s.outs++;
      }
    });

    // 處理打者自身進壘
    const batterAdv = advances.batter || resultType;
    if (batterAdv === 'HR') {
      runsScoredThisPlay++;
      rbiCount++;
    } else if (batterAdv === '3B') {
      nextBases[3] = { player: batter, playerIdx: currentOrderIdx, startInning: s.inning };
    } else if (batterAdv === '2B') {
      nextBases[2] = { player: batter, playerIdx: currentOrderIdx, startInning: s.inning };
    } else if (batterAdv === '1B' || isBB || isHBP || isError) {
      nextBases[1] = { player: batter, playerIdx: currentOrderIdx, startInning: s.inning };
    } else {
      // 打者出局
      s.outs++;
    }

    if (customRBI !== null) {
      rbiCount = parseInt(customRBI);
    }

    // 3. 組合早稻田外圈與內圈符號
    let hitText = fieldCode || resultType;
    if (isHit && !fieldCode) {
      hitText = `${resultType} ${direction}`;
    }

    cellNotations.first = {
      text: hitText,
      trajectory: trajectory !== 'none' ? trajectory : undefined,
      isSacrifice: isSAC
    };

    if (resultType === '2B') cellNotations.second = { text: '2B' };
    if (resultType === '3B') cellNotations.third = { text: '3B' };
    if (resultType === 'HR') cellNotations.second = { text: 'HR' };
    if (rbiCount > 0) {
      cellNotations.home = { text: '', rbi: rbiCount };
    }

    if (cellCenter.isRun) {
      // HR 已標 isRun
    } else if (resultType === 'Ʞ') {
      // 不死三振：打者安全上一壘，只顯示 K 符號，不記出局數
      cellCenter.strikeout = 'swinging';
    } else if (s.outs > 0 && (batterAdv === 'OUT' || isStrikeout)) {
      cellCenter.outNumber = s.outs;
      if (isStrikeout) {
        cellCenter.strikeout = (resultType === 'ꓘ') ? 'looking' : 'swinging';
      }
    }

    // 4. 寫入早稻田矩陣
    if (!game.scoreMatrix[battingTeamKey][currentOrderIdx]) {
      game.scoreMatrix[battingTeamKey][currentOrderIdx] = {};
    }
    const cellData = {
      pitches: [...s.currentPitches, 'put_in_play'],
      paths: cellPaths,
      notations: cellNotations,
      center: cellCenter
    };
    game.scoreMatrix[battingTeamKey][currentOrderIdx][s.inning] = cellData;

    // 5. 更新比賽比分與局得分板
    if (s.isTop) {
      s.scoreAway += runsScoredThisPlay;
      ensureInningLineScore(game.lineScore.away, s.inning);
      game.lineScore.away.innings[s.inning - 1] += runsScoredThisPlay;
      game.lineScore.away.runs += runsScoredThisPlay;
      if (isHit) game.lineScore.away.hits++;
      if (isError) game.lineScore.home.errors++;
    } else {
      s.scoreHome += runsScoredThisPlay;
      ensureInningLineScore(game.lineScore.home, s.inning);
      game.lineScore.home.innings[s.inning - 1] += runsScoredThisPlay;
      game.lineScore.home.runs += runsScoredThisPlay;
      if (isHit) game.lineScore.home.hits++;
      if (isError) game.lineScore.away.errors++;
    }

    // 6. 生成逐打席中文化轉播文字
    const inningName = `${s.inning}局${s.isTop ? '上' : '下'}`;
    const pbpMessage = generatePBPDescription({
      inningName,
      batter,
      pitcher,
      resultType,
      direction,
      hitText,
      rbiCount,
      runsScoredThisPlay,
      outsAfter: s.outs
    });
    game.pbpEvents.unshift({
      id: "PBP_" + Date.now(),
      text: pbpMessage,
      inning: s.inning,
      isTop: s.isTop,
      runs: runsScoredThisPlay,
      scoreSnapshot: `${s.scoreAway}:${s.scoreHome}`
    });

    // 7. 更新壘包跑者
    s.bases = nextBases;

    // 剛完成打席的進攻隊伍，下次輪到下一棒
    if (battingTeamKey === 'away') {
      s.awayOrderIdx = (s.awayOrderIdx + 1) % 9;
    } else {
      s.homeOrderIdx = (s.homeOrderIdx + 1) % 9;
    }

    // 8. 檢查三人出局換局
    let inningChanged = false;
    if (s.outs >= 3) {
      inningChanged = true;
      // 標註該打席局末雙斜線 //
      cellData.isInningEnd = true;

      // 結算半局殘壘 (LOB)
      let halfInningLOB = 0;
      [1, 2, 3].forEach(b => {
        if (s.bases[b]) {
          halfInningLOB++;
          // 在留在壘上的跑者格子中央標記草書 ℓ
          markLOBInMatrix(game, battingTeamKey, s.bases[b].playerIdx, s.bases[b].startInning);
        }
      });
      if (s.isTop) game.lineScore.away.lobs += halfInningLOB;
      else game.lineScore.home.lobs += halfInningLOB;

      // 切換半局
      s.outs = 0;
      s.bases = { 1: null, 2: null, 3: null };
      if (s.isTop) {
        s.isTop = false; // 換下半局 (主隊進攻)
      } else {
        s.isTop = true;  // 換下一局上半 (客隊進攻)
        s.inning++;
      }
    }

    // 清空逐球球數
    s.balls = 0;
    s.strikes = 0;
    s.currentPitches = [];

    return {
      success: true,
      inningChanged,
      runsScoredThisPlay,
      currentScore: { away: s.scoreAway, home: s.scoreHome }
    };
  }

  /**
   * 中文化逐打席賽況文字轉譯器
   */
  function generatePBPDescription(info) {
    const { inningName, batter, resultType, hitText, rbiCount, runsScoredThisPlay, outsAfter } = info;
    let desc = `【${inningName}】第 ${batter.order} 棒 #${batter.number} ${batter.name} `;

    switch (resultType) {
      case '1B':
        desc += `敲出 ${hitText} 一壘安打！`;
        break;
      case '2B':
        desc += `擊出 ${hitText} 二壘安打！攻佔得點圈！`;
        break;
      case '3B':
        desc += `掃出 ${hitText} 三壘安打！連奔三個壘包！`;
        break;
      case 'HR':
        desc += `轟出深遠全壘打！帶有 ${rbiCount} 分打點！`;
        break;
      case 'BB':
        desc += `展現選球耐心，獲得四壞球保送上一壘。`;
        break;
      case 'IBB':
        desc += `對手執行戰術，獲得故意四壞保送。`;
        break;
      case 'HBP':
        desc += `遭投手觸身球砸中，保送上一壘。`;
        break;
      case 'K':
        desc += `揮棒落空遭三振出局。(${outsAfter} 出局)`;
        break;
      case 'ꓘ':
        desc += `站著看好球進壘遭見振出局！(${outsAfter} 出局)`;
        break;
      case 'Ʞ':
        desc += `第三好球捕手暴投或捕逸，打者跑上一壘安全！(不死三振 Ʞ)`;
        break;
      case 'GO':
        if (hitText.includes('-')) {
          const parts = hitText.split('-');
          const p1Name = getPositionZhName(parts[0]);
          const p2Name = getPositionZhName(parts[1]);
          desc += `擊出滾地球，${p1Name}接球轉傳${p2Name}完成封殺/刺殺 (${hitText})！(${outsAfter} 出局)`;
        } else {
          const pName = getPositionZhName(hitText);
          desc += `擊出滾地球，${pName}接球自踩或直接刺殺出局 (${hitText})。(${outsAfter} 出局)`;
        }
        break;
      case 'FO':
        const foPos = hitText.replace('F', '');
        const foName = getPositionZhName(foPos);
        desc += `擊出高飛球，遭${foName}直接接殺出局 (${hitText})。(${outsAfter} 出局)`;
        break;
      case 'E':
        if (hitText.includes('-')) {
          desc += `擊出滾地球，防守方傳球發生守備失誤 (${hitText})，打者安全上一壘！`;
        } else {
          const ePos = hitText.replace('E', '');
          const eName = getPositionZhName(ePos);
          desc += `擊出球，${eName}接球或傳球發生守備失誤 (${hitText})，打者安全上一壘！`;
        }
        break;
      case 'SAC':
        desc += `執行犧牲短打戰術出局 (${hitText})，成功護送隊友進壘。(${outsAfter} 出局)`;
        break;
      case 'SF':
        desc += `擊出深遠高飛犧牲打出局 (${hitText})，護送跑者回本壘得分！(${outsAfter} 出局)`;
        break;
      default:
        desc += `擊球結果為 ${resultType} (${hitText})。`;
        break;
    }

    if (runsScoredThisPlay > 0 && resultType !== 'HR') {
      desc += ` 帶有 ${rbiCount} 分打點！`;
    }

    return desc;
  }

  /**
   * 計算並校驗早稻田平衡公式
   */
  function checkGameBalance(game, teamKey) {
    // 公式 1: 打席平衡 PA = AB + BB + HBP + SH + SF + INT
    // 公式 2: 局況平衡 PA = R + LOB + PO
    const team = game.teams[teamKey];
    let totalPA = 0;
    let totalAB = 0;
    let totalBB = 0;
    let totalHBP = 0;
    let totalSH = 0;
    let totalSF = 0;
    let totalR = 0;
    let totalH = 0;
    let totalRBI = 0;
    let totalK = 0;

    const matrix = game.scoreMatrix[teamKey] || {};

    Object.keys(matrix).forEach(playerIdx => {
      const innings = matrix[playerIdx];
      Object.keys(innings).forEach(inn => {
        const cell = innings[inn];
        if (!cell) return;
        totalPA++;

        const notations = cell.notations || {};
        const firstText = notations.first ? notations.first.text : '';
        const isSac = notations.first && notations.first.isSacrifice;
        const center = cell.center || {};

        if (center.isRun) totalR++;
        if (center.strikeout) totalK++;

        if (firstText.includes('BB')) totalBB++;
        else if (firstText.includes('HBP')) totalHBP++;
        else if (isSac) totalSH++;
        else if (firstText.includes('SF')) totalSF++;
        else totalAB++;

        if (firstText.includes('1B') || firstText.includes('2B') || firstText.includes('3B') || firstText.includes('HR')) {
          totalH++;
        }

        if (notations.home && notations.home.rbi) {
          totalRBI += notations.home.rbi;
        }
      });
    });

    const formula1Sum = totalAB + totalBB + totalHBP + totalSH + totalSF;
    const isFormula1Balanced = (totalPA === formula1Sum);

    const line = (teamKey === 'away') ? game.lineScore.away : game.lineScore.home;
    const oppoLine = (teamKey === 'away') ? game.lineScore.home : game.lineScore.away;
    // 總出局數 PO: 守備方已完成局數 * 3 + 當前出局
    const completedInnings = Math.max(0, game.status.inning - (game.status.isTop ? 1 : 0));
    const totalPO = completedInnings * 3 + (game.status.isTop && teamKey === 'away' ? game.status.outs : (!game.status.isTop && teamKey === 'home' ? game.status.outs : 0));
    const formula2Sum = totalR + line.lobs + totalPO;

    return {
      totalPA,
      totalAB,
      totalH,
      totalR,
      totalRBI,
      totalBB,
      totalHBP,
      totalSH,
      totalSF,
      totalK,
      formula1: {
        formula: "AB + BB + HBP + SH + SF",
        sum: formula1Sum,
        pa: totalPA,
        isBalanced: isFormula1Balanced
      },
      formula2: {
        formula: "R + LOB + PO",
        lobs: line.lobs,
        po: totalPO,
        sum: formula2Sum,
        pa: totalPA,
        isBalanced: (totalPA === formula2Sum)
      }
    };
  }

  function updateRunnerScoredInMatrix(game, teamKey, playerIdx, inning, respOrder) {
    const matrix = game.scoreMatrix[teamKey];
    if (matrix && matrix[playerIdx] && matrix[playerIdx][inning]) {
      const cell = matrix[playerIdx][inning];
      cell.paths = cell.paths || {};
      cell.paths.home = true;
      cell.center = cell.center || {};
      cell.center.isRun = true;
      delete cell.center.isLOB;
      delete cell.center.outNumber;
      cell.notations = cell.notations || {};
      cell.notations.home = { text: '', respBatter: respOrder };
    }
  }

  function markLOBInMatrix(game, teamKey, playerIdx, inning) {
    const matrix = game.scoreMatrix[teamKey];
    if (matrix && matrix[playerIdx] && matrix[playerIdx][inning]) {
      const cell = matrix[playerIdx][inning];
      if (!cell.center || !cell.center.isRun) {
        cell.center = cell.center || {};
        cell.center.isLOB = true;
      }
    }
  }

  function ensureInningLineScore(lineScore, inning) {
    while (lineScore.innings.length < inning) {
      lineScore.innings.push(0);
    }
  }

  function saveSnapshot(game) {
    const snap = JSON.stringify({
      status: game.status,
      lineScore: game.lineScore,
      scoreMatrix: game.scoreMatrix,
      pbpEvents: game.pbpEvents
    });
    game.historyStack.push(snap);
    if (game.historyStack.length > 20) game.historyStack.shift();
  }

  function undoLastAction(game) {
    if (!game.historyStack || game.historyStack.length === 0) return false;
    const snap = JSON.parse(game.historyStack.pop());
    game.status = snap.status;
    game.lineScore = snap.lineScore;
    game.scoreMatrix = snap.scoreMatrix;
    game.pbpEvents = snap.pbpEvents;
    return true;
  }

  function getPositionZhName(code) {
    const cleanCode = String(code).trim().replace(/[^0-9]/g, '');
    const map = {
      '1': '投手',
      '2': '捕手',
      '3': '一壘手',
      '4': '二壘手',
      '5': '三壘手',
      '6': '游擊手',
      '7': '左外野手',
      '8': '中外野手',
      '9': '右外野手'
    };
    return map[cleanCode] || (cleanCode ? `${cleanCode}號守備員` : '防守方');
  }

  return {
    createNewGame,
    recordPlay,
    inferAdvancement,
    checkGameBalance,
    undoLastAction
  };
}));
