// Bottom navigation bar component
import React from 'react';
import { StyleSheet, TouchableOpacity, Image, Platform, View, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, theme } from '../constants/theme';

const TABS = [
    { key: 'home',    label: 'Acasa',   icon: 'home',   href: '/feed' },
    { key: 'team',    label: 'Echipa', icon: 'people', href: '/team' },
    { key: 'profile', label: 'Profil', icon: 'person', href: '/profile' },
];

const ITEM_SIZE = 44; // icon button size

export default function NavBar({ user }) {
    const router   = useRouter();
    const pathname = usePathname() || '';
    const insets   = useSafeAreaInsets();

    const current = (pathname.split('/')[1] || 'home').toLowerCase();

    // Leave space for safe-area at the bottom
    const bottomOffset = (insets.bottom || 0) + 16;

    return (
        <BlurView
            intensity={60}
            tint="dark"
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            style={[styles.container, { bottom: bottomOffset }]}
        >
            <View style={[styles.inner, { paddingBottom: Math.max(8, insets.bottom ? 6 : 8) }]}>
                {TABS.map(tab => {
                    const isActive = current === tab.key;
                    const onPress = () => { if (pathname !== tab.href) router.push(tab.href); };

                    const IconEl = (
                        <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                            <Ionicons name={tab.icon} size={22} color={isActive ? '#fff' : colors.primary} />
                        </View>
                    );

                    if (tab.key === 'profile') {
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={styles.button}
                                onPress={onPress}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                activeOpacity={0.9}
                            >
                                <View style={[styles.iconWrap, styles.avatarWrap, isActive && styles.iconWrapActive]}>
                                    {user?.avatar
                                        ? <Image source={{ uri: user.avatar }} style={[styles.avatar, isActive && styles.avatarBorder]} />
                                        : <Ionicons name="person" size={22} color="#fff" />
                                    }
                                </View>
                                <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>{tab.label}</Text>
                            </TouchableOpacity>
                        );
                    }

                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={styles.button}
                            onPress={onPress}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            activeOpacity={0.9}
                        >
                            {IconEl}
                            <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>{tab.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </BlurView>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        borderRadius: 18,
    overflow: 'hidden', // keep for glass effect
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 10,
    },
    inner: {
        minHeight: 64,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.07)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
    paddingTop: 8, // small top padding
    },
    button: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    iconWrap: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        borderRadius: ITEM_SIZE / 2,
        backgroundColor: 'rgba(255,255,255,0.10)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapActive: {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
        transform: [{ scale: 1.02 }],
    },
    label: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
    },
    labelActive: {
        color: '#fff',
        fontWeight: '800',
    },
    avatarWrap: {
        backgroundColor: 'rgba(123,97,255,0.95)',
    },
    avatar: {
        width: ITEM_SIZE - 8,
        height: ITEM_SIZE - 8,
        borderRadius: (ITEM_SIZE - 8) / 2,
    },
    avatarBorder: {
        borderWidth: 2,
        borderColor: '#fff',
    },
});
