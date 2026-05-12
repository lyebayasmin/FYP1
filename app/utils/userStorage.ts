import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'userData';
const PROGRESS_KEY = 'languageProgress';

export const saveUserData = async (data: any) => {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
};

export const getUserData = async () => {
  const value = await AsyncStorage.getItem(KEY);
  return value ? JSON.parse(value) : null;
};

// Language progress interface
interface LanguageProgress {
  language: string;
  userLevel: string; // 'beginner' | 'intermediate'
  currentTier: string; // 'basic' | 'intermediate' | 'advanced'
  beginnerLevel: number; // 1-10 (1-3 beginner, 4-6 intermediate, 7+ pro)
  beginnerLessonIndex: number;
  beginnerBadgeCount: number;
  beginnerLessonsCompleted: number;
  xp: number;
  beginnerSubLevel: number; // 0=1 word, 1=2 words, 2=3 words
  lessonsAtCurrentWordLevel: number;
  lastLessonDate: string;
}

// Save progress for a specific language
export const saveLanguageProgress = async (language: string, progress: Partial<LanguageProgress>) => {
  const allProgress = await getAllLanguageProgress();
  const langKey = language.toLowerCase();
  allProgress[langKey] = {
    ...allProgress[langKey],
    language: langKey,
    ...progress,
  };
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(allProgress));
};

// Get progress for a specific language
export const getLanguageProgress = async (language: string): Promise<LanguageProgress | null> => {
  const allProgress = await getAllLanguageProgress();
  return allProgress[language.toLowerCase()] || null;
};

// Get all language progress
export const getAllLanguageProgress = async (): Promise<Record<string, LanguageProgress>> => {
  const value = await AsyncStorage.getItem(PROGRESS_KEY);
  return value ? JSON.parse(value) : {};
};

// Reset progress for a language (start from beginning)
export const resetLanguageProgress = async (language: string) => {
  const allProgress = await getAllLanguageProgress();
  delete allProgress[language.toLowerCase()];
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(allProgress));
  
  // Also clear the individual AsyncStorage keys for this language
  await AsyncStorage.removeItem('userLevel');
  await AsyncStorage.removeItem('currentTier');
  await AsyncStorage.removeItem('beginnerLevel');
  await AsyncStorage.removeItem('beginnerLessonIndex');
  await AsyncStorage.removeItem('beginnerBadgeCount');
  await AsyncStorage.removeItem('beginnerLessonsCompleted');
  await AsyncStorage.removeItem('xp');
  await AsyncStorage.removeItem('beginnerSubLevel');
  await AsyncStorage.removeItem('lessonsAtCurrentWordLevel');
};

// Sync current AsyncStorage values to language progress (for migration)
export const syncCurrentProgressToLanguage = async (language: string) => {
  const userLevel = await AsyncStorage.getItem('userLevel');
  const currentTier = await AsyncStorage.getItem('currentTier');
  const beginnerLevel = await AsyncStorage.getItem('beginnerLevel');
  const beginnerLessonIndex = await AsyncStorage.getItem('beginnerLessonIndex');
  const beginnerBadgeCount = await AsyncStorage.getItem('beginnerBadgeCount');
  const beginnerLessonsCompleted = await AsyncStorage.getItem('beginnerLessonsCompleted');
  const xp = await AsyncStorage.getItem('xp');
  const beginnerSubLevel = await AsyncStorage.getItem('beginnerSubLevel');
  const lessonsAtCurrentWordLevel = await AsyncStorage.getItem('lessonsAtCurrentWordLevel');
  const lastLessonDate = await AsyncStorage.getItem('lastLessonDate');

  await saveLanguageProgress(language, {
    userLevel: userLevel || 'beginner',
    currentTier: currentTier || 'basic',
    beginnerLevel: beginnerLevel ? parseInt(beginnerLevel) : 1,
    beginnerLessonIndex: beginnerLessonIndex ? parseInt(beginnerLessonIndex) : 0,
    beginnerBadgeCount: beginnerBadgeCount ? parseInt(beginnerBadgeCount) : 0,
    beginnerLessonsCompleted: beginnerLessonsCompleted ? parseInt(beginnerLessonsCompleted) : 0,
    xp: xp ? parseInt(xp) : 0,
    beginnerSubLevel: beginnerSubLevel ? parseInt(beginnerSubLevel) : 0,
    lessonsAtCurrentWordLevel: lessonsAtCurrentWordLevel ? parseInt(lessonsAtCurrentWordLevel) : 0,
    lastLessonDate: lastLessonDate || '',
  });
};

// Load language progress into AsyncStorage (restore from saved)
export const loadLanguageProgressToStorage = async (language: string) => {
  const progress = await getLanguageProgress(language);
  if (progress) {
    await AsyncStorage.setItem('userLevel', progress.userLevel || 'beginner');
    await AsyncStorage.setItem('currentTier', progress.currentTier || 'basic');
    await AsyncStorage.setItem('beginnerLevel', String(progress.beginnerLevel || 1));
    await AsyncStorage.setItem('beginnerLessonIndex', String(progress.beginnerLessonIndex || 0));
    await AsyncStorage.setItem('beginnerBadgeCount', String(progress.beginnerBadgeCount || 0));
    await AsyncStorage.setItem('beginnerLessonsCompleted', String(progress.beginnerLessonsCompleted || 0));
    await AsyncStorage.setItem('xp', String(progress.xp || 0));
    await AsyncStorage.setItem('beginnerSubLevel', String(progress.beginnerSubLevel || 0));
    await AsyncStorage.setItem('lessonsAtCurrentWordLevel', String(progress.lessonsAtCurrentWordLevel || 0));
    if (progress.lastLessonDate) {
      await AsyncStorage.setItem('lastLessonDate', progress.lastLessonDate);
    }
    return true;
  }
  return false;
};
