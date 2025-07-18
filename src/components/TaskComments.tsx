import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Send, 
  Reply, 
  Edit3, 
  Trash2, 
  MoreHorizontal,
  MessageCircle,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { useTaskRealtime } from '../hooks/useRealtimeSubscription';
import { formatDistanceToNow } from 'date-fns';

interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  user: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
  replies?: TaskComment[];
}

interface TaskCommentsProps {
  taskId: string;
  taskTitle: string;
}

const TaskComments: React.FC<TaskCommentsProps> = ({ taskId, taskTitle }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load comments
  useEffect(() => {
    loadComments();
  }, [taskId]);

  // Real-time comment updates
  useTaskRealtime(
    taskId,
    undefined, // onTaskUpdate
    undefined, // onSubtaskUpdate
    (comment) => {
      // Handle real-time comment updates
      loadComments(); // Reload comments for simplicity
    }
  );

  const loadComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:auth.users!task_comments_user_id_fkey(
            id,
            email,
            raw_user_meta_data
          )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading comments:', error);
        setError('Failed to load comments');
        return;
      }

      // Organize comments into threads
      const commentsMap = new Map<string, TaskComment>();
      const rootComments: TaskComment[] = [];

      // First pass: create all comments
      data?.forEach(comment => {
        const formattedComment: TaskComment = {
          ...comment,
          replies: []
        };
        commentsMap.set(comment.id, formattedComment);
      });

      // Second pass: organize into threads
      data?.forEach(comment => {
        const formattedComment = commentsMap.get(comment.id)!;
        if (comment.parent_comment_id) {
          const parent = commentsMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(formattedComment);
          }
        } else {
          rootComments.push(formattedComment);
        }
      });

      setComments(rootComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (parentId?: string) => {
    const content = parentId ? editContent : newComment;
    if (!content.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user?.id,
          content: content.trim(),
          parent_comment_id: parentId || null
        })
        .select(`
          *,
          user:auth.users!task_comments_user_id_fkey(
            id,
            email,
            raw_user_meta_data
          )
        `)
        .single();

      if (error) {
        console.error('Error adding comment:', error);
        setError('Failed to add comment');
        return;
      }

      // Reset form
      if (parentId) {
        setReplyingTo(null);
        setEditContent('');
      } else {
        setNewComment('');
      }

      // Reload comments
      loadComments();

      // Log activity
      await supabase.rpc('log_user_activity', {
        p_user_id: user?.id,
        p_activity_type: parentId ? 'comment_reply' : 'comment_added',
        p_activity_description: `${parentId ? 'Replied to' : 'Added'} comment on task: ${taskTitle}`,
        p_metadata: { 
          task_id: taskId, 
          comment_id: data.id,
          parent_comment_id: parentId
        }
      });

    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const updateComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('task_comments')
        .update({
          content: editContent.trim(),
          updated_at: new Date().toISOString(),
          is_edited: true
        })
        .eq('id', commentId);

      if (error) {
        console.error('Error updating comment:', error);
        setError('Failed to update comment');
        return;
      }

      setEditingComment(null);
      setEditContent('');
      loadComments();

    } catch (error) {
      console.error('Error updating comment:', error);
      setError('Failed to update comment');
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('Error deleting comment:', error);
        setError('Failed to delete comment');
        return;
      }

      loadComments();

    } catch (error) {
      console.error('Error deleting comment:', error);
      setError('Failed to delete comment');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (comment: TaskComment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingComment(null);
    setEditContent('');
  };

  const startReplying = (commentId: string) => {
    setReplyingTo(commentId);
    setEditContent('');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const renderComment = (comment: TaskComment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-8 mt-3' : 'mb-4'}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.user.user_metadata?.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs">
            {comment.user.user_metadata?.full_name?.charAt(0) || comment.user.email.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {comment.user.user_metadata?.full_name || comment.user.email}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
                {comment.is_edited && (
                  <Badge variant="secondary" className="text-xs">edited</Badge>
                )}
              </div>
              
              {comment.user_id === user?.id && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditing(comment)}
                    className="h-6 w-6 p-0"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteComment(comment.id)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            
            {editingComment === comment.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateComment(comment.id)}>
                    <Check className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditing}>
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                {!isReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startReplying(comment.id)}
                    className="mt-2 h-6 text-xs"
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                )}
              </>
            )}
          </div>
          
          {/* Reply form */}
          {replyingTo === comment.id && (
            <div className="mt-3 ml-3">
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="min-h-[60px]"
                />
                <div className="flex flex-col gap-1">
                  <Button size="sm" onClick={() => addComment(comment.id)}>
                    <Send className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setReplyingTo(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3">
              {comment.replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Comments
          {comments.length > 0 && (
            <Badge variant="secondary">{comments.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Add new comment */}
        <div className="mb-6">
          <div className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs">
                {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="min-h-[80px]"
              />
              <div className="flex justify-end mt-2">
                <Button 
                  onClick={() => addComment()} 
                  disabled={!newComment.trim() || loading}
                  size="sm"
                >
                  {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                  Comment
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments list */}
        {loading && comments.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No comments yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map(comment => renderComment(comment))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskComments;
