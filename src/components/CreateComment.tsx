'use client';
import { Label } from '@radix-ui/react-label';
import { FC, startTransition, useState } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/Button';
import { useMutation } from '@tanstack/react-query';
import { CommentRequest } from '@/lib/validators/comment';
import axios, { AxiosError } from 'axios';
import { useCustomToast } from '@/hooks/use-custom-toast';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

interface CreateCommentProps {
  postId: string;
  replyToId?: string;
}

const CreateComment: FC<CreateCommentProps> = ({
  postId,
  replyToId,
}: CreateCommentProps) => {
  const router = useRouter();
  const { loginToast } = useCustomToast();
  const { mutate: comment, isLoading } = useMutation({
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

      return toast({
        title: 'Comment posted',
        description: `You're post was sucessfully add to the post.`,
      });
    },
  });

  const [input, setInput] = useState('');

  return (
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

      <div className="mt-2 flex justify-end">
        <Button
          isLoading={isLoading}
          disabled={input.length === 0}
          onClick={() => comment({ postId, text: input, replyToId })}
        >
          Post
        </Button>
      </div>
    </div>
  );
};

export default CreateComment;
