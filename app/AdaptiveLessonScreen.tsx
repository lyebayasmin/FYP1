import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData, saveUserData } from './utils/userStorage';

// ─── Data ────────────────────────────────────────────────────────────────────

const WORD_DATA: Record<string, { word: string; translation: string }[]> = {
  urdu: [
    { word: 'سلام', translation: 'hello' },
    { word: 'شکریہ', translation: 'thank you' },
    { word: 'پانی', translation: 'water' },
    { word: 'کھانا', translation: 'food' },
    { word: 'گھر', translation: 'house' },
    { word: 'کتاب', translation: 'book' },
    { word: 'دوست', translation: 'friend' },
    { word: 'وقت', translation: 'time' },
    { word: 'سڑک', translation: 'road' },
    { word: 'شہر', translation: 'city' },
    { word: 'بازار', translation: 'market' },
    { word: 'گاڑی', translation: 'car' },
    { word: 'بچہ', translation: 'child' },
    { word: 'ماں', translation: 'mother' },
    { word: 'باپ', translation: 'father' },
  ],
  german: [
    { word: 'Hallo', translation: 'hello' },
    { word: 'Danke', translation: 'thank you' },
    { word: 'Wasser', translation: 'water' },
    { word: 'Essen', translation: 'food' },
    { word: 'Haus', translation: 'house' },
    { word: 'Buch', translation: 'book' },
    { word: 'Freund', translation: 'friend' },
    { word: 'Zeit', translation: 'time' },
    { word: 'Straße', translation: 'street' },
    { word: 'Stadt', translation: 'city' },
    { word: 'Markt', translation: 'market' },
    { word: 'Auto', translation: 'car' },
    { word: 'Kind', translation: 'child' },
    { word: 'Mutter', translation: 'mother' },
    { word: 'Vater', translation: 'father' },
  ],
  spanish: [
    { word: 'hola', translation: 'hello' },
    { word: 'gracias', translation: 'thank you' },
    { word: 'agua', translation: 'water' },
    { word: 'comida', translation: 'food' },
    { word: 'casa', translation: 'house' },
    { word: 'libro', translation: 'book' },
    { word: 'amigo', translation: 'friend' },
    { word: 'tiempo', translation: 'time' },
    { word: 'calle', translation: 'street' },
    { word: 'ciudad', translation: 'city' },
    { word: 'mercado', translation: 'market' },
    { word: 'coche', translation: 'car' },
    { word: 'niño', translation: 'child' },
    { word: 'madre', translation: 'mother' },
    { word: 'padre', translation: 'father' },
  ],
};

// Short fill-in-the-blank phrases  (Level 2)
const SHORT_PHRASES: Record<string, { phrase: string; blank: string; translation: string; hint: string }[]> = {
  urdu: [
    { phrase: 'میرا ___ یہاں ہے', blank: 'دوست', translation: 'My friend is here', hint: 'friend' },
    { phrase: '___ پینا ہے', blank: 'پانی', translation: 'Need to drink water', hint: 'water' },
    { phrase: 'یہ ___ اچھا ہے', blank: 'کھانا', translation: 'This food is good', hint: 'food' },
    { phrase: 'میرا ___ بڑا ہے', blank: 'گھر', translation: 'My house is big', hint: 'house' },
    { phrase: '___ پڑھنا ہے', blank: 'کتاب', translation: 'Need to read a book', hint: 'book' },
    { phrase: 'وہ ___ میں ہے', blank: 'بازار', translation: 'He is in the market', hint: 'market' },
  ],
  german: [
    { phrase: 'Ich trinke ___', blank: 'Wasser', translation: 'I drink water', hint: 'water' },
    { phrase: 'Das ___ ist groß', blank: 'Haus', translation: 'The house is big', hint: 'house' },
    { phrase: 'Mein ___ heißt Max', blank: 'Freund', translation: 'My friend is called Max', hint: 'friend' },
    { phrase: 'Das ___ ist gut', blank: 'Essen', translation: 'The food is good', hint: 'food' },
    { phrase: 'Ich lese ein ___', blank: 'Buch', translation: 'I read a book', hint: 'book' },
    { phrase: 'Die ___ ist weit', blank: 'Stadt', translation: 'The city is far', hint: 'city' },
  ],
  spanish: [
    { phrase: 'Bebo ___ cada día', blank: 'agua', translation: 'I drink water every day', hint: 'water' },
    { phrase: 'Mi ___ es grande', blank: 'casa', translation: 'My house is big', hint: 'house' },
    { phrase: 'Mi ___ se llama Ana', blank: 'amigo', translation: 'My friend is called Ana', hint: 'friend' },
    { phrase: 'La ___ está buena', blank: 'comida', translation: 'The food is good', hint: 'food' },
    { phrase: 'Leo un ___ hoy', blank: 'libro', translation: 'I read a book today', hint: 'book' },
    { phrase: 'La ___ es bonita', blank: 'ciudad', translation: 'The city is beautiful', hint: 'city' },
  ],
};

