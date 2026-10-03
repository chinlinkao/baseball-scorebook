/**
 * 台中小海盜大叔隊 球員名單與背號資料庫
 * 來源：台中小海盜大叔隊_背號.pdf
 */

const PIRATES_ROSTER = [
  { id: "P05", number: "5",  name: "林嘉輝", defaultPos: "7", defaultOrder: 7 },
  { id: "P09", number: "9",  name: "簡亦汛", defaultPos: "8", defaultOrder: 1 },
  { id: "P13", number: "13", name: "高新策", defaultPos: "6", defaultOrder: 2 },
  { id: "P14", number: "14", name: "陳俊志", defaultPos: "BN" },
  { id: "P16", number: "16", name: "尤瑞衡", defaultPos: "BN" },
  { id: "P18", number: "18", name: "黃思學", defaultPos: "1", defaultOrder: 9 },
  { id: "P21", number: "21", name: "郭致宏", defaultPos: "BN" },
  { id: "P22", number: "22", name: "鄭隆達", defaultPos: "4", defaultOrder: 6 },
  { id: "P23", number: "23", name: "楊敏達", defaultPos: "3", defaultOrder: 4 },
  { id: "P24", number: "24", name: "李喆欽", defaultPos: "5", defaultOrder: 5 },
  { id: "P31", number: "31", name: "黃鈞晃", defaultPos: "BN" },
  { id: "P35", number: "35", name: "江定原", defaultPos: "BN" },
  { id: "P38", number: "38", name: "陳郁方", defaultPos: "BN" },
  { id: "P39", number: "39", name: "彭丞宇", defaultPos: "BN" },
  { id: "P58", number: "58", name: "黃威銘", defaultPos: "2", defaultOrder: 8 },
  { id: "P61", number: "61", name: "陳炫男", defaultPos: "BN" },
  { id: "P63", number: "63", name: "卓宥男", defaultPos: "BN" },
  { id: "P68", number: "68", name: "楊昌憲", defaultPos: "BN" },
  { id: "P70", number: "70", name: "高慶霖", defaultPos: "BN" },
  { id: "P71", number: "71", name: "林子強", defaultPos: "BN" },
  { id: "P73", number: "73", name: "陳信宇", defaultPos: "BN" },
  { id: "P74", number: "74", name: "楊明程", defaultPos: "BN" },
  { id: "P77", number: "77", name: "張季暐", defaultPos: "BN" },
  { id: "P84", number: "84", name: "譚翔",   defaultPos: "9", defaultOrder: 3 },
  { id: "P86", number: "86", name: "詹宗憲", defaultPos: "BN" },
  { id: "P89", number: "89", name: "林威志", defaultPos: "BN" },
  { id: "P99", number: "99", name: "王維新", defaultPos: "BN" },
  { id: "P00", number: "00", name: "顏平和", defaultPos: "BN" }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PIRATES_ROSTER;
}