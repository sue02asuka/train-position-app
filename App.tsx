import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/config/supabase';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import PostScreen from './src/screens/PostScreen';
import MyPageScreen from './src/screens/MyPageScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [homeKey, setHomeKey] = useState(0);
  const [postKey, setPostKey] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      {session ? (
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: '#E65100',
              tabBarInactiveTintColor: '#999',
            }}
          >
            <Tab.Screen
              name="ホーム"
              options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🚃</Text> }}
              listeners={({ navigation }) => ({
                tabPress: () => {
                  if (navigation.isFocused()) {
                    setHomeKey(k => k + 1);
                  }
                },
              })}
            >
              {() => <HomeScreen key={homeKey} />}
            </Tab.Screen>
            <Tab.Screen
              name="投稿"
              options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📝</Text> }}
              listeners={({ navigation }) => ({
                tabPress: () => {
                  if (navigation.isFocused()) {
                    setPostKey(k => k + 1);
                  }
                },
              })}
            >
              {() => <PostScreen key={postKey} />}
            </Tab.Screen>
            <Tab.Screen
              name="マイページ"
              component={MyPageScreen}
              options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      ) : (
        <LoginScreen />
      )}
    </>
  );
}
