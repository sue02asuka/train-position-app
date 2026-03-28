import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES, type Route } from '../data/routes';

interface Props {
  onSelectRoute: (route: Route) => void;
}

export default function RouteSelectScreen({ onSelectRoute }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>🚉 JR東海 乗車位置ガイド</Text>
        <Text style={styles.headerSub}>路線を選択してください</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {ROUTES.map((route) => {
          const isAvailable = route.status === 'available';
          return (
            <TouchableOpacity
              key={route.routeId}
              style={[styles.card, !isAvailable && styles.cardDisabled]}
              onPress={() => isAvailable && onSelectRoute(route)}
              activeOpacity={isAvailable ? 0.7 : 1}
            >
              {/* ラインカラー帯 */}
              <View style={[styles.colorBar, { backgroundColor: route.color }]} />

              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <Text style={styles.icon}>{route.icon}</Text>
                  <View>
                    <Text style={[styles.routeName, !isAvailable && styles.textDisabled]}>
                      {route.routeName}
                    </Text>
                    <Text style={[styles.routeKana, !isAvailable && styles.textDisabled]}>
                      {route.routeNameKana}
                    </Text>
                    <Text style={[styles.section, !isAvailable && styles.textDisabled]}>
                      {route.section}
                    </Text>
                  </View>
                </View>

                {isAvailable ? (
                  <Text style={styles.arrow}>›</Text>
                ) : (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>近日公開</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#E65100',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#FFCCBC', fontSize: 13, marginTop: 4 },
  list: { padding: 12, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardDisabled: { opacity: 0.6 },
  colorBar: { width: 6 },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 28 },
  routeName: { fontSize: 17, fontWeight: 'bold', color: '#222' },
  routeKana: { fontSize: 11, color: '#888', marginTop: 1 },
  section: { fontSize: 12, color: '#666', marginTop: 3 },
  textDisabled: { color: '#aaa' },
  arrow: { fontSize: 24, color: '#ccc' },
  badge: {
    backgroundColor: '#EEE',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, color: '#888', fontWeight: 'bold' },
});
