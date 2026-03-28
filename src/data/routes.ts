// JR東海 路線一覧
// 新路線追加時はここにエントリを追加し、対応するJSONファイルを src/data/ に置く

export type RouteStatus = 'available' | 'coming_soon';

export interface Route {
  routeId: string;
  routeName: string;
  routeNameKana: string;
  color: string;         // ラインカラー
  icon: string;          // 絵文字アイコン
  section: string;       // 区間
  status: RouteStatus;
  dataFile?: string;     // 対応JSONファイル名（src/data/配下）
}

export const ROUTES: Route[] = [
  {
    routeId: 'tokaido',
    routeName: '東海道本線',
    routeNameKana: 'とうかいどうほんせん',
    color: '#E65100',
    icon: '🚃',
    section: '豊橋 〜 米原',
    status: 'available',
    dataFile: 'tokaido',
  },
  {
    routeId: 'chuo',
    routeName: '中央本線',
    routeNameKana: 'ちゅうおうほんせん',
    color: '#1565C0',
    icon: '🚋',
    section: '名古屋 〜 塩尻',
    status: 'coming_soon',
  },
  {
    routeId: 'kansai',
    routeName: '関西本線',
    routeNameKana: 'かんさいほんせん',
    color: '#2E7D32',
    icon: '🚆',
    section: '名古屋 〜 亀山',
    status: 'coming_soon',
  },
  {
    routeId: 'taketoyo',
    routeName: '武豊線',
    routeNameKana: 'たけとよせん',
    color: '#6A1B9A',
    icon: '🚄',
    section: '大府 〜 武豊',
    status: 'coming_soon',
  },
  {
    routeId: 'iida',
    routeName: '飯田線',
    routeNameKana: 'いいだせん',
    color: '#00838F',
    icon: '🚞',
    section: '豊橋 〜 辰野',
    status: 'coming_soon',
  },
];
