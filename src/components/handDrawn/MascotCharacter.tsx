import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MAOQIU_MASCOTS, DEFAULT_MASCOT, MASCOT_ANIMATIONS } from '../../config/mascot';
import { Mascot } from '../../types';

interface MascotCharacterProps {
    mascot?: Mascot;
    expression?: string;
    size?: 'small' | 'medium' | 'large';
    animated?: boolean;
    onPress?: () => void;
    showName?: boolean;
}

export const MascotCharacter: React.FC<MascotCharacterProps> = ({
    mascot = DEFAULT_MASCOT,
    expression = 'happy',
    size = 'medium',
    animated = true,
    onPress,
    showName = false,
}) => {
    const animValue = new Animated.Value(0);
    const currentExpression = mascot.expressions.find((e: any) => e.id === expression) || mascot.expressions[0];

    const getSizeStyle = (): { size: number; fontSize: number } => {
        switch (size) {
            case 'small':
                return { size: 60, fontSize: 32 };
            case 'large':
                return { size: 120, fontSize: 64 };
            default:
                return { size: 80, fontSize: 48 };
        }
    };

    useEffect(() => {
        if (animated) {
            startAnimation();
        }
    }, [expression, animated]);

    const startAnimation = () => {
        const animation = MASCOT_ANIMATIONS[currentExpression.animation as keyof typeof MASCOT_ANIMATIONS];

        Animated.loop(
            Animated.sequence([
                Animated.timing(animValue, {
                    toValue: 1,
                    duration: animation.duration / 2,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
                Animated.timing(animValue, {
                    toValue: 0,
                    duration: animation.duration / 2,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const getAnimationStyle = () => {
        if (!animated) return {};

        switch (currentExpression.animation) {
            case 'bounce':
                return {
                    transform: [
                        {
                            translateY: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -10],
                            }),
                        },
                    ],
                };
            case 'shake':
                return {
                    transform: [
                        {
                            rotate: animValue.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: ['-5deg', '5deg', '-5deg'],
                            }),
                        },
                    ],
                };
            case 'pulse':
                return {
                    transform: [
                        {
                            scale: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 1.1],
                            }),
                        },
                    ],
                };
            default:
                return {};
        }
    };

    const sizeStyle = getSizeStyle();

    const content = (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.mascotContainer,
                    {
                        width: sizeStyle.size,
                        height: sizeStyle.size,
                        borderRadius: sizeStyle.size / 2,
                        backgroundColor: mascot.color + '20',
                    },
                    getAnimationStyle(),
                ]}
            >
                <View
                    style={[
                        styles.emojiContainer,
                        {
                            backgroundColor: mascot.color + '30',
                            borderRadius: sizeStyle.size / 2,
                        },
                    ]}
                >
                    <Text style={{ fontSize: sizeStyle.fontSize }}>{currentExpression.emoji}</Text>
                </View>
            </Animated.View>
            {showName && <Text style={styles.name}>{mascot.name}</Text>}
        </View>
    );

    if (onPress) {
        return (
            <View onStartShouldSetResponder={() => true}>
                {content}
            </View>
        );
    }

    return content;
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    mascotContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    emojiContainer: {
        width: '80%',
        height: '80%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
});
