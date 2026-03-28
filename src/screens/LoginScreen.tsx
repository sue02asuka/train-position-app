import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { supabase } from '../config/supabase';

// URLのフラグメントまたはクエリからパラメータを取得するヘルパー
function parseParams(url: string): Record<string, string> {
  const result: Record<string, string> = {};
  const fragment = url.includes('#') ? url.split('#')[1] : '';
  const query = url.includes('?') ? url.split('?')[1]?.split('#')[0] : '';
  [fragment, query].forEach(part => {
    if (!part) return;
    part.split('&').forEach(pair => {
      const [key, val] = pair.split('=');
      if (key && val) result[decodeURIComponent(key)] = decodeURIComponent(val);
    });
  });
  return result;
}

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // ディープリンクのコールバックを受け取る
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      if (url.startsWith('trainposition://auth/callback')) {
        const params = parseParams(url);
        if (params.access_token && params.refresh_token) {
          await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
        }
      }
    });
    return () => subscription.remove();
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        // Web: Supabaseが自動でリダイレクト処理する
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (error) throw error;
      } else {
        // Native: ディープリンクで戻る
        const redirectTo = 'trainposition://auth/callback';
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        });
        if (error) throw error;
        if (data?.url) {
          await Linking.openURL(data.url);
        }
      }
    } catch (e: any) {
      Alert.alert('ログインエラー', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚃 JR東海</Text>
      <Text style={styles.subtitle}>乗車位置ガイド</Text>
      <Text style={styles.description}>
        ログインすると乗車位置情報を投稿して{'\n'}ポイントを獲得できます
      </Text>

      <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.googleButtonText}>Googleでログイン</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 48,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 24,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 48,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
