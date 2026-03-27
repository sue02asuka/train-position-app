import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView,
} from 'react-native';
import type { Station, Direction, Formation } from '../types/station';
import stationsData from '../data/tokaido.json';
import ResultScreen from './ResultScreen';

const stations: Station[] = stationsData as Station[];

type Step = 'station' | 'direction' | 'formation' | 'result';

export default function HomeScreen() {
  const [step, setStep] = useState<Step>('station');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<Direction | null>(null);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);

  const reset = () => {
    setStep('station');
    setSelectedStation(null);
    setSelectedDirection(null);
    setSelectedFormation(null);
  };

  if (step === 'result' && selectedStation && selectedDirection && selectedFormation) {
    return (
      <ResultScreen
        station={selectedStation}
        direction={selectedDirection}
        formation={selectedFormation}
        onBack={reset}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚃 乗車位置ガイド</Text>
        {step !== 'station' && (
          <TouchableOpacity onPress={reset}>
            <Text style={styles.resetText}>最初から</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ステップ表示 */}
      <View style={styles.stepBar}>
        {['駅', '方面', '編成'].map((label, i) => {
          const stepKeys: Step[] = ['station', 'direction', 'formation'];
          const active = step === stepKeys[i];
          const done = stepKeys.indexOf(step) > i;
          return (
            <View key={label} style={styles.stepItem}>
              <View style={[styles.stepCircle, done && styles.stepDone, active && styles.stepActive]}>
                <Text style={[styles.stepNum, (done || active) && styles.stepNumActive]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
            </View>
          );
        })}
      </View>

      {/* 選択済み情報 */}
      {selectedStation && (
        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbText}>
            {selectedStation.stationName}
            {selectedDirection ? ` › ${selectedDirection.directionName}` : ''}
          </Text>
        </View>
      )}

      {/* リスト */}
      <ScrollView contentContainerStyle={styles.list}>
        {step === 'station' && stations.map((s) => (
          <TouchableOpacity key={s.stationId} style={styles.item} onPress={() => {
            setSelectedStation(s);
            setStep('direction');
          }}>
            <Text style={styles.itemText}>{s.stationName}</Text>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>
        ))}

        {step === 'direction' && selectedStation?.directions.map((d) => (
          <TouchableOpacity key={d.directionId} style={styles.item} onPress={() => {
            setSelectedDirection(d);
            setStep('formation');
          }}>
            <Text style={styles.itemText}>{d.directionName}</Text>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>
        ))}

        {step === 'formation' && selectedDirection?.formations.map((f) => (
          <TouchableOpacity key={f.cars} style={styles.item} onPress={() => {
            setSelectedFormation(f);
            setStep('result');
          }}>
            <Text style={styles.itemText}>{f.label}</Text>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#E65100', paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  resetText: { color: '#fff', fontSize: 14 },
  stepBar: {
    flexDirection: 'row', justifyContent: 'center', gap: 32,
    backgroundColor: '#fff', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#ddd', alignItems: 'center', justifyContent: 'center',
  },
  stepActive: { backgroundColor: '#E65100' },
  stepDone: { backgroundColor: '#4CAF50' },
  stepNum: { fontSize: 13, fontWeight: 'bold', color: '#999' },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 11, color: '#999' },
  stepLabelActive: { color: '#E65100', fontWeight: 'bold' },
  breadcrumb: {
    backgroundColor: '#FFF3E0', paddingHorizontal: 16, paddingVertical: 8,
  },
  breadcrumbText: { fontSize: 13, color: '#E65100' },
  list: { padding: 12, gap: 8 },
  item: {
    backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  itemText: { fontSize: 16, color: '#333' },
  itemArrow: { fontSize: 20, color: '#ccc' },
});
