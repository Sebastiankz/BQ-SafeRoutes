import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { buscarLugares } from "../../services/maps";
import type { LugarSugerido } from "../../services/maps";
import { colors, radii, shadow } from "../../theme/tokens";

export interface BuscarDireccionModalProps {
    visible: boolean;
    apiKey: string;
    userLocation?: { latitude: number; longitude: number };
    onClose: () => void;
    onSelectLugar: (lugar: LugarSugerido) => void;
}

const DEBOUNCE_MS = 350;

export default function BuscarDireccionModal({
    visible,
    apiKey,
    userLocation,
    onClose,
    onSelectLugar,
}: BuscarDireccionModalProps) {
    const insets = useSafeAreaInsets();
    const inputRef = useRef<TextInput>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [query, setQuery] = useState("");
    const [sugerencias, setSugerencias] = useState<LugarSugerido[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setQuery("");
            setSugerencias([]);
            setError(null);
            setTimeout(() => inputRef.current?.focus(), 120);
        }
    }, [visible]);

    function handleChangeText(text: string) {
        setQuery(text);
        setError(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!text.trim()) {
            setSugerencias([]);
            setCargando(false);
            return;
        }
        setCargando(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const resultados = await buscarLugares(text, apiKey, userLocation);
                setSugerencias(resultados);
            } catch {
                setError("No se pudo buscar. Verifica tu conexión.");
                setSugerencias([]);
            } finally {
                setCargando(false);
            }
        }, DEBOUNCE_MS);
    }

    function handleSeleccionar(lugar: LugarSugerido) {
        onSelectLugar(lugar);
        onClose();
    }

    return (
        <Modal
            animationType="slide"
            onRequestClose={onClose}
            presentationStyle="pageSheet"
            statusBarTranslucent
            transparent={false}
            visible={visible}
        >
            <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
                {/* Barra superior */}
                <View style={styles.topBar}>
                    <View style={styles.inputWrap}>
                        <MaterialCommunityIcons
                            color={colors.textMuted}
                            name="magnify"
                            size={20}
                            style={styles.inputIcon}
                        />
                        <TextInput
                            ref={inputRef}
                            autoCapitalize="none"
                            autoCorrect={false}
                            clearButtonMode="never"
                            onChangeText={handleChangeText}
                            placeholder="Buscar lugar o dirección"
                            placeholderTextColor={colors.textMuted}
                            returnKeyType="search"
                            style={styles.input}
                            value={query}
                        />
                        {query.length > 0 && (
                            <Pressable
                                hitSlop={8}
                                onPress={() => handleChangeText("")}
                                style={styles.clearBtn}
                            >
                                <MaterialCommunityIcons
                                    color={colors.textMuted}
                                    name="close-circle"
                                    size={18}
                                />
                            </Pressable>
                        )}
                    </View>
                    <Pressable
                        hitSlop={8}
                        onPress={onClose}
                        style={({ pressed }) => [
                            styles.cancelBtn,
                            pressed && styles.pressed,
                        ]}
                    >
                        <Text style={styles.cancelTxt}>Cancelar</Text>
                    </Pressable>
                </View>

                {/* Contenido */}
                {cargando && (
                    <ActivityIndicator
                        color={colors.primary}
                        size="small"
                        style={styles.loader}
                    />
                )}

                {error && !cargando && (
                    <View style={styles.msgWrap}>
                        <MaterialCommunityIcons
                            color={colors.danger}
                            name="wifi-off"
                            size={24}
                        />
                        <Text style={styles.msgTxt}>{error}</Text>
                    </View>
                )}

                {!cargando && !error && query.length > 0 && sugerencias.length === 0 && (
                    <View style={styles.msgWrap}>
                        <MaterialCommunityIcons
                            color={colors.textMuted}
                            name="map-search-outline"
                            size={24}
                        />
                        <Text style={styles.msgTxt}>Sin resultados para "{query}"</Text>
                    </View>
                )}

                <FlatList
                    data={sugerencias}
                    keyboardShouldPersistTaps="handled"
                    keyExtractor={(item) => item.placeId}
                    renderItem={({ item, index }) => (
                        <Pressable
                            onPress={() => handleSeleccionar(item)}
                            style={({ pressed }) => [
                                styles.fila,
                                pressed && styles.filaPressed,
                                index === 0 && styles.filaPrimera,
                            ]}
                        >
                            <View style={styles.filaIcono}>
                                <MaterialCommunityIcons
                                    color={colors.primary}
                                    name="map-marker-outline"
                                    size={22}
                                />
                            </View>
                            <View style={styles.filaCuerpo}>
                                <Text numberOfLines={1} style={styles.filaPrincipal}>
                                    {item.textoPrincipal}
                                </Text>
                                {item.textoSecundario ? (
                                    <Text numberOfLines={1} style={styles.filaSecundario}>
                                        {item.textoSecundario}
                                    </Text>
                                ) : null}
                            </View>
                        </Pressable>
                    )}
                    ItemSeparatorComponent={Separador}
                    style={styles.lista}
                />
            </View>
        </Modal>
    );
}

function Separador() {
    return <View style={styles.separador} />;
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    inputWrap: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.background,
        borderRadius: radii.pill,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === "ios" ? 10 : 6,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(214,225,235,0.9)",
        ...shadow.card,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        color: colors.text,
        fontSize: 15,
        fontWeight: "500",
    },
    clearBtn: {
        marginLeft: 6,
        padding: 2,
    },
    cancelBtn: {
        paddingHorizontal: 4,
        paddingVertical: 8,
    },
    cancelTxt: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: "600",
    },
    pressed: {
        opacity: 0.6,
    },
    loader: {
        marginTop: 20,
    },
    msgWrap: {
        alignItems: "center",
        marginTop: 40,
        gap: 10,
        paddingHorizontal: 32,
    },
    msgTxt: {
        color: colors.textMuted,
        fontSize: 14,
        textAlign: "center",
    },
    lista: {
        flex: 1,
    },
    filaPrimera: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "rgba(214,225,235,0.7)",
    },
    fila: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    filaPressed: {
        backgroundColor: colors.background,
    },
    filaIcono: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: `${colors.primary}18`,
        alignItems: "center",
        justifyContent: "center",
    },
    filaCuerpo: {
        flex: 1,
    },
    filaPrincipal: {
        color: colors.text,
        fontSize: 15,
        fontWeight: "600",
    },
    filaSecundario: {
        marginTop: 2,
        color: colors.textMuted,
        fontSize: 12,
    },
    separador: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "rgba(214,225,235,0.7)",
        marginLeft: 66,
    },
});
