import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData, syncCurrentProgressToLanguage } from './utils/userStorage';
import wordsData from '../data/vocabularyLessons.json';

type LangKey = 'spanish' | 'german' | 'urdu';

interface WordEntry {
  word: string;
  translation: string;
}

interface Lesson {
  id: number;
  title: string;
  words: WordEntry[];
  phrases?: WordEntry[];
}

const LANG_LABELS: Record<LangKey, string> = {
  german: 'German',
  spanish: 'Spanish',
  urdu: 'Urdu',
};

const LANG_FLAGS: Record<LangKey, string> = {
  german: '🇩🇪',
  spanish: '🇪🇸',
  urdu: '🇵🇰',
};

const BADGE_ICONS = ['🥉', '🥈', '🥇', '🏅', '🎖️', '👑', '💎', '🌟', '⭐', '🏆'];

const getLevelName = (level: number): string => {
  if (level <= 1) return 'Beginner';
  if (level === 2) return 'Intermediate';
  return 'Advanced';
};

const getWordCountPerItem = (level: number): number => {
  if (level <= 3) return 1;
  if (level <= 6) return 2;
  return 3;
};

// Tap-to-Reveal Card Component
const WordRevealCard = ({ item, index, lang, onReveal }: { item: WordEntry, index: number, lang: LangKey, onReveal: () => void }) => {
  const [revealed, setRevealed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  const handlePress = () => {
    if (!revealed) {
      setRevealed(true);
      onReveal();
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={handlePress} 
    >
      <Animated.View style={[styles.wordCard, revealed && styles.wordCardRevealed, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.wordHeader}>
          <View style={[styles.wordNumber, revealed && styles.wordNumberRevealed]}>
            <Text style={[styles.wordNumberText, revealed && styles.wordNumberTextRevealed]}>{index + 1}</Text>
          </View>
          <Text style={styles.foreignWordText}>{item.word}</Text>
        </View>

        {/* Reveal Area */}
        <View style={styles.revealArea}>
          {!revealed ? (
            <Text style={styles.tapToRevealText}>Tap to reveal meaning</Text>
          ) : (
            <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}>
              <Text style={styles.englishWordText}>{item.translation}</Text>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function BeginnerLessonScreen() {
  const router = useRouter();
  const [lang, setLang] = useState<LangKey>('spanish');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [badgeCount, setBadgeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showQuizPrompt, setShowQuizPrompt] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  
  const [displayWords, setDisplayWords] = useState<WordEntry[]>([]);
  const [wordCountPerItem, setWordCountPerItem] = useState(1);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const user = await getUserData();
    const userLang = ((user?.language || 'spanish').toLowerCase()) as string;
    
    const safeLang: LangKey = ['german', 'spanish', 'urdu'].includes(userLang)
      ? (userLang as LangKey)
      : 'spanish';

    const savedLessonIndex = await AsyncStorage.getItem('beginnerLessonIndex');
    const savedLevel = await AsyncStorage.getItem('beginnerLevel');
    const savedBadges = await AsyncStorage.getItem('beginnerBadgeCount');
    
    const currentIndex = savedLessonIndex ? parseInt(savedLessonIndex) : 0;
    const currentLevel = savedLevel ? parseInt(savedLevel) : 1;
    const currentBadges = savedBadges ? parseInt(savedBadges) : 0;

    setLang(safeLang);
    setLessonIndex(currentIndex);
    setUserLevel(currentLevel);
    setBadgeCount(currentBadges);

    const wordsPerItem = getWordCountPerItem(currentLevel);
    setWordCountPerItem(wordsPerItem);

    const langData = wordsData[safeLang as keyof typeof wordsData];
    if (langData && langData.lessons[currentIndex]) {
      const currentLesson = langData.lessons[currentIndex] as Lesson;
      setLesson(currentLesson);
      
      const allWords = currentLesson.words || [];
      const combinedWords: WordEntry[] = [];
      
      if (wordsPerItem === 1) {
        combinedWords.push(...allWords.slice(0, 10));
      } else {
        for (let i = 0; i < allWords.length && combinedWords.length < 5; i += wordsPerItem) {
          const group = allWords.slice(i, i + wordsPerItem);
          if (group.length === wordsPerItem) {
            combinedWords.push({
              word: group.map(w => w.word).join(' '),
              translation: group.map(w => w.translation).join(', '),
            });
          }
        }
      }
      setDisplayWords(combinedWords);
    }

    await syncCurrentProgressToLanguage(safeLang);
    setLoading(false);
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  };

  const handleTakeQuiz = async () => {
    setShowQuizPrompt(false);
    if (displayWords.length > 0) {
      await AsyncStorage.setItem('currentQuizWords', JSON.stringify(displayWords));
      await AsyncStorage.setItem('currentQuizLang', lang);
      await AsyncStorage.setItem('currentQuizUsePhrases', wordCountPerItem > 1 ? 'true' : 'false');
    }
    router.push('/BeginnerQuizScreen');
  };

  const getBadgeIcon = (count: number) => {
    if (count <= 0) return '🎯';
    return BADGE_ICONS[Math.min(count - 1, BADGE_ICONS.length - 1)];
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Building your deck...</Text>
      </View>
    );
  }

  if (!lesson || displayWords.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>No lessons available</Text>
        <TouchableOpacity style={styles.nextBtn} onPress={() => router.replace('/WelcomeScreen')}>
          <Text style={styles.nextBtnText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const levelName = getLevelName(userLevel);
  // Ensure the quiz button only activates when all words are revealed
  const allRevealed = revealedCount >= displayWords.length;

  return (
    <View style={styles.container}>
      {/* Game Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/WelcomeScreen')} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.headerStats}>
          <View style={styles.statBadge}>
            <Text style={styles.statIcon}>{getBadgeIcon(badgeCount)}</Text>
            <Text style={styles.statText}>Lvl {userLevel}</Text>
          </View>
          <View style={styles.statBadgeDark}>
            <Text style={styles.statTextHighlight}>{levelName}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.lessonTitle}>
          Lesson {lessonIndex + 1}: {lesson.title}
        </Text>
        <Text style={styles.lessonSubtitle}>
          Tap each word below to reveal its translation
        </Text>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {displayWords.map((item, index) => (
            <WordRevealCard 
              key={index} 
              item={item} 
              index={index} 
              lang={lang} 
              onReveal={() => setRevealedCount(prev => prev + 1)} 
            />
          ))}

          {/* Continue Button */}
          <TouchableOpacity 
            style={[styles.nextBtn, !allRevealed && styles.nextBtnDisabled]} 
            onPress={() => setShowQuizPrompt(true)}
            activeOpacity={0.8}
            disabled={!allRevealed}
          >
            <Text style={styles.nextBtnText}>
              {allRevealed ? 'Take the Quiz →' : `Reveal all words to continue (${revealedCount}/${displayWords.length})`}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Quiz Prompt Modal */}
      <Modal visible={showQuizPrompt} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🎮</Text>
            <Text style={styles.modalTitle}>Challenge Ready!</Text>
            <Text style={styles.modalSubtitle}>
              You have studied {displayWords.length} {wordCountPerItem > 1 ? 'combinations' : 'words'} in {LANG_LABELS[lang]}.{'\n\n'}
              Now let's see what you remember.
            </Text>

            <TouchableOpacity style={styles.modalBtnYes} onPress={handleTakeQuiz}>
              <Text style={styles.modalBtnYesText}>Start Quiz</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtnNo} onPress={() => setShowQuizPrompt(false)}>
              <Text style={styles.modalBtnNoText}>Wait, let me review again</Text>
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
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F1A35',
  },
  loadingText: {
    fontSize: 16,
    color: '#A855F7',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  backButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statBadgeDark: {
    backgroundColor: '#A855F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    justifyContent: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  statText: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 13,
  },
  statTextHighlight: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  lessonTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  lessonSubtitle: {
    fontSize: 15,
    color: '#94A3B8',
    marginBottom: 24,
  },
  wordCard: {
    backgroundColor: '#172545',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  wordCardRevealed: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
  },
  wordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  wordNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  wordNumberRevealed: {
    backgroundColor: '#A855F7',
  },
  wordNumberText: {
    color: '#94A3B8',
    fontWeight: 'bold',
    fontSize: 14,
  },
  wordNumberTextRevealed: {
    color: '#FFFFFF',
  },
  foreignWordText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
  },
  revealArea: {
    backgroundColor: '#0F1A35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  tapToRevealText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  englishWordText: {
    color: '#A855F7',
    fontSize: 20,
    fontWeight: '800',
  },
  nextBtn: {
    backgroundColor: '#A855F7',
    width: '100%',
    padding: 18,
    borderRadius: 100,
    alignItems: 'center',
    marginTop: 20,
    elevation: 4,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  nextBtnDisabled: {
    backgroundColor: '#1E293B',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
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
    fontSize: 64,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  modalBtnYes: {
    backgroundColor: '#A855F7',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 100,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  modalBtnYesText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  modalBtnNo: {
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnNoText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 15,
  },
});