// Longer fill-in-the-blank phrases (Level 3)
const LONG_PHRASES: Record<string, { phrase: string; blank: string; translation: string; hint: string }[]> = {
  urdu: [
    { phrase: 'میں آج بازار سے ___ خریدنا چاہتا ہوں', blank: 'کھانا', translation: 'I want to buy food from the market today', hint: 'food' },
    { phrase: 'میرا دوست شہر کے بڑے ___ میں رہتا ہے', blank: 'گھر', translation: 'My friend lives in a big house in the city', hint: 'house' },
    { phrase: 'اسکول میں ہر طالب علم ___ پڑھتا ہے', blank: 'کتاب', translation: 'Every student reads a book at school', hint: 'book' },
    { phrase: 'آج موسم اچھا ہے اس لیے ہم ___ پر جائیں گے', blank: 'بازار', translation: 'The weather is nice so we will go to the market', hint: 'market' },
    { phrase: 'میری ماں نے کہا کہ ___ گرم پیو', blank: 'پانی', translation: 'My mother said to drink warm water', hint: 'water' },
  ],
  german: [
    { phrase: 'Ich möchte heute im Markt frisches ___ kaufen', blank: 'Essen', translation: 'I want to buy fresh food at the market today', hint: 'food' },
    { phrase: 'Mein Freund wohnt in einem großen ___ in der Stadt', blank: 'Haus', translation: 'My friend lives in a big house in the city', hint: 'house' },
    { phrase: 'Jeder Schüler liest in der Schule ein ___', blank: 'Buch', translation: 'Every student reads a book at school', hint: 'book' },
    { phrase: 'Das Wetter ist schön also gehen wir zum ___', blank: 'Markt', translation: 'The weather is nice so we go to the market', hint: 'market' },
    { phrase: 'Meine Mutter sagte ich soll warmes ___ trinken', blank: 'Wasser', translation: 'My mother said I should drink warm water', hint: 'water' },
  ],
  spanish: [
    { phrase: 'Quiero comprar ___ fresca en el mercado hoy', blank: 'comida', translation: 'I want to buy fresh food at the market today', hint: 'food' },
    { phrase: 'Mi amigo vive en una ___ grande en la ciudad', blank: 'casa', translation: 'My friend lives in a big house in the city', hint: 'house' },
    { phrase: 'Cada estudiante lee un ___ en la escuela', blank: 'libro', translation: 'Every student reads a book at school', hint: 'book' },
    { phrase: 'El tiempo es bueno así que vamos al ___', blank: 'mercado', translation: 'The weather is nice so we go to the market', hint: 'market' },
    { phrase: 'Mi madre dijo que beba ___ caliente', blank: 'agua', translation: 'My mother said to drink warm water', hint: 'water' },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

function buildWordQuiz(words: { word: string; translation: string }[], allWords: { word: string; translation: string }[]) {
  const correct = pickRandom(words, 3);
  return correct.map((item) => {
    const distractors = allWords.filter((w) => w.translation !== item.translation);
    const wrongOptions = pickRandom(distractors, 3).map((w) => w.translation);
    const options = shuffle([item.translation, ...wrongOptions]);
    return { ...item, options };
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type QuizLevel = 1 | 2 | 3;

interface WordQuestion {
  word: string;
  translation: string;
  options: string[];
}

interface FillQuestion {
  phrase: string;
  blank: string;
  translation: string;
  hint: string;
}

type Question = WordQuestion | FillQuestion;

const LANG_LABELS: Record<string, string> = {
  english: 'English 🇬🇧',
  german: 'German 🇩🇪',
  spanish: 'Spanish 🇪🇸',
  urdu: 'Urdu 🇵🇰',
};

// ─── Level Info ───────────────────────────────────────────────────────────────

const LEVEL_INFO = [
  {
    level: 1,
    title: 'Word Recognition',
    desc: 'Match words to their English meaning',
    icon: '🔤',
    badge: '🥉',
    color: '#6366F1',
    badgesEarned: 1,
  },
  {
    level: 2,
    title: 'Short Phrases',
    desc: 'Fill in the blank in short sentences',
    icon: '✏️',
    badge: '🥈',
    color: '#8B5CF6',
    badgesEarned: 2,
  },
  {
    level: 3,
    title: 'Long Phrases',
    desc: 'Complete longer sentences with the right word',
    icon: '📝',
    badge: '🥇',
    color: '#A855F7',
    badgesEarned: 3,
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdaptiveLessonScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState<string>('spanish');

  // Quiz state
  const [quizLevel, setQuizLevel] = useState<QuizLevel>(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [fillInput, setFillInput] = useState('');
  const [answered, setAnswered] = useState(false);
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'levelup' | 'complete'>('intro');

  // Badges
  const [totalBadges, setTotalBadges] = useState(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    animateIn();
  }, [phase, currentQ]);

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    scaleAnim.setValue(0.9);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const loadData = async () => {
    const user = await getUserData();
    const lang = (user?.language || 'spanish').toLowerCase();
    setLanguage(lang);

    const savedBadges = await AsyncStorage.getItem('adaptiveBadges');
    const savedLevel = await AsyncStorage.getItem('adaptiveLevel');
    const badges = savedBadges ? parseInt(savedBadges) : 0;
    const level = (savedLevel ? parseInt(savedLevel) : 1) as QuizLevel;

    setTotalBadges(badges);
    setQuizLevel(level);
  };

  const buildQuestions = (lang: string, level: QuizLevel): Question[] => {
    const safeLang = ['urdu', 'german', 'spanish'].includes(lang) ? lang : 'spanish';

    if (level === 1) {
      const words = WORD_DATA[safeLang] || WORD_DATA['spanish'];
      const quizWords = buildWordQuiz(words, words);
      return quizWords;
    } else if (level === 2) {
      const pool = SHORT_PHRASES[safeLang] || SHORT_PHRASES['spanish'];
      return pickRandom(pool, 3);
    } else {
      const pool = LONG_PHRASES[safeLang] || LONG_PHRASES['spanish'];
      return pickRandom(pool, 3);
    }
  };

  const startQuiz = () => {
    const qs = buildQuestions(language, quizLevel);
    setQuestions(qs);
    setCurrentQ(0);
    setScore(0);
    setSelected(null);
    setFillInput('');
    setAnswered(false);
    setPhase('quiz');

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 0,
      useNativeDriver: false,
    }).start();
  };

  const updateProgress = (qIndex: number) => {
    Animated.timing(progressAnim, {
      toValue: (qIndex + 1) / 3,
      duration: 400,
      useNativeDriver: false,
    }).start();
  };

  const handleWordAnswer = (option: string) => {
    if (answered) return;
    const q = questions[currentQ] as WordQuestion;
    const correct = option === q.translation;
    setSelected(option);
    setAnswered(true);
    if (correct) {
      setScore((s) => s + 1);
    } else {
      shake();
    }
    updateProgress(currentQ);
    setTimeout(() => advance(), 1100);
  };

  const handleFillAnswer = () => {
    if (answered) return;
    const q = questions[currentQ] as FillQuestion;
    const correct = fillInput.trim().toLowerCase() === q.blank.toLowerCase();
    setAnswered(true);
    if (correct) {
      setScore((s) => s + 1);
    } else {
      shake();
    }
    updateProgress(currentQ);
    setTimeout(() => advance(), 1300);
  };

  const advance = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((i) => i + 1);
      setSelected(null);
      setFillInput('');
      setAnswered(false);
    } else {
      completedLevel();
    }
  };

  const completedLevel = async () => {
    const info = LEVEL_INFO[quizLevel - 1];
    const newBadges = totalBadges + info.badgesEarned;
    setTotalBadges(newBadges);
    await AsyncStorage.setItem('adaptiveBadges', String(newBadges));

    if (quizLevel < 3) {
      setPhase('levelup');
    } else {
      // All 3 levels done
      await AsyncStorage.setItem('adaptiveLevel', '1'); // reset for next time
      setPhase('complete');
    }
  };

  const nextLevel = async () => {
    const next = (quizLevel + 1) as QuizLevel;
    setQuizLevel(next);
    await AsyncStorage.setItem('adaptiveLevel', String(next));
    const qs = buildQuestions(language, next);
    setQuestions(qs);
    setCurrentQ(0);
    setScore(0);
    setSelected(null);
    setFillInput('');
    setAnswered(false);
    setPhase('quiz');
    progressAnim.setValue(0);
  };

  const langLabel = LANG_LABELS[language] || language;
  const levelInfo = LEVEL_INFO[quizLevel - 1];

  // ── Render phases ────────────────────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <View style={styles.container}>
        <BgDecorations />
        <Animated.View style={[styles.introWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.langBadge}>
            <Text style={styles.langBadgeText}>{langLabel}</Text>
          </View>
          <Text style={styles.introTitle}>Intermediate{'\n'}Challenge 🚀</Text>
          <Text style={styles.introSub}>3 levels, each harder than the last.{'\n'}Earn badges as you advance!</Text>

          <View style={styles.levelCards}>
            {LEVEL_INFO.map((info, i) => (
              <View key={info.level} style={styles.levelCard}>
                <Text style={styles.levelCardIcon}>{info.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.levelCardTitle}>Level {info.level}: {info.title}</Text>
                  <Text style={styles.levelCardDesc}>{info.desc}</Text>
                </View>
                <Text style={styles.levelCardBadge}>{info.badge}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.startBtn} onPress={startQuiz}>
            <Text style={styles.startBtnText}>Start Level {quizLevel} →</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  if (phase === 'levelup') {
    const nextInfo = LEVEL_INFO[quizLevel]; // next level (0-indexed)
    return (
      <View style={styles.container}>
        <BgDecorations />
        <Animated.View style={[styles.centerWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.bigEmoji}>{levelInfo.badge}</Text>
          <Text style={styles.levelUpTitle}>Level {quizLevel} Complete!</Text>
          <Text style={styles.levelUpScore}>{score}/3 correct</Text>

          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>+{levelInfo.badgesEarned} Badge{levelInfo.badgesEarned > 1 ? 's' : ''} Earned  •  Total: {totalBadges} 🏅</Text>
          </View>

          <Text style={styles.nextLevelPreview}>
            Up next: Level {quizLevel + 1} — {nextInfo.title}
          </Text>
          <Text style={styles.nextLevelDesc}>{nextInfo.desc}</Text>

          <TouchableOpacity style={styles.startBtn} onPress={nextLevel}>
            <Text style={styles.startBtnText}>Continue to Level {quizLevel + 1} →</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  if (phase === 'complete') {
    return (
      <View style={styles.container}>
        <BgDecorations />
        <Animated.View style={[styles.centerWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.bigEmoji}>🏆</Text>
          <Text style={styles.levelUpTitle}>All Levels Complete!</Text>
          <Text style={styles.levelUpScore}>You crushed all 3 levels!</Text>

          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>Total Badges: {totalBadges} 🏅</Text>
          </View>

          <TouchableOpacity style={styles.startBtn} onPress={() => router.replace('/WelcomeScreen')}>
            <Text style={styles.startBtnText}>Back to Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.retryBtn} onPress={async () => {
            setQuizLevel(1);
            await AsyncStorage.setItem('adaptiveLevel', '1');
            setPhase('intro');
          }}>
            <Text style={styles.retryBtnText}>Play Again 🔄</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ── Quiz phase ────────────────────────────────────────────────────────────────

  const q = questions[currentQ];
  const isWordQ = quizLevel === 1;
  const wordQ = q as WordQuestion;
  const fillQ = q as FillQuestion;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <BgDecorations />

        {/* Header */}
        <View style={styles.quizHeader}>
          <View style={styles.levelTag}>
            <Text style={styles.levelTagText}>{levelInfo.icon} Level {quizLevel}</Text>
          </View>
          <Text style={styles.quizCounter}>{currentQ + 1} / 3</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: levelInfo.color }]} />
        </View>

        <Animated.View style={[
          styles.quizCard,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { translateX: shakeAnim }] }
        ]}>
          {/* Level title */}
          <Text style={styles.levelTitle}>{levelInfo.title}</Text>

          {isWordQ ? (
            <>
              <Text style={styles.questionPrompt}>What does this mean in English?</Text>
              <View style={styles.wordDisplay}>
                <Text style={styles.foreignWord}>{wordQ.word}</Text>
                <Text style={styles.wordLang}>{langLabel}</Text>
              </View>

              <View style={styles.optionsGrid}>
                {wordQ.options?.map((opt) => {
                  const isCorrect = opt === wordQ.translation;
                  const isSelected = selected === opt;
                  let bg = styles.optionBtn;
                  let textStyle = styles.optionText;
                  if (answered && isSelected && isCorrect) {
                    bg = { ...styles.optionBtn, ...styles.optionCorrect };
                    textStyle = { ...styles.optionText, color: '#fff' };
                  } else if (answered && isSelected && !isCorrect) {
                    bg = { ...styles.optionBtn, ...styles.optionWrong };
                    textStyle = { ...styles.optionText, color: '#fff' };
                  } else if (answered && isCorrect) {
                    bg = { ...styles.optionBtn, ...styles.optionCorrectGhost };
                  }
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={bg}
                      onPress={() => handleWordAnswer(opt)}
                      disabled={answered}
                      activeOpacity={0.8}
                    >
                      <Text style={textStyle}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.questionPrompt}>Fill in the blank:</Text>
              <View style={styles.translationBox}>
                <Text style={styles.translationLabel}>English meaning:</Text>
                <Text style={styles.translationText}>{fillQ.translation}</Text>
              </View>
              <Text style={styles.hintText}>Hint: "{fillQ.hint}" in {language}</Text>

              {/* Phrase with blank */}
              <View style={styles.phraseDisplay}>
                {fillQ.phrase?.split('___').map((part, i, arr) => (
                  <Text key={i} style={styles.phraseText}>
                    {part}
                    {i < arr.length - 1 && (
                      <Text style={[
                        styles.blankSlot,
                        answered && fillInput.trim().toLowerCase() === fillQ.blank.toLowerCase()
                          ? styles.blankCorrect
                          : answered
                          ? styles.blankWrong
                          : {}
                      ]}>
                        {answered ? (fillInput.trim().toLowerCase() === fillQ.blank.toLowerCase() ? ` ${fillQ.blank} ` : ` ${fillInput || '___'} `) : ' ___ '}
                      </Text>
                    )}
                  </Text>
                ))}
              </View>

              {!answered && (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.fillInput}
                    value={fillInput}
                    onChangeText={setFillInput}
                    placeholder={`Type in ${language}...`}
                    placeholderTextColor="#4A5580"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={[styles.submitBtn, !fillInput.trim() && styles.submitBtnDisabled]}
                    onPress={handleFillAnswer}
                    disabled={!fillInput.trim()}
                  >
                    <Text style={styles.submitBtnText}>✓</Text>
                  </TouchableOpacity>
                </View>
              )}

              {answered && (
                <View style={[
                  styles.feedbackBox,
                  fillInput.trim().toLowerCase() === fillQ.blank.toLowerCase()
                    ? styles.feedbackCorrect
                    : styles.feedbackWrong
                ]}>
                  <Text style={styles.feedbackText}>
                    {fillInput.trim().toLowerCase() === fillQ.blank.toLowerCase()
                      ? '✅ Correct!'
                      : `❌ The answer was: ${fillQ.blank}`}
                  </Text>
                </View>
              )}
            </>
          )}
        </Animated.View>

        {/* Score */}
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>Score: {score}/{currentQ + (answered ? 1 : 0)}</Text>
          <Text style={styles.badgeTotal}>{totalBadges} 🏅</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Background Decorations ───────────────────────────────────────────────────

function BgDecorations() {
  return (
    <>
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1A35',
  },
  bgCircle1: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#4C1D95',
    opacity: 0.12,
    top: -100,
    right: -100,
  },
  bgCircle2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#6366F1',
    opacity: 0.08,
    bottom: 80,
    left: -80,
  },
  bgCircle3: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#A855F7',
    opacity: 0.06,
    top: '40%',
    right: -40,
  },

  // ── Intro ──
  introWrap: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  langBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  langBadgeText: {
    color: '#A855F7',
    fontWeight: '700',
    fontSize: 13,
  },
  introTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 44,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  introSub: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 22,
    marginBottom: 32,
  },
  levelCards: {
    gap: 12,
    marginBottom: 36,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#172545',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  levelCardIcon: { fontSize: 24 },
  levelCardTitle: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
  },
  levelCardDesc: {
    color: '#64748B',
    fontSize: 12,
  },
  levelCardBadge: { fontSize: 22 },
  startBtn: {
    backgroundColor: '#A855F7',
    padding: 18,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },

  // ── Level-up / Complete ──
  centerWrap: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  levelUpTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  levelUpScore: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 20,
  },
  badgePill: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#A855F7',
    marginBottom: 32,
  },
  badgePillText: {
    color: '#C4B5FD',
    fontWeight: '700',
    fontSize: 14,
  },
  nextLevelPreview: {
    color: '#E2E8F0',
    fontWeight: '800',
    fontSize: 17,
    marginBottom: 6,
    textAlign: 'center',
  },
  nextLevelDesc: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 32,
  },
  retryBtn: {
    marginTop: 16,
    padding: 14,
  },
  retryBtnText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Quiz ──
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 12,
  },
  levelTag: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelTagText: {
    color: '#A855F7',
    fontWeight: '700',
    fontSize: 13,
  },
  quizCounter: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 14,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#1E293B',
    marginHorizontal: 24,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  quizCard: {
    marginHorizontal: 20,
    backgroundColor: '#172545',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  levelTitle: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  questionPrompt: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 20,
  },

  // Word quiz
  wordDisplay: {
    backgroundColor: '#0F1A35',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  foreignWord: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  wordLang: {
    fontSize: 12,
    color: '#4A5580',
    fontWeight: '600',
  },
  optionsGrid: {
    gap: 10,
  },
  optionBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  optionCorrect: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  optionWrong: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  optionCorrectGhost: {
    borderColor: '#16A34A',
    backgroundColor: 'rgba(22,163,74,0.1)',
  },
  optionText: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 15,
  },

  // Fill quiz
  translationBox: {
    backgroundColor: '#0F1A35',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  translationLabel: {
    color: '#4A5580',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  translationText: {
    color: '#CBD5E1',
    fontSize: 15,
    fontWeight: '600',
  },
  hintText: {
    color: '#A855F7',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  phraseDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: '#0F1A35',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  phraseText: {
    fontSize: 18,
    color: '#E2E8F0',
    fontWeight: '600',
    lineHeight: 28,
  },
  blankSlot: {
    color: '#A855F7',
    fontWeight: '900',
    textDecorationLine: 'underline',
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  blankCorrect: {
    color: '#4ADE80',
    backgroundColor: 'rgba(74,222,128,0.12)',
  },
  blankWrong: {
    color: '#F87171',
    backgroundColor: 'rgba(248,113,113,0.12)',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  fillInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(168,85,247,0.3)',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#A855F7',
    width: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#334155',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  feedbackBox: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  feedbackCorrect: {
    backgroundColor: 'rgba(22,163,74,0.15)',
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  feedbackWrong: {
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  feedbackText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Score row
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  scoreText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 14,
  },
  badgeTotal: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 14,
  },
});
