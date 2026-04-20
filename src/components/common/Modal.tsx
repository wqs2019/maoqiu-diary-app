import React, { useState, useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, TouchableWithoutFeedback, ModalProps, KeyboardAvoidingView, Platform } from 'react-native';
import { Portal } from './Portal';

interface CustomModalProps extends Omit<ModalProps, 'visible'> {
  visible: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  animationDuration?: number;
}

export const Modal: React.FC<CustomModalProps> = ({
  visible,
  onClose,
  children,
  animationDuration = 200,
}) => {
  const [shouldRender, setShouldRender] = useState(visible);
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: animationDuration,
        useNativeDriver: true,
      }).start();
    } else if (shouldRender) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: animationDuration,
        useNativeDriver: true,
      }).start(() => setShouldRender(false));
    }
  }, [visible, opacity, shouldRender, animationDuration]);

  if (!shouldRender) return null;

  return (
    <Portal>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlayContainer}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.animatedWrapper, { opacity }]}>
                {children}
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Portal>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    zIndex: 1000,
    elevation: 1000,
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  animatedWrapper: {
    flex: 1,
  },
});
