'use client';
import { FC, startTransition, useRef, useState } from 'react';
import UserAvatar from './UserAvatar';
import { Comment, CommentVote, User } from '@prisma/client';
import { formatTimeToNow } from '@/lib/utils';
import CommentVotes from './CommentVotes';
import { Button } from './ui/Button';
import { MessageSquare } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useMutation } from '@tanstack/react-query';
import { CommentRequest } from '@/lib/validators/comment';
import axios, { AxiosError } from 'axios';
import { useCustomToast } from '@/hooks/use-custom-toast';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type ExtendedComment = Comment & {
  votes: CommentVote[];
  author: User;
};

interface PostCommentProps {
  comment: ExtendedComment;
  votesAmt: number;
  currentVote?: CommentVote;
  postId: string;
}

const PostComment: FC<PostCommentProps> = function ({
  postId,
  comment,
  votesAmt,
  currentVote,
}) {
  const router = useRouter();
  const commentRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const { loginToast } = useCustomToast();

  const [isReplying, setIsReplying] = useState(false);
  const [input, setInput] = useState('');

  const { mutate: postComment, isLoading } = useMutation({
    mutationFn: async ({ postId, text, replyToId }: CommentRequest) => {
      const payload: CommentRequest = {
        postId,
        text,
        replyToId,
      };

      const { data } = await axios.patch(
        `/api/subreddit/post/comment`,
        payload
      );
      return data;
    },
    onError: (err) => {
      if (err instanceof AxiosError) {
        if (err.response?.status === 401) {
          return loginToast();
        }
      }
      return toast({
        title: 'There was a problem',
        description: 'Something went wrong, please try again.',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      startTransition(() => {
        router.refresh();
      });

      setIsReplying(false);

      return toast({
        title: 'Comment posted',
        description: `You're post was sucessfully add to the post.`,
      });
    },
  });

  return (
    <div className="flex flex-col" ref={commentRef}>
      <div className="flex items-center">
        <UserAvatar
          user={{
            name: comment.author.name || null,
            image: comment.author.image || null,
          }}
          className="h-6 w-6"
        />
        <div className="ml-2 flex items-center gap-x-2">
          <p className="text-sm font-medium text-gray-900">
            u/{comment.author.username}
          </p>
          <p className="max-h-40 truncate text-xs text-zinc-500">
            {formatTimeToNow(new Date(comment.createdAt))}
          </p>
        </div>
      </div>
      <p className="test-sm text-zinc-900 mt-2">{comment.text}</p>

      <div className="flex gap-2 items-center">
        <CommentVotes
          commentId={comment.id}
          initialVotesAmt={votesAmt}
          initialVote={currentVote}
        />

        <Button
          onClick={() => {
            if (!session) return router.push('sign-in');
            setIsReplying(true);
          }}
          variant="ghost"
          size="xs"
        >
          <MessageSquare className="w-4 h-4 mr-1.5" />
          Reply
        </Button>
      </div>
      {isReplying && (
        <div className="grid w-full gap-1.5">
          <Label htmlFor="comment">Your comment</Label>
          <div className="mt-2" />
          <Textarea
            id="comment"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            placeholder="What are your thoguhts"
          />

          <div className="gap-2 mt-2 flex justify-end">
            <Button
              tabIndex={-1}
              variant="subtle"
              onClick={() => {
                setIsReplying(false);
              }}
            >
              Cancel
            </Button>
            <Button
              isLoading={isLoading}
              disabled={input.length === 0}
              onClick={() => {
                if (!input) return;
                postComment({
                  postId,
                  text: input,
                  replyToId: comment.replyToId ?? comment.id,
                });
              }}
            >
              Post
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostComment;
