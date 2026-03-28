import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { supabase } from '../config/supabase';
import type { Station, Direction, FacilityType } from '../types/station';
import stationsData from '../data/tokaido.json';

const stations: Station[] = (stationsData as any).stations as Station[];

const FACILITY_OPTIONS: { type: FacilityType; label: string; icon: string }[] = [
  { type: 'stairs', label: '階段', icon: '🪜' },
  { type: 'escalator', label: 'エスカレーター', icon: '↕️' },
  { type: 'elevator', label: 'エレベーター', icon: '🛗' },
];

type Step = 'station' | 'direction' | 'formation' | 'facility';

export default function PostScreen() {
  const [step, setStep] = useState<Step>('station');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<Direction | null>(null);
  const [selectedCars, setSelectedCars] = useState<number | null>(null);
  const [facilityType, setFacilityType] = useState<FacilityType>('stairs');
  const [facilityName, setFacilityName] = useState('');
  const [car, setCar] = useState(1);
  const [door, setDoor] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep('station');
    setSelectedStation(null);
    setSelectedDirection(null);
    setSelectedCars(null);
    setFacilityType('stairs');
    setFacilityName('');
    setCar(1);
    setDoor(1);
  };

  const handleSubmit = async () => {
    if (!selectedStation || !selectedDirection || !selectedCars) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインが必要です');

      // 重複チェック: 同じユーザーが同じ駅・方面・編成に既に投稿していないか確認
      const { data: existing } = await supabase
        .from('submissions')
        .select('facilities')
        .eq('user_id', user.id)
        .eq('station_id', selectedStation.stationId)
        .eq('direction_id', selectedDirection.directionId)
        .eq('cars', selectedCars);

      if (existing && existing.length > 0) {
        // 同じ設備（号車・ドア・種類）の投稿が既にあるか確認
        const isDuplicate = existing.some((row: any) => {
          const facs = Array.isArray(row.facilities) ? row.facilities : [];
          return facs.some((f: any) =>
            f.type === facilityType && f.car === car && f.door === door
          );
        });

        if (isDuplicate) {
          const msg = `この設備はすでに投稿済みです。\n（${selectedStation.stationName} ${selectedDirection.directionName} ${selectedCars}両 ${FACILITY_OPTIONS.find(f => f.type === facilityType)?.label} ${car}号車${door}番目ドア）`;
          if (typeof window !== 'undefined') {
            window.alert(msg);
          } else {
            Alert.alert('投稿済み', msg);
          }
          return;
        }
      }

      const { error } = await supabase.from('submissions').insert({
        user_id: user.id,
        station_id: selectedStation.stationId,
        direction_id: selectedDirection.directionId,
        cars: selectedCars,
        facilities: [{ type: facilityType, name: facilityName || `${selectedStation.stationName} ${FACILITY_OPTIONS.find(f => f.type === facilityType)?.label}`, car, door }],
        status: 'pending',
      });
      if (error) throw error;

      // ポイント加算
      await supabase.rpc('increment_points', { uid: user.id, amount: 10 }).maybeSingle();

      if (typeof window !== 'undefined') {
        window.alert('投稿完了！＋10ポイント獲得しました🎉');
        reset();
      } else {
        Alert.alert('投稿完了！', '＋10ポイント獲得しました🎉', [{ text: 'OK', onPress: reset }]);
      }
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ステップ: 駅・方面・編成選択
  if (step !== 'facility') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📝 乗車位置を投稿</Text>
          {step !== 'station' && (
            <TouchableOpacity onPress={reset}><Text style={styles.resetText}>最初から</Text></TouchableOpacity>
          )}
        </View>

        {selectedStation && (
          <View style={styles.breadcrumb}>
            <Text style={styles.breadcrumbText}>
              {selectedStation.stationName}
              {selectedDirection ? ` › ${selectedDirection.directionName}` : ''}
            </Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.list}>
          {step === 'station' && stations.map((s) => (
            <TouchableOpacity key={s.stationId} style={styles.item} onPress={() => { setSelectedStation(s); setStep('direction'); }}>
              <Text style={styles.itemText}>{s.stationName}</Text>
              <Text style={styles.itemArrow}>›</Text>
            </TouchableOpacity>
          ))}
          {step === 'direction' && selectedStation?.directions.map((d) => (
            <TouchableOpacity key={d.directionId} style={styles.item} onPress={() => { setSelectedDirection(d); setStep('formation'); }}>
              <Text style={styles.itemText}>{d.directionName}</Text>
              <Text style={styles.itemArrow}>›</Text>
            </TouchableOpacity>
          ))}
          {step === 'formation' && selectedDirection?.formations.map((f) => (
            <TouchableOpacity key={f.cars} style={styles.item} onPress={() => { setSelectedCars(f.cars); setStep('facility'); }}>
              <Text style={styles.itemText}>{f.label}</Text>
              <Text style={styles.itemArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ステップ: 設備情報入力
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep('formation')}><Text style={styles.resetText}>← 戻る</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>設備情報を入力</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.breadcrumb}>
        <Text style={styles.breadcrumbText}>
          {selectedStation?.stationName} › {selectedDirection?.directionName} › {selectedCars}両
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        {/* 設備種類 */}
        <Text style={styles.label}>設備の種類</Text>
        <View style={styles.row}>
          {FACILITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.type}
              style={[styles.typeButton, facilityType === opt.type && styles.typeButtonActive]}
              onPress={() => setFacilityType(opt.type)}
            >
              <Text style={styles.typeIcon}>{opt.icon}</Text>
              <Text style={[styles.typeLabel, facilityType === opt.type && styles.typeLabelActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 号車番号 */}
        <Text style={styles.label}>号車番号（1号車が先頭）</Text>
        <View style={styles.row}>
          {Array.from({ length: selectedCars! }, (_, i) => i + 1).map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.numButton, car === n && styles.numButtonActive]}
              onPress={() => setCar(n)}
            >
              <Text style={[styles.numText, car === n && styles.numTextActive]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ドア番号 */}
        <Text style={styles.label}>ドア番号（進行方向前から）</Text>
        <View style={styles.row}>
          {[1, 2, 3].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.numButton, door === n && styles.numButtonActive]}
              onPress={() => setDoor(n)}
            >
              <Text style={[styles.numText, door === n && styles.numTextActive]}>{n}番目</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 投稿ボタン */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>投稿する（＋10pt）</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1565C0', paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resetText: { color: '#fff', fontSize: 14 },
  breadcrumb: { backgroundColor: '#E3F2FD', paddingHorizontal: 16, paddingVertical: 8 },
  breadcrumbText: { fontSize: 13, color: '#1565C0' },
  list: { padding: 12, gap: 8 },
  item: {
    backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  itemText: { fontSize: 16, color: '#333' },
  itemArrow: { fontSize: 20, color: '#ccc' },
  formContainer: { padding: 16, gap: 8 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeButton: {
    flex: 1, alignItems: 'center', padding: 12, borderRadius: 8,
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#ddd',
  },
  typeButtonActive: { borderColor: '#1565C0', backgroundColor: '#E3F2FD' },
  typeIcon: { fontSize: 24, marginBottom: 4 },
  typeLabel: { fontSize: 12, color: '#999' },
  typeLabelActive: { color: '#1565C0', fontWeight: 'bold' },
  numButton: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#ddd',
  },
  numButtonActive: { borderColor: '#1565C0', backgroundColor: '#1565C0' },
  numText: { fontSize: 14, color: '#333' },
  numTextActive: { color: '#fff', fontWeight: 'bold' },
  submitButton: {
    backgroundColor: '#1565C0', borderRadius: 8, paddingVertical: 16,
    alignItems: 'center', marginTop: 32,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
