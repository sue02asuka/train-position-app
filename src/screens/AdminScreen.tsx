import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { supabase } from '../config/supabase';
import stationsData from '../data/tokaido.json';

// 駅ID → 漢字駅名 / 方面ID → 漢字方面名 のマップ
const stationNameMap: Record<string, string> = {};
const directionNameMap: Record<string, string> = {};
(stationsData as any).stations.forEach((s: any) => {
  stationNameMap[s.stationId] = s.stationName;
  s.directions.forEach((d: any) => {
    directionNameMap[d.directionId] = d.directionName;
  });
});

type AdminTab = 'submissions' | 'users';
type StatusFilter = 'pending' | 'approved' | 'rejected';

interface AdminSubmission {
  id: string;
  station_id: string;
  direction_id: string;
  cars: number;
  facilities: { type: string; car: number; door: number; name: string }[];
  status: string;
  created_at: string;
  user_id: string;
  users: { nickname: string | null } | null;
}

interface AdminUser {
  id: string;
  nickname: string | null;
  points: number;
  badges: string[];
}

const STATUS_LABEL: Record<StatusFilter, string> = {
  pending: '⏳ 審査中',
  approved: '✅ 承認済',
  rejected: '❌ 却下',
};

export default function AdminScreen() {
  const [tab, setTab] = useState<AdminTab>('submissions');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [pointInputs, setPointInputs] = useState<Record<string, string>>({});

  // ===== 投稿一覧取得 =====
  const loadSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('submissions')
      .select('*, users(nickname)')
      .eq('status', statusFilter)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) Alert.alert('取得エラー', error.message);
    setSubmissions((data as AdminSubmission[]) ?? []);
    setLoading(false);
  };

  // ===== ユーザー一覧取得 =====
  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('id, nickname, points, badges')
      .order('points', { ascending: false })
      .limit(100);
    if (error) Alert.alert('取得エラー', error.message);
    setUsers((data as AdminUser[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (tab === 'submissions') loadSubmissions();
    else loadUsers();
  }, [tab, statusFilter]);

  // ===== 承認 =====
  const handleApprove = async (sub: AdminSubmission) => {
    const { error } = await supabase.rpc('admin_approve_submission', {
      p_submission_id: sub.id,
    });
    if (error) { Alert.alert('エラー', error.message); return; }
    setSubmissions(prev => prev.filter(s => s.id !== sub.id));
    const msg = '投稿を承認しました。投稿者に +50pt 付与しました。';
    if (typeof window !== 'undefined') window.alert(msg);
    else Alert.alert('承認完了', msg);
  };

  // ===== 却下 =====
  const handleReject = async (sub: AdminSubmission) => {
    const { error } = await supabase.rpc('admin_reject_submission', {
      p_submission_id: sub.id,
    });
    if (error) { Alert.alert('エラー', error.message); return; }
    setSubmissions(prev => prev.filter(s => s.id !== sub.id));
  };

  // ===== 削除 =====
  const handleDelete = (sub: AdminSubmission) => {
    const msg = 'この投稿を完全に削除しますか？';
    const doDelete = async () => {
      // SECURITY DEFINER関数でRLSをバイパスして削除
      const { error } = await supabase.rpc('admin_delete_submission', {
        p_submission_id: sub.id,
      });
      if (error) { Alert.alert('エラー', error.message); return; }
      setSubmissions(prev => prev.filter(s => s.id !== sub.id));
    };
    Alert.alert('削除確認', msg, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除する', style: 'destructive', onPress: doDelete },
    ]);
  };

  // ===== ポイント設定 =====
  const handleSetPoints = async (user: AdminUser) => {
    const val = parseInt(pointInputs[user.id] ?? '');
    if (isNaN(val)) {
      Alert.alert('入力エラー', '数値を入力してください');
      return;
    }
    const { error } = await supabase.rpc('admin_set_points', {
      p_uid: user.id,
      p_points: val,
    });
    if (error) { Alert.alert('エラー', error.message); return; }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, points: Math.max(0, val) } : u));
    setPointInputs(prev => ({ ...prev, [user.id]: '' }));
    const msg = `${user.nickname ?? 'ユーザー'} のポイントを ${Math.max(0, val)}pt に設定しました。`;
    if (typeof window !== 'undefined') window.alert(msg);
    else Alert.alert('更新完了', msg);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔧 管理者画面</Text>
      </View>

      {/* タブ切り替え */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'submissions' && styles.tabButtonActive]}
          onPress={() => setTab('submissions')}
        >
          <Text style={[styles.tabText, tab === 'submissions' && styles.tabTextActive]}>
            📋 投稿審査
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'users' && styles.tabButtonActive]}
          onPress={() => setTab('users')}
        >
          <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>
            👥 ユーザー管理
          </Text>
        </TouchableOpacity>
      </View>

      {/* ===== 投稿審査タブ ===== */}
      {tab === 'submissions' && (
        <>
          {/* ステータスフィルター */}
          <View style={styles.filterRow}>
            {(['pending', 'approved', 'rejected'] as StatusFilter[]).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.filterButton, statusFilter === s && styles.filterButtonActive]}
                onPress={() => setStatusFilter(s)}
              >
                <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>
                  {STATUS_LABEL[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E65100" />
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {submissions.length === 0 && (
                <Text style={styles.emptyText}>該当する投稿はありません</Text>
              )}
              {submissions.map((sub) => (
                <View key={sub.id} style={styles.subCard}>
                  {/* 投稿情報 */}
                  <View style={styles.subInfo}>
                    <Text style={styles.subStation}>
                      {stationNameMap[sub.station_id] ?? sub.station_id}
                    </Text>
                    <Text style={styles.subMeta}>
                      {directionNameMap[sub.direction_id] ?? sub.direction_id} › {sub.cars}両
                    </Text>
                    {sub.facilities?.[0] && (
                      <Text style={styles.subFacility}>
                        {sub.facilities[0].car}号車 {sub.facilities[0].door}番目ドア・{sub.facilities[0].name}
                      </Text>
                    )}
                    <Text style={styles.subUser}>
                      投稿者: {sub.users?.nickname ?? '（未設定）'}
                    </Text>
                    <Text style={styles.subDate}>
                      {new Date(sub.created_at).toLocaleDateString('ja-JP')}
                    </Text>
                  </View>

                  {/* 操作ボタン */}
                  <View style={styles.actionButtons}>
                    {sub.status === 'pending' && (
                      <>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.approveBtn]}
                          onPress={() => handleApprove(sub)}
                        >
                          <Text style={styles.actionBtnText}>✅ 承認</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.rejectBtn]}
                          onPress={() => handleReject(sub)}
                        >
                          <Text style={styles.actionBtnText}>❌ 却下</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={() => handleDelete(sub)}
                    >
                      <Text style={styles.actionBtnText}>🗑 削除</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* ===== ユーザー管理タブ ===== */}
      {tab === 'users' && (
        loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E65100" />
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {users.length === 0 && (
              <Text style={styles.emptyText}>ユーザーがいません</Text>
            )}
            {users.map((user) => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.nickname ?? '（未設定）'}</Text>
                  <Text style={styles.userPoints}>🏆 {user.points} pt</Text>
                  {user.badges?.length > 0 && (
                    <Text style={styles.userBadges}>
                      バッジ: {user.badges.join(' · ')}
                    </Text>
                  )}
                </View>
                {/* ポイント設定 */}
                <View style={styles.pointRow}>
                  <TextInput
                    style={styles.pointInput}
                    placeholder="新しいpt"
                    keyboardType="numeric"
                    value={pointInputs[user.id] ?? ''}
                    onChangeText={(v) => setPointInputs(prev => ({ ...prev, [user.id]: v }))}
                  />
                  <TouchableOpacity
                    style={styles.pointBtn}
                    onPress={() => handleSetPoints(user)}
                  >
                    <Text style={styles.pointBtnText}>設定</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#37474F', paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  tabButton: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabButtonActive: { borderBottomColor: '#37474F' },
  tabText: { fontSize: 14, color: '#999' },
  tabTextActive: { color: '#37474F', fontWeight: 'bold' },
  filterRow: {
    flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  filterButton: {
    flex: 1, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f0f0f0', alignItems: 'center',
  },
  filterButtonActive: { backgroundColor: '#37474F' },
  filterText: { fontSize: 12, color: '#666' },
  filterTextActive: { color: '#fff', fontWeight: 'bold' },
  list: { padding: 12, gap: 10 },
  emptyText: { textAlign: 'center', color: '#aaa', paddingTop: 40, fontSize: 15 },

  // 投稿カード
  subCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    gap: 10,
  },
  subInfo: { gap: 3 },
  subStation: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  subMeta: { fontSize: 13, color: '#555' },
  subFacility: { fontSize: 12, color: '#666' },
  subUser: { fontSize: 12, color: '#999', marginTop: 2 },
  subDate: { fontSize: 11, color: '#bbb' },
  actionButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
  },
  approveBtn: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7' },
  rejectBtn: { backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FFE082' },
  deleteBtn: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2' },
  actionBtnText: { fontSize: 13, fontWeight: 'bold', color: '#333' },

  // ユーザーカード
  userCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    gap: 10,
  },
  userInfo: { gap: 3 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  userPoints: { fontSize: 14, color: '#E65100' },
  userBadges: { fontSize: 12, color: '#888' },
  pointRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pointInput: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, backgroundColor: '#fafafa',
  },
  pointBtn: {
    backgroundColor: '#37474F', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  pointBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});
