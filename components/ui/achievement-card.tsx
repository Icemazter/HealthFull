import { Palette } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AchievementCardProps {
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
  isDark: boolean;
  progress?: number;
  total?: number;
}

export const AchievementCard = React.memo(
  ({
    emoji,
    title,
    description,
    unlocked,
    isDark,
    progress,
    total,
  }: AchievementCardProps) => {
    const percent =
      progress && total ? Math.round((progress / total) * 100) : 0;

    return (
      <View
        style={[
          styles.card,
          isDark && styles.cardDark,
          unlocked && styles.cardUnlocked,
        ]}>
        <View
          style={[
            styles.emojiContainer,
            !unlocked && styles.emojiContainerLocked,
          ]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              isDark && styles.titleDark,
              unlocked && styles.titleUnlocked,
            ]}>
            {title}
          </Text>
          <Text style={[styles.description, isDark && styles.descriptionDark]}>
            {description}
          </Text>
          {progress !== undefined && total !== undefined && (
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBar,
                  isDark && styles.progressBarDark,
                ]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(percent, 100)}%` },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, isDark && styles.progressTextDark]}>
                {progress}/{total}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  },
  (prev, next) => {
    return (
      prev.emoji === next.emoji &&
      prev.title === next.title &&
      prev.unlocked === next.unlocked &&
      prev.isDark === next.isDark &&
      prev.progress === next.progress &&
      prev.total === next.total
    );
  }
);

AchievementCard.displayName = 'AchievementCard';

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#e5e7eb',
    opacity: 0.6,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderLeftColor: '#334155',
  },
  cardUnlocked: {
    opacity: 1,
    borderLeftColor: Palette.primary,
    backgroundColor: '#f0f9ff',
  },
  emojiContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emojiContainerLocked: {
    backgroundColor: '#d1d5db',
  },
  emoji: {
    fontSize: 28,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 2,
  },
  titleDark: {
    color: '#9ca3af',
  },
  titleUnlocked: {
    color: Palette.primary,
  },
  description: {
    fontSize: 12,
    color: '#9ca3af',
  },
  descriptionDark: {
    color: '#64748b',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBarDark: {
    backgroundColor: '#334155',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Palette.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  progressTextDark: {
    color: '#64748b',
  },
});
