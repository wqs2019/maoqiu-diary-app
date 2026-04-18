import React, { useEffect, useRef } from "react"; 
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native"; 
import { Ionicons } from "@expo/vector-icons"; 

export default function CustomSplashScreen({ onFinish }: { onFinish: () => void }) { 
  // Animation values 
  const fadeAnim = useRef(new Animated.Value(0)).current; 
  const scaleAnim = useRef(new Animated.Value(0.8)).current; 
  const textFadeAnim = useRef(new Animated.Value(0)).current; 
  const pawAnim = useRef(new Animated.Value(0)).current; 

  useEffect(() => { 
    // Sequence of animations 
    Animated.sequence([ 
      // 1. Fade in and Scale up logo 
      Animated.parallel([ 
        Animated.timing(fadeAnim, { 
          toValue: 1, 
          duration: 600, // Reduced from 800 
          useNativeDriver: true, 
        }), 
        Animated.spring(scaleAnim, { 
          toValue: 1, 
          friction: 8, 
          tension: 40, 
          useNativeDriver: true, 
        }), 
      ]), 
      // 2. Show text (in parallel with paw to save time) 
      Animated.parallel([ 
        Animated.timing(textFadeAnim, { 
          toValue: 1, 
          duration: 400, // Reduced from 600 
          useNativeDriver: true, 
        }), 
        // 3. Paw print animation 
        Animated.spring(pawAnim, { 
          toValue: 1, 
          friction: 6, 
          useNativeDriver: true, 
        }), 
      ]), 
      // 4. Wait a bit then finish 
      Animated.delay(600), // Reduced from 1500 
    ]).start(() => { 
      // Fade out everything before unmounting 
      Animated.timing(fadeAnim, { 
        toValue: 0, 
        duration: 300, // Reduced from 500 
        useNativeDriver: true, 
      }).start(onFinish); 
    }); 
  }, []); 

  return ( 
    <View style={[styles.container, { backgroundColor: "#FDF9F7" }]}> 
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}> 
        {/* Main Logo Composition */} 
        <View style={styles.logoCircle}> 
          {/* Using a combination of icons to create a unique logo */} 
          <Ionicons name="book" size={60} color="#FFB6C1" style={styles.bookIcon} /> 
          <Animated.View style={[styles.pawContainer, { opacity: pawAnim, transform: [{ scale: pawAnim }] }]}> 
            <Ionicons name="paw" size={30} color="#FF8B94" /> 
          </Animated.View> 
        </View> 

        {/* App Name */} 
        <Animated.View style={{ opacity: textFadeAnim, alignItems: "center" }}> 
          <Text style={[styles.appName, { color: "#5D4037" }]}>毛球日记</Text> 
          <Text style={[styles.tagline, { color: "#8D6E63" }]}>记录每一个特别的瞬间</Text> 
        </Animated.View> 
      </Animated.View> 

      {/* Footer decoration */} 
      <View style={styles.footer}> 
        <Text style={styles.copyright}>© 2026 Maoqiu Diary</Text> 
      </View> 
    </View> 
  ); 
} 

const styles = StyleSheet.create({ 
  container: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: "center", 
    alignItems: "center", 
    zIndex: 9999, // Ensure it's on top 
  }, 
  content: { 
    alignItems: "center", 
    justifyContent: "center", 
  }, 
  logoCircle: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    backgroundColor: "#FFF", 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 24, 
    shadowColor: "#FFB6C1", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 10, 
    elevation: 5, 
  }, 
  bookIcon: { 
    marginLeft: 4, // Visual adjustment 
  }, 
  pawContainer: { 
    position: "absolute", 
    bottom: 24, 
    right: 24, 
    backgroundColor: "#FFF", 
    borderRadius: 15, 
    padding: 2, 
  }, 
  appName: { 
    fontSize: 28, 
    fontWeight: "bold", 
    letterSpacing: 2, 
    marginBottom: 8, 
  }, 
  tagline: { 
    fontSize: 14, 
    letterSpacing: 1, 
  }, 
  footer: { 
    position: "absolute", 
    bottom: 40, 
  }, 
  copyright: { 
    fontSize: 10, 
    color: "#BCAAA4", 
  }, 
});