import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

import { FormatUtil } from '@/utils/format';

export interface Comment {
  id: string;
  user: string;
  userId?: string;
  avatar?: string;
  content: string;
  createTime?: string;
  time?: string; // 兼容旧数据
  parentId?: string; // 新增：父评论 ID
  replyToUser?: string; // 新增：回复的目标用户名称
  replies?: Comment[]; // 新增：嵌套的回复列表
}

interface CommentListProps {
  comments: Comment[];
  emptyText?: string;
  authorId?: string;
  onReplyPress?: (comment: Comment) => void; // 新增：点击回复事件回调
}

export const CommentList: React.FC<CommentListProps> = ({
  comments = [],
  emptyText = '还没有评论哦，快来抢沙发~',
  authorId,
  onReplyPress,
}) => {
  // 在组件内部将扁平的评论数组转换为树形结构
  const commentTree = useMemo(() => {
    const tree: Comment[] = [];
    const replyMap: Record<string, Comment[]> = {};

    comments.forEach((c) => {
      if (c.parentId) {
        if (!replyMap[c.parentId]) replyMap[c.parentId] = [];
        replyMap[c.parentId].push(c);
      } else {
        tree.push({ ...c, replies: [] });
      }
    });

    tree.forEach((t) => {
      if (replyMap[t.id]) {
        t.replies = replyMap[t.id];
      }
    });

    return tree;
  }, [comments]);

  return (
    <View style={styles.commentsSection}>
      <Text style={styles.commentsTitle}>全部评论 ({comments.length})</Text>
      {commentTree.map((comment) => (
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
                {comment.createTime || comment.time
                  ? FormatUtil.formatRelativeTime(comment.createTime || comment.time || '')
                  : ''}
              </Text>
            </View>

            {/* 主评论内容，点击触发回复 */}
            <TouchableOpacity activeOpacity={0.7} onPress={() => onReplyPress?.(comment)}>
              <Text style={styles.commentText}>{comment.content}</Text>
            </TouchableOpacity>

            {/* 嵌套回复区域 */}
            {comment.replies && comment.replies.length > 0 && (
              <View style={styles.repliesContainer}>
                {comment.replies.map((reply) => (
                  <TouchableOpacity
                    key={reply.id}
                    activeOpacity={0.7}
                    onPress={() => onReplyPress?.(reply)}
                    style={styles.replyItem}
                  >
                    <Text style={styles.replyText}>
                      <Text style={styles.replyUser}>{reply.user}</Text>
                      {reply.replyToUser && (
                        <>
                          <Text style={styles.replyAction}> 回复 </Text>
                          <Text style={styles.replyUser}>{reply.replyToUser}</Text>
                        </>
                      )}
                      <Text style={styles.replyColon}>: </Text>
                      {reply.content}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      ))}
      {comments.length === 0 && <Text style={styles.emptyCommentText}>{emptyText}</Text>}
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
  repliesContainer: {
    marginTop: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
  },
  replyItem: {
    marginBottom: 6,
  },
  replyText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  replyUser: {
    fontWeight: '600',
    color: '#374151',
  },
  replyAction: {
    color: '#9CA3AF',
  },
  replyColon: {
    fontWeight: '600',
    color: '#374151',
  },
});
