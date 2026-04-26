import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

type MountFn = (id: string, content: ReactNode) => void;
type UnmountFn = (id: string) => void;

// We use EventEmitter pattern instead of React State to avoid infinite loops
// when the Portal consumer is deeply nested and causes re-renders.
class PortalManager {
  private readonly portals: Map<string, ReactNode> = new Map();
  private readonly listeners: Set<() => void> = new Set();

  mount(id: string, content: ReactNode) {
    this.portals.set(id, content);
    this.notify();
  }

  unmount(id: string) {
    this.portals.delete(id);
    this.notify();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getPortals() {
    return Array.from(this.portals.entries());
  }

  private notify() {
    this.listeners.forEach((listener) => {
      listener();
    });
  }
}

const PortalContext = createContext<PortalManager | null>(null);

export const PortalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const managerRef = useRef(new PortalManager());
  const manager = managerRef.current;
  const [portals, setPortals] = useState<[string, ReactNode][]>([]);

  useEffect(() => {
    return manager.subscribe(() => {
      setPortals(manager.getPortals());
    });
  }, [manager]);

  return (
    <PortalContext.Provider value={manager}>
      <View style={styles.container}>{children}</View>
      {portals.map(([id, content]) => (
        <View key={id} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {content}
        </View>
      ))}
    </PortalContext.Provider>
  );
};

export const Portal: React.FC<{ children: ReactNode }> = ({ children }) => {
  const manager = useContext(PortalContext);
  const [id] = useState(() => Math.random().toString(36).substring(2, 9));

  useEffect(() => {
    if (manager) {
      manager.mount(id, children);
    }
  }, [children, manager, id]);

  useEffect(() => {
    return () => {
      if (manager) {
        manager.unmount(id);
      }
    };
  }, [manager, id]);

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
