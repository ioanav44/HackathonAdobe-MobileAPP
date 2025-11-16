import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import Button from '../components/Button';
import Input from '../components/Input';
import NavBar from '../components/navbar';
import { supabase } from '../lib/supabase';
import { colors, theme } from '../constants/theme';

const DEPARTMENTS = ['Engineering','Product','Design','Marketing','Sales','HR','Finance','Operations','Legal','Support'];

export default function Profile() {
    const [loading, setLoading]   = useState(true);
    const [userId, setUserId]     = useState(null);
    const [email, setEmail]       = useState('');
    const [fullName, setFullName] = useState('');
    const [dept, setDept]         = useState('');

    const [viewOpen, setViewOpen] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const { data: sess } = await supabase.auth.getUser();
                const user = sess?.user;
                if (!user) { Alert.alert('Nu ești autentificat.'); return; }
                setUserId(user.id);
                setEmail(user.email || '');

                const { data, error } = await supabase
                    .from('profiles')
                    .select('full_name, department')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) throw error;
                if (data) {
                    setFullName(data.full_name || '');
                    setDept(data.department || '');
                }
            } catch (e) {
                Alert.alert('Eroare', e.message || String(e));
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const onSave = async () => {
        try {
            if (!userId) return;
            if (!fullName.trim()) return Alert.alert('Completează numele.');
            if (!dept) return Alert.alert('Alege un departament.');

            const { error } = await supabase
                .from('profiles')
                .upsert({ user_id: userId, full_name: fullName.trim(), department: dept }, { onConflict: 'user_id' });

            if (error) throw error;
            Alert.alert('Salvat', 'Profilul a fost actualizat.');
        } catch (e) {
            Alert.alert('Eroare', e.message || String(e));
        }
    };

    return (
        <Screen style={{ flex: 1, backgroundColor: 'transparent' }}>
            {/* FUNDAL */}
            <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={[styles.blob, styles.blobA, { backgroundColor: colors.tertiary, opacity: 0.12 }]} />
            <View style={[styles.blob, styles.blobB, { backgroundColor: '#ffffff', opacity: 0.08 }]} />
            <View style={[styles.blob, styles.blobC, { backgroundColor: '#FFD7AE', opacity: 0.1 }]} />

            <ScrollView contentContainerStyle={styles.wrap}>
                <View style={styles.card}>
                    <Text style={styles.title}>Profil</Text>
                    <Text style={styles.subtitle}>Editează-ți datele și departamentul.</Text>

                    {/* Email (doar afișare) */}
                    <View style={{ gap: 6 }}>
                        <Text style={styles.label}>Email</Text>
                        <Text style={styles.readonly}>{email || '-'}</Text>
                    </View>

                    {/* Nume complet — acum cu variant="light" */}
                    <Input
                        label="Nume complet"
                        placeholder="Nume Prenume"
                        value={fullName}
                        onChangeText={setFullName}
                        autoCapitalize="words"
                        variant="light"
                    />

                    {/* Departamente */}
                    <Text style={[styles.label, { marginTop: theme.spacing(1) }]}>Departament</Text>
                    <View style={styles.chipRow}>
                        {DEPARTMENTS.map(d => {
                            const active = d === dept;
                            return (
                                <TouchableOpacity key={d} onPress={() => setDept(d)} style={[styles.chip, active && styles.chipActive]} activeOpacity={0.85}>
                                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{d}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Button title="Salvează" onPress={onSave} style={{ marginTop: theme.spacing(2) }} />


                    <Button
                        title="Vezi profilul"
                        onPress={() => setViewOpen(true)}
                        style={{ marginTop: theme.spacing(1), backgroundColor: '#111827' }}
                        textStyle={{ color: '#fff' }}
                    />
                </View>

                {loading && (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" />
                    </View>
                )}
            </ScrollView>

            {/* MODAL – detalii profil */}
            <Modal visible={viewOpen} transparent animationType="fade" onRequestClose={() => setViewOpen(false)}>
                <View style={styles.modalWrap}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Profilul meu</Text>
                        <View style={styles.row}>
                            <Text style={styles.key}>Email</Text>
                            <Text style={styles.val}>{email || '-'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.key}>Nume complet</Text>
                            <Text style={styles.val}>{fullName || '-'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.key}>Departament</Text>
                            <Text style={styles.val}>{dept || '-'}</Text>
                        </View>
                        <Button title="Închide" onPress={() => setViewOpen(false)} style={{ marginTop: theme.spacing(2) }} />
                    </View>
                </View>
            </Modal>

            <NavBar user={{ email }} />
        </Screen>
    );
}

const BLOB = 320;

const styles = StyleSheet.create({
    wrap: { padding: theme.spacing(2), paddingBottom: theme.spacing(14) },
    card: {
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: theme.spacing(2),
        gap: theme.spacing(1.5),
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 3,
        marginTop: 85,
    },
    title: { color: '#111827', fontSize: 18, fontWeight: '800' },
    subtitle: { color: '#4B5563', marginBottom: theme.spacing(1) },
    label: { color: '#111827', fontWeight: '700', fontSize: 13 },
    readonly: {
        color: '#111827',
        backgroundColor: '#F9FAFB',
        borderWidth: 1, borderColor: '#E5E7EB',
        borderRadius: theme.roundness,
        paddingHorizontal: 12, paddingVertical: 10,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
    chip: {
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
        backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: '#111827', fontWeight: '600' },
    chipTextActive: { color: '#fff' },
    loading: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },

    // modal
    modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modalCard: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
    modalTitle: { color: '#111827', fontWeight: '800', fontSize: 16, marginBottom: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    key: { color: '#6B7280', fontWeight: '600' },
    val: { color: '#111827', fontWeight: '700' },

    // blobs
    blob: { position: 'absolute', width: BLOB, height: BLOB, borderRadius: BLOB / 1.6 },
    blobA: { top: -BLOB * 0.25, left: -BLOB * 0.18 },
    blobB: { top: -BLOB * 0.36, right: -BLOB * 0.22 },
    blobC: { bottom: -BLOB * 0.26, left: -BLOB * 0.1 },
});
