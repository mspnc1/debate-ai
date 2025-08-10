import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface AppLogoProps {
  size?: number;
}

const AppLogo: React.FC<AppLogoProps> = ({ size = 120 }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require('../../assets/app-logo.png') as number}
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
});

export default AppLogo;