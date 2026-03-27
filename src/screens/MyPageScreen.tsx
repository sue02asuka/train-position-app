import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { supabase } from '../config/supabase';

interface UserData {
  nickname: string | null;
  points: number;
  badges: string[];
}

const BADGE_ICONS: Record<string, string> = {
  '見習い駅員': '🥉',
  'ベテラン駅員': '🥈',
  '駅長': '🥇',
  '路線マスター': '🗾',
};

const ALL_BADGES = [
  { name: '見習い駅員', condition: '投稿承認 1件' },
  { name: 'ベテラン駅員', condition: '投稿承認 10件' },
  { name: '駅長', condition: '投稿承認 50件' },
  { name: '路線マスター', condition: '全駅を投稿' },
];

export default function MyPageScreen() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [email, setEmail] = useState('');
  const [approvedCount, setApprovedCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');

      const { data } = await supabase
        .from('users')
        .select('nickname, points, badges')
        .eq('id', user.id)
        .single();
      setUserData(data ?? { nickname: null, points: 0, badges: [] });

      const { count } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'approved');
      setApprovedCount(count ?? 0);
    };
    load();
  }, []);

  const handleLogout = async () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  const hasBadge = (name: string) => userData?.badges?.includes(name) ?? false;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 マイページ</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ポイントカード */}
        <View style={styles.card}>
          <Text style={styles.email}>{email}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData?.points ?? 0}</Text>
              <Text style={styles.statLabel}>ポイント</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{approvedCount}</Text>
              <Text style={styles.statLabel}>承認済み投稿</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData?.badges?.length ?? 0}</Text>
              <Text style={styles.statLabel}>バッジ</Text>
            </View>
          </View>
        </View>

        {/* バッジ一覧 */}
        <Text style={styles.sectionTitle}>バッジ</Text>
        <View style={styles.badgeGrid}>
          {ALL_BADGES.map((badge) => {
            const earned = hasBadge(badge.name);
            return (
              <View key={badge.name} style={[styles.badgeCard, !earned && styles.badgeCardLocked]}>
                <Text style={[styles.badgeIcon, !earned && styles.badgeIconLocked]}>
                  {BADGE_ICONS[badge.name]}
                </Text>
                <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]}>{badge.name}</Text>
                <Text style={styles.badgeCondition}>{badge.condition}</Text>
              </View>
            );
          })}
        </View>

        {/* ログアウト */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>ログアウト</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scroll: { padding: 16, gap: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  email: { fontSize: 13, color: '#999', marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#4CAF50' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: '#eee' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 16,
    alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  badgeCardLocked: { backgroundColor: '#f9f9f9', opacity: 0.6 },
  badgeIcon: { fontSize: 36 },
  badgeIconLocked: { filter: 'grayscale(1)' } as any,
  badgeName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  badgeNameLocked: { color: '#aaa' },
  badgeCondition: { fontSize: 11, color: '#999', textAlign: 'center' },
  logoutButton: {
    backgroundColor: '#fff', borderRadius: 8, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#ddd',
  },
  logoutText: { color: '#f44336', fontSize: 16 },
});
