import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData } from './utils/userStorage';
import phrases from '../data/phrases.json';

type LangKey = 'english' | 'urdu' | 'spanish' | 'german';

interface Question {
  question: string;
  options: string[];
  answer: string;
  fullPhrase?: string; // Stored to show user the full sentence on reveal
}

const QUIZ_SIZE = 5;
const BADGE_ICONS = ['🥉', '🥈', '🥇', '🏅', '🎖️', '👑', '💎', '🌟', '⭐', '🏆'];

const getLevelName = (level: number): string => {
  if (level <= 1) return 'Beginner';
  if (level === 2) return 'Intermediate';
  return 'Advanced';
};

const PRAISE_MESSAGES = [
  "You're absolutely AMAZING! 🌟",
  "Incredible achievement! You're a language superstar! ⭐",
  "WOW! You're crushing it! Keep shining! 💫",
  "Outstanding work! Your dedication is inspiring! 🎯",
  "Phenomenal! You're on fire! 🔥",
];

const getRandomPraise = () => PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getLangEntries(lang: LangKey): any[] {
  return (phrases as any[]).filter(
    (p) => p[lang] && typeof p[lang] === 'string' && (p[lang] as string).trim() !== ''
  );
}

/**
 * Build fill-in-the-blank vocab questions scaled by difficulty level.
 */
