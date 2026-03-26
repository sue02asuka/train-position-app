import { useState } from 'react'
import tokaidoData from './data/tokaido.json'
import PlatformDiagram from './PlatformDiagram'

const lines = [tokaidoData]

export default function App() {
  const [selectedLine, setSelectedLine] = useState('')
  const [selectedStation, setSelectedStation] = useState('')
  const [selectedDirection, setSelectedDirection] = useState('')

  const line = lines.find(l => l.lineId === selectedLine)
  const station = line?.stations.find(s => s.stationId === selectedStation)
  const direction = station?.directions.find(d => d.directionId === selectedDirection)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-orange-500 text-white px-4 py-3 shadow">
        <h1 className="text-lg font-bold">JR東海 乗車位置ガイド</h1>
        <p className="text-xs text-orange-100">階段・エレベーター前の乗車位置を調べる</p>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* 路線選択 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ① 路線を選ぶ
          </label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
            value={selectedLine}
            onChange={e => {
              setSelectedLine(e.target.value)
              setSelectedStation('')
              setSelectedDirection('')
            }}
          >
            <option value="">-- 路線を選択 --</option>
            {lines.map(l => (
              <option key={l.lineId} value={l.lineId}>{l.lineName}</option>
            ))}
          </select>
        </div>

        {/* 駅選択 */}
        {line && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ② 駅を選ぶ
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
              value={selectedStation}
              onChange={e => {
                setSelectedStation(e.target.value)
                setSelectedDirection('')
              }}
            >
              <option value="">-- 駅を選択 --</option>
              {line.stations.map(s => (
                <option key={s.stationId} value={s.stationId}>{s.stationName}</option>
              ))}
            </select>
          </div>
        )}

        {/* 方向選択 */}
        {station && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ③ 方向を選ぶ
            </label>
            <div className="flex gap-2">
              {station.directions.map(d => (
                <button
                  key={d.directionId}
                  onClick={() => setSelectedDirection(d.directionId)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    selectedDirection === d.directionId
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  {d.directionName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 結果表示 */}
        {direction && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              📍 {station.stationName}駅 {direction.directionName}の乗車位置
            </h2>
            {direction.formations.map((formation, fi) => (
              <div key={fi} className="mb-4">
                <p className="text-xs text-gray-500 mb-2">{formation.label}</p>

                {/* ホーム図 */}
                <PlatformDiagram formation={formation} />

                {/* 設備リスト */}
                <div className="space-y-2 mt-4">
                  {formation.facilities.map((f, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        f.type === 'elevator'
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-green-50 border border-green-200'
                      }`}
                    >
                      <span className="text-2xl">
                        {f.type === 'elevator' ? '🛗' : '🪜'}
                      </span>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800 text-sm">{f.name}</p>
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold">{f.car}号車</span> · {f.door}番ドア付近
                        </p>
                        {f.note && (
                          <p className="text-xs text-orange-500 mt-0.5">{f.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
