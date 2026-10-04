import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '[https://seu-codigo.supabase.co](https://seu-codigo.supabase.co)';
const supabaseAnonKey = 'sb_publishable_QreoHDEzARlLDs78MgTVww_F3Zd8nvb';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
