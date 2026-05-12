import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { getLanguageProgress, syncCurrentProgressToLanguage } from './utils/userStorage';

const LANG_OPTIONS = [
  { id: 'English', label: 'English', emoji: '🇬🇧' },
  { id: 'German', label: 'German', emoji: '🇩🇪' },
  { id: 'Spanish', label: 'Spanish', emoji: '🇪🇸' },
  { id: 'Urdu', label: 'Urdu', emoji: '🇵🇰' },
];

const BADGE_ICONS = ['🥉', '🥈', '🥇', '🏅', '🎖️', '👑', '💎', '🌟', '⭐', '🏆'];

export default function ProgressScreen() {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  
  const [count, setCount] = useState(0);
  const [praise, setPraise] = useState('');
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    const syncCurrent = async () => {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const { language } = JSON.parse(userData);
        if (language) {
          await syncCurrentProgressToLanguage(language);
        }
      }
    };
    syncCurrent();
  }, []);

  const handleLanguageSelect = async (langId: string) => {
    let total = 0;
    let badges = 0;
    
    const progress = await getLanguageProgress(langId.toLowerCase());
    
    if (progress) {
      total = progress.beginnerLessonsCompleted || 0;
      badges = progress.beginnerBadgeCount || 0;
    } else {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const { language } = JSON.parse(userData);
        if (language?.toLowerCase() === langId.toLowerCase()) {
           const val = await AsyncStorage.getItem('lessonsCompleted');
           const savedBadges = await AsyncStorage.getItem('beginnerBadgeCount');
           const beginnerLessons = await AsyncStorage.getItem('beginnerLessonsCompleted');
           
           const globalTotal = val ? parseInt(val) : 0;
           badges = savedBadges ? parseInt(savedBadges) : 0;
           const bLessons = beginnerLessons ? parseInt(beginnerLessons) : 0;
           
           total = bLessons > 0 ? bLessons : globalTotal;
        }
      }
    }

    setCount(total);
    setBadgeCount(badges);

    if (total === 0) {
      setPraise("Start your first lesson!");
    } else if (total % 3 === 0) {
      setPraise(`Amazing! You've completed ${total} lessons! Keep it up!`);
    } else if (total % 3 === 1) {
      setPraise("Great start! Keep going!");
    } else {
      setPraise("You're doing really well! One more for a milestone!");
    }

    setSelectedLang(langId);
  };

  const getDisplayLevelName = (badges: number): string => {
    if (badges === 0) return 'Beginner';
    if (badges === 1) return 'Intermediate';
    return 'Advanced';
  };

  const levelName = getDisplayLevelName(badgeCount);
  const currentBadge = badgeCount > 0 ? BADGE_ICONS[Math.min(badgeCount - 1, BADGE_ICONS.length - 1)] : '🎯';

  return (
    <View style={styles.container}>
      {!selectedLang ? (
        <View style={styles.selectionContainer}>
          <Text style={styles.title}>My Progress 📊</Text>
          <Text style={styles.subtitle}>Select a language to view your progress</Text>
          
          <View style={styles.languagesGrid}>
            {LANG_OPTIONS.map((lang) => (
              <TouchableOpacity
                key={lang.id}
                style={styles.langCard}
                onPress={() => handleLanguageSelect(lang.id)}
              >
                <Text style={styles.langEmoji}>{lang.emoji}</Text>
                <Text style={styles.langLabel}>{lang.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity style={styles.btnSecondary} onPress={() => router.back()}>
            <Text style={styles.btnSecondaryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.progressContainer}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setSelectedLang(null)} style={styles.backIconBtn}>
              <Text style={styles.backIconText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{selectedLang} Progress</Text>
            <View style={{ width: 40 }} /> {/* Spacer */}
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{levelName} Level</Text>
            </View>
            <View style={styles.badgeDisplay}>
              <Text style={styles.badgeIcon}>{currentBadge}</Text>
              <Text style={styles.badgeCountText}>{badgeCount} {badgeCount === 1 ? 'badge' : 'badges'}</Text>
            </View>
          </View>

          <View style={styles.countBox}>
            <Text style={styles.count}>{count}</Text>
            <Text style={styles.label}>Lessons Completed</Text>
          </View>

          <View style={styles.praiseBox}>
            <Text style={styles.praiseText}>{praise}</Text>
          </View>

          <View style={styles.barBackground}>
            <View style={[styles.barFill, { width: `${Math.min((count % 3) / 3 * 100, 100)}%` }]} />
          </View>
          <Text style={styles.barLabel}>{count % 3}/3 towards next milestone 🎯</Text>

          <TouchableOpacity style={styles.btnPrimary} onPress={() => router.back()}>
            <Text style={styles.btnPrimaryText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1A35',
    padding: 24,
    justifyContent: 'center',
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 40,
    textAlign: 'center',
  },
  languagesGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 40,
  },
  langCard: {
    width: '47%',
    backgroundColor: '#172545',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  langEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  langLabel: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 16,
  },
  progressContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 30,
  },
  levelBadge: {
    backgroundColor: '#A855F7',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 8,
  },
  badgeIcon: {
    fontSize: 18,
  },
  badgeCountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  countBox: {
    backgroundColor: '#172545',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  count: {
    fontSize: 72,
    fontWeight: '900',
    color: '#A855F7',
  },
  label: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 8,
    fontWeight: '600',
  },
  praiseBox: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  praiseText: {
    color: '#C4B5FD',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
  barBackground: {
    width: '100%',
    height: 12,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#A855F7',
    borderRadius: 10,
  },
  barLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 40,
    fontWeight: '600',
  },
  btnPrimary: {
    backgroundColor: '#A855F7',
    padding: 18,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    padding: 18,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnSecondaryText: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 16,
  },
});
