#!/usr/bin/env node
/**
 * 駅ホーム号車案内板 写真AI解析スクリプト
 *
 * 使い方:
 *   node tools/analyze-photo.js <写真.jpg> [駅名] [方面]
 *
 * 例:
 *   node tools/analyze-photo.js hamamatsu.jpg 浜松 大垣方面
 *   node tools/analyze-photo.js nagoya.jpg
 *
 * 必要な環境変数:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *
 * 出力:
 *   tokaido.json に貼り付け可能なJSONをターミナルに表示します。
 *   確認後、src/data/tokaido.json の該当駅データを手動で更新してください。
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

// 引数取得
const [, , imagePath, stationHint, directionHint] = process.argv;

if (!imagePath) {
  console.error('エラー: 画像ファイルパスを指定してください。');
  console.error('使い方: node tools/analyze-photo.js <写真.jpg> [駅名] [方面]');
  process.exit(1);
}

if (!fs.existsSync(imagePath)) {
  console.error(`エラー: ファイルが見つかりません: ${imagePath}`);
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('エラー: 環境変数 ANTHROPIC_API_KEY が設定されていません。');
  console.error('例: export ANTHROPIC_API_KEY=sk-ant-...');
  process.exit(1);
}

// 画像をBase64エンコード
const imageBuffer = fs.readFileSync(imagePath);
const base64Image = imageBuffer.toString('base64');
const ext = path.extname(imagePath).toLowerCase();
const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

// スキーマ定義（AIへの説明用）
const SCHEMA_EXAMPLE = `
{
  "stationId": "nagoya",        // 駅名の英語ID（ローマ字）
  "stationName": "名古屋",      // 駅名（日本語）
  "directions": [
    {
      "directionId": "ogaki",         // 方面ID（英語）
      "directionName": "大垣・米原方面", // 方面名（日本語）
      "formations": [
        {
          "cars": 8,              // 両数（4, 6, 8, 10, 12 など）
          "label": "8両編成",
          "facilities": [
            {
              "type": "stairs",   // "stairs"（階段）, "escalator"（エスカレーター）, "elevator"（エレベーター）
              "name": "中央改札口 階段",  // 設備名・出口名
              "car": 4,           // 号車番号（1号車が先頭）
              "door": 2           // ドア番号（進行方向前から1,2,3）
            }
          ]
        }
      ]
    }
  ]
}
`;

const systemPrompt = `あなたはJR東海の駅ホームにある「号車案内板」「乗車位置案内図」の写真から、
乗車位置情報をJSONデータとして抽出する専門アシスタントです。

## 抽出ルール
- 階段・エスカレーター・エレベーターの位置を正確に読み取る
- 号車番号は「1号車が進行方向の先頭」として数える
- ドア番号は「進行方向の前から1・2・3番目」として数える（3ドア車の場合）
- 編成両数ごとに分けて記録する（4両・6両・8両など）
- 出口名・改札名は案内板に書かれている通りに記録する
- 読み取れない部分は省略し、確実な情報のみ出力する

## 出力形式
以下のJSONスキーマに従って出力してください。JSONのみ出力し、説明文は不要です。
${SCHEMA_EXAMPLE}`;

const userMessage = `この画像はJR東海の駅ホームにある号車案内板です。
${stationHint ? `駅名: ${stationHint}` : ''}
${directionHint ? `方面: ${directionHint}` : ''}

画像から乗車位置情報を読み取り、指定されたJSON形式で出力してください。
JSONのみ出力してください（説明文不要）。`;

// Claude API呼び出し
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

console.error('🔍 画像を解析中...');

try {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: userMessage,
          },
        ],
      },
    ],
  });

  const result = response.content[0].text;

  // JSONとして整形して出力
  try {
    const parsed = JSON.parse(result);
    console.log(JSON.stringify(parsed, null, 2));
    console.error('\n✅ 解析完了。上記のJSONをsrc/data/tokaido.jsonの該当駅に貼り付けてください。');
  } catch {
    // JSONパースに失敗した場合はそのまま出力
    console.log(result);
    console.error('\n⚠️  JSON形式ではない出力が返されました。内容を確認してください。');
  }
} catch (error) {
  console.error('エラー:', error.message);
  process.exit(1);
}
