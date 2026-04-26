import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'success' | 'error' | 'info' | 'loading';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions | string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  loading: (message: string) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ToastOptions>({ message: '', type: 'info' });
  const insets = useSafeAreaInsets();

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  }, [opacity, translateY]);

  const showToast = useCallback(
    (opts: ToastOptions | string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const toastOptions =
        typeof opts === 'string' ? { message: opts, type: 'info' as ToastType } : opts;
      const type = toastOptions.type || 'info';
      const duration = toastOptions.duration || (type === 'loading' ? 0 : 2500);

      setOptions({ ...toastOptions, type });
      setVisible(true);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      if (duration > 0) {
        timerRef.current = setTimeout(() => {
          hide();
        }, duration);
      }
    },
    [opacity, translateY, hide]
  );

  const getIcon = () => {
    switch (options.type) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={24} color="#10B981" style={styles.icon} />;
      case 'error':
        return <Ionicons name="close-circle" size={24} color="#EF4444" style={styles.icon} />;
      case 'loading':
        return <Ionicons name="sync" size={24} color="#3B82F6" style={styles.icon} />; // Could add rotation animation here
      case 'info':
        return <Ionicons name="information-circle" size={24} color="#3B82F6" style={styles.icon} />;
      default:
        return null;
    }
  };

  return (
    <ToastContext.Provider
      value={{
        showToast,
        success: (msg) => {
          showToast({ message: msg, type: 'success' });
        },
        error: (msg) => {
          showToast({ message: msg, type: 'error' });
        },
        info: (msg) => {
          showToast({ message: msg, type: 'info' });
        },
        loading: (msg) => {
          showToast({ message: msg, type: 'loading' });
        },
        hide,
      }}
    >
      {children}
      {visible && (
        <View
          style={[styles.container, { top: Math.max(insets.top, 20) + 10 }]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              styles.toast,
              {
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            {getIcon()}
            <Text style={styles.message}>{options.message}</Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    maxWidth: '85%',
  },
  icon: {
    marginRight: 8,
  },
  message: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
});
