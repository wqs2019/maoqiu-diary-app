import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Dimensions,
} from 'react-native';

import { Modal } from './Modal';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { APP_STORE_URL } from '../../utils/update';

interface UpdateModalProps {
  visible: boolean;
  currentVersion: string;
  latestVersion: string;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  currentVersion,
  latestVersion,
  onClose,
}) => {
  const { isDark } = useAppTheme();
  const { t } = useTranslation();

  const handleUpdate = () => {
    Linking.openURL(APP_STORE_URL);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <BlurView
        intensity={isDark ? 40 : 20}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2C1B24' : HEALING_COLORS.pink[50] }]}>
            <Ionicons name="rocket" size={48} color={HEALING_COLORS.pink[500]} />
          </View>
          
          <Text style={[styles.title, { color: isDark ? '#FFF' : '#333' }]}>
            {t('aboutScreen.updateErrors.newVersionTitle')}
          </Text>
          
          <Text style={[styles.message, { color: isDark ? '#AAA' : '#666' }]}>
            {t('aboutScreen.updateErrors.newVersionMessage', { current: currentVersion, latest: latestVersion })}
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: isDark ? '#333' : '#F5F5F5' }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: isDark ? '#AAA' : '#666' }]}>
                {t('aboutScreen.updateErrors.later')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.updateButton, { backgroundColor: HEALING_COLORS.pink[500] }]}
              onPress={handleUpdate}
            >
              <Text style={[styles.buttonText, { color: '#FFF', fontWeight: '600' }]}>
                {t('aboutScreen.updateErrors.updateNow')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // 增加一层半透明黑色，让模糊效果更明显
  },
  container: {
    width: Math.min(width - 48, 340),
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: 12,
  },
  updateButton: {
    shadowColor: HEALING_COLORS.pink[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
