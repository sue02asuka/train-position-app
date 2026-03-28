import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import type { Station, Direction, Formation, FacilityType, Facility } from '../types/station';
import { supabase } from '../config/supabase';

interface Props {
  station: Station;
  direction: Direction;
  formation: Formation;
  onBack: () => void;
}

const FACILITY_ICONS: Record<FacilityType, string> = {
  stairs: '🪜',
  escalator: '↕️',
  elevator: '🛗',
};

const FACILITY_LABELS: Record<FacilityType, string> = {
  stairs: '階段',
  escalator: 'エスカレーター',
  elevator: 'エレベーター',
};

const FACILITY_COLORS: Record<FacilityType, string> = {
  stairs: '#1565C0',
  escalator: '#2E7D32',
  elevator: '#6A1B9A',
};

export default function ResultScreen({ station, direction, formation, onBack }: Props) {
  const [facilities, setFacilities] = useState<Facility[]>(formation.facilities);
  const [loading, setLoading] = useState(true);
  const [fromCrowd, setFromCrowd] = useState(false);

  useEffect(() => {
    const fetchApproved = async () => {
      try {
        const { data } = await supabase
          .from('submissions')
          .select('facilities')
          .eq('station_id', station.stationId)
          .eq('direction_id', direction.directionId)
          .eq('cars', formation.cars)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          setFacilities(data[0].facilities as Facility[]);
          setFromCrowd(true);
        }
      } catch (e) {
        // エラー時はローカルデータをそのまま使用
      } finally {
        setLoading(false);
      }
    };
    fetchApproved();
  }, [station.stationId, direction.directionId, formation.cars]);

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.stationName}>{station.stationName}</Text>
          <Text style={styles.subInfo}>{direction.directionName}｜{formation.label}</Text>
        </View>
      </View>

      {fromCrowd && (
        <View style={styles.crowdBadge}>
          <Text style={styles.crowdBadgeText}>👥 ユーザー投稿データ（承認済み）</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E65100" />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {facilities.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>データがありません</Text>
              <Text style={styles.emptySubText}>この駅・方面のデータはまだ登録されていません</Text>
            </View>
          ) : (
            facilities.map((f, i) => (
              <View key={i} style={[styles.card, { borderLeftColor: FACILITY_COLORS[f.type] }]}>
                <Text style={styles.facilityIcon}>{FACILITY_ICONS[f.type]}</Text>
                <View style={styles.cardBody}>
                  <Text style={[styles.facilityType, { color: FACILITY_COLORS[f.type] }]}>
                    {FACILITY_LABELS[f.type]}
                  </Text>
                  <Text style={styles.facilityName}>{f.name}</Text>
                  <Text style={styles.position}>
                    {f.car}号車 · {f.door}番目のドア
                  </Text>
                  {f.note && <Text style={styles.note}>{f.note}</Text>}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#E65100', paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backButton: { paddingRight: 8 },
  backText: { color: '#fff', fontSize: 15 },
  headerInfo: { flex: 1 },
  stationName: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  subInfo: { color: '#FFE0B2', fontSize: 13, marginTop: 2 },
  scroll: { padding: 12, gap: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  facilityIcon: { fontSize: 28, marginTop: 2 },
  cardBody: { flex: 1 },
  facilityType: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  facilityName: { fontSize: 16, color: '#333', fontWeight: 'bold', marginBottom: 4 },
  position: { fontSize: 14, color: '#666' },
  note: { fontSize: 12, color: '#E65100', marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 18, color: '#999', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#bbb' },
  crowdBadge: {
    backgroundColor: '#E8F5E9', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#C8E6C9',
  },
  crowdBadgeText: { fontSize: 13, color: '#2E7D32', fontWeight: 'bold' },
});
