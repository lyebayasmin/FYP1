import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './app/(tabs)/HomeScreen';
import LessonScreen from './app/(tabs)/LessonScreen';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: "Home" }} 
        />
        <Stack.Screen 
          name="Lesson" 
          component={LessonScreen} 
          options={{ title: "Lesson" }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;