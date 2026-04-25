import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';

const WebScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const [loading, setLoading] = useState(true);

  // 从路由参数中获取要打开的链接和标题
  const { url, title } = route.params || {};

  if (!url) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: isDark ? '#121212' : '#FAFAFA' }]}>
        <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={28} color={isDark ? '#FFF' : HEALING_COLORS.gray[800]} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}>错误</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={{ color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }}>未提供有效的链接</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: isDark ? '#121212' : '#FAFAFA' }]}>
      <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#F0F0F0', backgroundColor: isDark ? '#121212' : '#FAFAFA' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={28} color={isDark ? '#FFF' : HEALING_COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]} numberOfLines={1}>
          {title || '网页'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.webViewContainer}>
        {loading && (
          <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#121212' : '#FAFAFA' }]}>
            <ActivityIndicator size="large" color={HEALING_COLORS.pink[400]} />
          </View>
        )}
        <WebView
          source={{ uri: url }}
          style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#FAFAFA' }}
          onLoadEnd={() => setLoading(false)}
          startInLoadingState={false}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  webViewContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
});

export default WebScreen;
