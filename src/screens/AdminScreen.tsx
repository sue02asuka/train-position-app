import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

type AdminTab = 'submissions' | 'users' | 'formations';
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
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<AdminTab>('submissions');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [pointInputs, setPointInputs] = useState<Record<string, string>>({});

  // ===== 選択モード =====
  // ===== 選択モード =====
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ===== 初期データ管理 =====
  // JSONから施設データがある編成を全て抽出
  const allFormations = (() => {
    const list: { stationId: string; stationName: string; directionId: string; directionName: string; cars: number; label: string }[] = [];
    (stationsData as any).stations.forEach((s: any) => {
      s.directions.forEach((d: any) => {
        d.formations.forEach((f: any) => {
          if (f.facilities && f.facilities.length > 0) {
            list.push({
              stationId: s.stationId, stationName: s.stationName,
              directionId: d.directionId, directionName: d.directionName,
              cars: f.cars, label: f.label,
            });
          }
        });
      });
    });
    return list;
  })();
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const formationKey = (stationId: string, directionId: string, cars: number) =>
    `${stationId}__${directionId}__${cars}`;

  const loadHiddenFormations = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('hidden_formations').select('station_id, direction_id, cars');
    if (error) Alert.alert('取得エラー', error.message);
    const keys = new Set((data ?? []).map((r: any) => formationKey(r.station_id, r.direction_id, r.cars)));
    setHiddenKeys(keys);
    setLoading(false);
  };

  const handleToggleFormation = async (f: typeof allFormations[0]) => {
    const key = formationKey(f.stationId, f.directionId, f.cars);
    const isHidden = hiddenKeys.has(key);
    if (isHidden) {
      // 復元
      const { error } = await supabase.from('hidden_formations').delete()
        .eq('station_id', f.stationId).eq('direction_id', f.directionId).eq('cars', f.cars);
      if (error) { Alert.alert('エラー', error.message); return; }
      setHiddenKeys(prev => { const next = new Set(prev); next.delete(key); return next; });
    } else {
      // 非表示
      const { error } = await supabase.from('hidden_formations')
        .insert({ station_id: f.stationId, direction_id: f.directionId, cars: f.cars });
      if (error) { Alert.alert('エラー', error.message); return; }
      setHiddenKeys(prev => new Set([...prev, key]));
    }
  };

  const handleHideAll = () => {
    const visibleCount = allFormations.filter(f => !hiddenKeys.has(formationKey(f.stationId, f.directionId, f.cars))).length;
    if (visibleCount === 0) return;
    Alert.alert('全件非表示', `初期データ ${visibleCount} 件をすべてホームから非表示にしますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '非表示にする', style: 'destructive', onPress: async () => {
        const rows = allFormations
          .filter(f => !hiddenKeys.has(formationKey(f.stationId, f.directionId, f.cars)))
          .map(f => ({ station_id: f.stationId, direction_id: f.directionId, cars: f.cars }));
        const { error } = await supabase.from('hidden_formations').insert(rows);
        if (error) { Alert.alert('エラー', error.message); return; }
        setHiddenKeys(new Set(allFormations.map(f => formationKey(f.stationId, f.directionId, f.cars))));
        Alert.alert('完了', `${visibleCount}件を非表示にしました。`);
      }},
    ]);
  };

  // 選択モード終了時にリセット
  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  // フィルター切り替え時に選択モードをリセット
  const changeFilter = (s: StatusFilter) => {
    exitSelectionMode();
    setStatusFilter(s);
  };

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
    exitSelectionMode();
    if (tab === 'submissions') loadSubmissions();
    else if (tab === 'users') loadUsers();
    else if (tab === 'formations') loadHiddenFormations();
  }, [tab, statusFilter]);

  // ===== 承認 =====
  const handleApprove = async (sub: AdminSubmission) => {
    const { error } = await supabase.rpc('admin_approve_submission', {
      p_submission_id: sub.id,
    });
    if (error) { Alert.alert('エラー', error.message); return; }
    setSubmissions(prev => prev.filter(s => s.id !== sub.id));
    Alert.alert('承認完了', '投稿を承認しました。投稿者に +50pt 付与しました。');
  };

  // ===== 却下 =====
  const handleReject = async (sub: AdminSubmission) => {
    const { error } = await supabase.rpc('admin_reject_submission', {
      p_submission_id: sub.id,
    });
    if (error) { Alert.alert('エラー', error.message); return; }
    setSubmissions(prev => prev.filter(s => s.id !== sub.id));
  };

  // ===== 1件削除 =====
  const handleDelete = (sub: AdminSubmission) => {
    Alert.alert('削除確認', 'この投稿を完全に削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する', style: 'destructive', onPress: async () => {
          const { error } = await supabase.rpc('admin_delete_submission', {
            p_submission_id: sub.id,
          });
          if (error) { Alert.alert('エラー', error.message); return; }
          setSubmissions(prev => prev.filter(s => s.id !== sub.id));
        },
      },
    ]);
  };

  // ===== 選択切り替え =====
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ===== 選択削除 =====
  const handleDeleteSelected = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    Alert.alert(
      '選択削除',
      `選択した ${count} 件を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: `${count}件を削除`, style: 'destructive', onPress: async () => {
            const ids = Array.from(selectedIds);
            const { error } = await supabase.rpc('admin_delete_submissions_by_ids', {
              p_ids: ids,
            });
            if (error) { Alert.alert('エラー', error.message); return; }
            setSubmissions(prev => prev.filter(s => !selectedIds.has(s.id)));
            exitSelectionMode();
            Alert.alert('完了', `${count}件を削除しました。`);
          },
        },
      ],
    );
  };

  // ===== 全件削除 =====
  const handleDeleteAll = () => {
    const count = submissions.length;
    if (count === 0) return;
    Alert.alert(
      '全件削除',
      `${STATUS_LABEL[statusFilter]} の投稿 ${count} 件をすべて削除しますか？\nこの操作は元に戻せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '全件削除する', style: 'destructive', onPress: async () => {
            const { error } = await supabase.rpc('admin_delete_submissions_by_status', {
              p_status: statusFilter,
            });
            if (error) { Alert.alert('エラー', error.message); return; }
            setSubmissions([]);
            exitSelectionMode();
            Alert.alert('完了', `${count}件をすべて削除しました。`);
          },
        },
      ],
    );
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
    Alert.alert('更新完了', `${user.nickname ?? 'ユーザー'} のポイントを ${Math.max(0, val)}pt に設定しました。`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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
        <TouchableOpacity
          style={[styles.tabButton, tab === 'formations' && styles.tabButtonActive]}
          onPress={() => setTab('formations')}
        >
          <Text style={[styles.tabText, tab === 'formations' && styles.tabTextActive]}>
            🗂 初期データ
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
                onPress={() => changeFilter(s)}
              >
                <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>
                  {STATUS_LABEL[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 操作ツールバー */}
          {!loading && submissions.length > 0 && (
            <View style={styles.toolbarRow}>
              {selectionMode ? (
                <>
                  {/* 選択モード中 */}
                  <Text style={styles.selectedCount}>
                    {selectedIds.size}件選択中
                  </Text>
                  <View style={styles.toolbarButtons}>
                    <TouchableOpacity
                      style={styles.toolbarBtn}
                      onPress={() => {
                        // 全選択 / 全解除
                        if (selectedIds.size === submissions.length) {
                          setSelectedIds(new Set());
                        } else {
                          setSelectedIds(new Set(submissions.map(s => s.id)));
                        }
                      }}
                    >
                      <Text style={styles.toolbarBtnText}>
                        {selectedIds.size === submissions.length ? '全解除' : '全選択'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toolbarBtn, styles.toolbarBtnDanger, selectedIds.size === 0 && styles.toolbarBtnDisabled]}
                      onPress={handleDeleteSelected}
                      disabled={selectedIds.size === 0}
                    >
                      <Text style={[styles.toolbarBtnText, styles.toolbarBtnTextDanger]}>
                        🗑 選択削除 ({selectedIds.size})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarBtn} onPress={exitSelectionMode}>
                      <Text style={styles.toolbarBtnText}>キャンセル</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  {/* 通常モード */}
                  <View style={styles.toolbarButtons}>
                    <TouchableOpacity
                      style={styles.toolbarBtn}
                      onPress={() => setSelectionMode(true)}
                    >
                      <Text style={styles.toolbarBtnText}>☑ 選択モード</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toolbarBtn, styles.toolbarBtnDanger]}
                      onPress={handleDeleteAll}
                    >
                      <Text style={[styles.toolbarBtnText, styles.toolbarBtnTextDanger]}>
                        🗑 全件削除 ({submissions.length})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E65100" />
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {submissions.length === 0 && (
                <Text style={styles.emptyText}>該当する投稿はありません</Text>
              )}
              {submissions.map((sub) => {
                const isSelected = selectedIds.has(sub.id);
                // 投稿情報の中身（選択モード・通常モード共通）
                const cardContent = (
                  <View style={styles.subCardInner}>
                    {/* チェックボックス（選択モード時のみ） */}
                    {selectionMode && (
                      <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                    )}
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
                  </View>
                );

                return (
                  // ★ 外側は常にView。ネストされたTouchableOpacity問題を回避
                  <View key={sub.id} style={[styles.subCard, isSelected && styles.subCardSelected]}>
                    {selectionMode ? (
                      // 選択モード：カード全体をタップで選択
                      <TouchableOpacity onPress={() => toggleSelect(sub.id)} activeOpacity={0.7}>
                        {cardContent}
                      </TouchableOpacity>
                    ) : (
                      // 通常モード：タップ不要、そのまま表示
                      cardContent
                    )}

                    {/* 操作ボタン（通常モード時のみ・ViewのためTouchableOpacityが正常動作） */}
                    {!selectionMode && (
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
                    )}
                  </View>
                );
              })}
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
      {/* ===== 初期データ管理タブ ===== */}
      {tab === 'formations' && (
        loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E65100" />
        ) : (
          <>
            {/* 全件非表示ボタン */}
            <View style={styles.formationToolbar}>
              <Text style={styles.formationToolbarInfo}>
                表示中: {allFormations.filter(f => !hiddenKeys.has(formationKey(f.stationId, f.directionId, f.cars))).length} /
                全 {allFormations.length} 件
              </Text>
              <TouchableOpacity style={[styles.toolbarBtn, styles.toolbarBtnDanger]} onPress={handleHideAll}>
                <Text style={[styles.toolbarBtnText, styles.toolbarBtnTextDanger]}>🗑 全件非表示</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.list}>
              {allFormations.map((f) => {
                const key = formationKey(f.stationId, f.directionId, f.cars);
                const isHidden = hiddenKeys.has(key);
                return (
                  <View key={key} style={[styles.formationCard, isHidden && styles.formationCardHidden]}>
                    <View style={styles.formationInfo}>
                      <Text style={[styles.formationStation, isHidden && styles.formationTextHidden]}>
                        {f.stationName}
                      </Text>
                      <Text style={[styles.formationMeta, isHidden && styles.formationTextHidden]}>
                        {f.directionName} · {f.label}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.toggleBtn, isHidden ? styles.toggleBtnHidden : styles.toggleBtnVisible]}
                      onPress={() => handleToggleFormation(f)}
                    >
                      <Text style={styles.toggleBtnText}>
                        {isHidden ? '🚫 非表示中' : '✅ 表示中'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </>
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#37474F', paddingHorizontal: 16, paddingBottom: 12,
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

  // ツールバー
  toolbarRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#ECEFF1', borderBottomWidth: 1, borderBottomColor: '#ddd',
  },
  selectedCount: { fontSize: 13, fontWeight: 'bold', color: '#37474F' },
  toolbarButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 },
  toolbarBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc',
  },
  toolbarBtnDanger: { borderColor: '#EF9A9A', backgroundColor: '#FFEBEE' },
  toolbarBtnDisabled: { opacity: 0.4 },
  toolbarBtnText: { fontSize: 12, color: '#555', fontWeight: 'bold' },
  toolbarBtnTextDanger: { color: '#C62828' },

  list: { padding: 12, gap: 10 },
  emptyText: { textAlign: 'center', color: '#aaa', paddingTop: 40, fontSize: 15 },

  // 投稿カード
  subCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    gap: 10, borderWidth: 2, borderColor: 'transparent',
  },
  subCardSelected: {
    borderColor: '#1565C0', backgroundColor: '#E3F2FD',
  },
  subCardInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#90A4AE',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  checkboxChecked: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  subInfo: { flex: 1, gap: 3 },
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

  // 初期データ管理
  formationToolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#ECEFF1', borderBottomWidth: 1, borderBottomColor: '#ddd',
  },
  formationToolbarInfo: { fontSize: 13, color: '#555' },
  formationCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  formationCardHidden: { backgroundColor: '#F5F5F5', opacity: 0.7 },
  formationInfo: { flex: 1, gap: 3 },
  formationStation: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  formationMeta: { fontSize: 12, color: '#666' },
  formationTextHidden: { color: '#aaa' },
  toggleBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, alignItems: 'center', minWidth: 90,
  },
  toggleBtnVisible: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  toggleBtnHidden: { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' },
  toggleBtnText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
});
