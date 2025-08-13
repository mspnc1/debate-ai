/**
 * ScoreDisplay Organism Component
 * Displays current debate scores
 */

import React from 'react';
import { View } from 'react-native';
import { Box } from '../../atoms';
import { Typography } from '../../molecules';
import { useTheme } from '../../../theme';
import { AI } from '../../../types';
import { AI_BRAND_COLORS } from '../../../constants/aiColors';
import { ScoreBoard } from '../../../services/debate';

export interface ScoreDisplayProps {
  participants: AI[];
  scores: ScoreBoard;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  participants,
  scores,
}) => {
  const { theme } = useTheme();

  const getAIColor = (aiId: string) => {
    const aiBrandKey = (aiId === 'openai' || aiId === 'chatgpt') ? 'openai' : 
                       aiId === 'claude' ? 'claude' :
                       aiId === 'gemini' ? 'gemini' :
                       aiId === 'nomi' ? 'nomi' : null;
    
    return aiBrandKey ? AI_BRAND_COLORS[aiBrandKey as keyof typeof AI_BRAND_COLORS] : theme.colors.primary;
  };

  return (
    <Box style={{
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderTopWidth: 1,
    }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
      }}>
        {participants.map((ai) => {
          const aiScore = scores[ai.id];
          const aiColor = getAIColor(ai.id);
          
          return (
            <View key={ai.id} style={{ 
              flexDirection: 'row', 
              alignItems: 'center',
              gap: 8,
            }}>
              <Typography 
                variant="body" 
                weight="semibold"
                style={{ color: aiColor[600] }}
              >
                {ai.name}
              </Typography>
              <Typography 
                variant="heading" 
                weight="bold"
                style={{ fontSize: 24 }}
              >
                {aiScore?.roundWins || 0}
              </Typography>
            </View>
          );
        })}
      </View>
    </Box>
  );
};