import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { saveUserData, getUserData } from './utils/userStorage'; // ✅ add getUserData here

export default function CategoryScreen() {
  const router = useRouter();
  const [category, setCategory] = useState('');

  const categories = ['greeting', 'daily', 'travel', 'food', 'emergency'];

  const finish = async () => {
    if (!category) {
      alert('⚠️ Please select a category before starting!');
      return;
    }
    const existing = await getUserData();
    await saveUserData({
      ...existing,
      category
    });
    router.replace('/LessonScreen');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Category 📚</Text>

      {categories.map((item) => (
        <TouchableOpacity
          key={item}
          style={[styles.card, category === item && styles.selected]}
          onPress={() => setCategory(item)}
        >
          <Text style={styles.text}>{item.toUpperCase()}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.btn} onPress={finish}>
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Start Learning</Text>
      </TouchableOpacity>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE4EC',
    padding: 20,
    justifyContent: 'center'
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20
  },

  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center'
  },

  selected: {
    backgroundColor: '#FF6FA1'
  },

  text: {
    fontWeight: 'bold'
  },

  btn: {
    marginTop: 20,
    backgroundColor: '#FF6FA1',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center'
  }
});