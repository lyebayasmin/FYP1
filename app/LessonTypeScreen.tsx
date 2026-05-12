import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function LessonTypeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What do you want to learn? 📖</Text>
      <Text style={styles.subtitle}>Choose your lesson type</Text>

      {/* Vocabulary — go to LessonScreen to study, then quiz */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push('/LessonScreen')}
      >
        <Text style={styles.icon}>📝</Text>
        <Text style={styles.cardTitle}>Vocabulary</Text>
        <Text style={styles.cardDesc}>
          Practice phrases in your target language
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.replace('/WelcomeScreen')}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE4EC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF3D7F',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 30,
  },
  card: {
    backgroundColor: 'white',
    width: '100%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  icon: {
    fontSize: 36,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6FA1',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: 'gray',
    textAlign: 'center',
  },
  backBtn: {
    marginTop: 10,
    padding: 12,
  },
  backText: {
    color: '#FF6FA1',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
