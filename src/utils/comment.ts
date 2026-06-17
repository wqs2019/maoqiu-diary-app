import type { Comment } from '@/components/handDrawn/CommentList';

export const removeCommentFromList = (comments: Comment[], targetComment: Comment): Comment[] => {
  return comments.filter((item) => {
    if (item.id === targetComment.id) {
      return false;
    }

    if (!targetComment.parentId && item.parentId === targetComment.id) {
      return false;
    }

    return true;
  });
};

export const getReplyTargetAfterDelete = (
  replyToComment: Comment | null,
  targetComment: Comment
): Comment | null => {
  if (!replyToComment) {
    return null;
  }

  if (replyToComment.id === targetComment.id) {
    return null;
  }

  if (!targetComment.parentId && replyToComment.parentId === targetComment.id) {
    return null;
  }

  return replyToComment;
};
