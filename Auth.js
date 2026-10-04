import React, { useState } from 'react';
import { View, StyleSheet, Alert, TextInput, TouchableOpacity, Text, ActivityIndicator, Platform } from 'react-native';
import { supabase } from './supabase';

export default function Auth({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  async function handleAuth() {
    setLoading(true);
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) {
        showAlert('Erro no registo', error.message);
      } else {
        showAlert('Sucesso!', 'Conta criada com sucesso.');
        if (data?.session) {
          onLoginSuccess(data.session.user);
        }
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        showAlert('Erro no login', error.message);
      } else if (data?.session) {
        onLoginSuccess(data.session.user);
      }
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {isSignUp ? 'Criar Conta' : 'Entrar no Finanças'}
        </Text>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          placeholder="O seu e-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          placeholder="A sua senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity 
          style={[styles.button, (loading || !email || !password) ? styles.buttonDisabled : null]}
          onPress={handleAuth}
          disabled={loading || !email || !password}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>{isSignUp ? 'Cadastrar' : 'Entrar'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.switchButton}
          onPress={() => setIsSignUp(!isSignUp)}
          disabled={loading}
        >
          <Text style={styles.switchButtonText}>
            {isSignUp
              ? 'Já possui uma conta? Entrar'
              : 'Não tem conta? Cadastre-se'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FAFAFA',
  },
  card: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#1E293B',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
});
