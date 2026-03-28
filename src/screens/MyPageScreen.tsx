import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { supabase } from '../config/supabase';
import TrainDiagram from '../components/TrainDiagram';
import stationsData from '../data/tokaido.json';

// 駅ID → 漢字駅名 のマップ
const stationNameMap: Record<string, string> = {};
// 方面ID → 漢字方面名 のマップ
const directionNameMap: Record<string, string> = {};
(stationsData as any).stations.forEach((s: any) => {
  stationNameMap[s.stationId] = s.stationName;
  s.directions.forEach((d: any) => {
    directionNameMap[d.directionId] = d.directionName;
  });
});

interface UserData {
  nickname: string | null;
  points: number;
  badges: string[];
}

interface Submission {
  id: string;
  station_id: string;
  direction_id: string;
  cars: number;
  status: string;
  created_at: string;
  facilities: { type: string; car: number; door: number; name: string }[];
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
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  // 展開中の投稿カードID（1件のみ展開）
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc('get_my_is_admin').then(({ data }) => setIsAdmin(data === true));
  }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email ?? '');
    setUserId(user.id);

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

    const { data: subs } = await supabase
      .from('submissions')
      .select('id, station_id, direction_id, cars, status, created_at, facilities')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setSubmissions(subs ?? []);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (sub: Submission) => {
    const refundPoints = sub.status === 'approved' ? 60 : 10;
    // 管理者はポイント変動なし
    const msg = isAdmin
      ? `この投稿を取り消しますか？\n（${sub.station_id} ${sub.direction_id} ${sub.cars}両）`
      : `この投稿を取り消しますか？\n（${sub.station_id} ${sub.direction_id} ${sub.cars}両）\n\n⚠️ ${refundPoints}ポイント返却されます。`;

    const confirm = typeof window !== 'undefined'
      ? window.confirm(msg)
      : await new Promise<boolean>((resolve) =>
          Alert.alert('投稿を取り消す', msg, [
            { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
            { text: '取り消す', style: 'destructive', onPress: () => resolve(true) },
          ])
        );

    if (!confirm) return;

    // 即座にリストから削除（楽観的更新）
    setSubmissions(prev => prev.filter(s => s.id !== sub.id));

    const { error } = await supabase.from('submissions').delete().eq('id', sub.id);
    if (error) {
      // 失敗したら元に戻す
      setSubmissions(prev => [...prev, sub].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      Alert.alert('エラー', error.message);
      return;
    }

    if (!isAdmin) {
      // 一般ユーザーのみポイントを返却
      await supabase.rpc('decrement_points', { uid: userId, amount: refundPoints });
    }

    // ポイントのみ再取得（投稿リストは再取得しない）
    const { data } = await supabase
      .from('users')
      .select('nickname, points, badges')
      .eq('id', userId)
      .single();
    if (data) setUserData(data);

    const successMsg = isAdmin
      ? '投稿を取り消しました。'
      : `投稿を取り消しました。${refundPoints}ポイント返却されました。`;
    if (typeof window !== 'undefined') window.alert(successMsg);
    else Alert.alert('完了', successMsg);
  };

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

        {/* 投稿履歴 */}
        <Text style={styles.sectionTitle}>投稿履歴</Text>
        {submissions.length === 0 ? (
          <Text style={styles.emptyText}>投稿がまだありません</Text>
        ) : (
          submissions.map((sub) => {
            const isExpanded = expandedId === sub.id;
            return (
              <TouchableOpacity
                key={sub.id}
                style={styles.subCard}
                onPress={() => setExpandedId(isExpanded ? null : sub.id)}
                activeOpacity={0.85}
              >
                {/* カードヘッダー（常に表示） */}
                <View style={styles.subHeader}>
                  <View style={styles.subInfo}>
                    <View style={[styles.statusBadge,
                      sub.status === 'approved' ? styles.statusApproved : styles.statusPending
                    ]}>
                      <Text style={styles.statusText}>
                        {sub.status === 'approved' ? '✅ 承認済' : '⏳ 審査中'}
                      </Text>
                    </View>
                    <Text style={styles.subStationName}>
                      {stationNameMap[sub.station_id] ?? sub.station_id}
                    </Text>
                    <Text style={styles.subTitle}>
                      {directionNameMap[sub.direction_id] ?? sub.direction_id} › {sub.cars}両
                    </Text>
                    {sub.facilities?.[0] && (
                      <Text style={styles.subDetail}>
                        {sub.facilities[0].car}号車 {sub.facilities[0].door}番目ドア・{sub.facilities[0].name}
                      </Text>
                    )}
                    <Text style={styles.subDate}>
                      {new Date(sub.created_at).toLocaleDateString('ja-JP')}
                    </Text>
                  </View>
                  <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                </View>

                {/* 展開エリア：車両図＋取り消しボタン */}
                {isExpanded && (
                  <View style={styles.subExpanded}>
                    <TrainDiagram
                      totalCars={sub.cars}
                      facilities={sub.facilities}
                      compact
                    />
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleDelete(sub);
                      }}
                    >
                      <Text style={styles.deleteText}>🗑 この投稿を取り消す</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}

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
  badgeIconLocked: { opacity: 0.3 },
  badgeName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  badgeNameLocked: { color: '#aaa' },
  badgeCondition: { fontSize: 11, color: '#999', textAlign: 'center' },
  logoutButton: {
    backgroundColor: '#fff', borderRadius: 8, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#ddd',
  },
  logoutText: { color: '#f44336', fontSize: 16 },
  emptyText: { color: '#aaa', textAlign: 'center', paddingVertical: 16 },
  subCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  subHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  subInfo: { flex: 1, gap: 4 },
  expandIcon: { fontSize: 12, color: '#aaa', marginLeft: 8 },
  subExpanded: {
    marginTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 },
  statusApproved: { backgroundColor: '#E8F5E9' },
  statusPending: { backgroundColor: '#FFF8E1' },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  subStationName: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 2 },
  subTitle: { fontSize: 13, color: '#666' },
  subDetail: { fontSize: 12, color: '#666' },
  subDate: { fontSize: 11, color: '#aaa' },
  deleteButton: {
    backgroundColor: '#FFF3F3', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#FFCDD2', alignItems: 'center',
  },
  deleteText: { color: '#f44336', fontSize: 13, fontWeight: 'bold' },
});
