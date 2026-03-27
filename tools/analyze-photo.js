#!/usr/bin/env node
/**
 * 駅ホーム乗車位置 写真AI解析スクリプト
 *
 * 【案内板モード】号車案内板の写真1枚から解析
 *   node tools/analyze-photo.js <写真.jpg> [駅名] [方面]
 *
 * 【床マークモード】号車案内板がない駅向け。複数枚まとめて解析
 *   node tools/analyze-photo.js --floor <写真1.jpg> [写真2.jpg ...] --station 駅名 --direction 方面
 *
 * 例:
 *   node tools/analyze-photo.js board.jpg 浜松 大垣方面
 *   node tools/analyze-photo.js --floor mark1.jpg mark2.jpg mark3.jpg --station 西小坂井 --direction 名古屋方面
 *
 * 必要な環境変数:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *
 * 出力:
 *   tokaido.json に貼り付け可能なJSONをターミナルに表示します。
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

// ── 引数パース ──────────────────────────────────────────
const args = process.argv.slice(2);

if (args.length === 0) {
  printUsage();
  process.exit(1);
}

const isFloorMode = args[0] === '--floor';
let imagePaths = [];
let stationHint = '';
let directionHint = '';

if (isFloorMode) {
  // --floor 写真1.jpg 写真2.jpg ... --station 駅名 --direction 方面
  const rest = args.slice(1);
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--station') { stationHint = rest[++i] || ''; }
    else if (rest[i] === '--direction') { directionHint = rest[++i] || ''; }
    else { imagePaths.push(rest[i]); }
  }
  if (imagePaths.length === 0) {
    console.error('エラー: 床マークモードでは写真ファイルを1枚以上指定してください。');
    process.exit(1);
  }
} else {
  // 案内板モード: 写真.jpg [駅名] [方面]
  imagePaths = [args[0]];
  stationHint = args[1] || '';
  directionHint = args[2] || '';
}

// ファイル存在確認
for (const p of imagePaths) {
  if (!fs.existsSync(p)) {
    console.error(`エラー: ファイルが見つかりません: ${p}`);
    process.exit(1);
  }
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('エラー: 環境変数 ANTHROPIC_API_KEY が設定されていません。');
  console.error('例: export ANTHROPIC_API_KEY=sk-ant-...');
  process.exit(1);
}

// ── 画像をBase64エンコード ──────────────────────────────
function encodeImage(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  return {
    data: buf.toString('base64'),
    mimeType: ext === '.png' ? 'image/png' : 'image/jpeg',
  };
}

// ── スキーマ定義 ────────────────────────────────────────
const SCHEMA_EXAMPLE = `
{
  "stationId": "nishikozakai",   // 駅名の英語ID（ローマ字・小文字）
  "stationName": "西小坂井",     // 駅名（日本語）
  "directions": [
    {
      "directionId": "nagoya",         // 方面ID（英語）
      "directionName": "名古屋方面",   // 方面名（日本語）
      "formations": [
        {
          "cars": 4,              // 両数（4, 6, 8, 10, 12 など）
          "label": "4両編成",
          "facilities": [
            {
              "type": "stairs",   // "stairs"（階段）, "escalator"（エスカレーター）, "elevator"（エレベーター）
              "name": "改札口 階段",     // 設備名・出口名
              "car": 2,           // 号車番号（1号車が進行方向先頭）
              "door": 1           // ドア番号（進行方向前から1,2,3）
            }
          ]
        }
      ]
    }
  ]
}`;

const BASE_SYSTEM_PROMPT = `あなたはJR東海の駅ホームの写真から乗車位置情報をJSONデータとして抽出する専門アシスタントです。

## 共通ルール
- 階段・エスカレーター・エレベーターの位置を正確に読み取る
- 号車番号は「1号車が進行方向の先頭」として数える
- ドア番号は「進行方向の前から1・2・3番目」として数える（3ドア車の場合）
- 編成両数ごとに分けて記録する（4両・6両・8両など）
- 出口名・改札名は写真に写っている通りに記録する
- 読み取れない部分は省略し、確実な情報のみ出力する

## 出力形式
以下のJSONスキーマに従って出力してください。JSONのみ出力し、説明文は不要です。
${SCHEMA_EXAMPLE}`;

const BOARD_SYSTEM_PROMPT = BASE_SYSTEM_PROMPT;

const FLOOR_SYSTEM_PROMPT = `${BASE_SYSTEM_PROMPT}

## 床マーク読み取りの追加ルール
- ホームの床には「▼4」「◎6-3」「■8-2」のような停車位置マークがある
- 「4」= 4両編成、「6-3」= 6両編成の3号車位置、のように読む
- 階段・エレベーター・エスカレーターはホームの構造物として写真に写っている
- 複数枚の写真が渡される場合は、すべての情報を統合して1つのJSONにまとめる
- 床マークと周囲の設備（階段・エレベーター等）の位置関係から、どの号車・ドアに近いかを推定する`;

// ── メッセージ本文 ──────────────────────────────────────
function buildUserMessage(mode) {
  const stationLine = stationHint ? `駅名: ${stationHint}` : '';
  const directionLine = directionHint ? `方面: ${directionHint}` : '';
  const hints = [stationLine, directionLine].filter(Boolean).join('\n');

  if (mode === 'floor') {
    return `これらの画像はJR東海の駅ホームの床にある停車位置マークを撮影したものです。
${hints}

床のマーク番号と近くにある階段・エレベーター・エスカレーターの位置関係を読み取り、
指定されたJSON形式で出力してください。JSONのみ出力してください（説明文不要）。`;
  }

  return `この画像はJR東海の駅ホームにある号車案内板です。
${hints}

画像から乗車位置情報を読み取り、指定されたJSON形式で出力してください。
JSONのみ出力してください（説明文不要）。`;
}

// ── Claude API呼び出し ──────────────────────────────────
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const mode = isFloorMode ? 'floor' : 'board';

console.error(`🔍 ${isFloorMode ? '床マークモード' : '案内板モード'}で解析中... (${imagePaths.length}枚)`);

// 画像コンテンツブロックを作成
const imageBlocks = imagePaths.map((p) => {
  const { data, mimeType } = encodeImage(p);
  return {
    type: 'image',
    source: { type: 'base64', media_type: mimeType, data },
  };
});

const textBlock = {
  type: 'text',
  text: buildUserMessage(mode),
};

try {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4000,
    system: isFloorMode ? FLOOR_SYSTEM_PROMPT : BOARD_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [...imageBlocks, textBlock],
      },
    ],
  });

  const result = response.content[0].text;

  try {
    const parsed = JSON.parse(result);
    console.log(JSON.stringify(parsed, null, 2));
    console.error('\n✅ 解析完了。上記のJSONをsrc/data/tokaido.jsonの該当駅に貼り付けてください。');
  } catch {
    console.log(result);
    console.error('\n⚠️  JSON形式ではない出力が返されました。内容を確認してください。');
  }
} catch (error) {
  console.error('エラー:', error.message);
  process.exit(1);
}

// ── ヘルプ表示 ──────────────────────────────────────────
function printUsage() {
  console.error(`
使い方:
  【案内板モード】号車案内板の写真1枚から解析
    node tools/analyze-photo.js <写真.jpg> [駅名] [方面]

  【床マークモード】号車案内板がない駅向け。複数枚まとめて解析
    node tools/analyze-photo.js --floor <写真1.jpg> [写真2.jpg ...] --station 駅名 --direction 方面

例:
  node tools/analyze-photo.js board.jpg 浜松 大垣方面
  node tools/analyze-photo.js --floor mark1.jpg mark2.jpg --station 西小坂井 --direction 名古屋方面

必要な環境変数:
  export ANTHROPIC_API_KEY=sk-ant-...
  `);
}
