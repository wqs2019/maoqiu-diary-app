import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, ViewStyle, TextStyle } from 'react-native';
import { HAND_DRAWN_STYLES, HEALING_COLORS } from '../../config/handDrawnTheme';

interface HandDrawnButtonProps {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    style?: 'soft' | 'warm' | 'dreamy' | 'natural';
    variant?: 'primary' | 'secondary' | 'outline';
    icon?: string;
    size?: 'small' | 'medium' | 'large';
    color?: string;
    buttonStyle?: ViewStyle;
}

export const HandDrawnButton: React.FC<HandDrawnButtonProps> = ({
    title,
    onPress,
    loading = false,
    disabled = false,
    style: styleType = 'soft',
    variant = 'primary',
    icon,
    size = 'medium',
    color,
    buttonStyle,
}) => {
    const handDrawnStyle = HAND_DRAWN_STYLES[styleType];
    const buttonColor = color || HEALING_COLORS.pink[400];

    const getSizeStyle = (): { height: number; fontSize: number } => {
        switch (size) {
            case 'small':
                return { height: 36, fontSize: 14 };
            case 'large':
                return { height: 56, fontSize: 18 };
            default:
                return { height: 48, fontSize: 16 };
        }
    };

    const getVariantStyle = (): ViewStyle => {
        switch (variant) {
            case 'secondary':
                return { backgroundColor: HEALING_COLORS.pink[100] };
            case 'outline':
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderColor: buttonColor,
                };
            default:
                return { backgroundColor: buttonColor };
        }
    };

    const sizeStyle = getSizeStyle();

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    height: sizeStyle.height,
                    borderRadius: handDrawnStyle.borderRadius,
                    borderWidth: handDrawnStyle.borderWidth,
                    borderColor: handDrawnStyle.borderColor,
                    shadowColor: handDrawnStyle.shadowColor,
                    shadowOpacity: handDrawnStyle.shadowOpacity,
                    shadowRadius: handDrawnStyle.shadowRadius,
                    shadowOffset: handDrawnStyle.shadowOffset,
                },
                getVariantStyle(),
                disabled && styles.disabled,
                buttonStyle,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'outline' ? buttonColor : '#FFFFFF'} />
            ) : (
                <View style={styles.content}>
                    {icon && <Text style={[styles.icon, { fontSize: sizeStyle.fontSize }]}> {icon}</Text>}
                    <Text
                        style={[
                            styles.text,
                            { fontSize: sizeStyle.fontSize },
                            variant === 'outline' && { color: buttonColor },
                        ]}
                    >
                        {title}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 24,
        elevation: 3,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    text: {
        color: '#FFFFFF',
        fontWeight: '600',
        textAlign: 'center',
    },
    icon: {
        marginRight: 8,
        fontWeight: '600',
    },
    disabled: {
        opacity: 0.5,
    },
});
