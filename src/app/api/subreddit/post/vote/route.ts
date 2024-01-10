import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { postVoteValidator } from '@/lib/validators/vote';
import { CachedPost } from '@/types/redits';
import { z } from 'zod';

const CACHE_AFTER_UPVOTES = 1;

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    const { postId, voteType } = postVoteValidator.parse(body);

    const session = await getAuthSession();
    console.log(
      'LS -> src/app/api/subreddit/post/vote/route.ts:16 -> session: ',
      session
    );

    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const existingVote = await db.vote.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId,
        },
      },
    });

    const post = await db.post.findUnique({
      where: {
        id: postId,
      },
      include: {
        author: true,
        votes: true,
      },
    });

    if (!post) {
      return new Response('Post not found', { status: 404 });
    }

    /* if(!existingVote){
      await db.vote.create({
        data: {
          type: voteType,
          postId,
          userId: session.user.id
        }
      })

    }

    if(existingVote?.type !== voteType) {
      await db.vote.update({
        where: {userId_postId: {
          userId: session.user.id,
          postId
        }},
        data: {type: voteType}
      })
    } */

    /* if (!existingVote || existingVote?.type !== voteType) {
      await db.vote.upsert({
        where: {
          userId_postId: {
            userId: session.user.id,
            postId,
          },
        },
        create: {
          type: voteType,
          postId,
          userId: session.user.id,
        },
        update: {
          type: voteType,
        },
      });
    } else {
      await db.vote.delete({
        where: {
          userId_postId: {
            userId: session.user.id,
            postId,
          },
        },
      });
    } */

    if (existingVote) {
      if (existingVote.type === voteType) {
        await db.vote.delete({
          where: {
            userId_postId: {
              userId: session.user.id,
              postId,
            },
          },
        });

        return new Response('OK');
      }

      await db.vote.update({
        where: {
          userId_postId: {
            userId: session.user.id,
            postId,
          },
        },
        data: { type: voteType },
      });

      const votesAmt = post.votes.reduce((acc, vote) => {
        if (vote.type === 'UP') return acc + 1;
        if (vote.type === 'DOWN') return acc - 1;
        return acc;
      }, 0);

      if (votesAmt >= CACHE_AFTER_UPVOTES) {
        const cachePayload: CachedPost = {
          authorUserName: post.author.username ?? '',
          content: JSON.stringify(post.content),
          id: post.id,
          title: post.title,
          currentVote: voteType,
          createdAt: post.createdAt,
        };

        await redis.hset(`post:${postId}`, cachePayload);
      }

      return new Response('OK');
    }

    await db.vote.create({
      data: {
        type: voteType,
        postId,
        userId: session.user.id,
      },
    });

    const votesAmt = post.votes.reduce((acc, vote) => {
      if (vote.type === 'UP') return acc + 1;
      if (vote.type === 'DOWN') return acc - 1;
      return acc;
    }, 0);

    if (votesAmt >= CACHE_AFTER_UPVOTES) {
      const cachePayload: CachedPost = {
        authorUserName: post.author.username ?? '',
        content: JSON.stringify(post.content),
        id: post.id,
        title: post.title,
        currentVote: voteType,
        createdAt: post.createdAt,
      };

      await redis.hset(`post:${postId}`, cachePayload);
    }

    return new Response('OK');
  } catch (err) {
    if (err instanceof z.ZodError) {
      return new Response('Invalid POST request data passed', { status: 422 });
    }
    return new Response('Could not register your vote, please try again.', {
      status: 500,
    });
  }
}
