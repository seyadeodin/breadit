import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { PostValidator } from '@/lib/validators/post';
import { SubredditSubscriptionValidator } from '@/lib/validators/subreddit';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await req.json();

    const { subredditId, title, content } = PostValidator.parse(body);

    const subscriptionExists = await db.subscription.findFirst({
      where: {
        subredditId,
        userId: session.user.id,
      },
    });
    console.log(
      'LS -> src/app/api/subreddit/post/create/route.ts:24 -> subscriptionExists: ',
      subscriptionExists
    );

    if (!subscriptionExists) {
      return new Response('Subscribe to post', {
        status: 400,
      });
    }

    await db.post.create({
      data: {
        subredditId,
        title,
        content,
        authorId: session.user.id,
      },
    });

    return new Response('Ok');
  } catch (err) {
    console.log(
      'LS -> src/app/api/subreddit/post/create/route.ts:42 -> err: ',
      err
    );

    if (err instanceof z.ZodError) {
      return new Response('Invalid request data passed', { status: 422 });
    }
    return new Response(
      'Could not post to subreddit at this time, please try again laterr',
      { status: 500 }
    );
  }
}
