/**
 * Baseball Scoring Engine (棒球計分與規則狀態機)
 * 完整支援早稻田式計分規範、雙殺守備 (DP)、跑者進壘邏輯、打擊/投手數據自動統計、雙重平衡檢核
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

  function createPitcherStats(pitcher) {
    return {
      name: pitcher.name || "投手",
      number: pitcher.number || "1",
      winLoss: pitcher.winLoss || "-",
      outs: 0,
      np: 0,
      bf: 0,
      h: 0,
      hr: 0,
      so: 0,
      bb: 0,
      r: 0,
      er: 0
    };
  }

  function createNewGame(options = {}) {
    const defaultAwayLineup = options.awayLineup || [];
    const defaultHomeLineup = options.homeLineup || [];

    const awayPitchers = (options.awayPitchers && options.awayPitchers.length > 0)
      ? options.awayPitchers.map(createPitcherStats)
      : [createPitcherStats({ name: "黃思學", number: "18" })];

    const homePitchers = (options.homePitchers && options.homePitchers.length > 0)
      ? options.homePitchers.map(createPitcherStats)
      : [createPitcherStats({ name: "鄭凱文", number: "19" })];

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
      teams: {
        away: {
          name: options.awayName || "台中小海盜大叔隊",
          lineup: defaultAwayLineup,
          bench: options.awayBench || [],
          pitchers: awayPitchers,
          currentPitcherIdx: 0,
          stats: {}
        },
        home: {
          name: options.homeName || "台中獵犬棒球隊",
          lineup: defaultHomeLineup,
          bench: options.homeBench || [],
          pitchers: homePitchers,
          currentPitcherIdx: 0,
          stats: {}
        }
      },
      status: {
        inning: 1,
        isTop: true,
        outs: 0,
        balls: 0,
        strikes: 0,
        scoreAway: 0,
        scoreHome: 0,
        awayOrderIdx: 0,
        homeOrderIdx: 0,
        bases: { 1: null, 2: null, 3: null },
        currentPitches: [],
        currentPitcherBF: 0
      },
      lineScore: {
        away: { innings: [0], runs: 0, hits: 0, errors: 0, lobs: 0 },
        home: { innings: [0], runs: 0, hits: 0, errors: 0, lobs: 0 }
      },
      scoreMatrix: {
        away: {},
        home: {}
      },
      pbpEvents: [],
      historyStack: []
    };
  }

  function inferAdvancement(bases, hitType, isWalk) {
    const adv = {
      batter: 'OUT',
      runners: { 1: 'STAY', 2: 'STAY', 3: 'STAY' }
    };

    if (isWalk) {
      adv.batter = '1B';
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
      case 'SAC':
        adv.batter = 'OUT';
        if (bases[3]) adv.runners[3] = 'SCORE';
        if (bases[2]) adv.runners[2] = 'ADV_3';
        if (bases[1]) adv.runners[1] = 'ADV_2';
        break;
      case 'SF':
        adv.batter = 'OUT';
        if (bases[3]) adv.runners[3] = 'SCORE';
        break;
      case 'Ʞ':
        adv.batter = '1B';
        if (bases[1]) adv.runners[1] = 'ADV_2';
        if (bases[2]) adv.runners[2] = 'ADV_3';
        if (bases[3]) adv.runners[3] = 'SCORE';
        break;
      default:
        adv.batter = 'OUT';
        break;
    }

    return adv;
  }

  function markRunnerOutInMatrix(game, teamKey, playerIdx, inning, targetBaseName, fieldCode, outNumber, isDoublePlay) {
    const matrix = game.scoreMatrix[teamKey];
    if (matrix && matrix[playerIdx] && matrix[playerIdx][inning]) {
      const cell = matrix[playerIdx][inning];
      cell.center = cell.center || {};
      cell.center.outNumber = outNumber;
      if (isDoublePlay) {
        cell.doublePlay = true;
      }

      if (targetBaseName === 'second' || targetBaseName === '2' || targetBaseName === 1) {
        cell.interruptedPath = { from: 'first', to: 'second', ratio: 0.5 };
        cell.notations = cell.notations || {};
        cell.notations.second = { text: fieldCode || 'DP' };
      } else if (targetBaseName === 'third' || targetBaseName === '3' || targetBaseName === 2) {
        cell.interruptedPath = { from: 'second', to: 'third', ratio: 0.5 };
        cell.notations = cell.notations || {};
        cell.notations.third = { text: fieldCode || 'DP' };
      } else if (targetBaseName === 'home' || targetBaseName === '4' || targetBaseName === 3) {
        cell.interruptedPath = { from: 'third', to: 'home', ratio: 0.5 };
        cell.notations = cell.notations || {};
        cell.notations.home = { text: fieldCode || 'DP' };
      }
    }
  }

  function recordPlay(game, playPayload) {
    saveSnapshot(game);

    const s = game.status;
    const outsBefore = s.outs;
    const battingTeamKey = s.isTop ? 'away' : 'home';
    const fieldingTeamKey = s.isTop ? 'home' : 'away';
    const battingTeam = game.teams[battingTeamKey];
    const fieldingTeam = game.teams[fieldingTeamKey];
    const currentOrderIdx = s.isTop ? s.awayOrderIdx : s.homeOrderIdx;
    const batter = battingTeam.lineup[currentOrderIdx];
    const pitcher = fieldingTeam.pitchers[fieldingTeam.currentPitcherIdx] || { name: "先發投手", number: "1" };

    const {
      resultType,
      direction = 8,
      trajectory = 'none',
      fieldCode = '',
      customRBI = null,
      advances = {},
      isDoublePlay = false,
      dpType = '',
      runnerFieldCodes = {}
    } = playPayload;

    let runsScoredThisPlay = 0;
    let rbiCount = 0;
    let isHit = false;
    let isAB = true;
    let isBB = false;
    let isHBP = false;
    let isSAC = false;
    let isSF = false;
    let isStrikeout = (resultType === 'K' || resultType === 'ꓘ' || dpType === 'K+CS');
    let isError = false;

    let cellPaths = {};
    let cellNotations = {};
    let cellCenter = {};

    const actualDP = isDoublePlay || resultType === 'DP';

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
      isStrikeout = true;
      isAB = true;
      cellPaths.first = true;
    }

    const nextBases = { 1: null, 2: null, 3: null };
    const runnersAdv = advances.runners || {};

    [3, 2, 1].forEach(base => {
      const runner = s.bases[base];
      if (!runner) return;
      const act = runnersAdv[base] || 'STAY';

      if (act === 'SCORE') {
        runsScoredThisPlay++;
        rbiCount++;
        updateRunnerScoredInMatrix(game, battingTeamKey, runner.playerIdx, runner.startInning, batter.order);
      } else if (act === 'ADV_3') {
        nextBases[3] = runner;
      } else if (act === 'ADV_2') {
        nextBases[2] = runner;
      } else if (act === 'STAY') {
        nextBases[base] = runner;
      } else if (act === 'OUT') {
        s.outs++;
        const targetBaseName = (base === 1) ? 'second' : (base === 2) ? 'third' : 'home';
        const runnerCode = runnerFieldCodes[base] || (actualDP ? 'DP' : 'OUT');
        markRunnerOutInMatrix(game, battingTeamKey, runner.playerIdx, runner.startInning, targetBaseName, runnerCode, s.outs, actualDP);
      }
    });

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
      s.outs++;
    }

    if (customRBI !== null) {
      rbiCount = parseInt(customRBI);
    }

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
      // HR
    } else if (resultType === 'Ʞ') {
      cellCenter.strikeout = 'swinging';
    } else if (s.outs > 0 && (batterAdv === 'OUT' || isStrikeout)) {
      cellCenter.outNumber = s.outs;
      if (isStrikeout) {
        cellCenter.strikeout = (resultType === 'ꓘ') ? 'looking' : 'swinging';
      }
    }

    if (!game.scoreMatrix[battingTeamKey][currentOrderIdx]) {
      game.scoreMatrix[battingTeamKey][currentOrderIdx] = {};
    }
    const cellData = {
      pitches: [...s.currentPitches, 'put_in_play'],
      paths: cellPaths,
      notations: cellNotations,
      center: cellCenter,
      doublePlay: actualDP
    };
    game.scoreMatrix[battingTeamKey][currentOrderIdx][s.inning] = cellData;

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
      outsAfter: s.outs,
      isDoublePlay: actualDP,
      dpType
    });
    game.pbpEvents.unshift({
      id: "PBP_" + Date.now(),
      text: pbpMessage,
      inning: s.inning,
      isTop: s.isTop,
      runs: runsScoredThisPlay,
      scoreSnapshot: `${s.scoreAway}:${s.scoreHome}`
    });

    s.bases = nextBases;

    if (battingTeamKey === 'away') {
      s.awayOrderIdx = (s.awayOrderIdx + 1) % 9;
    } else {
      s.homeOrderIdx = (s.homeOrderIdx + 1) % 9;
    }

    let inningChanged = false;
    if (s.outs >= 3) {
      inningChanged = true;
      cellData.isInningEnd = true;

      let halfInningLOB = 0;
      [1, 2, 3].forEach(b => {
        if (s.bases[b]) {
          halfInningLOB++;
          markLOBInMatrix(game, battingTeamKey, s.bases[b].playerIdx, s.bases[b].startInning);
        }
      });
      if (s.isTop) game.lineScore.away.lobs += halfInningLOB;
      else game.lineScore.home.lobs += halfInningLOB;

      s.outs = 0;
      s.bases = { 1: null, 2: null, 3: null };
      if (s.isTop) {
        s.isTop = false;
      } else {
        s.isTop = true;
        s.inning++;
      }
    }

    if (pitcher) {
      pitcher.bf = (pitcher.bf || 0) + 1;
      const pitchesCount = (s.currentPitches && s.currentPitches.length > 0) ? s.currentPitches.length : 1;
      pitcher.np = (pitcher.np || 0) + pitchesCount;

      if (isHit) pitcher.h = (pitcher.h || 0) + 1;
      if (resultType === 'HR') pitcher.hr = (pitcher.hr || 0) + 1;
      if (isStrikeout) pitcher.so = (pitcher.so || 0) + 1;
      if (isBB || isHBP) pitcher.bb = (pitcher.bb || 0) + 1;

      pitcher.r = (pitcher.r || 0) + runsScoredThisPlay;
      if (!isError) pitcher.er = (pitcher.er || 0) + runsScoredThisPlay;

      const outsThisPlay = inningChanged ? (3 - outsBefore) : (s.outs - outsBefore);
      pitcher.outs = (pitcher.outs || 0) + Math.max(0, outsThisPlay);
    }

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

  function generatePBPDescription(info) {
    const { inningName, batter, resultType, hitText, rbiCount, runsScoredThisPlay, outsAfter, isDoublePlay, dpType } = info;
    let desc = `【${inningName}】第 ${batter.order} 棒 #${batter.number} ${batter.name} `;

    if (isDoublePlay || resultType === 'DP') {
      if (dpType === '6-4-3') desc += `擊出 6-4-3 滾地雙殺打，防守方傳二壘再轉傳一壘完成雙殺守備！`;
      else if (dpType === '4-6-3') desc += `擊出 4-6-3 滾地雙殺打，防守方傳游擊再轉傳一壘完成雙殺守備！`;
      else if (dpType === '5-4-3') desc += `擊出 5-4-3 滾地雙殺打，三壘手接球轉傳二壘、再傳一壘完成雙殺！`;
      else if (dpType === '1-6-3') desc += `擊出 1-6-3 投手前滾地雙殺打，投手傳二壘再轉傳一壘完成雙殺！`;
      else if (dpType === '3-6-3') desc += `擊出 3-6-3 一壘滾地雙殺打，一壘手傳二壘再轉傳一壘完成雙殺！`;
      else if (dpType === '1-2-3') desc += `擊出本壘方向強迫雙殺打，傳本壘封殺跑者、捕手再轉傳一壘完成雙殺！`;
      else if (dpType === 'L6-6') desc += `擊出內野平飛球遭接殺，傳壘刺殺回壘不及之跑者，形成雙殺！`;
      else if (dpType === 'F9-2') desc += `擊出外野高飛球遭接殺，外野手長傳本壘刺殺搶攻跑者，形成雙殺！`;
      else if (dpType === 'K+CS') desc += `揮棒落空遭三振，捕手快速傳壘阻殺盜壘跑者，形成三振雙殺！`;
      else desc += `擊出 ${hitText} 雙殺打，形成雙殺守備！`;

      desc += ` (${outsAfter} 出局【雙殺】)`;
      return desc;
    }

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

  function checkGameBalance(game, teamKey) {
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