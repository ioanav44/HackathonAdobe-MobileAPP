import React, { useEffect, useState } from 'react';
import { Slot, useRouter, usePathname } from 'expo-router';
import { supabase } from '../lib/supabase';
import { StatusBar } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

export default function RootLayout() {
    const [ready, setReady] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // System navigation bar styling (Android)
    useEffect(() => {
        (async () => {
            try {
                await NavigationBar.setBackgroundColorAsync('rgba(0,0,0,0)');
                await NavigationBar.setButtonStyleAsync('light');
                await NavigationBar.setBehaviorAsync('overlay-swipe');
            } catch (err) {
                console.log('NavigationBar setup failed:', err.message);
            }
        })();
    }, []);

    // Auth guard and routing
    useEffect(() => {
        (async () => {
            const { data } = await supabase.auth.getSession();
            const isAuthed = !!data.session;
            const openRoutes = ['/', '/login', '/register'];

            // If not logged in and accessing a protected route → redirect to login
            if (!isAuthed && !openRoutes.includes(pathname)) {
                router.replace('/login');
            }
            setReady(true);
        })();

        // Listen to session changes
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session && (pathname === '/login' || pathname === '/register')) {
                router.replace('/feed'); // redirect to feed after login
            }
            if (!session && pathname === '/feed') {
                router.replace('/login');
            }
        });

        return () => sub.subscription?.unsubscribe();
    }, [pathname]);

    // Wait for session check
    if (!ready) return null;

    // Global layout
    return (
        <>
            {/* StatusBar: light text over gradient */}
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <Slot />
        </>
    );
}
