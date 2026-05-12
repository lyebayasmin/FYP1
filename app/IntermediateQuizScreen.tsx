/**
 * IntermediateQuizScreen.tsx
 *
 * Used ONLY for the "Know the Basics" path selected on KnowledgeCheckScreen.
 * Totally separate from BeginnerQuizScreen (which is untouched).
 *
 * Progression:
 *   Sub-level 1 — 3 quizzes — 1 word per question
 *   Sub-level 2 — 3 quizzes — 2 words per question
 *   Sub-level 3 — 3 quizzes — 3 words per question
 *
 * Rules:
 *   • Wrong answer immediately shows correct answer + explanation
 *   • Must score 5/5 to advance — no skip option
 *   • After 3 perfect quizzes at a sub-level → badge + sub-level up
 *   • After clearing all 3 sub-levels → graduation badge
 */

import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import wordsData from '../data/vocabularyLessons.json';
import { getUserData, syncCurrentProgressToLanguage } from './utils/userStorage';

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

const QUIZ_SIZE = 5;
const QUIZZES_PER_SUB_LEVEL = 3;
const BADGE_ICONS = ['🥉', '🥈', '🥇', '🏅', '🎖️', '👑', '💎', '🌟', '⭐', '🏆'];

const getWordCount = (subLevel: number) => {
  if (subLevel <= 1) return 1;
  if (subLevel === 2) return 2;
  return 3;
};

const getSubLevelName = (subLevel: number) => {
  if (subLevel <= 1) return 'Level 1 – Single Words';
  if (subLevel === 2) return 'Level 2 – Word Pairs';
  return 'Level 3 – Phrases';
};

const getLevelName = (level: number) => {
  if (level <= 1) return 'Beginner';
  if (level === 2) return 'Intermediate';
  return 'Advanced';
};

