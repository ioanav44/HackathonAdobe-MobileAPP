import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    Alert, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import NavBar from '../components/navbar';
import DailySummaryButton from '../components/DailySummaryButton';
import { colors, theme } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform } from 'react-native';


const NAVBAR_H = 64;
const COMPOSER_H = 56;
const PAGE_SIZE = 100;

export default function Team() {
    const insets = useSafeAreaInsets();
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [dept, setDept] = useState('');
    const [loading, setLoading] = useState(true);
    const [generalChannel, setGeneralChannel] = useState(null);
    const [deptChannel, setDeptChannel] = useState(null);
    const [active, setActive] = useState('general');
    const [messages, setMessages] = useState([]);
    const [body, setBody] = useState('');
    const listRef = useRef(null);
    const realtimeRef = useRef(null);

    // helpers
    const ensureChannel = useCallback(async (slug, name, is_department = false) => {
        const { data, error } = await supabase
            .from('channels')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();
        if (error) throw error;
        if (data) return data;
        const { data: created, error: insErr } = await supabase
            .from('channels')
            .insert({ slug, name, is_department })
            .select('*')
            .single();
        if (insErr) throw insErr;
        return created;
    }, []);

    const loadMessages = useCallback(async (channelId) => {
        const { data, error } = await supabase
            .from('messages')
            .select('id, user_id, author_email, body, created_at')
            .eq('channel_id', channelId)
            .order('created_at', { ascending: true })
            .limit(PAGE_SIZE);
        if (error) {
            Alert.alert('Eroare', error.message);
            return [];
        }
        return data || [];
    }, []);

    const openRealtime = useCallback((channelId) => {
        if (realtimeRef.current) {
            supabase.removeChannel(realtimeRef.current);
            realtimeRef.current = null;
        }
        const channel = supabase
            .channel(`messages-${channelId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new]);
                    setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 0);
                }
            )
            .subscribe();
        realtimeRef.current = channel;
    }, []);


    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const { data: sess } = await supabase.auth.getUser();
                const u = sess?.user;
                if (!u) return Alert.alert('Nu ești autentificat.');
                setUser(u);
                setEmail(u.email || '');

                const { data: prof } = await supabase
                    .from('profiles')
                    .select('department')
                    .eq('user_id', u.id)
                    .maybeSingle();

                const department = prof?.department || '';
                setDept(department);

                const gen = await ensureChannel('general', 'General', false);
                setGeneralChannel(gen);

                let deptChan = null;
                if (department) {
                    const slug = `dept:${department.toLowerCase()}`;
                    deptChan = await ensureChannel(slug, department, true);
                }
                setDeptChannel(deptChan || null);

                const activeChanId = gen.id;
                const initial = await loadMessages(activeChanId);
                setMessages(initial);
                openRealtime(activeChanId);
            } catch (e) {
                Alert.alert('Eroare', e.message || String(e));
            } finally {
                setLoading(false);
            }
        })();

        return () => {
            if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
        };
    }, []);

    // switch tab
    const switchTab = async (next) => {
        try {
            setActive(next);
            const chanId = next === 'general' ? generalChannel?.id : (deptChannel?.id || generalChannel?.id);
            if (!chanId) return;
            const data = await loadMessages(chanId);
            setMessages(data);
            openRealtime(chanId);
            setTimeout(() => listRef.current?.scrollToEnd?.({ animated: false }), 0);
        } catch (e) {
            Alert.alert('Eroare', e.message || String(e));
        }
    };

    const send = async () => {
        try {
            if (!user) return;
            const text = body.trim();
            if (!text) return;
            const chanId = active === 'general' ? generalChannel?.id : (deptChannel?.id || generalChannel?.id);
            const { error } = await supabase.from('messages').insert({
                channel_id: chanId,
                user_id: user.id,
                author_email: user.email,
                body: text,
            });
            if (error) throw error;
            setBody('');
            setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 200);
        } catch (e) {
            Alert.alert('Eroare', e.message || String(e));
        }
    };

    const confirmDeleteMessage = (id) => {
        Alert.alert('Confirmare', 'Ștergi acest mesaj?', [
            { text: 'Nu', style: 'cancel' },
            { text: 'Da, șterge', style: 'destructive', onPress: () => deleteMessage(id) },
        ]);
    };

    const deleteMessage = async (id) => {
        try {
            const { error } = await supabase.from('messages').delete().eq('id', id);
            if (error) return Alert.alert('Eroare', error.message);
            setMessages(prev => (prev || []).filter(m => m.id !== id));
        } catch (e) {
            Alert.alert('Eroare', String(e?.message || e));
        }
    };

    const tabs = useMemo(() => {
        const arr = [{ key: 'general', label: 'General' }];
        if (deptChannel) arr.push({ key: 'dept', label: deptChannel.name });
        else if (dept) arr.push({ key: 'dept', label: dept });
        return arr;
    }, [dept, deptChannel]);

    const bottomPad = (insets.bottom || 0) + NAVBAR_H + COMPOSER_H + 16;

    return (
        <Screen style={{ flex: 1, backgroundColor: 'transparent' }}>
            {/* Background gradient and decorative blobs */}
            <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={[styles.blob, styles.blobA, { backgroundColor: colors.tertiary, opacity: 0.12 }]} />
            <View style={[styles.blob, styles.blobB, { backgroundColor: '#ffffff', opacity: 0.08 }]} />
            <View style={[styles.blob, styles.blobC, { backgroundColor: '#FFD7AE', opacity: 0.1 }]} />

            {/* Header with tabs */}
            <View style={styles.header}>
                <Text style={styles.title}>Conversații</Text>
                <View style={styles.tabs}>
                    {tabs.map(t => {
                        const activeTab = active === t.key;
                        return (
                            <TouchableOpacity
                                key={t.key}
                                style={[styles.tab, activeTab && styles.tabActive]}
                                onPress={() => switchTab(t.key)}
                                activeOpacity={0.9}
                            >
                                <Text style={[styles.tabText, activeTab && styles.tabTextActive]}>{t.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Messages list */}
            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            ) : (
                <FlatList
                    ref={listRef}
                    data={messages}
                    keyExtractor={(i) => i.id}
                    contentContainerStyle={{
                        padding: theme.spacing(2),
                        paddingTop: theme.spacing(1),
                        paddingBottom: bottomPad,
                    }}
                    renderItem={({ item }) => {
                        const mine = item.user_id === user?.id;
                        return (
                            <View style={[styles.msgRow, mine ? styles.rowRight : styles.rowLeft]}>
                                {!mine && (
                                    <View style={styles.avatarMini}>
                                        <Text style={styles.avatarLetter}>
                                            {(item.author_email || 'A')[0].toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onLongPress={mine ? () => confirmDeleteMessage(item.id) : undefined}
                                    style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}
                                >
                                    {!mine && <Text style={styles.author}>{item.author_email || 'Anon'}</Text>}
                                    <Text style={mine ? styles.bodyMine : styles.bodyOther}>{item.body}</Text>
                                    <Text style={mine ? styles.timeMine : styles.timeOther}>
                                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        );
                    }}
                    onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
                />
            )}

            {/* Message composer */}
            <View style={[styles.composerWrap, { bottom: (insets.bottom || 0) + NAVBAR_H + 12 }]}>
                <View style={styles.composer}>
                    <TextInput
                        value={body}
                        onChangeText={setBody}
                        placeholder={`Mesaj în ${active === 'general' ? 'General' : (deptChannel?.name || 'Departament')}…`}
                        placeholderTextColor="#9CA3AF"
                        style={styles.input}
                        multiline
                    />
                    <TouchableOpacity onPress={send} style={styles.sendBtn} activeOpacity={0.9}>
                        <Ionicons name="send" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Daily summary button for quick counts */}
            <DailySummaryButton entries={messages.map(m => ({ text: m.body || '', created_at: m.created_at }))} userLabel={email || 'Ziua ta'} />

            <NavBar user={{ email }} />
        </Screen>
    );
}

const BLOB = 320;

const styles = StyleSheet.create({
    header: {
        paddingTop: theme.spacing(2),
        paddingHorizontal: theme.spacing(2),
        paddingBottom: theme.spacing(1),
    },
    title: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 8,marginTop:25 },
    tabs: { flexDirection: 'row', gap: 8 },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    },
    tabActive: { backgroundColor: '#111827', borderColor: '#111827' },
    tabText: { color: '#fff', fontWeight: '700' },
    tabTextActive: { color: '#fff' },

    msgRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
    rowLeft: { justifyContent: 'flex-start' },
    rowRight: { justifyContent: 'flex-end' },

    avatarMini: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#EEF2FF',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#E5E7EB',
        marginRight: 8,
    },
    avatarLetter: { color: colors.primary, fontWeight: '800', fontSize: 12 },

    bubble: {
        maxWidth: '82%',
        borderRadius: 16,
        padding: 10,
        borderWidth: 1,
    },
    bubbleOther: { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: '#E5E7EB' },
    bubbleMine: { backgroundColor: '#111827', borderColor: '#111827' },

    author: { color: '#374151', fontSize: 12, fontWeight: '700', marginBottom: 2 },
    bodyOther: { color: '#111827' },
    bodyMine: { color: '#FFFFFF' },
    timeOther: { color: '#6B7280', fontSize: 10, marginTop: 4 },
    timeMine: { color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 4 },

    

    composerWrap: {
        position: 'absolute',
        left: 0, right: 0,
        zIndex: 10,
        paddingHorizontal: theme.spacing(2),
    },
    composer: {
        flexDirection: 'row',
        marginBottom: theme.spacing(4),
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderRadius: 999,
        borderWidth: 1, borderColor: '#E5E7EB',
        paddingLeft: 14, paddingRight: 8, paddingVertical: 6,
    },
    input: {
        flex: 1, minHeight: 40, maxHeight: 100,
        color: '#111827',
    },
    sendBtn: {
        marginLeft: 8,
        backgroundColor: colors.primary,
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },

    // blobs
    blob: { position: 'absolute', width: BLOB, height: BLOB, borderRadius: BLOB / 1.6 },
    blobA: { top: -BLOB * 0.25, left: -BLOB * 0.18 },
    blobB: { top: -BLOB * 0.36, right: -BLOB * 0.22 },
    blobC: { bottom: -BLOB * 0.26, left: -BLOB * 0.1 },
});
