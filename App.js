import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/Home/HomeScreen'; // adjust path
// or import AuthStack from './src/navigation/AuthStack';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        {/* or <Stack.Screen name="Auth" component={AuthStack} /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
