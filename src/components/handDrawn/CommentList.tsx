import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

import { FormatUtil } from '@/utils/format';

interface Comment {
  id: string;
  user: string;
  userId?: string;
  avatar?: string;
  content: string;
  createTime?: string;
  time?: string; // 兼容旧数据
}

interface CommentListProps {
  comments: Comment[];
  emptyText?: string;
  authorId?: string;
}

export const CommentList: React.FC<CommentListProps> = ({ 
  comments = [], 
  emptyText = '还没有评论哦，快来抢沙发~',
  authorId
}) => {
  return (
    <View style={styles.commentsSection}>
      <Text style={styles.commentsTitle}>全部评论 ({comments.length})</Text>
      {comments.map((comment) => (
        <View key={comment.id} style={styles.commentItem}>
          <View style={styles.commentAvatar}>
            {comment.avatar ? (
              <Image source={{ uri: comment.avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.commentAvatarEmoji}>😸</Text>
            )}
          </View>
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <View style={styles.userRow}>
                <Text style={styles.commentUser}>{comment.user}</Text>
                {authorId && comment.userId === authorId && (
                  <View style={styles.authorTag}>
                    <Text style={styles.authorTagText}>作者</Text>
                  </View>
                )}
              </View>
              <Text style={styles.commentTime}>
                {(comment.createTime || comment.time) ? FormatUtil.formatRelativeTime(comment.createTime || comment.time || '') : ''}
              </Text>
            </View>
            <Text style={styles.commentText}>{comment.content}</Text>
          </View>
        </View>
      ))}
      {comments.length === 0 && (
        <Text style={styles.emptyCommentText}>{emptyText}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  commentsSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentAvatarEmoji: {
    fontSize: 18,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorTag: {
    backgroundColor: '#ffe5eb', // pink-200
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  authorTagText: {
    fontSize: 10,
    color: '#f43a3a', // pink-700
    fontWeight: 'bold',
  },
  commentUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  commentTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  commentText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  emptyCommentText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 20,
  },
});