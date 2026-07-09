import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, DeviceEventEmitter } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { HEALING_COLORS } from '../../config/handDrawnTheme';

const formatDuration = (ms: number) => {
  if (!ms || isNaN(ms)) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const AudioWaveform = ({ isPlaying, isDark }: { isPlaying: boolean, isDark: boolean }) => {
  const waveAnims = useRef(Array.from({ length: 30 }).map(() => new Animated.Value(0.15))).current;

  useEffect(() => {
    if (isPlaying) {
      const animations = waveAnims.map(anim => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: Math.random() * 0.6 + 0.4, duration: 250 + Math.random() * 200, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.15, duration: 250 + Math.random() * 200, useNativeDriver: true })
          ])
        );
      });
      animations.forEach(a => a.start());
      return () => animations.forEach(a => a.stop());
    } else {
      waveAnims.forEach(anim => {
        Animated.timing(anim, { toValue: 0.15, duration: 300, useNativeDriver: true }).start();
      });
    }
  }, [isPlaying]);

  return (
    <View style={styles.waveformContainer}>
      {waveAnims.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.waveBar,
            {
              backgroundColor: isDark ? '#666' : HEALING_COLORS.pink[400],
              transform: [{ scaleY: anim }]
            }
          ]}
        />
      ))}
    </View>
  );
};

interface InlineAudioPlayerProps {
  uri: string;
  duration?: number;
  isDark: boolean;
}

export const InlineAudioPlayer: React.FC<InlineAudioPlayerProps> = ({ uri, duration = 0, isDark }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('onAudioPlay', async (playingUri: string) => {
      if (playingUri !== uri && sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await sound.pauseAsync();
        }
      }
    });
    return () => {
      subscription.remove();
    };
  }, [uri, sound]);

  const handlePlayPause = async () => {
    try {
      if (!sound) {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          playThroughEarpieceAndroid: false,
        });
        DeviceEventEmitter.emit('onAudioPlay', uri);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
        setIsPlaying(true);
      } else {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          DeviceEventEmitter.emit('onAudioPlay', uri);
          // 如果已经播放到末尾，重新从头播放
          const status = await sound.getStatusAsync();
          if (status.isLoaded && status.positionMillis === status.durationMillis) {
            await sound.replayAsync();
          } else {
            await sound.playAsync();
          }
        }
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setPosition(status.positionMillis);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(status.durationMillis || 0); // 保持在末尾，或者重置为0
      }
    } else {
      if (status.error) {
        console.error(`FATAL PLAYER ERROR: ${status.error}`);
      }
    }
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.85}
      onPress={handlePlayPause}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#2C2C2C' : HEALING_COLORS.pink[50],
          shadowColor: isDark ? '#000' : HEALING_COLORS.pink[200],
        },
        !isDark && styles.lightShadow
      ]}
    >
      <View style={[
        styles.playButton, 
        { backgroundColor: isDark ? '#444' : HEALING_COLORS.pink[500] }
      ]}>
        <Ionicons 
          name={isPlaying ? "pause" : "play"} 
          size={16} 
          color="#FFF" 
          style={{ marginLeft: isPlaying ? 0 : 2 }} 
        />
      </View>
      
      <AudioWaveform isPlaying={isPlaying} isDark={isDark} />
      
      <Text style={[
        styles.timeText, 
        { color: isDark ? '#999' : HEALING_COLORS.pink[600] }
      ]}>
        {isPlaying ? formatDuration(position) : formatDuration(duration)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 6,
    paddingRight: 16,
    marginBottom: 8,
  },
  lightShadow: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 24,
    flex: 1,
    marginHorizontal: 12,
  },
  waveBar: {
    width: 3,
    height: 24,
    borderRadius: 1.5,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 36,
    textAlign: 'right',
    letterSpacing: 0.5,
  }
});