import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Form, UserCircle2 } from "lucide-react-native";


export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Ordenes',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="bus-stops"
        options={{
          title: 'Paraderos',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="map.fill" color={color} />,
        }}
      />
      <Tabs.Screen 
        name="formularios"
        options={{
          title: "Formularios",
          tabBarIcon: ({color}) => <Form size={28} color={color} />
        }}
      />
      <Tabs.Screen
        name="my-account"
        options={{
          title:"Mi cuenta",
          tabBarIcon: ({color}) => <UserCircle2 size={28} color={color} />
        }}
      />
    </Tabs>
  );
}
