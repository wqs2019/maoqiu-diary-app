import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, TextInput } from 'react-native';

import type { Comment } from '@/components/handDrawn/CommentList';
import { useCommentDiary } from '@/hooks/useDiaryQuery';

type CommentComposerUser = {
  _id?: string;
  nickname?: string | null;
  avatar?: string | null;
} | null;

interface UseCommentComposerOptions {
  diaryId: string;
  initialComments?: Comment[];
  user?: CommentComposerUser;
  initialInputVisible?: boolean;
  hideInputOnKeyboardHide?: boolean;
  collapseAfterSend?: boolean;
}

export const useCommentComposer = ({
  diaryId,
  initialComments = [],
  user,
  initialInputVisible = true,
  hideInputOnKeyboardHide = false,
  collapseAfterSend = false,
}: UseCommentComposerOptions) => {
  const commentMutation = useCommentDiary();
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [replyToComment, setReplyToComment] = useState<Comment | null>(null);
  const [commentInputVisible, setCommentInputVisible] = useState(initialInputVisible);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setComments(initialComments || []);
  }, [initialComments]);

  useEffect(() => {
    if (!hideInputOnKeyboardHide) {
      return;
    }

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setCommentInputVisible(false);
      setReplyToComment(null);
      setCommentText('');
    });

    return () => {
      hideSubscription.remove();
    };
  }, [hideInputOnKeyboardHide]);

  const focusCommentInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const openCommentInput = useCallback(
    (comment?: Comment | null) => {
      setReplyToComment(comment || null);
      setCommentInputVisible(true);
      focusCommentInput();
    },
    [focusCommentInput]
  );

  const handleReplyPress = useCallback(
    (comment: Comment) => {
      openCommentInput(comment);
    },
    [openCommentInput]
  );

  const handleSendComment = useCallback(() => {
    if (!commentText.trim() || !user?._id) {
      return;
    }

    const newComment: Comment = {
      id: Date.now().toString(),
      user: user.nickname || '我',
      userId: user._id,
      avatar: user.avatar || undefined,
      content: commentText.trim(),
      createTime: new Date().toISOString(),
    };

    if (replyToComment) {
      newComment.parentId = replyToComment.parentId || replyToComment.id;
      newComment.replyToUser = replyToComment.user;
      newComment.replyToUserId = replyToComment.userId;
    }

    setComments((prevComments) => [...prevComments, newComment]);
    setCommentText('');
    setReplyToComment(null);

    if (collapseAfterSend) {
      setCommentInputVisible(false);
    }

    Keyboard.dismiss();
    commentMutation.mutate({ id: diaryId, comment: newComment });
  }, [collapseAfterSend, commentMutation, commentText, diaryId, replyToComment, user]);

  const handleCloseCommentInput = useCallback(() => {
    setCommentInputVisible(false);
    setReplyToComment(null);
    setCommentText('');
    Keyboard.dismiss();
  }, []);

  return {
    commentText,
    setCommentText,
    comments,
    setComments,
    replyToComment,
    setReplyToComment,
    commentInputVisible,
    setCommentInputVisible,
    inputRef,
    openCommentInput,
    focusCommentInput,
    handleReplyPress,
    handleSendComment,
    handleCloseCommentInput,
    commentMutation,
  };
};
