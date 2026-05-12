import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData, saveUserData } from './utils/userStorage';

const LANG_LABELS: Record<string, string> = {
  english: 'English 🇬🇧',
  german: 'German 🇩🇪',
  spanish: 'Spanish 🇪🇸',
  urdu: 'Urdu 🇵🇰',
};

export default function KnowledgeCheckScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState('english');
  const [selected, setSelected] = useState<'beginner' | 'intermediate' | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const card1Slide = useRef(new Animated.Value(30)).current;
  const card1Fade = useRef(new Animated.Value(0)).current;
  const card2Slide = useRef(new Animated.Value(30)).current;
  const card2Fade = useRef(new Animated.Value(0)).current;

  const card1Scale = useRef(new Animated.Value(1)).current;
  const card2Scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadLanguage();

    // Initial fade in for header
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();

    // Staggered entry for cards
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(card1Fade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(card1Slide, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(card2Fade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(card2Slide, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
      ])
    ]).start();
  }, []);

  const loadLanguage = async () => {
    const user = await getUserData();
    setLanguage((user?.language || 'english').toLowerCase());
  };

  const handleSelect = (level: 'beginner' | 'intermediate') => {
    setSelected(level);
    const anim = level === 'beginner' ? card1Scale : card2Scale;
    Animated.sequence([
      Animated.spring(anim, { toValue: 0.95, friction: 8, tension: 50, useNativeDriver: true }),
      Animated.spring(anim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
    ]).start();
  };

  const handleContinue = async () => {
    if (!selected) return;
    const existing = await getUserData();
    await saveUserData({ ...existing, level: selected });
    // Reset lesson progress for fresh start
    await AsyncStorage.setItem('userLevel', selected);
    await AsyncStorage.setItem('lessonIndex', '0');
    await AsyncStorage.removeItem('beginnerSubLevel'); // Reset word-level progression
    await AsyncStorage.setItem('xp', '0');
    
    // For Total Beginners learning non-English languages, go to lesson first
    if (selected === 'beginner' && language !== 'english') {
      // Reset beginner-specific progress — UNCHANGED, not touched
      await AsyncStorage.setItem('beginnerLevel', '1');
      await AsyncStorage.setItem('beginnerLessonIndex', '0');
      await AsyncStorage.setItem('lessonsAtCurrentWordLevel', '0');
      await AsyncStorage.removeItem('isIntermediateStart');
      router.replace('/BeginnerLessonScreen');
    } else if (selected === 'intermediate' && language !== 'english') {
      // "Know the Basics" path — 3 sub-level progressive quiz system
      await AsyncStorage.setItem('intermediateSubLevel', '1');
      await AsyncStorage.setItem('intermediateQuizzesPassed', '0');
      await AsyncStorage.setItem('intermediateBadgeCount', '0');
      await AsyncStorage.setItem('intermediateLessonIndex', '0');
      await AsyncStorage.setItem('isIntermediateStart', 'true');
      router.replace('/IntermediateQuizScreen');
    } else {
      // English learners go to adaptive lessons
      router.replace('/AdaptiveLessonScreen');
    }
  };

  const langLabel = LANG_LABELS[language] || language;

  return (
    <View style={styles.container}>
      {/* Background decorative circles adjusted for dark theme */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
          <View style={styles.langBadge}>
            <Text style={styles.langBadgeText}>{langLabel}</Text>
          </View>
          <Text style={styles.title}>
            How well do you{'\n'}know this language?
          </Text>
          <Text style={styles.subtitle}>
            We'll personalise your lessons based on your answer
          </Text>
        </View>

        {/* Cards */}
        <View style={styles.cards}>
          {/* Beginner card */}
          <Animated.View style={{ opacity: card1Fade, transform: [{ translateY: card1Slide }, { scale: card1Scale }] }}>
            <TouchableOpacity
              style={[
                styles.card,
                selected === 'beginner' && styles.cardSelected,
              ]}
              onPress={() => handleSelect('beginner')}
              activeOpacity={0.9}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardEmoji}>🌱</Text>
                <View
                  style={[
                    styles.radioOuter,
                    selected === 'beginner' && styles.radioOuterSelected,
                  ]}
                >
                  {selected === 'beginner' && <View style={styles.radioDot} />}
                </View>
              </View>
              <Text
                style={[
                  styles.cardTitle,
                  selected === 'beginner' && styles.cardTitleSelected,
                ]}
              >
                Total Beginner
              </Text>
              <Text
                style={[
                  styles.cardDesc,
                  selected === 'beginner' && styles.cardDescSelected,
                ]}
              >
                I've never studied this language. Start me from scratch with greetings and basic words.
              </Text>
              <View
                style={[
                  styles.cardTag,
                  selected === 'beginner' && styles.cardTagSelected,
                ]}
              >
                <Text
                  style={[
                    styles.cardTagText,
                    selected === 'beginner' && styles.cardTagTextSelected,
                  ]}
                >
                  Starts from A1 basics
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Intermediate card */}
          <Animated.View style={{ opacity: card2Fade, transform: [{ translateY: card2Slide }, { scale: card2Scale }] }}>
            <TouchableOpacity
              style={[
                styles.card,
                selected === 'intermediate' && styles.cardSelected,
              ]}
              onPress={() => handleSelect('intermediate')}
              activeOpacity={0.9}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardEmoji}>⚡</Text>
                <View
                  style={[
                    styles.radioOuter,
                    selected === 'intermediate' && styles.radioOuterSelected,
                  ]}
                >
                  {selected === 'intermediate' && <View style={styles.radioDot} />}
                </View>
              </View>
              <Text
                style={[
                  styles.cardTitle,
                  selected === 'intermediate' && styles.cardTitleSelected,
                ]}
              >
                Know the Basics
              </Text>
              <Text
                style={[
                  styles.cardDesc,
                  selected === 'intermediate' && styles.cardDescSelected,
                ]}
              >
                I know some words or phrases already. Challenge me with real sentences.
              </Text>
              <View
                style={[
                  styles.cardTag,
                  selected === 'intermediate' && styles.cardTagSelected,
                ]}
              >
                <Text
                  style={[
                    styles.cardTagText,
                    selected === 'intermediate' && styles.cardTagTextSelected,
                  ]}
                >
                  Jumps to A2–B1 level
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Continue button */}
        <TouchableOpacity
          style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
          onPress={handleContinue}
          activeOpacity={selected ? 0.8 : 1}
        >
          <Text style={styles.continueBtnText}>
            {selected ? 'Start Learning →' : 'Select one to continue'}
          </Text>
        </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1A35',
  },
  bgCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#4C1D95',
    opacity: 0.15,
    top: -80,
    right: -80,
  },
  bgCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#A855F7',
    opacity: 0.08,
    bottom: 40,
    left: -60,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    paddingBottom: 60,
  },
  header: {
    marginBottom: 28,
    alignItems: 'center',
  },
  langBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  langBadgeText: {
    color: '#A855F7',
    fontWeight: 'bold',
    fontSize: 13,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  cards: {
    gap: 16,
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#172545',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.05)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  cardSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: '#A855F7',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardEmoji: {
    fontSize: 32,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4C1D95',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#A855F7',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#A855F7',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  cardTitleSelected: {
    color: '#FFFFFF',
  },
  cardDesc: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
    marginBottom: 16,
  },
  cardDescSelected: {
    color: 'rgba(255,255,255,0.85)',
  },
  cardTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cardTagSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
  },
  cardTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  cardTagTextSelected: {
    color: '#FFFFFF',
  },
  continueBtn: {
    backgroundColor: '#A855F7',
    padding: 18,
    borderRadius: 100,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  continueBtnDisabled: {
    backgroundColor: '#334155',
    elevation: 0,
    shadowOpacity: 0,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
