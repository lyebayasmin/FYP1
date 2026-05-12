import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import wordsData from '../data/vocabularyLessons.json';
import { syncCurrentProgressToLanguage } from './utils/userStorage';

type LangKey = 'spanish' | 'german' | 'urdu';

interface WordEntry {
  word: string;
  translation: string;
}

interface Question {
  foreignPhrase: string;
  correctAnswer: string;
  options: string[];
  explanation: string;
  words: WordEntry[];
}

const LANG_LABELS: Record<LangKey, string> = {
  german: 'German',
  spanish: 'Spanish',
  urdu: 'Urdu',
};

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
    if (!selected) {
      Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
    }
  };

  const handlePressOut = () => {
    if (!selected) {
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    }
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
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
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

export default function BeginnerQuizScreen() {
  const router = useRouter();

  const [lang, setLang] = useState<LangKey>('spanish');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showNewBadge, setShowNewBadge] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState(1);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [badgeCount, setBadgeCount] = useState(0);
  const [newBadgeIcon, setNewBadgeIcon] = useState('🥉');
  const [lessonsCompleted, setLessonsCompleted] = useState(0);
  const [praiseMessage, setPraiseMessage] = useState('');

  const cardAnim = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const badgeRotate = useRef(new Animated.Value(0)).current;
  const badgeSlideY = useRef(new Animated.Value(-200)).current;
  const congratsScale = useRef(new Animated.Value(0)).current;
  const feedbackScale = useRef(new Animated.Value(0.8)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  
  const confettiAnims = useRef(
    [...Array(30)].map(() => ({
      translateY: new Animated.Value(-50),
      translateX: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    init();
  }, []);

  const triggerHapticFeedback = () => {
    try {
      if (Platform.OS !== 'web') {
        const { Vibration } = require('react-native');
        Vibration.vibrate([0, 100, 100, 200]);
      }
    } catch (error) {}
  };

  const init = async () => {
    const savedWords = await AsyncStorage.getItem('currentQuizWords');
    const savedLang = await AsyncStorage.getItem('currentQuizLang');
    const savedLevel = await AsyncStorage.getItem('beginnerLevel');
    const savedLessonIndex = await AsyncStorage.getItem('beginnerLessonIndex');
    const savedBadges = await AsyncStorage.getItem('beginnerBadgeCount');
    const savedLessonsCompleted = await AsyncStorage.getItem('beginnerLessonsCompleted');

    const currentLevel = savedLevel ? parseInt(savedLevel) : 1;
    const currentLessonIndex = savedLessonIndex ? parseInt(savedLessonIndex) : 0;
    const currentBadges = savedBadges ? parseInt(savedBadges) : 0;
    const completedCount = savedLessonsCompleted ? parseInt(savedLessonsCompleted) : 0;

    setUserLevel(currentLevel);
    setLessonIndex(currentLessonIndex);
    setBadgeCount(currentBadges);
    setLessonsCompleted(completedCount);

    if (savedLang && ['spanish', 'german', 'urdu'].includes(savedLang)) {
      setLang(savedLang as LangKey);
    }

    let words: WordEntry[] = [];
    if (savedWords) {
      words = JSON.parse(savedWords);
    }

    const qs = buildQuestions(words, currentLevel);
    setQuestions(qs);
    setLoading(false);
    animateCardIn();
  };

  const buildQuestions = (words: WordEntry[], level: number): Question[] => {
    let numWords = 1;
    if (level === 2) numWords = 2;
    if (level >= 3) numWords = 3;

    if (words.length < numWords) return [];

    const questions: Question[] = [];
    const shuffledWords = shuffle([...words]);

    for (let i = 0; i < QUIZ_SIZE && i < shuffledWords.length; i++) {
      const primaryWord = shuffledWords[i];
      const questionWords = [primaryWord];
      
      if (numWords > 1) {
        const otherWords = words.filter(w => w.word !== primaryWord.word);
        const additionalWords = shuffle(otherWords).slice(0, numWords - 1);
        questionWords.push(...additionalWords);
      }

      const foreignPhrase = questionWords.map(w => w.word).join(' ');
      const correctAnswer = questionWords.map(w => w.translation).join(' ');

      const distractors: string[] = [];
      let attempts = 0;
      while (distractors.length < 3 && attempts < 50) {
        let distractorWords = [];
        if (numWords === 1) {
          const wrongWord = words[Math.floor(Math.random() * words.length)];
          distractorWords = [wrongWord];
        } else {
          distractorWords = shuffle([...words]).slice(0, numWords);
        }
        
        const distractorText = distractorWords.map(w => w.translation).join(' ');
        if (distractorText !== correctAnswer && !distractors.includes(distractorText)) {
          distractors.push(distractorText);
        }
        attempts++;
      }

      const placeholders = ['(none of these)', '(not applicable)', '(unknown)'];
      let pIdx = 0;
      while (distractors.length < 3) {
        const p = placeholders[pIdx++ % placeholders.length];
        if (!distractors.includes(p) && p !== correctAnswer) distractors.push(p);
      }

      const explanation = `"${foreignPhrase}" means "${correctAnswer}".`;

      questions.push({
        foreignPhrase,
        correctAnswer,
        options: shuffle([correctAnswer, ...distractors]),
        explanation,
        words: questionWords,
      });
    }

    return questions;
  };

  const animateCardIn = () => {
    cardAnim.setValue(50);
    Animated.spring(cardAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
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
    
    confettiAnims.forEach((anim, index) => {
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

    const isCorrect = option === questions[currentIndex].correctAnswer;
    if (isCorrect) {
      setScore(s => s + 1);
    } else {
      setMistakes(m => [...m, currentIndex]);
    }
    
    // Play feedback animation
    animateFeedbackIn();
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setShowResults(true);
    } else {
      setCurrentIndex(currentIndex + 1);
      setSelected(null);
      animateCardIn();
    }
  };

  const handleRetakeQuiz = () => {
    const reshuffled = questions.map(q => ({
      ...q,
      options: shuffle([...q.options]),
    }));
    setQuestions(reshuffled);
    setCurrentIndex(0);
    setSelected(null);
    setScore(0);
    setMistakes([]);
    setShowResults(false);
    animateCardIn();
  };

  const handleNextLesson = async () => {
    const isPerfect = score === QUIZ_SIZE;
    
    if (isPerfect) {
      const newLessonsCompleted = lessonsCompleted + 1;
      
      // User earns a badge and levels up every 3 lessons completed!
      const isLevelUpTime = newLessonsCompleted % 3 === 0;
      let newBadgeCount = badgeCount;
      let newLevel = userLevel;
      
      if (isLevelUpTime) {
        newBadgeCount = badgeCount + 1;
        newLevel = userLevel + 1; // Level goes from Beginner (1-3) -> Intermediate (4-6) -> Pro (7+)
        
        setNewBadgeIcon(BADGE_ICONS[Math.min(newBadgeCount - 1, BADGE_ICONS.length - 1)]);
        setBadgeCount(newBadgeCount);
        setUserLevel(newLevel);
        setPraiseMessage(getRandomPraise());
        
        await AsyncStorage.setItem('beginnerBadgeCount', String(newBadgeCount));
      }
      
      const langData = wordsData[lang as keyof typeof wordsData];
      const nextLessonIndex = (lessonIndex + 1) % langData.lessons.length;

      await AsyncStorage.setItem('beginnerLevel', String(newLevel));
      await AsyncStorage.setItem('beginnerLessonIndex', String(nextLessonIndex));
      await AsyncStorage.setItem('beginnerLessonsCompleted', String(newLessonsCompleted));
      await AsyncStorage.setItem('lastLessonDate', new Date().toDateString());
      await syncCurrentProgressToLanguage(lang);

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
      const langData = wordsData[lang as keyof typeof wordsData];
      const nextLessonIndex = (lessonIndex + 1) % langData.lessons.length;
      await AsyncStorage.setItem('beginnerLessonIndex', String(nextLessonIndex));
      await syncCurrentProgressToLanguage(lang);
      router.replace('/BeginnerLessonScreen');
    }
  };

  const handleContinueAfterCongrats = () => {
    setShowCongrats(false);
    setShowNewBadge(false);
    router.replace('/BeginnerLessonScreen');
  };

  const getBadgeIcon = (count: number) => {
    if (count <= 0) return '🎯';
    return BADGE_ICONS[Math.min(count - 1, BADGE_ICONS.length - 1)];
  };

  if (loading || questions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Building your quiz...</Text>
      </View>
    );
  }

  const levelName = getLevelName(userLevel);

  // LEVEL UP / NEW BADGE MODAL
  if (showNewBadge) {
    const spin = badgeRotate.interpolate({
      inputRange: [0, 2],
      outputRange: ['0deg', '720deg'],
    });

    const confettiEmojis = ['🎉', '🎊', '✨', '⭐', '💫', '🌟', '💖', '🎈'];

    return (
      <View style={styles.congratsContainer}>
        {confettiAnims.map((anim, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.confetti,
              {
                transform: [
                  { translateY: anim.translateY },
                  { translateX: anim.translateX },
                  { rotate: anim.rotate.interpolate({ inputRange: [0, 10], outputRange: ['0deg', '3600deg'] }) },
                ],
                opacity: anim.opacity,
                left: '50%',
              },
            ]}
          >
            {confettiEmojis[i % confettiEmojis.length]}
          </Animated.Text>
        ))}

        <Animated.View style={[styles.badgePopup, { transform: [{ translateY: badgeSlideY }, { scale: badgeScale }, { rotate: spin }] }]}>
          <Text style={styles.newBadgeIcon}>{newBadgeIcon}</Text>
        </Animated.View>

        <View style={styles.congratsContent}>
          <Text style={styles.congratsTitle}>LEVEL UP!</Text>
          <Text style={styles.praiseMessage}>{praiseMessage}</Text>
          <Text style={styles.congratsSubtitle}>You have conquered 3 lessons and leveled up!</Text>
          <Text style={styles.congratsLevel}>You are now: <Text style={{color: '#A855F7'}}>{levelName}</Text></Text>

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

          <TouchableOpacity style={styles.actionBtn} onPress={handleContinueAfterCongrats}>
            <Text style={styles.actionBtnText}>Continue Quest!</Text>
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
          <Text style={styles.congratsTitle}>FLAWLESS VICTORY!</Text>
          <Text style={styles.congratsSubtitle}>You got all 5 answers correct!</Text>
          
          <View style={styles.progressBox}>
            <Text style={styles.progressBoxText}>
              {3 - (lessonsCompleted % 3)} more perfect lessons until LEVEL UP!
            </Text>
            {/* Visual dots representing the 3 steps */}
            <View style={styles.progressDotsBox}>
               {[1, 2, 3].map(step => (
                 <View key={step} style={[styles.stepDot, step <= (lessonsCompleted % 3) && styles.stepDotFilled]} />
               ))}
            </View>
          </View>

          <TouchableOpacity style={styles.actionBtn} onPress={handleContinueAfterCongrats}>
            <Text style={styles.actionBtnText}>Next Lesson!</Text>
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
            {isPerfect ? "Amazing! You have mastered these words!" : `You made ${mistakes.length} mistake${mistakes.length > 1 ? 's' : ''}. Practice makes perfect!`}
          </Text>

          {hasMistakes && !isPerfect ? (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={handleRetakeQuiz}>
                <Text style={styles.actionBtnText}>Retake Quiz</Text>
              </TouchableOpacity>
              <Text style={styles.retakeHint}>Get all 5 correct to earn progress toward Level Up!</Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleNextLesson}>
                <Text style={styles.secondaryBtnText}>Skip to Next Lesson</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.actionBtn} onPress={handleNextLesson}>
              <Text style={styles.actionBtnText}>Claim Reward & Continue!</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.homeLink} onPress={() => router.replace('/WelcomeScreen')}>
            <Text style={styles.homeLinkText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const q = questions[currentIndex];
  const isCorrect = selected === q.correctAnswer;
  const isWrong = selected !== null && selected !== q.correctAnswer;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Game Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/BeginnerLessonScreen')} style={styles.backButton}>
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

      <View style={styles.progressContainer}>
        {Array.from({ length: QUIZ_SIZE }).map((_, i) => (
          <View key={i} style={[styles.progressDot, i < currentIndex && styles.progressDotDone, i === currentIndex && styles.progressDotCurrent]} />
        ))}
      </View>

      <Animated.View style={[styles.questionBox, { transform: [{ translateY: cardAnim }] }]}>
        <Text style={styles.questionLabel}>What is the meaning of...</Text>
        <Text style={styles.questionWord}>{q.foreignPhrase}</Text>
      </Animated.View>

      <View style={styles.optionsContainer}>
        {q.options.map((option, idx) => (
          <QuizOption 
            key={idx} 
            option={option} 
            idx={idx} 
            selected={selected} 
            correctAnswer={q.correctAnswer} 
            onSelect={handleSelect} 
          />
        ))}
      </View>

      {/* Feedback Area */}
      {selected && (
        <Animated.View style={[styles.feedbackBox, isCorrect ? styles.feedbackCorrect : styles.feedbackWrong, { opacity: feedbackOpacity, transform: [{ scale: feedbackScale }] }]}>
          <Text style={styles.feedbackTitle}>{isCorrect ? 'Excellent! 🎯' : 'Not quite! 💔'}</Text>
          {isWrong && (
            <Text style={styles.feedbackAnswer}>Correct Answer: <Text style={{color: '#FFFFFF'}}>{q.correctAnswer}</Text></Text>
          )}
          <Text style={styles.feedbackExplanation}>{q.explanation}</Text>
        </Animated.View>
      )}

      {selected && (
        <TouchableOpacity style={styles.actionBtn} onPress={handleNext}>
          <Text style={styles.actionBtnText}>{currentIndex + 1 >= QUIZ_SIZE ? 'See Results →' : 'Next Question →'}</Text>
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
    paddingVertical: 20,
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
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
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
    alignItems: 'center',
    width: '100%',
  },
  secondaryBtnText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 15,
  },
  // Modal / Results Styles
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
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
  // Level Up specific styles
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
  // Results screen styling
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
});
