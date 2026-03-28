/**
 * TrainDiagram — 車両図コンポーネント
 * 号車・ドア位置に階段/エレベーター/エスカレーターのアイコンを表示する
 */
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import type { Facility, FacilityType } from '../types/station';

interface Props {
  totalCars: number;
  facilities: Facility[];
  /** trueにすると凡例・設備リストを非表示（投稿履歴カード内での使用向け） */
  compact?: boolean;
}

const CAR_WIDTH = 88;    // 1両の幅(px)
const CAR_HEIGHT = 52;   // 1両の高さ(px)
const DOOR_POSITIONS = [0.15, 0.5, 0.85]; // ドア1〜3の位置（車両幅の割合）

const FACILITY_CONFIG: Record<FacilityType, { icon: string; color: string; label: string }> = {
  stairs:    { icon: '🪜', color: '#1565C0', label: '階段' },
  escalator: { icon: '🔼', color: '#2E7D32', label: 'エスカレ' },
  elevator:  { icon: '🛗', color: '#6A1B9A', label: 'エレベータ' },
};

export default function TrainDiagram({ totalCars, facilities, compact = false }: Props) {
  const totalWidth = CAR_WIDTH * totalCars;

  // 号車・ドアごとの設備マップ
  const facilityMap: Record<string, Facility[]> = {};
  facilities.forEach((f) => {
    const key = `${f.car}-${f.door}`;
    if (!facilityMap[key]) facilityMap[key] = [];
    facilityMap[key].push(f);
  });

  return (
    <View style={styles.wrapper}>
      <Text style={styles.direction}>← 進行方向（先頭）</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: totalWidth }}>
          {/* ホームライン（上） */}
          <View style={styles.platformTop} />

          {/* 車両列 */}
          <View style={styles.trainRow}>
            {Array.from({ length: totalCars }, (_, i) => i + 1).map((carNo) => (
              <View key={carNo} style={styles.car}>
                {/* 号車番号 */}
                <Text style={styles.carNumber}>{carNo}号車</Text>

                {/* 車体 */}
                <View style={styles.carBody}>
                  {/* ドア3つ */}
                  {[1, 2, 3].map((doorNo) => {
                    const key = `${carNo}-${doorNo}`;
                    const hasFacility = !!facilityMap[key];
                    const facs = facilityMap[key] ?? [];
                    return (
                      <View
                        key={doorNo}
                        style={[styles.door, hasFacility && styles.doorHighlight]}
                      >
                        {facs.map((f, idx) => (
                          <Text key={idx} style={styles.doorIcon}>
                            {FACILITY_CONFIG[f.type]?.icon ?? '?'}
                          </Text>
                        ))}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {/* ホームライン（下） */}
          <View style={styles.platformBottom} />

          {/* 凡例（compactモードでは非表示） */}
          {!compact && (
            <View style={styles.legend}>
              {Object.entries(FACILITY_CONFIG).map(([type, config]) => (
                <View key={type} style={styles.legendItem}>
                  <Text style={styles.legendIcon}>{config.icon}</Text>
                  <Text style={[styles.legendLabel, { color: config.color }]}>{config.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 設備リスト（compactモードでは非表示） */}
          {!compact && facilities.length > 0 && (
            <View style={styles.facilityList}>
              {facilities.map((f, i) => {
                const cfg = FACILITY_CONFIG[f.type];
                return (
                  <View key={i} style={[styles.facilityItem, { borderLeftColor: cfg.color }]}>
                    <Text style={styles.facilityItemIcon}>{cfg.icon}</Text>
                    <View>
                      <Text style={[styles.facilityItemType, { color: cfg.color }]}>{cfg.label}</Text>
                      <Text style={styles.facilityItemPos}>{f.car}号車 · {f.door}番目ドア</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 4 },
  direction: { fontSize: 11, color: '#999', marginBottom: 4 },
  platformTop: { height: 8, backgroundColor: '#CFD8DC', borderRadius: 4, marginBottom: 2 },
  platformBottom: { height: 8, backgroundColor: '#CFD8DC', borderRadius: 4, marginTop: 2 },
  trainRow: { flexDirection: 'row' },
  car: { width: CAR_WIDTH, alignItems: 'center', paddingHorizontal: 2 },
  carNumber: { fontSize: 10, color: '#666', marginBottom: 2, fontWeight: 'bold' },
  carBody: {
    width: CAR_WIDTH - 4,
    height: CAR_HEIGHT,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#1565C0',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    paddingBottom: 0,
  },
  door: {
    width: 20,
    height: 28,
    backgroundColor: '#fff',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#90CAF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doorHighlight: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFA000',
    borderWidth: 2,
  },
  doorIcon: { fontSize: 12 },
  legend: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendIcon: { fontSize: 14 },
  legendLabel: { fontSize: 11, fontWeight: 'bold' },
  facilityList: { gap: 6, paddingTop: 8 },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 2,
  },
  facilityItemIcon: { fontSize: 18 },
  facilityItemType: { fontSize: 12, fontWeight: 'bold' },
  facilityItemPos: { fontSize: 12, color: '#666' },
});
