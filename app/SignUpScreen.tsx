import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SignUpScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignup = async () => {
    setErrorMsg('');

    if (!name) {
      setErrorMsg('⚠️ Please enter your name!');
      return;
    }
    if (!email) {
      setErrorMsg('⚠️ Please enter your email!');
      return;
    }
    if (!password) {
      setErrorMsg('⚠️ Please enter a password!');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('⚠️ Password must be at least 6 characters!');
      return;
    }

    // Check if email already registered
    const savedEmail = await AsyncStorage.getItem('userEmail');
    if (savedEmail === email) {
      setErrorMsg('⚠️ This email is already registered! Please login instead.');
      return;
    }

    // ✅ Save user credentials and mark as logged in
    await AsyncStorage.setItem('userName', name);
    await AsyncStorage.setItem('userEmail', email);
    await AsyncStorage.setItem('userPassword', password);
    await AsyncStorage.setItem('isLoggedIn', 'true');

    router.replace('/HomeScreen');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Create Account 🌸</Text>
          <Text style={styles.subtitle}>Join LinguaBloom and start learning!</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              placeholder="Enter your full name"
              placeholderTextColor="#64748B"
              style={styles.input}
              onChangeText={(val) => { setName(val); setErrorMsg(''); }}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              placeholder="Enter your email"
              placeholderTextColor="#64748B"
              style={styles.input}
              onChangeText={(val) => { setEmail(val); setErrorMsg(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              placeholder="Minimum 6 characters"
              placeholderTextColor="#64748B"
              secureTextEntry
              style={styles.input}
              onChangeText={(val) => { setPassword(val); setErrorMsg(''); }}
            />
          </View>

          {errorMsg !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.btn} onPress={handleSignup}>
            <Text style={styles.btnText}>Create Account</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.line} />
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <TouchableOpacity style={styles.btnOutline} onPress={() => router.replace('/loginScreen')}>
              <Text style={styles.btnOutlineText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1A35',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#94A3B8',
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 14,
  },
  btn: {
    backgroundColor: '#A855F7',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E293B',
  },
  orText: {
    marginHorizontal: 16,
    color: '#64748B',
    fontWeight: '700',
    fontSize: 14,
  },
  footerContainer: {
    alignItems: 'center',
  },
  loginText: {
    color: '#94A3B8',
    marginBottom: 16,
    fontSize: 15,
    fontWeight: '500',
  },
  btnOutline: {
    borderWidth: 2,
    borderColor: '#A855F7',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
  },
  btnOutlineText: {
    color: '#A855F7',
    fontWeight: '700',
    fontSize: 16,
  },
});
