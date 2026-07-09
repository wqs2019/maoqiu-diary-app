import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';

interface VoiceRecordModalProps {
  visible: boolean;
  onClose: () => void;
  onRecordComplete: (uri: string, duration: number) => void;
}

export const VoiceRecordModal: React.FC<VoiceRecordModalProps> = ({ visible, onClose, onRecordComplete }) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const { isDark } = useAppTheme();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1000);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        // 必须先设置 AudioMode，并且在 iOS 上需要设置 playsInSilentModeIOS 为 true
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          playThroughEarpieceAndroid: false,
        });
        
        try {
          // 创建录音实例
          const { recording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
          );
          
          setRecording(recording);
          setIsRecording(true);
        } catch (recordErr: any) {
          console.error('Failed to create recording instance', recordErr);
          // 如果在模拟器上报错，给用户一个友好的提示
          if (recordErr?.message?.includes('recorder not prepared')) {
            alert('录音功能在当前 iOS 模拟器上不可用，请在真机上测试。');
          }
        }
      } else {
        console.warn('Microphone permission not granted');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async (discard = false) => {
    if (!recording) return;
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      
      // 恢复默认的音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false,
      });
      
      const uri = recording.getURI();
      if (uri && !discard) {
        onRecordComplete(uri, duration);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
    setRecording(null);
    if (discard) {
      onClose();
    }
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: isDark ? '#1E1E1E' : '#FFF' }]}>
          <Text style={[styles.title, { color: isDark ? '#FFF' : '#333' }]}>录制语音</Text>
          <Text style={[styles.duration, { color: isDark ? '#AAA' : '#666' }]}>
            {formatDuration(duration)}
          </Text>
          
          <TouchableOpacity
            style={[styles.recordButton, isRecording && styles.recordingActive]}
            onPress={() => isRecording ? stopRecording(false) : startRecording()}
          >
            <Ionicons name={isRecording ? "stop" : "mic"} size={40} color="#FFF" />
          </TouchableOpacity>
          
          <Text style={[styles.hint, { color: isDark ? '#888' : '#999' }]}>
            {isRecording ? '点击停止录音' : '点击开始录音'}
          </Text>

          <TouchableOpacity style={styles.closeButton} onPress={() => {
            if (isRecording) {
              stopRecording(true);
            } else {
              onClose();
            }
          }}>
            <Text style={[styles.closeText, { color: isDark ? '#AAA' : '#666' }]}>取消</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: 300,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  duration: {
    fontSize: 36,
    fontWeight: '300',
    marginBottom: 32,
    fontVariant: ['tabular-nums'],
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: HEALING_COLORS.pink[400],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: HEALING_COLORS.pink[400],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  recordingActive: {
    backgroundColor: '#FF4444',
    shadowColor: '#FF4444',
  },
  hint: {
    fontSize: 14,
    marginBottom: 24,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  closeText: {
    fontSize: 16,
  },
});
