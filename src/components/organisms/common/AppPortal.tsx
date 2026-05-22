import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

interface AppPortalContextValue {
  setPortalNode: (node: React.ReactNode) => void;
  clearPortalNode: () => void;
}

const AppPortalContext = createContext<AppPortalContextValue | null>(null);

export const AppPortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [portalNode, setPortalNodeState] = useState<React.ReactNode>(null);

  const value = useMemo<AppPortalContextValue>(
    () => ({
      setPortalNode: setPortalNodeState,
      clearPortalNode: () => setPortalNodeState(null),
    }),
    []
  );

  return (
    <AppPortalContext.Provider value={value}>
      <View style={styles.host}>
        {children}
        {portalNode ? (
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            {portalNode}
          </View>
        ) : null}
      </View>
    </AppPortalContext.Provider>
  );
};

export const AppPortal: React.FC<{ visible: boolean; children: React.ReactNode }> = ({
  visible,
  children,
}) => {
  const portal = useContext(AppPortalContext);

  useEffect(() => {
    if (!portal) return;

    if (visible) {
      portal.setPortalNode(children);
    } else {
      portal.clearPortalNode();
    }

    return () => {
      portal.clearPortalNode();
    };
  }, [children, portal, visible]);

  if (portal || !visible) return null;

  return <>{children}</>;
};

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
});
