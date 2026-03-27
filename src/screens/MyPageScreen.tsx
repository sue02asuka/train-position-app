import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../config/supabase';

interface UserData {
  nickname: string | null;
  points: number;
}

export default function MyPageScreen() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');
      const { data } = await supabase.from('users').select('nickname, points').eq('id', user.id).single();
      setUserData(data ?? { nickname: null, points: 0 });
    };
    load();
  }, []);

  const handleLogout = async () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 マイページ</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.email}>{email}</Text>
        <View style={styles.pointsRow}>
          <Text style={styles.pointsLabel}>累計ポイント</Text>
          <Text style={styles.points}>{userData?.points ?? 0} pt</Text>
        </View>
      </View>

      <View style={styles.badgeSection}>
        <Text style={styles.sectionTitle}>バッジ</Text>
        <Text style={styles.badgeHint}>投稿が承認されるとバッジを獲得できます</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>ログアウト</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  card: {
    backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  email: { fontSize: 14, color: '#666', marginBottom: 16 },
  pointsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pointsLabel: { fontSize: 16, color: '#333' },
  points: { fontSize: 28, fontWeight: 'bold', color: '#4CAF50' },
  badgeSection: { marginHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  badgeHint: { fontSize: 14, color: '#999' },
  logoutButton: {
    margin: 16, marginTop: 'auto', backgroundColor: '#fff', borderRadius: 8,
    paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ddd',
  },
  logoutText: { color: '#f44336', fontSize: 16 },
});