function buildVocabQuestions(lang: LangKey, level: number, count = QUIZ_SIZE): Question[] {
  const pool = getLangEntries(lang);
  
  // Filter by length based on user level
  let validPhrases = pool.filter((p) => {
    const len = (p[lang] as string).length;
    if (level <= 1) return len < 35; // Level 1 (Beginner): Short
    if (level === 2) return len >= 35 && len <= 60; // Level 2 (Intermediate): Medium
    return len > 60; // Level 3+ (Advanced): Long
  });

  // Fallback if not enough phrases in the tier
  if (validPhrases.length < count) {
    validPhrases = pool; 
  }

  const picked = shuffle(validPhrases).slice(0, count);

  return picked.map((item) => {
    const fullPhrase: string = item[lang];
    const words = fullPhrase.split(' ');
    
    // Try to find a word that is > 2 chars to blank out
    const candidates = words.map((w, i) => ({ word: w, index: i }))
                            .filter(w => w.word.replace(/[^a-zA-Z]/g, '').length > 2);
    
    const target = candidates.length > 0 ? shuffle(candidates)[0] : { word: words[Math.floor(words.length / 2)], index: Math.floor(words.length / 2) };
    
    // Clean the target word (remove punctuation from the answer)
    const cleanAnswer = target.word.replace(/[.,!?";:]/g, '');
    
    // Reconstruct prompt with blank
    const promptWords = [...words];
    promptWords[target.index] = promptWords[target.index].replace(cleanAnswer, '___');
    const prompt = `Fill in the blank:\n\n${promptWords.join(' ')}`;

    // Generate distractors by pulling random words from other phrases
    const otherPhrases = pool.filter(p => p.id !== item.id);
    const allOtherWords = otherPhrases.flatMap(p => (p[lang] as string).split(' '))
                                      .map(w => w.replace(/[.,!?";:]/g, ''))
                                      .filter(w => w.length > 2 && w.toLowerCase() !== cleanAnswer.toLowerCase());
    
    const distractors = shuffle(Array.from(new Set(allOtherWords))).slice(0, 3);

    // If we couldn't find enough distractors, fallback to generic words
    const safeDistractors = ['something', 'never', 'always', 'today', 'there', 'who', 'about'];
    let dIdx = 0;
    while (distractors.length < 3) {
      if (!distractors.includes(safeDistractors[dIdx])) {
         distractors.push(safeDistractors[dIdx]);
      }
      dIdx++;
    }

    return {
      question: prompt,
      options: shuffle([cleanAnswer, ...distractors]),
      answer: cleanAnswer,
      fullPhrase: fullPhrase
    };
  });
}

// Interactive Quiz Option Component
const QuizOption = ({ 
  option, 
  idx, 
  selected, 
  correctAnswer, 
  onSelect 
}: { 
  option: string; 
  idx: number; 
  selected: string | null; 
  correctAnswer: string; 
  onSelect: (opt: string) => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!selected) Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    if (!selected) Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const handlePress = () => {
    if (!selected) onSelect(option);
  };

  let optionStyle = [styles.optionCard];
  let textStyle = [styles.optionText];
  let bubbleStyle = [styles.optionBubble];
  let bubbleTextStyle = [styles.optionBubbleText];

  if (selected) {
    if (option === correctAnswer) {
      optionStyle.push(styles.optionCorrect);
      textStyle.push(styles.optionTextCorrect);
      bubbleStyle.push(styles.optionBubbleCorrect);
      bubbleTextStyle.push(styles.optionBubbleTextLight);
    } else if (option === selected) {
      optionStyle.push(styles.optionWrong);
      textStyle.push(styles.optionTextWrong);
      bubbleStyle.push(styles.optionBubbleWrong);
      bubbleTextStyle.push(styles.optionBubbleTextLight);
    } else {
      optionStyle.push(styles.optionDim);
      textStyle.push(styles.optionTextDim);
    }
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={handlePress}>
      <Animated.View style={[optionStyle, { transform: [{ scale: scaleAnim }] }]}>
        <View style={bubbleStyle}>
          <Text style={bubbleTextStyle}>{String.fromCharCode(65 + idx)}</Text>
        </View>
        <Text style={textStyle}>{option}</Text>
        {selected && option === correctAnswer && <Text style={styles.iconCorrect}>✓</Text>}
        {selected && option === selected && option !== correctAnswer && <Text style={styles.iconWrong}>✕</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function QuizScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();

  const [lang, setLang] = useState<LangKey>('english');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<number[]>([]);
  
  // Progress states
  const [userLevel, setUserLevel] = useState(1);
  const [badgeCount, setBadgeCount] = useState(0);
  const [lessonsCompleted, setLessonsCompleted] = useState(0);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [showNewBadge, setShowNewBadge] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [newBadgeIcon, setNewBadgeIcon] = useState('🥉');
  const [praiseMessage, setPraiseMessage] = useState('');

  // Animations
  const cardAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const feedbackScale = useRef(new Animated.Value(0.8)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const badgeRotate = useRef(new Animated.Value(0)).current;
  const badgeSlideY = useRef(new Animated.Value(-200)).current;
  const congratsScale = useRef(new Animated.Value(0)).current;
  
  const confettiAnims = useRef(
    [...Array(30)].map(() => ({
      translateY: new Animated.Value(-50),
      translateX: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    setupQuiz();
  }, []);

  const triggerHapticFeedback = () => {
    try {
      if (Platform.OS !== 'web') {
        const { Vibration } = require('react-native');
        Vibration.vibrate([0, 100, 100, 200]);
      }
    } catch (error) {}
  };

  const setupQuiz = async () => {
    const user = await getUserData();
    const rawLang = (user?.language || 'english').toLowerCase();
    const safeLang: LangKey = ['english', 'german', 'spanish', 'urdu'].includes(rawLang)
      ? (rawLang as LangKey)
      : 'english';

    setLang(safeLang);

    const savedLevel = await AsyncStorage.getItem('beginnerLevel');
    const savedBadges = await AsyncStorage.getItem('beginnerBadgeCount');
    const savedLessonsCompleted = await AsyncStorage.getItem('beginnerLessonsCompleted');

    // Default to Level 1
    const currentLevel = savedLevel ? parseInt(savedLevel) : 1;
    const currentBadges = savedBadges ? parseInt(savedBadges) : 0;
    const completedCount = savedLessonsCompleted ? parseInt(savedLessonsCompleted) : 0;

    setUserLevel(currentLevel);
    setBadgeCount(currentBadges);
    setLessonsCompleted(completedCount);

    let qs: Question[] = [];
    qs = buildVocabQuestions(safeLang, currentLevel);

    setQuestions(qs);
    setLoading(false);
    animateIn();
  };

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    cardAnim.setValue(50);
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(cardAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();
  };

  const animateFeedbackIn = () => {
    feedbackScale.setValue(0.8);
    feedbackOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(feedbackScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      Animated.timing(feedbackOpacity, { toValue: 1, duration: 200, useNativeDriver: true })
    ]).start();
  };

  const animateBadgeEntry = () => {
    badgeSlideY.setValue(-200);
    badgeScale.setValue(0);
    badgeRotate.setValue(0);

    Animated.sequence([
      Animated.spring(badgeSlideY, { toValue: 0, friction: 4, tension: 40, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(badgeScale, { toValue: 1.3, friction: 3, tension: 100, useNativeDriver: true }),
        Animated.timing(badgeRotate, { toValue: 2, duration: 800, useNativeDriver: true }),
      ]),
      Animated.spring(badgeScale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();

    animateConfetti();
  };

  const animateConfetti = () => {
    const { width, height } = Dimensions.get('window');
    
    confettiAnims.forEach((anim) => {
      const randomX = (Math.random() - 0.5) * width;
      const randomDelay = Math.random() * 500;
      
      anim.translateY.setValue(-50);
      anim.translateX.setValue(randomX);
      anim.rotate.setValue(0);
      anim.opacity.setValue(1);

      Animated.sequence([
        Animated.delay(randomDelay),
        Animated.parallel([
          Animated.timing(anim.translateY, { toValue: height + 100, duration: 2000 + Math.random() * 1000, useNativeDriver: true }),
          Animated.timing(anim.translateX, { toValue: randomX + (Math.random() - 0.5) * 200, duration: 2000 + Math.random() * 1000, useNativeDriver: true }),
          Animated.timing(anim.rotate, { toValue: Math.random() * 10, duration: 2000, useNativeDriver: true }),
          Animated.timing(anim.opacity, { toValue: 0, duration: 2500, useNativeDriver: true }),
        ]),
      ]).start();
    });
  };

  const animateCongrats = () => {
    congratsScale.setValue(0);
    Animated.spring(congratsScale, {
      toValue: 1,
      friction: 4,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  const handleSelect = (option: string) => {
    if (selected !== null) return;
    setSelected(option);

    const isCorrect = option === questions[current].answer;
    if (isCorrect) {
      setScore((s) => s + 1);
    } else {
      setMistakes((m) => [...m, current]);
    }
    animateFeedbackIn();
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      handleCompleteQuiz();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      setCurrent((c) => c + 1);
      setSelected(null);
      setTimeout(animateIn, 100);
    }
  };

  const handleRetakeQuiz = () => {
    const reshuffled = questions.map(q => ({ ...q, options: shuffle([...q.options]) }));
    setQuestions(reshuffled);
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setMistakes([]);
    setShowResults(false);
    animateIn();
  };

  const handleNextQuiz = () => {
    setShowResults(false);
    setupQuiz();
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setMistakes([]);
  };

  const handleCompleteQuiz = async () => {
    const isPerfect = score === QUIZ_SIZE;
    
    if (isPerfect) {
      const newLessonsCompleted = lessonsCompleted + 1;
      const isLevelUpTime = newLessonsCompleted % 3 === 0;
      
      let newBadgeCount = badgeCount;
      let newLevel = userLevel;
      
      if (isLevelUpTime) {
        newBadgeCount = badgeCount + 1;
        newLevel = userLevel + 1;
        
        setNewBadgeIcon(BADGE_ICONS[Math.min(newBadgeCount - 1, BADGE_ICONS.length - 1)]);
        setBadgeCount(newBadgeCount);
        setUserLevel(newLevel);
        setPraiseMessage(getRandomPraise());
        
        await AsyncStorage.setItem('beginnerBadgeCount', String(newBadgeCount));
      }
      
      await AsyncStorage.setItem('beginnerLevel', String(newLevel));
      await AsyncStorage.setItem('beginnerLessonsCompleted', String(newLessonsCompleted));
      await AsyncStorage.setItem('lastLessonDate', new Date().toDateString());

      setLessonsCompleted(newLessonsCompleted);

      if (isLevelUpTime) {
        setShowNewBadge(true);
        triggerHapticFeedback();
        setTimeout(() => animateBadgeEntry(), 100);
      } else {
        setShowCongrats(true);
        animateCongrats();
      }
    } else {
      setShowResults(true);
    }
  };

  const handleContinueAfterCongrats = () => {
    setShowCongrats(false);
    setShowNewBadge(false);
    setShowResults(true);
  };

  const getBadgeIcon = (count: number) => {
    if (count <= 0) return '🎯';
    return BADGE_ICONS[Math.min(count - 1, BADGE_ICONS.length - 1)];
  };

  if (loading || questions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Building your quiz... ✨</Text>
      </View>
    );
  }

  const levelName = getLevelName(userLevel);

  // LEVEL UP / NEW BADGE MODAL
  if (showNewBadge) {
    const spin = badgeRotate.interpolate({ inputRange: [0, 2], outputRange: ['0deg', '720deg'] });
    const confettiEmojis = ['🎉', '🎊', '✨', '⭐', '💫', '🌟', '💖', '🎈'];

    return (
      <View style={styles.congratsContainer}>
        {confettiAnims.map((anim, i) => (
          <Animated.Text key={i} style={[styles.confetti, { transform: [{ translateY: anim.translateY }, { translateX: anim.translateX }, { rotate: anim.rotate.interpolate({ inputRange: [0, 10], outputRange: ['0deg', '3600deg'] }) }], opacity: anim.opacity, left: '50%' }]}>
            {confettiEmojis[i % confettiEmojis.length]}
          </Animated.Text>
        ))}

        <Animated.View style={[styles.badgePopup, { transform: [{ translateY: badgeSlideY }, { scale: badgeScale }, { rotate: spin }] }]}>
          <Text style={styles.newBadgeIcon}>{newBadgeIcon}</Text>
        </Animated.View>

        <View style={styles.congratsContent}>
          <Text style={styles.congratsTitle}>LEVEL UP!</Text>
          <Text style={styles.praiseMessage}>{praiseMessage}</Text>
          <Text style={styles.congratsSubtitle}>You conquered 3 quizzes and leveled up!</Text>
          <Text style={styles.congratsLevel}>You unlocked: <Text style={{color: '#A855F7'}}>{levelName} Phrases</Text></Text>

          <View style={styles.badgeProgress}>
            <Text style={styles.badgeProgressText}>Your Epic Collection</Text>
            <View style={styles.badgeRow}>
              {[...Array(Math.min(badgeCount, 10))].map((_, i) => (
                <Animated.Text key={i} style={[styles.badgeRowIcon, i === badgeCount - 1 && styles.newBadgeHighlight]}>
                  {BADGE_ICONS[Math.min(i, BADGE_ICONS.length - 1)]}
                </Animated.Text>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.actionBtn} onPress={() => { setShowNewBadge(false); handleNextQuiz(); }}>
            <Text style={styles.actionBtnText}>Start Level {userLevel} Quizzes 🚀</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleContinueAfterCongrats}>
            <Text style={styles.secondaryBtnText}>See Results</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // PERFECT SCORE MODAL (Before 3rd lesson)
  if (showCongrats) {
    return (
      <View style={styles.congratsContainer}>
        <Animated.View style={[styles.congratsCard, { transform: [{ scale: congratsScale }] }]}>
          <Text style={styles.congratsEmoji}>🔥</Text>
          <Text style={styles.congratsTitle}>FLAWLESS!</Text>
          <Text style={styles.congratsSubtitle}>You got all 5 answers correct!</Text>
          
          <View style={styles.progressBox}>
            <Text style={styles.progressBoxText}>
              {3 - (lessonsCompleted % 3)} more perfect quizzes until LEVEL UP!
            </Text>
            <View style={styles.progressDotsBox}>
               {[1, 2, 3].map(step => (
                 <View key={step} style={[styles.stepDot, step <= (lessonsCompleted % 3) && styles.stepDotFilled]} />
               ))}
            </View>
          </View>

          <TouchableOpacity style={styles.actionBtn} onPress={() => { setShowCongrats(false); handleNextQuiz(); }}>
            <Text style={styles.actionBtnText}>Next Quiz 🚀</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleContinueAfterCongrats}>
            <Text style={styles.secondaryBtnText}>See Results</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // RESULTS SCREEN
  if (showResults) {
    const isPerfect = score === QUIZ_SIZE;
    const hasMistakes = mistakes.length > 0;

    return (
      <View style={styles.container}>
        <View style={styles.resultsCard}>
          <View style={styles.resultsBadgeRow}>
            <View style={styles.statBadgeDark}>
              <Text style={styles.statTextHighlight}>{levelName}</Text>
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.statIcon}>{getBadgeIcon(badgeCount)}</Text>
              <Text style={styles.statText}>{badgeCount}</Text>
            </View>
          </View>

          <Text style={styles.resultsEmoji}>{isPerfect ? '🏆' : hasMistakes ? '📚' : '🌟'}</Text>
          <Text style={styles.resultsTitle}>{isPerfect ? 'Perfect Score!' : 'Quiz Complete!'}</Text>
          <Text style={styles.resultsScore}>{score} / {QUIZ_SIZE}</Text>
          <Text style={styles.resultsMsg}>
            {isPerfect ? "Amazing! You have mastered these phrases!" : `You made ${mistakes.length} mistake${mistakes.length > 1 ? 's' : ''}. Practice makes perfect!`}
          </Text>

          {hasMistakes && !isPerfect ? (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={handleRetakeQuiz}>
                <Text style={styles.actionBtnText}>Retake Quiz</Text>
              </TouchableOpacity>
              <Text style={styles.retakeHint}>Get all 5 correct to earn progress toward Level Up!</Text>
            </>
          ) : (
            <TouchableOpacity style={styles.actionBtn} onPress={handleNextQuiz}>
              <Text style={styles.actionBtnText}>Next Quiz →</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.homeLink} onPress={() => router.replace('/WelcomeScreen')}>
            <Text style={styles.homeLinkText}>Skip & Return to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const q = questions[current];
  const isCorrect = selected === q.answer;
  const isWrong = selected !== null && selected !== q.answer;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Quit Confirmation Modal */}
      <Modal visible={showQuitModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🚪</Text>
            <Text style={styles.modalTitle}>Quit Quiz?</Text>
            <Text style={styles.modalSubtitle}>Your progress on this quiz won't be saved. Are you sure?</Text>
            <TouchableOpacity style={styles.modalBtnDanger} onPress={() => router.replace('/WelcomeScreen')}>
              <Text style={styles.modalBtnDangerText}>Yes, Quit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowQuitModal(false)}>
              <Text style={styles.modalBtnCancelText}>Keep Going 💪</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Game Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowQuitModal(true)} style={styles.backButton}>
          <Text style={styles.backButtonText}>Quit Quiz 🚪</Text>
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

      <View style={styles.progressContainer}>
        {Array.from({ length: QUIZ_SIZE }).map((_, i) => (
          <View key={i} style={[styles.progressDot, i < current && styles.progressDotDone, i === current && styles.progressDotCurrent]} />
        ))}
      </View>

      <Animated.View style={[styles.questionBox, { transform: [{ translateY: cardAnim }] }]}>
        <Text style={styles.questionLabel}>Vocabulary Challenge</Text>
        <Text style={styles.questionWord}>{q.question}</Text>
      </Animated.View>

      <View style={styles.optionsContainer}>
        {q.options.map((option, idx) => (
          <QuizOption key={idx} option={option} idx={idx} selected={selected} correctAnswer={q.answer} onSelect={handleSelect} />
        ))}
      </View>

      {selected && (
        <Animated.View style={[styles.feedbackBox, isCorrect ? styles.feedbackCorrect : styles.feedbackWrong, { opacity: feedbackOpacity, transform: [{ scale: feedbackScale }] }]}>
          <Text style={styles.feedbackTitle}>{isCorrect ? 'Excellent! 🎯' : 'Not quite! 💔'}</Text>
          {isWrong && (
            <Text style={styles.feedbackAnswer}>Correct Answer: <Text style={{color: '#FFFFFF'}}>{q.answer}</Text></Text>
          )}
          {q.fullPhrase && (
             <Text style={styles.feedbackExplanation}>Full phrase: "{q.fullPhrase}"</Text>
          )}
        </Animated.View>
      )}

      {selected && (
        <TouchableOpacity style={styles.actionBtn} onPress={handleNext}>
          <Text style={styles.actionBtnText}>{current + 1 >= QUIZ_SIZE ? 'Finish Quiz →' : 'Next Question →'}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1A35',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
    flexGrow: 1,
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
    paddingTop: 40,
    marginBottom: 24,
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
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  progressDot: {
    flex: 1,
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
  },
  progressDotDone: {
    backgroundColor: '#4C1D95',
  },
  progressDotCurrent: {
    backgroundColor: '#A855F7',
  },
  questionBox: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 10,
  },
  questionLabel: {
    color: '#94A3B8',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: 12,
  },
  questionWord: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 44,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#172545',
    borderWidth: 2,
    borderColor: '#1E293B',
    borderRadius: 20,
    padding: 16,
  },
  optionCorrect: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  optionWrong: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  optionDim: {
    opacity: 0.5,
  },
  optionBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionBubbleCorrect: {
    backgroundColor: '#10B981',
  },
  optionBubbleWrong: {
    backgroundColor: '#EF4444',
  },
  optionBubbleText: {
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  optionBubbleTextLight: {
    color: '#FFFFFF',
  },
  optionText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  optionTextCorrect: {
    color: '#10B981',
  },
  optionTextWrong: {
    color: '#EF4444',
  },
  optionTextDim: {
    color: '#64748B',
  },
  iconCorrect: {
    color: '#10B981',
    fontSize: 20,
    fontWeight: 'bold',
  },
  iconWrong: {
    color: '#EF4444',
    fontSize: 20,
    fontWeight: 'bold',
  },
  feedbackBox: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  feedbackCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  feedbackWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  feedbackAnswer: {
    fontSize: 15,
    color: '#94A3B8',
    marginBottom: 8,
    fontWeight: '600',
  },
  feedbackExplanation: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionBtn: {
    backgroundColor: '#A855F7',
    padding: 18,
    borderRadius: 100,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 'auto',
    marginBottom: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    padding: 18,
    borderRadius: 100,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#A855F7',
    marginBottom: 10,
  },
  secondaryBtnText: {
    color: '#C084FC',
    fontWeight: '800',
    fontSize: 16,
  },
  congratsContainer: {
    flex: 1,
    backgroundColor: '#0F1A35',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  congratsCard: {
    backgroundColor: '#172545',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#1E293B',
    elevation: 10,
  },
  congratsEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  congratsTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  congratsSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  progressBox: {
    backgroundColor: '#0F1A35',
    padding: 20,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  progressBoxText: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  progressDotsBox: {
    flexDirection: 'row',
    gap: 12,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#334155',
  },
  stepDotFilled: {
    backgroundColor: '#A855F7',
    borderColor: '#C084FC',
  },
  badgePopup: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#172545',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#A855F7',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 10,
    marginBottom: 32,
    zIndex: 10,
  },
  newBadgeIcon: {
    fontSize: 72,
  },
  congratsContent: {
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#172545',
    padding: 32,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  praiseMessage: {
    fontSize: 16,
    color: '#A855F7',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  congratsLevel: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '800',
    marginBottom: 24,
  },
  badgeProgress: {
    width: '100%',
    backgroundColor: '#0F1A35',
    padding: 16,
    borderRadius: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  badgeProgressText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  badgeRowIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
  newBadgeHighlight: {
    opacity: 1,
    transform: [{ scale: 1.2 }],
  },
  confetti: {
    position: 'absolute',
    fontSize: 24,
    zIndex: 100,
  },
  resultsCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultsBadgeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  resultsEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  resultsScore: {
    fontSize: 48,
    fontWeight: '900',
    color: '#A855F7',
    marginBottom: 16,
  },
  resultsMsg: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  retakeHint: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 16,
  },
  homeLink: {
    marginTop: 24,
    padding: 16,
  },
  homeLinkText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 15,
  },
  // Quit Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
  },
  modalEmoji: { fontSize: 48, marginBottom: 12 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalBtnDanger: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalBtnDangerText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  modalBtnCancel: {
    backgroundColor: '#A855F7',
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnCancelText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
