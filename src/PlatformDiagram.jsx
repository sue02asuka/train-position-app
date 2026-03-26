export default function PlatformDiagram({ formation }) {
  const { cars, facilities } = formation

  // 号車ごとに設備をマッピング
  const facilityMap = {}
  facilities.forEach(f => {
    const key = f.car
    if (!facilityMap[key]) facilityMap[key] = []
    facilityMap[key].push(f)
  })

  return (
    <div className="mt-4">
      <p className="text-xs text-gray-500 mb-2">ホーム図（豊橋・米原側 → ）</p>

      {/* 列車図 */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-1 min-w-max">
          {Array.from({ length: cars }, (_, i) => {
            const carNum = i + 1
            const hasFacility = facilityMap[carNum]
            return (
              <div key={carNum} className="flex flex-col items-center gap-1">
                {/* 設備アイコン（上） */}
                <div className="h-8 flex flex-col items-center justify-end gap-0.5">
                  {hasFacility?.map((f, fi) => (
                    <span key={fi} className="text-base leading-none">
                      {f.type === 'elevator' ? '🛗' : '🪜'}
                    </span>
                  ))}
                </div>

                {/* 車両ボックス */}
                <div
                  className={`w-14 h-12 rounded border-2 flex items-center justify-center text-sm font-bold transition-colors ${
                    hasFacility
                      ? 'bg-orange-100 border-orange-400 text-orange-700'
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                  }`}
                >
                  {carNum}号車
                </div>

                {/* 設備名（下） */}
                <div className="h-8 flex flex-col items-center justify-start gap-0.5">
                  {hasFacility?.map((f, fi) => (
                    <span
                      key={fi}
                      className={`text-xs leading-tight text-center whitespace-nowrap ${
                        f.type === 'elevator' ? 'text-blue-600' : 'text-green-700'
                      }`}
                    >
                      {f.type === 'elevator' ? 'EV' : '階段'}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* ホームライン */}
        <div className="mt-1 h-2 rounded-full bg-gray-300 min-w-max" style={{ width: `${cars * 60}px` }} />
        <p className="text-xs text-gray-400 mt-1">← ホーム</p>
      </div>

      {/* 凡例 */}
      <div className="flex gap-4 mt-2 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-100 border-2 border-orange-400 inline-block" />
          設備あり
        </span>
        <span>🪜 階段</span>
        <span>🛗 エレベーター</span>
      </div>
    </div>
  )
}
