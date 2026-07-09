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
  const waveAnims = useRef(Array.from({ length: 25 }).map(() => new Animated.Value(0.2))).current;

  useEffect(() => {
    if (isPlaying) {
      const animations = waveAnims.map(anim => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: Math.random() * 0.8 + 0.2, duration: 200 + Math.random() * 200, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.2, duration: 200 + Math.random() * 200, useNativeDriver: true })
          ])
        );
      });
      animations.forEach(a => a.start());
      return () => animations.forEach(a => a.stop());
    } else {
      waveAnims.forEach(anim => {
        Animated.timing(anim, { toValue: 0.2, duration: 200, useNativeDriver: true }).start();
      });
    }
  }, [isPlaying]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 24, gap: 3, flex: 1, marginHorizontal: 12 }}>
      {waveAnims.map((anim, index) => (
        <Animated.View
          key={index}
          style={{
            flex: 1,
            height: 24,
            backgroundColor: isDark ? '#666' : HEALING_COLORS.pink[300],
            borderRadius: 2,
            transform: [{ scaleY: anim }]
          }}
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
      activeOpacity={0.8}
      onPress={handlePlayPause}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#2C2C2C' : HEALING_COLORS.pink[50],
          borderColor: isDark ? '#444' : HEALING_COLORS.pink[100],
        }
      ]}
    >
      <View style={[styles.playButton, { backgroundColor: isDark ? '#444' : '#FFF' }]}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={18} color={isDark ? '#AAA' : HEALING_COLORS.pink[500]} style={{ marginLeft: isPlaying ? 0 : 2 }} />
      </View>
      
      <AudioWaveform isPlaying={isPlaying} isDark={isDark} />
      
      <Text style={[styles.timeText, { color: isDark ? '#AAA' : HEALING_COLORS.pink[600] }]}>
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
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'right',
  }
});