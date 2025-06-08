// App.js
import React from 'react';                   // Needed to interpret JSX :contentReference[oaicite:0]{index=0}
import { View, Text, StyleSheet } from 'react-native';  // Core UI components :contentReference[oaicite:1]{index=1}

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello, World!</Text>
    </View>
  );
}

// Simple styles to center content
const styles = StyleSheet.create({
  container: {
    flex: 1,                    // Fill the screen
    justifyContent: 'center',   // Center vertically
    alignItems: 'center',       // Center horizontally
    backgroundColor: '#ffffff', // White background
  },
  text: {
    fontSize: 24,               // Large text
    fontWeight: 'bold',
    color: '#333333',
  },
});