const PRAISE = [
  "You're absolutely AMAZING! 🌟",
  "Incredible! You're a language superstar! ⭐",
  "WOW! You're crushing it! 💫",
  "Outstanding work! Keep shining! 🎯",
  "Phenomenal! You're on fire! 🔥",
];
const randomPraise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ─── Option Card ────────────────────────────────────────────────────────────
const QuizOption = ({
  option, idx, selected, correctAnswer, onSelect,
}: {
  option: string; idx: number; selected: string | null;
  correctAnswer: string; onSelect: (o: string) => void;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const isCorrect = selected && option === correctAnswer;
  const isWrong   = selected && option === selected && option !== correctAnswer;
  const isDim     = selected && option !== correctAnswer && option !== selected;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={() => { if (!selected) Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start(); }}
      onPressOut={() => { if (!selected) Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start(); }}
      onPress={() => { if (!selected) onSelect(option); }}
    >
      <Animated.View style={[
        styles.optionCard,
        isCorrect && styles.optionCorrect,
        isWrong   && styles.optionWrong,
        isDim     && styles.optionDim,
        { transform: [{ scale }] },
      ]}>
        <View style={[styles.bubble, isCorrect && styles.bubbleCorrect, isWrong && styles.bubbleWrong]}>
          <Text style={[styles.bubbleText, (isCorrect || isWrong) && styles.bubbleTextLight]}>
            {String.fromCharCode(65 + idx)}
          </Text>
        </View>
        <Text style={[
          styles.optionText,
          isCorrect && styles.optionTextCorrect,
          isWrong   && styles.optionTextWrong,
          isDim     && styles.optionTextDim,
        ]}>
          {option}
        </Text>
        {isCorrect && <Text style={styles.iconCorrect}>✓</Text>}
        {isWrong   && <Text style={styles.iconWrong}>✕</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function IntermediateQuizScreen() {
  const router = useRouter();

  const [lang, setLang] = useState<LangKey>('spanish');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState<number[]>([]);

  const [view, setView] = useState<'quiz' | 'results' | 'congrats' | 'sublevelup' | 'graduated'>('quiz');
  const [loading, setLoading] = useState(true);

  // Progression state (all persisted separately from beginner)
  const [subLevel, setSubLevel] = useState(1);           // 1 | 2 | 3
  const [quizzesPassed, setQuizzesPassed] = useState(0); // 0-2
  const [badgeCount, setBadgeCount] = useState(0);
  const [overallLevel, setOverallLevel] = useState(1);   // for display
  const [lessonIndex, setLessonIndex] = useState(0);
  const [newBadgeIcon, setNewBadgeIcon] = useState('🥉');
  const [praise, setPraise] = useState('');

  // Animations
  const cardAnim      = useRef(new Animated.Value(0)).current;
  const feedbackScale = useRef(new Animated.Value(0.8)).current;
  const feedbackAlpha = useRef(new Animated.Value(0)).current;
  const congratsScale = useRef(new Animated.Value(0)).current;
  const badgeSlideY   = useRef(new Animated.Value(-200)).current;
  const badgeScale    = useRef(new Animated.Value(0)).current;
  const badgeRotate   = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    [...Array(30)].map(() => ({
      translateY: new Animated.Value(-50),
      translateX: new Animated.Value(0),
      rotate:     new Animated.Value(0),
      opacity:    new Animated.Value(1),
    }))
  ).current;

  useEffect(() => { init(); }, []);

  // ── Init ───────────────────────────────────────────────────────────────────
  const init = async () => {
    const user = await getUserData();
    const userLang = ((user?.language || 'spanish').toLowerCase()) as string;
    const safeLang: LangKey = ['german', 'spanish', 'urdu'].includes(userLang)
      ? (userLang as LangKey) : 'spanish';
    setLang(safeLang);

    const savedSubLevel      = await AsyncStorage.getItem('intermediateSubLevel');
    const savedQuizzesPassed = await AsyncStorage.getItem('intermediateQuizzesPassed');
    const savedBadgeCount    = await AsyncStorage.getItem('intermediateBadgeCount');
    const savedLessonIndex   = await AsyncStorage.getItem('intermediateLessonIndex');
    const savedOverallLevel  = await AsyncStorage.getItem('beginnerLevel');

    const sl   = savedSubLevel      ? parseInt(savedSubLevel)      : 1;
    const qp   = savedQuizzesPassed ? parseInt(savedQuizzesPassed) : 0;
    const bc   = savedBadgeCount    ? parseInt(savedBadgeCount)    : 0;
    const li   = savedLessonIndex   ? parseInt(savedLessonIndex)   : 0;
    const ol   = savedOverallLevel  ? parseInt(savedOverallLevel)  : 1;

    setSubLevel(sl);
    setQuizzesPassed(qp);
    setBadgeCount(bc);
    setLessonIndex(li);
    setOverallLevel(ol);

    const langData = wordsData[safeLang as keyof typeof wordsData];
    const lesson = langData?.lessons[li];
    const words: WordEntry[] = lesson ? (lesson as any).words || [] : [];

    const qs = buildQuestions(words, sl);
    setQuestions(qs);
    setLoading(false);
    animateCardIn();
  };

  // ── Build questions ────────────────────────────────────────────────────────
  const buildQuestions = (words: WordEntry[], sl: number): Question[] => {
    const numWords = getWordCount(sl);
    if (words.length < numWords) return [];

    const result: Question[] = [];
    const shuffled = shuffle([...words]);

    for (let i = 0; i < QUIZ_SIZE && i < shuffled.length; i++) {
      const primary = shuffled[i];
      const qWords  = [primary];

      if (numWords > 1) {
        const others = shuffle(words.filter(w => w.word !== primary.word)).slice(0, numWords - 1);
        qWords.push(...others);
      }

      const foreignPhrase  = qWords.map(w => w.word).join(' ');
      const correctAnswer  = qWords.map(w => w.translation).join(' ');

      // Distractors
      const distractors: string[] = [];
      let attempts = 0;
      while (distractors.length < 3 && attempts < 50) {
        const dWords = shuffle([...words]).slice(0, numWords);
        const dText  = dWords.map(w => w.translation).join(' ');
        if (dText !== correctAnswer && !distractors.includes(dText)) distractors.push(dText);
        attempts++;
      }
      const placeholders = ['(none of these)', '(not applicable)', '(unknown)'];
      let pi = 0;
      while (distractors.length < 3) {
        const p = placeholders[pi++ % placeholders.length];
        if (!distractors.includes(p) && p !== correctAnswer) distractors.push(p);
      }

      // Explanation shown on wrong answer
      const explanation = numWords === 1
        ? `"${foreignPhrase}" means "${correctAnswer}" in English.`
        : `"${foreignPhrase}" → "${correctAnswer}". Breakdown: ${qWords.map(w => `"${w.word}" = "${w.translation}"`).join(', ')}.`;

      result.push({
        foreignPhrase,
        correctAnswer,
        options: shuffle([correctAnswer, ...distractors]),
        explanation,
        words: qWords,
      });
    }
    return result;
  };

  // ── Animations ─────────────────────────────────────────────────────────────
  const animateCardIn = () => {
    cardAnim.setValue(50);
    Animated.spring(cardAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }).start();
  };

  const animateFeedback = () => {
    feedbackScale.setValue(0.8);
    feedbackAlpha.setValue(0);
    Animated.parallel([
      Animated.spring(feedbackScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      Animated.timing(feedbackAlpha, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const animateCongrats = () => {
    congratsScale.setValue(0);
    Animated.spring(congratsScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }).start();
  };

  const animateBadge = () => {
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

    const { width, height } = Dimensions.get('window');
    confettiAnims.forEach(a => {
      const rx = (Math.random() - 0.5) * width;
      const rd = Math.random() * 500;
      a.translateY.setValue(-50);
      a.translateX.setValue(rx);
      a.rotate.setValue(0);
      a.opacity.setValue(1);
      Animated.sequence([
        Animated.delay(rd),
        Animated.parallel([
          Animated.timing(a.translateY, { toValue: height + 100, duration: 2000 + Math.random() * 1000, useNativeDriver: true }),
          Animated.timing(a.translateX, { toValue: rx + (Math.random() - 0.5) * 200, duration: 2000, useNativeDriver: true }),
          Animated.timing(a.rotate,     { toValue: Math.random() * 10, duration: 2000, useNativeDriver: true }),
          Animated.timing(a.opacity,    { toValue: 0, duration: 2500, useNativeDriver: true }),
        ]),
      ]).start();
    });
  };

  const haptic = () => {
    try { if (Platform.OS !== 'web') require('react-native').Vibration.vibrate([0,100,100,200]); } catch {}
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSelect = (option: string) => {
    if (selected) return;
    setSelected(option);
    if (option === questions[currentIndex].correctAnswer) {
      setScore(s => s + 1);
    } else {
      setWrongAnswers(prev => [...prev, currentIndex]);
    }
    animateFeedback();
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setView('results');
    } else {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      animateCardIn();
    }
  };

  const handleRetake = () => {
    setQuestions(qs => qs.map(q => ({ ...q, options: shuffle([...q.options]) })));
    setCurrentIndex(0);
    setSelected(null);
    setScore(0);
    setWrongAnswers([]);
    setView('quiz');
    animateCardIn();
  };

  const handlePerfectContinue = async () => {
    const newQuizzesPassed = quizzesPassed + 1;

    // Advance lesson index
    const langData = wordsData[lang as keyof typeof wordsData];
    const nextLesson = (lessonIndex + 1) % langData.lessons.length;
    await AsyncStorage.setItem('intermediateLessonIndex', String(nextLesson));
    await AsyncStorage.setItem('lastLessonDate', new Date().toDateString());
    setLessonIndex(nextLesson);

    if (newQuizzesPassed >= QUIZZES_PER_SUB_LEVEL) {
      // Sub-level cleared — earn badge and advance
      const newSubLevel   = subLevel + 1;
      const newBadgeCount = badgeCount + 1;
      const newOverall    = overallLevel + 1;
      const icon          = BADGE_ICONS[Math.min(newBadgeCount - 1, BADGE_ICONS.length - 1)];

      setNewBadgeIcon(icon);
      setBadgeCount(newBadgeCount);
      setOverallLevel(newOverall);
      setSubLevel(newSubLevel);
      setQuizzesPassed(0);
      setPraise(randomPraise());

      await AsyncStorage.setItem('intermediateSubLevel',      String(newSubLevel));
      await AsyncStorage.setItem('intermediateBadgeCount',    String(newBadgeCount));
      await AsyncStorage.setItem('intermediateQuizzesPassed', '0');
      await AsyncStorage.setItem('beginnerLevel',             String(newOverall));
      await syncCurrentProgressToLanguage(lang);

      haptic();
      if (newSubLevel > 3) {
        // All 3 sub-levels done — graduated!
        setTimeout(() => animateBadge(), 100);
        setView('graduated');
      } else {
        setTimeout(() => animateBadge(), 100);
        setView('sublevelup');
      }
    } else {
      // Same sub-level, more quizzes needed
      await AsyncStorage.setItem('intermediateQuizzesPassed', String(newQuizzesPassed));
      await syncCurrentProgressToLanguage(lang);
      setQuizzesPassed(newQuizzesPassed);
      animateCongrats();
      setView('congrats');
    }
  };

  const goNextLesson = async () => {
    // Load fresh lesson words for the new lessonIndex
    const langData = wordsData[lang as keyof typeof wordsData];
    const lesson   = langData?.lessons[lessonIndex];
    const words: WordEntry[] = lesson ? (lesson as any).words || [] : [];
    const qs = buildQuestions(words, subLevel);
    setQuestions(qs);
    setCurrentIndex(0);
    setSelected(null);
    setScore(0);
    setWrongAnswers([]);
    setView('quiz');
    animateCardIn();
  };

  const getBadgeIcon = (count: number) =>
    count <= 0 ? '🎯' : BADGE_ICONS[Math.min(count - 1, BADGE_ICONS.length - 1)];

  // ─────────────────────────────────────────────────────────────────────────
  if (loading || questions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Building your quiz... ✨</Text>
      </View>
    );
  }

  const confettiEmojis = ['🎉', '🎊', '✨', '⭐', '💫', '🌟', '💖', '🎈'];

  // ── GRADUATED SCREEN ─────────────────────────────────────────────────────
  if (view === 'graduated') {
    const spin = badgeRotate.interpolate({ inputRange: [0, 2], outputRange: ['0deg', '720deg'] });
    return (
      <View style={styles.fullCenter}>
        {confettiAnims.map((a, i) => (
          <Animated.Text key={i} style={[styles.confetti, {
            transform: [
              { translateY: a.translateY },
              { translateX: a.translateX },
              { rotate: a.rotate.interpolate({ inputRange: [0,10], outputRange: ['0deg','3600deg'] }) },
            ],
            opacity: a.opacity, left: '50%',
          }]}>{confettiEmojis[i % confettiEmojis.length]}</Animated.Text>
        ))}
        <Animated.View style={[styles.badgeCircle, { transform: [{ translateY: badgeSlideY }, { scale: badgeScale }, { rotate: spin }] }]}>
          <Text style={styles.bigBadgeEmoji}>{newBadgeIcon}</Text>
        </Animated.View>
        <View style={styles.celebCard}>
          <Text style={styles.celebTitle}>🎓 ALL LEVELS CLEARED!</Text>
          <Text style={styles.celebPraise}>{praise}</Text>
          <Text style={styles.celebSub}>You've mastered single words, word pairs, and full phrases in {lang.charAt(0).toUpperCase() + lang.slice(1)}!</Text>
          <Text style={styles.celebLevel}>You are now: <Text style={styles.purple}>{getLevelName(overallLevel)}</Text></Text>
          <View style={styles.badgeRow}>
            {[...Array(Math.min(badgeCount, 10))].map((_, i) => (
              <Text key={i} style={[styles.badgeRowIcon, i === badgeCount - 1 && styles.badgeRowIconNew]}>
                {BADGE_ICONS[Math.min(i, BADGE_ICONS.length - 1)]}
              </Text>
            ))}
          </View>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/WelcomeScreen')}>
            <Text style={styles.btnText}>Go to Home 🏠</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── SUB-LEVEL UP SCREEN ──────────────────────────────────────────────────
  if (view === 'sublevelup') {
    const spin = badgeRotate.interpolate({ inputRange: [0, 2], outputRange: ['0deg', '720deg'] });
    return (
      <View style={styles.fullCenter}>
        {confettiAnims.map((a, i) => (
          <Animated.Text key={i} style={[styles.confetti, {
            transform: [
              { translateY: a.translateY },
              { translateX: a.translateX },
              { rotate: a.rotate.interpolate({ inputRange: [0,10], outputRange: ['0deg','3600deg'] }) },
            ],
            opacity: a.opacity, left: '50%',
          }]}>{confettiEmojis[i % confettiEmojis.length]}</Animated.Text>
        ))}
        <Animated.View style={[styles.badgeCircle, { transform: [{ translateY: badgeSlideY }, { scale: badgeScale }, { rotate: spin }] }]}>
          <Text style={styles.bigBadgeEmoji}>{newBadgeIcon}</Text>
        </Animated.View>
        <View style={styles.celebCard}>
          <Text style={styles.celebTitle}>⬆️ LEVEL UP!</Text>
          <Text style={styles.celebPraise}>{praise}</Text>
          <Text style={styles.celebSub}>You cleared 3 quizzes and unlocked the next challenge!</Text>
          <View style={styles.subLevelBanner}>
            <Text style={styles.subLevelBannerLabel}>Now entering:</Text>
            <Text style={styles.subLevelBannerValue}>{getSubLevelName(subLevel)}</Text>
          </View>
          <View style={styles.subLevelDots}>
            {[1, 2, 3].map(lvl => (
              <View key={lvl} style={[styles.slDot, lvl < subLevel && styles.slDotDone, lvl === subLevel && styles.slDotCurrent]}>
                <Text style={styles.slDotText}>{lvl}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.btn} onPress={goNextLesson}>
            <Text style={styles.btnText}>Start {getSubLevelName(subLevel)} →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── CONGRATS (quiz passed, same sub-level) ───────────────────────────────
  if (view === 'congrats') {
    const remaining = QUIZZES_PER_SUB_LEVEL - quizzesPassed;
    return (
      <View style={styles.fullCenter}>
        <Animated.View style={[styles.congratsCard, { transform: [{ scale: congratsScale }] }]}>
          <Text style={styles.bigEmoji}>🔥</Text>
          <Text style={styles.celebTitle}>FLAWLESS!</Text>
          <Text style={styles.celebSub}>You got all {QUIZ_SIZE} correct!</Text>
          <View style={styles.progressBox}>
            <Text style={styles.subLevelTag}>{getSubLevelName(subLevel)}</Text>
            <Text style={styles.progressBoxText}>
              {remaining} more perfect {remaining === 1 ? 'quiz' : 'quizzes'} to unlock the next level!
            </Text>
            <View style={styles.miniDots}>
              {[1, 2, 3].map(s => (
                <View key={s} style={[styles.stepDot, s <= quizzesPassed && styles.stepDotFilled]} />
              ))}
            </View>
          </View>
          <TouchableOpacity style={styles.btn} onPress={goNextLesson}>
            <Text style={styles.btnText}>Next Lesson! →</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ── RESULTS SCREEN ───────────────────────────────────────────────────────
  if (view === 'results') {
    const isPerfect = score === QUIZ_SIZE;
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.resultsScroll}>
        {/* Header badges */}
        <View style={styles.resultsBadgeRow}>
          <View style={styles.badgePill}><Text style={styles.badgePillText}>{getLevelName(overallLevel)}</Text></View>
          <View style={styles.badgePillDark}>
            <Text style={styles.badgePillIcon}>{getBadgeIcon(badgeCount)}</Text>
            <Text style={styles.badgePillText}>{badgeCount}</Text>
          </View>
        </View>

        <Text style={styles.resultsEmoji}>{isPerfect ? '🏆' : '📚'}</Text>
        <Text style={styles.resultsTitle}>{isPerfect ? 'Perfect Score!' : 'Almost There!'}</Text>
        <Text style={styles.resultsScore}>{score} / {QUIZ_SIZE}</Text>

        {/* Sub-level progress */}
        <View style={styles.subLevelProgressBar}>
          <Text style={styles.subLevelTag}>{getSubLevelName(subLevel)}</Text>
          <View style={styles.miniDots}>
            {[1, 2, 3].map(s => (
              <View key={s} style={[styles.stepDot, s <= quizzesPassed && styles.stepDotFilled]} />
            ))}
          </View>
          <Text style={styles.quizCountText}>Quiz {quizzesPassed + 1} of {QUIZZES_PER_SUB_LEVEL}</Text>
        </View>

        {isPerfect ? (
          <>
            <Text style={styles.resultsMsg}>Amazing! You've mastered these {getWordCount(subLevel) > 1 ? 'combinations' : 'words'}!</Text>
            <TouchableOpacity style={styles.btn} onPress={handlePerfectContinue}>
              <Text style={styles.btnText}>Claim Reward & Continue! 🎉</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.resultsMsg}>
              You got {wrongAnswers.length} {wrongAnswers.length === 1 ? 'answer' : 'answers'} wrong.{'\n'}
              Score {QUIZ_SIZE}/{QUIZ_SIZE} to advance — review below and try again!
            </Text>

            {/* Review wrong answers */}
            <View style={styles.reviewSection}>
              <Text style={styles.reviewTitle}>📖 Review These:</Text>
              {wrongAnswers.map(qi => {
                const q = questions[qi];
                return (
                  <View key={qi} style={styles.reviewCard}>
                    <Text style={styles.reviewForeign}>"{q.foreignPhrase}"</Text>
                    <Text style={styles.reviewArrow}>↓</Text>
                    <Text style={styles.reviewCorrect}>{q.correctAnswer}</Text>
                    <Text style={styles.reviewExplanation}>{q.explanation}</Text>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleRetake}>
              <Text style={styles.btnText}>Retake Quiz 🔁</Text>
            </TouchableOpacity>
            <Text style={styles.retakeHint}>Score {QUIZ_SIZE}/{QUIZ_SIZE} to earn progress toward Level Up!</Text>
          </>
        )}

        <TouchableOpacity style={styles.homeLink} onPress={() => router.replace('/WelcomeScreen')}>
          <Text style={styles.homeLinkText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── ACTIVE QUIZ ──────────────────────────────────────────────────────────
  const q = questions[currentIndex];
  const isCorrect = selected === q.correctAnswer;
  const isWrong   = selected !== null && selected !== q.correctAnswer;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/WelcomeScreen')} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.subLevelTag}>{getSubLevelName(subLevel)}</Text>
        </View>
        <View style={styles.badgePillDark}>
          <Text style={styles.badgePillIcon}>{getBadgeIcon(badgeCount)}</Text>
          <Text style={styles.badgePillText}>Lvl {overallLevel}</Text>
        </View>
      </View>

      {/* Progress dots for this quiz */}
      <View style={styles.progressDots}>
        {Array.from({ length: QUIZ_SIZE }).map((_, i) => (
          <View key={i} style={[
            styles.pDot,
            i < currentIndex && styles.pDotDone,
            i === currentIndex && styles.pDotCurrent,
          ]} />
        ))}
      </View>

      {/* Quiz counter row */}
      <View style={styles.quizCountRow}>
        <Text style={styles.quizCountText}>Quiz {quizzesPassed + 1} of {QUIZZES_PER_SUB_LEVEL} to level up</Text>
        <View style={styles.miniDots}>
          {[1, 2, 3].map(s => (
            <View key={s} style={[
              styles.miniDot,
              s <= quizzesPassed && styles.miniDotFilled,
              s === quizzesPassed + 1 && styles.miniDotCurrent,
            ]} />
          ))}
        </View>
      </View>

      {/* Question */}
      <Animated.View style={[styles.questionBox, { transform: [{ translateY: cardAnim }] }]}>
        <Text style={styles.questionLabel}>What is the meaning of...</Text>
        <Text style={styles.questionWord}>{q.foreignPhrase}</Text>
      </Animated.View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {q.options.map((opt, idx) => (
          <QuizOption
            key={idx} option={opt} idx={idx}
            selected={selected} correctAnswer={q.correctAnswer}
            onSelect={handleSelect}
          />
        ))}
      </View>

      {/* Feedback — always shown after selecting, with explanation on wrong */}
      {selected && (
        <Animated.View style={[
          styles.feedbackBox,
          isCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
          { opacity: feedbackAlpha, transform: [{ scale: feedbackScale }] },
        ]}>
          <Text style={styles.feedbackTitle}>{isCorrect ? 'Excellent! 🎯' : 'Not quite! 💔'}</Text>
          {isWrong && (
            <>
              <Text style={styles.feedbackAnswerLabel}>Correct answer:</Text>
              <Text style={styles.feedbackAnswer}>{q.correctAnswer}</Text>
            </>
          )}
          <Text style={styles.feedbackExplanation}>{q.explanation}</Text>
        </Animated.View>
      )}

      {selected && (
        <TouchableOpacity style={styles.btn} onPress={handleNext}>
          <Text style={styles.btnText}>
            {currentIndex + 1 >= QUIZ_SIZE ? 'See Results →' : 'Next Question →'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0F1A35' },
  content:     { padding: 24, paddingBottom: 40, flexGrow: 1 },
  resultsScroll: { padding: 24, paddingBottom: 60, alignItems: 'center' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F1A35' },
  fullCenter:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0F1A35' },
  loadingText: { fontSize: 16, color: '#A855F7', fontWeight: 'bold' },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 40, marginBottom: 20 },
  headerCenter: { flex: 1, alignItems: 'center' },
  closeBtn:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  closeBtnText: { color: '#EF4444', fontSize: 14, fontWeight: 'bold' },

  subLevelTag:  { color: '#A855F7', fontWeight: '700', fontSize: 12, backgroundColor: 'rgba(168,85,247,0.12)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, overflow: 'hidden' },

  badgePill:     { backgroundColor: '#A855F7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgePillDark: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  badgePillIcon: { fontSize: 14 },
  badgePillText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  // Progress dots (per quiz)
  progressDots: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  pDot:         { flex: 1, height: 6, backgroundColor: '#1E293B', borderRadius: 3 },
  pDotDone:     { backgroundColor: '#4C1D95' },
  pDotCurrent:  { backgroundColor: '#A855F7' },

  // Quiz counter row
  quizCountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  quizCountText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  miniDots:     { flexDirection: 'row', gap: 6 },
  miniDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  miniDotFilled:  { backgroundColor: '#A855F7', borderColor: '#C084FC' },
  miniDotCurrent: { borderColor: '#A855F7' },

  // Question
  questionBox:   { alignItems: 'center', marginBottom: 32, paddingVertical: 20 },
  questionLabel: { color: '#94A3B8', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700', marginBottom: 12 },
  questionWord:  { fontSize: 42, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' },

  // Options
  optionsContainer: { gap: 16, marginBottom: 24 },
  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#172545', borderWidth: 2, borderColor: '#1E293B', borderRadius: 20, padding: 16 },
  optionCorrect: { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)' },
  optionWrong:   { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)' },
  optionDim:     { opacity: 0.4 },
  bubble:        { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  bubbleCorrect: { backgroundColor: '#10B981' },
  bubbleWrong:   { backgroundColor: '#EF4444' },
  bubbleText:    { color: '#94A3B8', fontWeight: 'bold' },
  bubbleTextLight: { color: '#FFFFFF' },
  optionText:    { flex: 1, fontSize: 18, fontWeight: '700', color: '#E2E8F0' },
  optionTextCorrect: { color: '#10B981' },
  optionTextWrong:   { color: '#EF4444' },
  optionTextDim:     { color: '#64748B' },
  iconCorrect: { color: '#10B981', fontSize: 20, fontWeight: 'bold' },
  iconWrong:   { color: '#EF4444', fontSize: 20, fontWeight: 'bold' },

  // Feedback
  feedbackBox:    { padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1 },
  feedbackCorrect: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' },
  feedbackWrong:   { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' },
  feedbackTitle:   { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  feedbackAnswerLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '600', marginBottom: 2 },
  feedbackAnswer:  { fontSize: 18, fontWeight: '800', color: '#A855F7', marginBottom: 10 },
  feedbackExplanation: { fontSize: 14, color: '#E2E8F0', lineHeight: 22, fontStyle: 'italic' },

  // Buttons
  btn:    { backgroundColor: '#A855F7', padding: 18, borderRadius: 100, alignItems: 'center', width: '100%', marginBottom: 10, shadowColor: '#A855F7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },

  homeLink:     { marginTop: 16, padding: 16 },
  homeLinkText: { color: '#64748B', fontWeight: '600', fontSize: 15, textAlign: 'center' },

  // Results
  resultsBadgeRow: { flexDirection: 'row', gap: 12, marginBottom: 32, marginTop: 20 },
  resultsEmoji:  { fontSize: 80, marginBottom: 16, textAlign: 'center' },
  resultsTitle:  { fontSize: 32, fontWeight: '900', color: '#FFFFFF', marginBottom: 12, textAlign: 'center' },
  resultsScore:  { fontSize: 48, fontWeight: '900', color: '#A855F7', marginBottom: 16, textAlign: 'center' },
  resultsMsg:    { fontSize: 15, color: '#94A3B8', textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  retakeHint:    { color: '#EF4444', fontSize: 13, textAlign: 'center', fontWeight: '600', marginTop: 8 },

  subLevelProgressBar: { alignItems: 'center', marginBottom: 20, backgroundColor: '#172545', padding: 16, borderRadius: 16, width: '100%', borderWidth: 1, borderColor: '#1E293B', gap: 8 },

  // Review
  reviewSection: { width: '100%', marginBottom: 20 },
  reviewTitle:   { color: '#FFFFFF', fontWeight: '800', fontSize: 16, marginBottom: 12 },
  reviewCard:    { backgroundColor: '#172545', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', alignItems: 'center' },
  reviewForeign: { fontSize: 18, fontWeight: '700', color: '#E2E8F0', marginBottom: 4 },
  reviewArrow:   { fontSize: 16, color: '#64748B', marginBottom: 4 },
  reviewCorrect: { fontSize: 20, fontWeight: '800', color: '#A855F7', marginBottom: 8 },
  reviewExplanation: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20, fontStyle: 'italic' },

  // Celebration screens
  bigEmoji:   { fontSize: 72, marginBottom: 16 },
  celebCard:  { backgroundColor: '#172545', borderRadius: 32, padding: 32, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: '#1E293B' },
  congratsCard: { backgroundColor: '#172545', borderRadius: 32, padding: 32, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: '#1E293B', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  celebTitle: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  celebPraise: { fontSize: 15, color: '#A855F7', fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  celebSub:   { fontSize: 15, color: '#94A3B8', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  celebLevel: { fontSize: 16, color: '#FFFFFF', fontWeight: '800', marginBottom: 20 },
  purple:     { color: '#A855F7' },

  progressBox:     { backgroundColor: '#0F1A35', padding: 20, borderRadius: 20, width: '100%', alignItems: 'center', marginBottom: 32, borderWidth: 1, borderColor: '#1E293B' },
  progressBoxText: { color: '#E2E8F0', fontWeight: '700', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  stepDot:         { width: 24, height: 24, borderRadius: 12, backgroundColor: '#1E293B', borderWidth: 2, borderColor: '#334155' },
  stepDotFilled:   { backgroundColor: '#A855F7', borderColor: '#C084FC' },

  subLevelBanner:      { backgroundColor: 'rgba(168,85,247,0.15)', borderWidth: 1, borderColor: '#A855F7', borderRadius: 16, padding: 16, alignItems: 'center', width: '100%', marginBottom: 20 },
  subLevelBannerLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  subLevelBannerValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  subLevelDots:        { flexDirection: 'row', gap: 12, marginBottom: 28 },
  slDot:               { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E293B', borderWidth: 2, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  slDotDone:           { backgroundColor: '#4C1D95', borderColor: '#A855F7' },
  slDotCurrent:        { backgroundColor: '#A855F7', borderColor: '#C084FC' },
  slDotText:           { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

  badgeCircle:     { width: 150, height: 150, borderRadius: 75, backgroundColor: '#172545', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#A855F7', shadowColor: '#A855F7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 30, elevation: 10, marginBottom: 32, zIndex: 10 },
  bigBadgeEmoji:   { fontSize: 72 },
  badgeRow:        { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 24 },
  badgeRowIcon:    { fontSize: 24, opacity: 0.5 },
  badgeRowIconNew: { opacity: 1 },
  confetti:        { position: 'absolute', fontSize: 24, zIndex: 100 },
});
