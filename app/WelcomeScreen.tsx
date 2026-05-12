import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData, resetLanguageProgress, loadLanguageProgressToStorage, getLanguageProgress } from './utils/userStorage';

const getLevelName = (level: number): string => {
  if (level <= 1) return 'Beginner';
  if (level === 2) return 'Intermediate';
  return 'Advanced';
};

const BADGE_ICONS = ['🥉', '🥈', '🥇', '🏅', '🎖️', '👑', '💎', '🌟', '⭐', '🏆'];

export default function WelcomeScreen() {
  const router = useRouter();
  const [userLevel, setUserLevel] = useState<string | null>(null);
  const [userLang, setUserLang] = useState<string>('english');
  const [beginnerLevel, setBeginnerLevel] = useState<number>(1);
  const [badgeCount, setBadgeCount] = useState<number>(0);
  const [lessonIndex, setLessonIndex] = useState<number>(0);
  const [showResetModal, setShowResetModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    checkMotivation();
    loadUserData();
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();
  }, []);

  const loadUserData = async () => {
    const user = await getUserData();
    const lang = (user?.language || 'english').toLowerCase();
    setUserLang(lang);
    
    if (lang !== 'english') {
      const savedProgress = await getLanguageProgress(lang);
      if (savedProgress) {
        await loadLanguageProgressToStorage(lang);
      }
    }
    
    const level = await AsyncStorage.getItem('userLevel');
    const savedBeginnerLevel = await AsyncStorage.getItem('beginnerLevel');
    const savedBadges = await AsyncStorage.getItem('beginnerBadgeCount');
    const savedLessonIndex = await AsyncStorage.getItem('beginnerLessonIndex');
    
    setUserLevel(level);
    
    if (lang === 'english') {
      setBeginnerLevel(4); // Default intermediate for English
    } else {
      setBeginnerLevel(savedBeginnerLevel ? parseInt(savedBeginnerLevel) : 1);
    }
    
    setBadgeCount(savedBadges ? parseInt(savedBadges) : 0);
    setLessonIndex(savedLessonIndex ? parseInt(savedLessonIndex) : 0);
  };
  
  const handleResetProgress = async () => {
    await resetLanguageProgress(userLang);
    setShowResetModal(false);
    setBeginnerLevel(1);
    setBadgeCount(0);
    setLessonIndex(0);
    router.replace('/KnowledgeCheckScreen');
  };

  const checkMotivation = async () => {
    const lastDate = await AsyncStorage.getItem('lastLessonDate');
    if (!lastDate) return;

    const last = new Date(lastDate);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= 2) {
      alert(`💌 Motivation Check!\n\nHey! We miss you 💖 Come back and keep learning!`);
    }
  };

  const levelName = getLevelName(beginnerLevel);
  const currentBadge = badgeCount > 0 ? BADGE_ICONS[Math.min(badgeCount - 1, BADGE_ICONS.length - 1)] : '🎯';

  const handleLogout = async () => {
    await AsyncStorage.removeItem('isLoggedIn');
    router.replace('/SplashScreen');
  };

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.replace('/HomeScreen')} style={styles.backIconBtn}>
          <Text style={styles.backIconText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout 🚪</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%', alignItems: 'center' }}>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Let's conquer {userLang.charAt(0).toUpperCase() + userLang.slice(1)} today.</Text>

        {/* Global Level and Badge Display */}
        {userLang !== 'english' && (
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{levelName}</Text>
              </View>
              <View style={styles.badgeDisplay}>
                <Text style={styles.badgeIcon}>{currentBadge}</Text>
                <Text style={styles.badgeCount}>{badgeCount}</Text>
              </View>
            </View>
            <Text style={styles.lessonInfo}>
              Currently on Lesson {lessonIndex + 1}
            </Text>
          </View>
        )}

        {/* Dynamic Action Buttons */}
        {userLang === 'english' ? (
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => router.push('/QuizScreen?type=vocab')}
          >
            <Text style={styles.btnPrimaryText}>Start Lesson →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => {
              if (userLevel === 'beginner') {
                router.push('/BeginnerLessonScreen');
              } else {
                router.push('/AdaptiveLessonScreen');
              }
            }}
          >
            <Text style={styles.btnPrimaryText}>Start Next Lesson →</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.btnSecondary} onPress={() => router.replace('/HomeScreen')}>
          <Text style={styles.btnSecondaryText}>🏠 Back to Home</Text>
        </TouchableOpacity>



        {/* Bottom Links */}
        <View style={styles.bottomLinks}>
          <TouchableOpacity style={styles.textLink} onPress={() => router.replace('/OnboardingQuestions')}>
            <Text style={styles.textLinkText}>Change Language</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Reset Progress Modal */}
      <Modal visible={showResetModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>⚠️</Text>
            <Text style={styles.modalTitle}>Start From Beginning?</Text>
            <Text style={styles.modalSubtitle}>
              This will reset all your progress in {userLang.charAt(0).toUpperCase() + userLang.slice(1)}:{'\n\n'}
              • Level will reset to Beginner{'\n'}
              • Lesson progress will be cleared{'\n'}
              • All badges will be lost
            </Text>

            <TouchableOpacity style={styles.modalBtnDanger} onPress={handleResetProgress}>
              <Text style={styles.modalBtnDangerText}>Yes, Start Over</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowResetModal(false)}>
              <Text style={styles.modalBtnCancelText}>Cancel</Text>
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
  title: { 
    fontSize: 32, 
    color: '#FFFFFF', 
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: { 
    color: '#94A3B8', 
    fontSize: 16,
    marginBottom: 32,
    fontWeight: '500',
  },
  statsContainer: {
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: '#172545',
    padding: 24,
    borderRadius: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelBadge: {
    backgroundColor: '#A855F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  levelText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  badgeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 6,
  },
  badgeIcon: {
    fontSize: 16,
  },
  badgeCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  lessonInfo: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
  },
  quizOptionsContainer: {
    width: '100%',
    marginBottom: 12,
  },
  sectionHeader: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  btnPrimary: {
    backgroundColor: '#A855F7',
    padding: 18,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  btnPrimaryEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  btnPrimaryText: { 
    color: '#FFFFFF', 
    fontWeight: '800',
    fontSize: 16,
  },
  btnSecondary: {
    backgroundColor: '#1E293B',
    padding: 18,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnSecondaryText: { 
    color: '#E2E8F0', 
    fontWeight: '700',
    fontSize: 15,
  },
  btnReset: {
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  resetText: { 
    color: '#EF4444', 
    fontWeight: '600',
    fontSize: 14,
  },
  bottomLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 24,
  },
  textLink: {
    padding: 8,
  },
  textLinkText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  dotSeparator: {
    color: '#334155',
    marginHorizontal: 8,
  },
  // Modal styles
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
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  modalBtnDanger: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalBtnDangerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  modalBtnCancel: {
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 15,
  },
});
