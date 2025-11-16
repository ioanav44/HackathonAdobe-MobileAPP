import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Alert,
    StyleSheet,
    Modal,
    TextInput,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';

import Screen from '../components/Screen';
import NavBar from '../components/navbar';
import Button from '../components/Button';
import DailyNotesButton from '../components/DailyNotesButton';
import DailySummaryButton from '../components/DailySummaryButton';
import { colors, theme } from '../constants/theme';
import { supabase } from '../lib/supabase';

const EMOJIS = ['❤', '👍', '🔥', '😂'];
const BLOB = 320;

export default function PhotoFeed() {
    const [photos, setPhotos] = useState([]);
    const [brokenImages, setBrokenImages] = useState({});
    const [reactions, setReactions] = useState([]); 
    const [userId, setUserId] = useState(null);
    const [userEmail, setUserEmail] = useState('');


    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickedAsset, setPickedAsset] = useState(null);
    const [caption, setCaption] = useState('');

    // ===== LOAD =====
    const load = useCallback(async () => {
        const { data: sess } = await supabase.auth.getUser();
        const user = sess?.user;
        setUserId(user?.id || null);
        setUserEmail(user?.email || '');

        const { data: photoList, error: pErr } = await supabase
            .from('photos')
            .select('id, user_id, author_email, image_url, caption, created_at')
            .order('created_at', { ascending: false })
            .limit(50);
        if (pErr) return Alert.alert('Eroare', pErr.message);
        setPhotos(photoList || []);

        if ((photoList || []).length) {
            const ids = photoList.map((p) => p.id);
            const { data: reacts, error: rErr } = await supabase
                .from('photo_reactions')
                .select('photo_id, user_id, emoji')
                .in('photo_id', ids);
            if (rErr) return Alert.alert('Eroare', rErr.message);
            setReactions(reacts || []);
        } else {
            setReactions([]);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

  
    const countsByEmoji = useMemo(() => {
        const map = new Map();
        reactions.forEach((r) => {
            const entry = map.get(r.photo_id) || {};
            entry[r.emoji] = (entry[r.emoji] || 0) + 1;
            map.set(r.photo_id, entry);
        });
        return map;
    }, [reactions]);

 
    const myEmojiMap = useMemo(() => {
        const map = new Map();
        reactions.forEach((r) => {
            if (r.user_id === userId) map.set(r.photo_id, r.emoji);
        });
        return map;
    }, [reactions, userId]);

    // ===== EMOJI REACTIONS =====
    const toggleReaction = async (photo_id, emoji) => {
        if (!userId) return Alert.alert('Trebuie să fii logat.');
        try {
            const mine = myEmojiMap.get(photo_id);
            if (mine === emoji) {
                const { error } = await supabase
                    .from('photo_reactions')
                    .delete()
                    .eq('photo_id', photo_id)
                    .eq('user_id', userId);
                if (error) throw error;
            } else if (mine) {
                const { error } = await supabase
                    .from('photo_reactions')
                    .update({ emoji })
                    .eq('photo_id', photo_id)
                    .eq('user_id', userId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('photo_reactions')
                    .insert({ photo_id, user_id: userId, emoji });
                if (error) throw error;
            }
            await load();
        } catch (e) {
            Alert.alert('Eroare', e.message || String(e));
        }
    };

    // ===== PICKER + UPLOAD =====
    const openPicker = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Atenție', 'Ai nevoie de permisiune la galerie.');
            return;
        }

        const hasNewEnum = !!ImagePicker.MediaType;
        const mediaTypes = hasNewEnum
            ? [ImagePicker.MediaType.Image] // SDK nou
            : ImagePicker.MediaTypeOptions?.Images ?? undefined; // SDK vechi (poate loga warning)

        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes,
            quality: 0.9,
            allowsEditing: true,
        });

        if (res.canceled || res.cancelled) return;
        const asset = res.assets?.[0] ?? res;
        const uri = asset?.uri;
        if (!uri) return;

        setPickedAsset({
            uri,
            fileName: asset.fileName || null,
            mimeType: asset.mimeType || 'image/jpeg',
        });
        setCaption('');
        setPickerVisible(true);
    };

    // upload ca ArrayBuffer + JPEG ***
    const uploadPicked = async () => {
        try {
            if (!userId || !pickedAsset?.uri) {
                Alert.alert('Eroare', 'Nu e selectată nicio imagine.');
                return;
            }

            // Convertim la JPEG (evită HEIC/PNG & "imagine neagră")
            const manip = await ImageManipulator.manipulateAsync(
                pickedAsset.uri,
                [],
                { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
            );

            // Citim fișierul ca ArrayBuffer (cel mai stabil în RN)
            const resp = await fetch(manip.uri);
            const arrayBuffer = await resp.arrayBuffer();
            const byteLength = arrayBuffer.byteLength || 0;
            if (byteLength === 0) {
                Alert.alert('Eroare', 'Fișierul convertit este gol (0 bytes). Reîncearcă altă imagine.');
                return;
            }

            // Construim un path stabil
            const path = `${userId}/${Date.now()}.jpg`;

            // Upload în bucketul "media"
            const { data: up, error: upErr } = await supabase
                .storage
                .from('media')
                .upload(path, arrayBuffer, {
                    contentType: 'image/jpeg',
                    upsert: false,
                });

            if (upErr) {
                Alert.alert('Upload eșuat', upErr.message);
                return;
            }
            console.log('UPLOADED PATH:', up?.path);

            // 5) URL public corect din SDK
            const { data: pub } = await supabase.storage.from('media').getPublicUrl(up.path);
            const publicUrl = pub?.publicUrl;
            console.log('PUBLIC URL:', publicUrl);

            if (!publicUrl) {
                Alert.alert('Eroare', 'Nu am putut genera URL-ul public.');
                return;
            }

            // 6) Salvăm în DB
            const { error: insErr } = await supabase.from('photos').insert({
                user_id: userId,
                author_email: userEmail,
                image_url: publicUrl,
                caption: caption.trim() || null,
            });
            if (insErr) {
                Alert.alert('Eroare', insErr.message);
                return;
            }

            setPickerVisible(false);
            setPickedAsset(null);
            setCaption('');
            load();
        } catch (e) {
            console.log('UPLOAD EXCEPTION', e);
            Alert.alert('Eroare', String(e?.message ?? e));
        }
    };

    const cancelPicked = () => {
        setPickerVisible(false);
        setPickedAsset(null);
        setCaption('');
    };

    const openPostMenu = (item) => {
        const isMine = (item.author_email || '') === (userEmail || '');
        if (isMine) {
            Alert.alert('Opțiuni postare', undefined, [
                { text: 'Șterge', style: 'destructive', onPress: () => confirmDelete(item.id) },
                { text: 'Anulează', style: 'cancel' },
            ]);
        } else {
            Alert.alert('Opțiuni postare', undefined, [
                { text: 'Raportează', onPress: () => Alert.alert('Mulțumim', 'Postarea a fost raportată.') },
                { text: 'Anulează', style: 'cancel' },
            ]);
        }
    };

    const confirmDelete = (id) => {
        Alert.alert('Confirmare', 'Sigur vrei să ștergi această postare?', [
            { text: 'Nu', style: 'cancel' },
            { text: 'Da, șterge', style: 'destructive', onPress: () => deletePost(id) },
        ]);
    };

    const deletePost = async (id) => {
        try {
            // remove reactions first
            await supabase.from('photo_reactions').delete().eq('photo_id', id);
            const { error } = await supabase.from('photos').delete().eq('id', id);
            if (error) return Alert.alert('Eroare', error.message);
            setPhotos(prev => (prev || []).filter(p => p.id !== id));
        } catch (e) {
            Alert.alert('Eroare', String(e?.message || e));
        }
    };

    // ===== UI =====
    return (
        <Screen style={{ flex: 1, backgroundColor: 'transparent' }}>
            <StatusBar barStyle="light-content" />
            
            <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={[styles.blob, styles.blobA, { backgroundColor: colors.tertiary, opacity: 0.12 }]} />
            <View style={[styles.blob, styles.blobB, { backgroundColor: '#ffffff', opacity: 0.08 }]} />
            <View style={[styles.blob, styles.blobC, { backgroundColor: '#FFD7AE', opacity: 0.1 }]} />

            
            <FlatList
                data={photos}
                keyExtractor={(i) => i.id}
                contentContainerStyle={{ padding: theme.spacing(4), paddingBottom: theme.spacing(14) }}
                ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
                renderItem={({ item }) => {
                    const counts = countsByEmoji.get(item.id) || {};
                    const myEmoji = myEmojiMap.get(item.id) || null;

                    return (
                        <View style={styles.card}>
                            <TouchableOpacity style={styles.menuBtn} onPress={() => openPostMenu(item)}>
                                <Ionicons name="ellipsis-vertical" size={18} color="#6B7280" />
                            </TouchableOpacity>
                            <View style={styles.header}>
                                <View style={styles.avatarMini}>
                                    <Text style={styles.avatarLetter}>
                                        {(item.author_email || 'A')[0].toUpperCase()}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.author}>{item.author_email || 'Anon'}</Text>
                                    <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
                                </View>
                            </View>

                            {brokenImages[item.id] ? (
                                <View style={[styles.image, styles.brokenPlaceholder]}>
                                    <Text style={{ color: '#fff', textAlign: 'center' }}>Imagine indisponibilă</Text>
                                </View>
                            ) : (
                                <Image
                                    source={{ uri: item.image_url }}
                                    style={styles.image}
                                    contentFit="cover"
                                    transition={300}
                                    cachePolicy="memory-disk"
                                    onLoadStart={() => console.log('IMG start', item.image_url)}
                                    onLoad={() => console.log('IMG loaded', item.image_url)}
                                    onError={(e) => {
                                        console.warn('IMG ERROR', item.image_url, e);
                                        setBrokenImages(prev => ({ ...(prev || {}), [item.id]: true }));
                                    }}
                                />
                            )}

                            {item.caption ? (
                                <Text style={styles.caption}>{item.caption}</Text>
                            ) : null}

                            
                            <View style={styles.actions}>
                                <View style={styles.emojiBar}>
                                    {EMOJIS.map((e) => {
                                        const n = counts[e] || 0;
                                        const mine = myEmoji === e;
                                        return (
                                            <TouchableOpacity
                                                key={e}
                                                onPress={() => toggleReaction(item.id, e)}
                                                style={[styles.emojiBtn, mine && styles.emojiBtnActive]}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={[styles.emojiText, mine && styles.emojiTextActive]}>{e}</Text>
                                                <Text style={[styles.emojiCount, mine && styles.emojiTextActive]}>
                                                    {n || ''}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <Text style={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 35 }}>
                        Încă nu sunt poze. Apasă butonul „+” pentru a adăuga una.
                    </Text>
                }
            />

            
            <DailyNotesButton userEmail={userEmail || 'guest'} />

            
            <TouchableOpacity style={styles.fab} onPress={openPicker} activeOpacity={0.85}>
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>

            
            <Modal visible={pickerVisible} transparent animationType="fade">
                <View style={styles.modalWrap}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Nouă fotografie</Text>
                        {pickedAsset ? (
                            <Image
                                source={{ uri: pickedAsset.uri }}
                                style={styles.modalImage}
                                contentFit="cover"
                            />
                        ) : null}
                        <TextInput
                            value={caption}
                            onChangeText={setCaption}
                            placeholder="Scrie un comentariu (optional)…"
                            placeholderTextColor="#888"
                            style={styles.modalInput}
                        />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Button
                                title="Renunță"
                                onPress={cancelPicked}
                                style={{ flex: 1, backgroundColor: '#111827' }}
                            />
                            <Button title="Încarcă" onPress={uploadPicked} style={{ flex: 1 }} />
                        </View>
                    </View>
                </View>
            </Modal>

            <NavBar user={{ email: userEmail }} />
        </Screen>
    );
}

const styles = StyleSheet.create({
    // fundal decorativ
    blob: { position: 'absolute', width: BLOB, height: BLOB, borderRadius: BLOB / 1.6 },
    blobA: { top: -BLOB * 0.25, left: -BLOB * 0.18 },
    blobB: { top: -BLOB * 0.36, right: -BLOB * 0.22 },
    blobC: { bottom: -BLOB * 0.26, left: -BLOB * 0.1 },

    // card foto
    card: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 8,
    },
    avatarMini: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    avatarLetter: { color: colors.primary, fontWeight: '800' },
    author: { color: '#111827', fontWeight: '700' },
    time: { color: '#6B7280', fontSize: 12 },
    image: { width: '100%', height: 260, backgroundColor: '#111111' },
    brokenPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#333' },
    caption: { color: '#111827', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },

    actions: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4 },
    emojiBar: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    emojiBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    emojiBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    emojiText: { fontSize: 16 },
    emojiTextActive: { color: '#fff', fontWeight: '700' },
    emojiCount: { color: '#111827', fontWeight: '700', marginLeft: 2 },

    // FAB +
    fab: {
        position: 'absolute',
        right: 18,
        bottom: 120,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    menuBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
    },

    // modal
    modalWrap: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        gap: 10,
    },
    modalTitle: { color: '#111827', fontWeight: '800', fontSize: 16 },
    modalImage: { width: '100%', height: 220, backgroundColor: '#eee', borderRadius: 12 },
    modalInput: {
        backgroundColor: '#fff',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        borderRadius: theme.roundness,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#111827',
    },
});
