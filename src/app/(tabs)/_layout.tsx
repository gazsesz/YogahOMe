import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, type ColorValue } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { C } from '../../lib/theme';

function PoseIcon({ color }: { color: ColorValue }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Circle cx={12} cy={4.5} r={2.2} fill={color as string} />
      <Path d="M12 8v6M5 9.5l7 1.5 7-1.5M12 14l-4.5 6M12 14l4.5 6" stroke={color as string} strokeWidth={2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function HomeIcon({ color }: { color: ColorValue }) {
  const c = color as string;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Path d="M4 11l8-7 8 7v9H4z" stroke={c} strokeWidth={2} strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function PlanIcon({ color }: { color: ColorValue }) {
  const c = color as string;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Path d="M6 3h12v18H6z" stroke={c} strokeWidth={2} strokeLinejoin="round" fill="none" />
      <Line x1={9} y1={8} x2={15} y2={8} stroke={c} strokeWidth={2} strokeLinecap="round" />
      <Line x1={9} y1={12} x2={15} y2={12} stroke={c} strokeWidth={2} strokeLinecap="round" />
      <Line x1={9} y1={16} x2={13} y2={16} stroke={c} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Profil ikon a fejlécben: alapbeállítások (szint, panaszok, hangok). */
function ProfileButton() {
  return (
    <Pressable
      onPress={() => router.push('/profil')}
      hitSlop={10}
      style={{ paddingHorizontal: 14 }}
      accessibilityRole="button"
      accessibilityLabel="Profil és beállítások"
    >
      <Svg width={26} height={26} viewBox="0 0 24 24">
        <Circle cx={12} cy={8.5} r={3.6} stroke={C.accent} strokeWidth={2} fill="none" />
        <Path d="M4.5 20c1.2-3.6 4-5.3 7.5-5.3s6.3 1.7 7.5 5.3" stroke={C.accent} strokeWidth={2} strokeLinecap="round" fill="none" />
      </Svg>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.muted,
        headerStyle: { backgroundColor: C.surface },
        headerTitleStyle: { color: C.ink },
        headerRight: ProfileButton,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Yoga hOMe', tabBarLabel: 'Főoldal', tabBarIcon: HomeIcon }} />
      <Tabs.Screen name="tar" options={{ title: 'Gyakorlattár', tabBarLabel: 'Gyakorlattár', tabBarIcon: PoseIcon }} />
      <Tabs.Screen name="plans" options={{ title: 'Óráim', tabBarLabel: 'Óráim', tabBarIcon: PlanIcon }} />
    </Tabs>
  );
}
