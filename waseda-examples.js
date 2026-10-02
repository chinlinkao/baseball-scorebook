/**
 * Waseda Baseball Scorebook 23 Classic Examples
 * 23 個早稻田實戰經典案例資料庫
 * 對應 Waseda_Baseball_Scorebook_KB.md 第 4 章節
 */

(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    global.WasedaExamples = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const EXAMPLES = [
    {
      id: 1,
      title: "圖 (1)：中間方向平飛一壘安打",
      description: "打者在 2 好 2 壞後，擊出中外野方向平飛一壘安打安全上壘。",
      data: {
        pitches: ['called_strike', 'ball', 'foul', 'ball', 'put_in_play'],
        paths: { first: true },
        notations: {
          first: { text: "1B 8", trajectory: "line" }
        }
      }
    },
    {
      id: 2,
      title: "圖 (2)：內野地滾球上壘（內野安打/野選）",
      description: "打者擊出三壘方向地滾球，三壘手接球後傳一壘，打者快腿安全上壘。",
      data: {
        pitches: ['swinging_strike', 'ball', 'foul', 'called_strike', 'ball', 'put_in_play'],
        paths: { first: true },
        notations: {
          first: { text: "5-3", trajectory: "ground" }
        }
      }
    },
    {
      id: 3,
      title: "圖 (3)：中外野平飛二壘安打",
      description: "打者在第一球即擊出中外野平飛安打，並趁隙攻佔二壘。",
      data: {
        pitches: ['put_in_play'],
        paths: { first: true, second: true },
        notations: {
          first: { text: "8-4", trajectory: "line" },
          second: { text: "2B" }
        }
      }
    },
    {
      id: 4,
      title: "圖 (4)：右外野飛球奔上三壘",
      description: "打者擊出右外野高飛球，經右外野手傳二壘轉傳本壘縫隙連奔三個壘包攻上三壘。",
      data: {
        pitches: ['put_in_play'],
        paths: { first: true, second: true, third: true },
        notations: {
          first: { text: "9-4-2", trajectory: "fly" },
          third: { text: "3B" }
        }
      }
    },
    {
      id: 5,
      title: "圖 (5)：左外野三分全壘打",
      description: "第一球擊出左外野方向三分全壘打，獲 3 分打點並回本壘得分。",
      data: {
        pitches: ['put_in_play'],
        paths: { first: true, second: true, third: true, home: true },
        notations: {
          first: { text: "7", trajectory: "fly" },
          second: { text: "HR" },
          home: { text: "", rbi: 3 }
        },
        center: { isRun: true }
      }
    },
    {
      id: 6,
      title: "圖 (6)：游擊手失誤上壘",
      description: "擊出游擊滾地球，游擊手傳一壘時失誤，打者安全上一壘。",
      data: {
        pitches: ['called_strike', 'ball', 'foul', 'put_in_play'],
        paths: { first: true },
        notations: {
          first: { text: "6E-3", trajectory: "ground" }
        }
      }
    },
    {
      id: 7,
      title: "圖 (7)：四壞球保送",
      description: "四壞球選保送上一壘。",
      data: {
        pitches: ['ball', 'called_strike', 'ball', 'ball', 'ball'],
        paths: { first: true },
        notations: {
          first: { text: "BB" }
        }
      }
    },
    {
      id: 8,
      title: "圖 (8)：觸身球保送",
      description: "在 2 好 2 壞後，被投手的第 5 顆球砸中身體獲得保送上壘。",
      data: {
        pitches: ['ball', 'foul', 'ball', 'called_strike', 'ball'],
        paths: { first: true },
        notations: {
          first: { text: "HBP" }
        }
      }
    },
    {
      id: 9,
      title: "圖 (9)：靠隊友滾地球推進二壘",
      description: "第一棒保送上壘後，靠第二棒擊出 5-3 滾地球推進至二壘。",
      data: {
        pitches: ['ball', 'ball', 'ball', 'ball'],
        paths: { first: true, second: true },
        notations: {
          first: { text: "BB" },
          second: { text: "5-3", trajectory: "ground", respBatter: 2 }
        }
      }
    },
    {
      id: 10,
      title: "圖 (10)：盜二壘成功，再靠隊友滾地推進三壘",
      description: "靠 BB 上壘後於第二棒第 2 顆壞球時盜二壘成功，再靠第二棒 6-3 滾地球推至三壘。",
      data: {
        pitches: ['ball', 'ball', 'ball', 'ball'],
        paths: { first: true, second: true, third: true },
        notations: {
          first: { text: "BB" },
          second: { text: "SB''" },
          third: { text: "6-3", trajectory: "ground", respBatter: 2 }
        }
      }
    },
    {
      id: 11,
      title: "圖 (11)：連續盜壘並靠安打回本壘得分",
      description: "保送上一壘後連盜二壘與三壘，最後靠第二棒安打跑回本壘得分。",
      data: {
        pitches: ['ball', 'ball', 'ball', 'ball'],
        paths: { first: true, second: true, third: true, home: true },
        notations: {
          first: { text: "BB" },
          second: { text: "SB" },
          third: { text: "SB" },
          home: { text: "6-3", trajectory: "ground", respBatter: 2 }
        },
        center: { isRun: true }
      }
    },
    {
      id: 12,
      title: "圖 (12)：犧牲短打（送跑者上一壘）",
      description: "執行犧牲觸擊戰術，投手接球傳一壘刺殺打者，打者出局但成功護送跑者。",
      data: {
        pitches: ['bunt', 'put_in_play'],
        notations: {
          first: { text: "1-3", isSacrifice: true }
        },
        center: { outNumber: 1 }
      }
    },
    {
      id: 13,
      title: "圖 (13)：揮棒三振出局 (K)",
      description: "打者揮棒落空被三振出局（局內第二個出局）。",
      data: {
        pitches: ['called_strike', 'swinging_strike', 'foul', 'swinging_strike'],
        center: { outNumber: 2, strikeout: 'swinging' }
      }
    },
    {
      id: 14,
      title: "圖 (14)：見振出局 (Looking ꓘ) 與半局結束",
      description: "打者未揮棒站著被三振（第三出局），半局結束攻守交換（雙斜線 //）。",
      data: {
        pitches: ['called_strike', 'ball', 'called_strike', 'called_strike'],
        center: { outNumber: 3, strikeout: 'looking' },
        isInningEnd: true
      }
    },
    {
      id: 15,
      title: "圖 (15)：一壘手自踩壘包刺殺 (3A)",
      description: "打者擊出一壘方向滾地球，一壘手自踩一壘壘包刺殺（第一個出局）。",
      data: {
        pitches: ['called_strike', 'put_in_play'],
        notations: {
          first: { text: "3A", trajectory: "ground" }
        },
        center: { outNumber: 1 }
      }
    },
    {
      id: 16,
      title: "圖 (16)：野手選擇 (FC)",
      description: "打者擊出滾地球，防守方選擇封殺二壘前位跑者，打者安全上到一壘。",
      data: {
        pitches: ['ball', 'put_in_play'],
        paths: { first: true },
        notations: {
          first: { text: "FC 9-4", trajectory: "ground" }
        }
      }
    },
    {
      id: 17,
      title: "圖 (17)：牽制出局 (Pickoff Out)",
      description: "一壘跑者離壘過遠，遭投手突襲牽制觸殺出局（第二個出局）。",
      data: {
        pitches: ['ball', 'called_strike'],
        paths: { first: true },
        interruptedPath: { from: 'first', to: 'second', ratio: 0.35 },
        notations: {
          first: { text: "BB" },
          second: { text: "1-3" }
        },
        center: { outNumber: 2 }
      }
    },
    {
      id: 18,
      title: "圖 (18)：雙殺守備 (Double Play 6-4-3)",
      description: "擊出游擊滾地球，游擊手傳二壘再轉傳一壘完成精彩雙殺（標記 DP 與第 3 出局）。",
      data: {
        pitches: ['called_strike', 'put_in_play'],
        doublePlay: true,
        notations: {
          first: { text: "6-4-3", trajectory: "ground" }
        },
        center: { outNumber: 3 },
        isInningEnd: true
      }
    },
    {
      id: 19,
      title: "圖 (19)：三殺守備 (Triple Play)",
      description: "三壘自踩封殺、傳二壘封殺、再傳一壘封殺，瞬間三出局並結束該半局。",
      data: {
        pitches: ['put_in_play'],
        triplePlay: true,
        notations: {
          first: { text: "5-4-3", trajectory: "ground" }
        },
        center: { outNumber: 3 },
        isInningEnd: true
      }
    },
    {
      id: 20,
      title: "圖 (20)：殘壘 (Left On Base ℓ)",
      description: "三人出局攻守交換時，跑者仍安全停留在二壘上未能回本壘，標記草書 ℓ。",
      data: {
        pitches: ['ball', 'ball', 'ball', 'ball'],
        paths: { first: true, second: true },
        notations: {
          first: { text: "BB" },
          second: { text: "SB" }
        },
        center: { isLOB: true }
      }
    },
    {
      id: 21,
      title: "圖 (21)：不死三振 (Mirrored Ʞ)",
      description: "第三個好球捕手暴投或捕逸，打者奔向一壘安全上壘，記不死三振。",
      data: {
        pitches: ['called_strike', 'swinging_strike', 'swinging_strike'],
        paths: { first: true },
        notations: {
          first: { text: "Ʞ 2B" }
        }
      }
    },
    {
      id: 22,
      title: "圖 (22)：局間更換投手 (頂部粗紅線與背號)",
      description: "更換投手時，在即將面對新投手的第一位打者格子上方劃粗紅分隔線並註明背號。",
      data: {
        pitcherChangeTop: true,
        pitcherNumber: "99",
        pitches: ['called_strike', 'ball', 'put_in_play'],
        paths: { first: true },
        notations: {
          first: { text: "1B 8", trajectory: "line" }
        }
      }
    },
    {
      id: 23,
      title: "圖 (23)：打席中更換投手 / 代打登場",
      description: "球數 1 好 1 壞後換投 (41號)，並換上代打 (PH)。",
      data: {
        isSubstitution: true,
        subType: "PH",
        pitches: ['ball', 'called_strike', 'foul', 'swinging_strike'],
        pitcherChangeAtPitch: 2,
        newPitcherNumber: "41",
        center: { outNumber: 1, strikeout: 'swinging' }
      }
    }
  ];

  return {
    EXAMPLES
  };
}));
