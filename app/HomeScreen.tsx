import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [userName, setUserName] = useState('');
  const [showMotivation, setShowMotivation] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const name = await AsyncStorage.getItem('userName');
      if (name) setUserName(name);
      
      const hasShown = await AsyncStorage.getItem('motivationShownToday');
      const today = new Date().toDateString();
      if (hasShown !== today) {
        setTimeout(() => setShowMotivation(true), 600);
        await AsyncStorage.setItem('motivationShownToday', today);
      }
    };
    fetchUser();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('isLoggedIn');
    router.replace('/SplashScreen');
  };

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconBtn}>
          <Text style={styles.backIconText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout 🚪</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.headerBox}>
          <Text style={styles.title}>Welcome{userName ? ` ${userName}` : ''}!</Text>
          <Text style={styles.subtitle}>What would you like to do today?</Text>
        </View>

        <TouchableOpacity 
          style={styles.cardPrimary} 
          onPress={() => router.push('/OnboardingQuestions')}
          activeOpacity={0.9}
        >
          <Text style={styles.cardEmoji}>📚</Text>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Start Lessons</Text>
            <Text style={styles.cardSubtitle}>Learn a new language or continue your journey.</Text>
          </View>
          <Text style={styles.arrowIcon}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cardSecondary} 
          onPress={() => router.push('/ProgressScreen')}
          activeOpacity={0.9}
        >
          <Text style={styles.cardEmoji}>📊</Text>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>View Progress</Text>
            <Text style={styles.cardSubtitle}>Check your level and badges across all languages.</Text>
          </View>
          <Text style={styles.arrowIcon}>→</Text>
        </TouchableOpacity>

      </Animated.View>

      {/* Motivation Modal */}
      <Modal visible={showMotivation} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🚀</Text>
            <Text style={styles.modalTitle}>Welcome Back!</Text>
            <Text style={styles.modalSubtitle}>
              "Every day is a chance to learn something new. Let's conquer a lesson today and keep your streak alive!"
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowMotivation(false)}>
              <Text style={styles.modalBtnText}>Let's Do This! 💪</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1A35',
    padding: 24,
  },
  topHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  backIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIconText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 60,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
  },
  cardPrimary: {
    backgroundColor: '#A855F7',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  cardSecondary: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardEmoji: {
    fontSize: 36,
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 4,
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  arrowIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 26, 53, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#172545',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#1E293B',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  modalBtn: {
    backgroundColor: '#A855F7',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
