import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData } from './utils/userStorage';
import phrases from '../data/phrases.json';

// Each entry has exactly one language key (english | urdu | spanish | german)
// and an id. We filter by language key presence.

type LangKey = 'english' | 'urdu' | 'spanish' | 'german';

const PHRASES_PER_LESSON = 8;
// Max character length for "easy" phrases shown in first lessons
const EASY_PHRASE_MAX_LEN = 35;

function getLangEntries(lang: LangKey) {
  return phrases.filter(
    (p: any) =>
      p[lang] &&
      typeof p[lang] === 'string' &&
      p[lang].trim() !== ''
  );
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/**
 * Returns short, beginner-friendly phrases sorted by length ascending.
 * Falls back to the full pool if not enough short ones exist.
 */
function getEasyPhrases(lang: LangKey, count: number): any[] {
  const all = getLangEntries(lang);
  // Prefer short phrases; sort by phrase length ascending
  const sorted = [...all].sort(
    (a, b) => (a[lang] as string).length - (b[lang] as string).length
  );
  // Take from the shorter end — pick randomly within the shortest 40% to add variety
  const easyPool = sorted.slice(0, Math.max(count * 3, Math.ceil(sorted.length * 0.4)));
  return shuffle(easyPool).slice(0, count);
}

const LANG_LABELS: Record<LangKey, string> = {
  english: 'English 🇬🇧',
  german: 'German 🇩🇪',
  spanish: 'Spanish 🇪🇸',
  urdu: 'Urdu 🇵🇰',
};

export default function LessonScreen() {
  const router = useRouter();
  const [lang, setLang] = useState<LangKey>('english');
  const [lesson, setLesson] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuizPrompt, setShowQuizPrompt] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const user = await getUserData();
    const userLang = ((user?.language || 'english').toLowerCase()) as LangKey;
    const safeLang: LangKey =
      ['english', 'german', 'spanish', 'urdu'].includes(userLang)
        ? userLang
        : 'english';
    setLang(safeLang);

    // Pick short, beginner-friendly phrases for the lesson
    const picked = getEasyPhrases(safeLang, PHRASES_PER_LESSON);
    setLesson(picked);
    setLoading(false);
  };

  const markComplete = async () => {
    const val = await AsyncStorage.getItem('lessonsCompleted');
    const current = val ? parseInt(val) : 0;
    await AsyncStorage.setItem('lessonsCompleted', String(current + 1));
    await AsyncStorage.setItem('lastLessonDate', new Date().toDateString());
    setShowQuizPrompt(true);
  };

  const handleQuizYes = () => {
    setShowQuizPrompt(false);
    router.replace('/QuizScreen?type=vocab');
  };

  const handleQuizNo = () => {
    setShowQuizPrompt(false);
    router.replace('/LessonTypeScreen');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Loading Lesson... ✨</Text>
      </View>
    );
  }

  if (lesson.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>No phrases found for this language 😅</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>📝 Vocabulary Lesson</Text>
        <Text style={styles.subtitle}>
          Learning: {LANG_LABELS[lang]} · {lesson.length} phrases
        </Text>

        {lesson.map((item, index) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <Text style={styles.phrase}>{item[lang]}</Text>
            <Text style={styles.langTag}>{LANG_LABELS[lang]}</Text>
          </View>
        ))}

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>💡 Study Tip</Text>
          <Text style={styles.tipText}>
            Read each phrase aloud. Try to understand the meaning from context, then
            test yourself on the quiz!
          </Text>
        </View>

        <TouchableOpacity style={styles.completeBtn} onPress={markComplete}>
          <Text style={styles.completeBtnText}>✅ Lesson Completed</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Quiz Prompt Modal */}
      <Modal visible={showQuizPrompt} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🎉</Text>
            <Text style={styles.modalTitle}>Lesson Complete!</Text>
            <Text style={styles.modalSubtitle}>
              You just studied {lesson.length} phrases in {LANG_LABELS[lang]}.{'\n'}
              Want to test your memory?
            </Text>

            <TouchableOpacity style={styles.modalBtnYes} onPress={handleQuizYes}>
              <Text style={styles.modalBtnYesText}>Yes, Take the Quiz! 📝</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtnNo} onPress={handleQuizNo}>
              <Text style={styles.modalBtnNoText}>No, Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE4EC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFE4EC',
    padding: 20,
  },
  loading: {
    fontSize: 16,
    color: '#FF6FA1',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF3D7F',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    color: 'gray',
    fontSize: 13,
    marginBottom: 22,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#FF6FA1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  numberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE4EC',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numberText: {
    color: '#FF3D7F',
    fontWeight: 'bold',
    fontSize: 14,
  },
  phrase: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    lineHeight: 22,
  },
  langTag: {
    fontSize: 11,
    color: '#FF6FA1',
    fontWeight: '600',
  },
  tipBox: {
    backgroundColor: '#FFF0F5',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6FA1',
  },
  tipTitle: {
    fontWeight: 'bold',
    color: '#FF3D7F',
    marginBottom: 6,
    fontSize: 14,
  },
  tipText: {
    color: '#555',
    fontSize: 13,
    lineHeight: 20,
  },
  completeBtn: {
    backgroundColor: '#FF6FA1',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  completeBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backBtn: {
    marginTop: 20,
    backgroundColor: '#FF6FA1',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  backBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    elevation: 10,
  },
  modalEmoji: {
    fontSize: 52,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF3D7F',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalBtnYes: {
    backgroundColor: '#FF6FA1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalBtnYesText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalBtnNo: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnNoText: {
    color: '#FF6FA1',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
