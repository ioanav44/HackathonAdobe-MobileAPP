
import 'react-native-url-polyfill/auto';
// Supabase client setup with env fallbacks and optional AsyncStorage persistence.
// Lazy-load AsyncStorage to avoid referencing window during bundling/server.
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';


let extra = Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {};

// Read app.json extra as a fallback (helps web/dev when Constants is empty)
try {
    if (!extra || Object.keys(extra).length === 0) {
        // eslint-disable-next-line global-require
        const appJson = require('../app.json');
        extra = appJson?.expo?.extra ?? extra;
    }
} catch (e) {
    // ignore
}

const url = extra.EXPO_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = extra.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    // Log minimal debug info to help diagnose missing env
    console.warn('ENV missing for Supabase ->', { url, hasKey: !!key });
    try {
        console.log('Supabase debug: extra=', extra);
        console.log('Supabase debug: process.env EXPO_PUBLIC_SUPABASE_URL=', process.env.EXPO_PUBLIC_SUPABASE_URL);
        console.log('Supabase debug: process.env EXPO_PUBLIC_SUPABASE_ANON_KEY=', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '[present]' : '[missing]');
    } catch (e) {
        // ignore
    }
    throw new Error('supabaseUrl is required.');
}

// Determine storage only on React Native runtime
let storage;
try {
    const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
    if (isReactNative) {
        // Lazy require to avoid server-only globals during bundling
        // eslint-disable-next-line global-require
        storage = require('@react-native-async-storage/async-storage').default;
    }
} catch (e) {
    // ignore — we'll fall back to default storage (browser localStorage) when available
}

export const supabase = createClient(url, key, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        ...(storage ? { storage } : {}),
    },
});
