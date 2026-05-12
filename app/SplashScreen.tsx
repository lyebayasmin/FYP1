import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen() {
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '65%'],
  });

  const languages = [
    { code: 'EN', name: 'English' },
    { code: 'DE', name: 'German' },
    { code: 'ES', name: 'Spanish' },
    { code: 'UR', name: 'Urdu' },
  ];

  const handleEnter = async () => {
    const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');

    if (isLoggedIn === 'true') {
      router.replace('/HomeScreen');
    } else {
      router.replace('/loginScreen');
    }
  };

  return (
    <View style={styles.container}>
      {/* LOGO */}
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', marginBottom: 20 }}>
        <View style={styles.logoOuter}>
          <View style={styles.logoMiddle}>
            <View style={styles.logoInner} />
          </View>
        </View>
      </Animated.View>

      {/* TITLE */}
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        <Text style={styles.title}>
          <Text style={styles.titleLingua}>Lingua</Text>
          <Text style={styles.titleBloom}>Bloom</Text>
        </Text>
        <Text style={styles.tagline}>LEARN ANY LANGUAGE</Text>
      </Animated.View>

      {/* LANGUAGE PILLS */}
      <Animated.View style={[styles.pillsRow, { opacity: fadeAnim }]}>
        {languages.map((lang) => (
          <View key={lang.code} style={styles.pill}>
            <Text style={styles.pillCode}>{lang.code}</Text>
            <Text style={styles.pillName}>{lang.name}</Text>
          </View>
        ))}
      </Animated.View>

      {/* LOADING TEXT + PROGRESS BAR */}
      <Animated.View style={{ opacity: fadeAnim, width: '100%', alignItems: 'center', gap: 15 }}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.loadingText}>LOADING...</Text>
      </Animated.View>

      {/* ARROW BUTTON */}
      <Animated.View style={[styles.arrowContainer, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.arrowBtn}
          onPress={handleEnter}
          activeOpacity={0.8}
        >
          <Text style={styles.arrowText}>↓</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1A35',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 30,
  },
  logoOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4C1D95',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 10,
  },
  logoMiddle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#C4B5FD',
  },
  title: {
    fontSize: 42,
    letterSpacing: -1,
  },
  titleLingua: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  titleBloom: {
    color: '#FCD34D',
    fontWeight: '700',
  },
  tagline: {
    fontSize: 12,
    color: '#64748B',
    letterSpacing: 4,
    marginTop: 8,
    fontWeight: '600',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#172545',
  },
  pillCode: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '700',
  },
  pillName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 11,
    color: '#64748B',
    letterSpacing: 3,
    fontWeight: '600',
  },
  progressTrack: {
    width: 180,
    height: 4,
    backgroundColor: '#1E293B',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A855F7',
    borderRadius: 2,
  },
  arrowContainer: {
    position: 'absolute',
    bottom: 50,
  },
  arrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 20,
    color: '#0F1A35',
    fontWeight: '400',
  },
});
