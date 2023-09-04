# Breadit

### RootLayout setup

- On [./src/app/layout.tsx]

  - Here we havae our metadata which is what will appear on search results
  - We use the inter font fron next fonts and apply it to our html togethe with the other tailwind classes e.g. antialised

  ```tsx
  import { Navbar } from '@/components/Navbar';
  import { Toaster } from '@/components/ui/toaster';
  import { cn } from '@/lib/utils';
  // the cn function is a helér that allow us to combine various class together using tailwindmerge and conditionally using clsx
  import '@/styles/globals.css';
  import { Inter } from 'next/font/google';

  export const metadata = {
    title: 'Breadit',
    description: 'A Reddit clone built with Next.js and TypeScript.',
  };

  const inter = Inter({ subsets: ['latin'] });

  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <html
        lang="en"
        className={cn(
          'bg=white text-slate-900 antialiased light',
          inter.className
        )}
      >
        <body className="min-h-screen pt-12 bg-slate-50 antialiased">
          <Navbar />

          <div className="container max-w-7xl mx-auto h-full pt-12">
            {children}
          </div>
          <Toaster />
        </body>
      </html>
    );
  }
  ```

### Applying shadcdn element style into another

- With shadcn we can apply, for exmaple, a button style into a Link by importing its variant into the Link classname:
  ```tsx
  <Link href="/sign-in" className={buttonVariants()}>
    Sign In
  </Link>
  ```

### Meging classes

- On utils we created a cn utility function which help us combine multiple classnames together

```tsx
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### UserAuthForm

- On [./src/components/UserAuthForm.tsx]

  - We create a client component where our logig with google client logic is done
  - Our toast component and hook are taken from shadcn, to use it we added our Toaster to our RootLayout and invoked it here.

  ```tsx
  'use client';
  import { FC, useState } from 'react';
  import { Button } from './ui/Button';
  import { cn } from '@/lib/utils';
  import { signIn } from 'next-auth/react';
  import { Icons } from './Icons';
  import { useToast } from '@/hooks/use-toast';

  interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

  const UserAuthForm: FC<UserAuthFormProps> = ({ className, ...props }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const loginWithGoogle = async () => {
      setIsLoading(true);

      try {
        await signIn('google');
      } catch (err) {
        toast({
          title: 'There was a problem',
          description: 'Error while trying to login with google',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className={cn('flex, justify-center', className)} {...props}>
        <Button
          size="sm"
          className="w-full"
          onClick={loginWithGoogle}
          isLoading={isLoading}
        >
          {isLoading ? null : <Icons.google className="w-4 h-4 mr-2" />}
          Google
        </Button>
      </div>
    );
  };

  export default UserAuthForm;
  ```

### Authentication

- To make our authentication we created a [./src/app/api/auth/[...nextauth]/route.ts]

  - Here we simply create a handler for our nextauth make both our get anad post auth routs available.

  ```tsx
  import NextAuth from 'next-auth/next';
  import { authOptions } from '@/lib/auth';

  const handler = NextAuth(authOptions);

  export { handler as GET, handler as POST };
  ```

- And for our [./src/lib/auth.ts]

  - Here wee configure our authhOptions lib passing our db, strategy, and google credentials.
  - We also create callbacks function, session will take our google data and pass it to our token.
  - JWT is w

  ```tsx
  //because we're preparaing a library to be used in our applicaiton
  import { NextAuthOptions } from 'next-auth';
  import { db } from './db';
  import { PrismaAdapter } from '@next-auth/prisma-adapter';
  import GoogleProvider from 'next-auth/providers/google';
  import { nanoid } from 'nanoid';

  export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(db),
    session: {
      strategy: 'jwt',
    },
    pages: {
      signIn: '/sign-in',
    },
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    ],
    callbacks: {
      async session({ token, session }) {
        if (token) {
          session.user.id = token.id;
          session.user.name = token.name;
          session.user.email = token.email;
          session.user.image = token.picture;
          session.user.username = token.username;
        }
      },
      async jwt({ token, user }) {
        const dbUser = await db.user.findFirst({
          where: {
            email: token.email,
          },
        });

        if (!dbUser) {
          token.id = user!.id;
          return token;
        }

        if (!dbUser.username) {
          await db.user.update({
            where: {
              id: dbUser.id,
            },
            data: {
              username: nanoid(10),
            },
          });
        }

        return {
          id: dbUser.id,
          name: dbUser.name,
          emai: dbUser.email,
          picture: dbUser.image,
          username: dbUser.username,
        };
      },
      redirect() {
        return '/';
      },
    },
  };
  ```

- On [./src/types/next-auth.d.ts]:

  - Here we declare or jwt and next-auth with the inclusion of our usename and id.

  ```tsx
  import type { Session, User } from 'next-auth';
  import type { JWT } from 'next-auth/jwt';

  type UserId = string;

  declare module 'next-auth/jwt' {
    interface JWT {
      id: UserId;
      username?: string | null;
    }
  }

  declare module 'next-auth' {
    interface Session {
      user: User & {
        id: UserId;
        username?: string | null;
      };
    }
  }
  ```

### UseraccountNav

- On [./src/components/UserAccountNav.tsx]:

  - Using shadcn DropDownMenu component we create our user menu, which has:
    1. A trigger, which is our UserAvatar
    2. Content, where our user data is available
    3. A separator
    4. Ou action links/buttons

  ```tsx
  const UserAccountNav: FC<UserAccountNavProps> = ({ user }) => {
    const handleSignOut = (e: Event) => {
      e.preventDefault();
      signOut({
        callbackUrl: `${window.location.origin}/sign-in`,
      });
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger>
          <UserAvatar
            user={{
              name: user.name || null,
              image: user.image || null,
            }}
            className="h-8 w-8"
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent className="bg-white" align="end">
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              {user.name && <p className="font-medium">{user.name}</p>}
              {user.email ? (
                <p className="w-[200px] truncate text-sm text-zinc-700">
                  {user.email}
                </p>
              ) : (
                <p className="w-[200px] truncate text-sm text-zinc-700">
                  email@teste.com
                </p>
              )}
            </div>
          </div>
          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href="/">Feed</Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/r/create">Create community</Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="settings">Settings</Link>
          </DropdownMenuItem>

          <DropdownMenuItem className="cursor-pointer" onSelect={handleSignOut}>
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };
  ```

### Perfecting the authentication flow

- Our authentications routes, when clicked will first open a modal, and will only redirect to a page when refreshed. To do that we have an `@componentName/(.)route-which-is--redirected`.
- On [./src/app/@authModal/default.tsx] we return null to say by default it won't redirect.
- On [./src/app/@authModal/(.)sign-in/page.tsx]:

  - We create a modal component.
  - `CloseModal` is simply a button which return to the previous route.
  - We do tha same to `/(.)sign-up`

  ```tsx
  const page: FC<PageProps> = ({}) => {
    return (
      <div className="fixed inset-0 bg-zinc-900/20 z-10">
        <div className="container flex items-center h-full maax-w-lg mx-auto">
          <div className="relative bg-white w-full h-fit py-20 px-2 rounded-lg">
            <div className="absolute top-4 right-4">
              <CloseModal />
            </div>
            <SignIn />
          </div>
        </div>
      </div>
    );
  };

  export default page;
  ```

### Database Modeling

- On [./prisma/schema.prisma] we create our tables: Subreddits, Posts, Comments, Votes and sub-tables to support them.

  - On the model comment we have the following relation between one comment and another comments.
  - We can break the @relation statement into:
    1. It's name(optinal)
    2. The field in the table that do the relation.
    3. The field it references on the other tablea.
    4. The actions the DB do when the comment it is related to is deleted, in this case since they're on the same table, it mustn't do anything.
  - replayTo and repalyToId here are optional since not all commeents are a reply to another.
  - replies is an array of comments, it is a one to many relationship

    ```prisma
    model Comment {
      id        String   @id @default(cuid())
      replyToId String?
      replyTo   Comment?  @relation("ReplyTo", fields: [replyToId], references: [id], onDelete: NoAction, onUpdate: NoAction)
      replies   Comment[] @relation("ReplyTo")
    }

    ```

- Here another example not between an user and a subreddit and a user and a subscription:
  - Here we can better understand relationships in Prisma.
  - First we have the relationship between User and Subreddit, where our subreddit is related to our user based on tis id. And likewise on user we have a Subscription[] to point out it can have many of them created.
  - Subscription is how we create many-to-many relationships. On Subscription we relate user and subreddit referencing their Id and creating a relation to the respective fields.

```prisma
    model User {
      id            String    @id @default(cuid())
      name          String?
      email         String?   @unique
      emailVerified DateTime?

      username String? @unique

      image        String?
      createdSubreddits Subreddit[] @relation("CreatedBy")
      accounts     Account[]
      sessions     Session[]
      Post         Post[]
      Comment      Comment[]
      CommentVote  CommentVote[]
      Vote         Vote[]
      Subscription Subscription[]
    }

    model Subreddit {
      id        String   @id @default(cuid())
      name      String   @unique
      createdAt DateTime @default(now())
      updatedAt DateTime @updatedAt
      posts     Post[]

      creatorId String?
      Creator   User?   @relation("CreatedBy", fields: [creatorId], references: [id])

      subscriber Subscription[]

      @@index([name])
    }

    model Subscription {
      user        User      @relation(fields: [userId], references: [id])
      userId      String
      subreddit   Subreddit @relation(fields: [subredditId], references: [id])
      subredditId String

      @@id([userId, subredditId])
    }
```

### Creating a subreddit and error handling

- On [./src/app/r/create/page.tsx]:

  - With useMutation from react query we send our data (name) to our api and receive back its response.
  - We then treat our axioserrors based on their http code, or show a generic toast if it doesnt match any of them.

  ```tsx
  const { mutate: createCommunity, isLoading } = useMutation({
    mutationFn: async () => {
      const payload: CreateSubredditPayload = { name: input };

      const { data } = await axios.post('/api/subreddit', payload);
      return data as string;
    },
    onError: (err) => {
      if (err instanceof AxiosError) {
        if (err.response?.status === 400) {
          return toast({
            title: 'Subreddit already exits',
            description: 'Please choose a different name',
            variant: 'destructive',
          });
        }

        if (err.response?.status === 422) {
          return toast({
            title: 'Invalid subreddit name',
            description: 'Please choose a name between 3 and 21 characters.',
            variant: 'destructive',
          });
        }

        if (err.response?.status === 401) {
          return loginToast();
        }
      }

      toast({
        title: 'There was an error',
        description: 'Could not create subreddit.',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => router.push(`/r/${data}`),
  });
  ```

- To toasts which will be commonly show we create a hook called useCustomToast:

```tsx
import Link from 'next/link';
import { toast } from './use-toast';
import { buttonVariants } from '@/components/ui/Button';

export const useCustomToast = () => {
  const loginToast = () => {
    const { dismiss } = toast({
      title: 'Login required.',
      description: 'You need to be logged in to do that.',
      variant: 'destructive',
      action: (
        <Link
          href="sign-in"
          onClick={() => dismiss()}
          className={buttonVariants({ variant: 'outline' })}
        >
          Login
        </Link>
      ),
    });
  };

  return { loginToast };
};
```

- API to create a subreddit:

  - Our POST route will make the due validations on the serve-side and if everything is ok return our response. In case it is not we returnr our status code.

  ```tsx
  import { getAuthSession } from '@/lib/auth';
  import { db } from '@/lib/db';
  import { SubredditValidator } from '@/lib/validators/subreddit';
  import { z } from 'zod';

  export async function POST(req: Request) {
    try {
      const session = await getAuthSession();

      if (!session?.user) {
        return new Response('Unauthorized', { status: 401 });
      }

      const body = await req.json();
      const { name } = SubredditValidator.parse(body);

      const subredditExists = await db.subreddit.findFirst({
        where: {
          name,
        },
      });

      if (subredditExists) {
        return new Response('Subreddit already exists', { status: 409 });
      }

      const subreddit = await db.subreddit.create({
        data: {
          name,
          creatorId: session.user.id,
        },
      });

      await db.subscription.create({
        data: {
          userId: session.user.id,
          subredditId: subreddit.id,
        },
      });

      return new Response(subreddit.name);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return new Response(err.message, { status: 422 });
      }
      return new Response('Could not create subreddit', { status: 500 });
    }
  }
  ```

- To make it all typesafe we create a [./src/lib/validators/subreddit.ts]:

  ```tsx
  import { z } from 'zod';

  export const SubredditValidator = z.object({
    name: z.string().min(3).max(21),
  });

  export const SubredditSubscriptionValidator = z.object({
    subredditId: z.string(),
  });

  export type CreateSubredditPayload = z.infer<typeof SubredditValidator>;
  export type SubscribeToSubredditPaloyad = z.infer<
    typeof SubredditSubscriptionValidator
  >;
  ```

### Subrerddit detail page

- On [./src/app/r/[slug]/layout.tsx]:

  - We create a definition list `<dl>` which receives a data term `<dl>` which defines a data description `dd`
  - It is alo here that we render our buttons to post and subscribe.

  ```tsx
  <dl className="divide-y divide-g-gray100 px-6 py-4 text-sm leading-6 bg-white">
    <div className="flex justify-between gap-x-4 py-3">
      <dt className="text-gray-500">Created</dt>
      <dd className="text-gray-700">
        <time dateTime={subreddit.createdAt.toDateString()}>
          {format(subreddit.createdAt, 'MMM d, yyyy')}
        </time>
      </dd>
    </div>

    <div className="flex justify-between gap-x-4 py-3">
      <dt className="text-gray-500">Members</dt>
      <dd className="text-gray-700">
        <div className="text-gray-900">{memberCount}</div>
      </dd>
    </div>

    {subreddit.creatorId === session?.user.id ? (
      <div className="flex justify-between gap-x-4 py-3">
        <p className="text-gray-500">You created this community</p>
      </div>
    ) : null}

    {subreddit.creatorId !== session?.user.id && (
      <SubscribeLeaveToggle
        subredditId={subreddit.id}
        subredditName={subreddit.name}
        isSubscribed={isSubscribed}
      />
    )}

    <Link
      className={buttonVariants({
        variant: 'outline',
        className: 'w-full mb-6',
      })}
      href={`r/${slug}/submit`}
    >
      Create Post
    </Link>
  </dl>
  ```

  - To get our posts from the db we invoke it directly from oru layout, which is async.
  - We include on that search the posts together with its related tables.
  - We also make a call to check if our user is subscribed on the subreddit.
  - Finally we count the number of subscription on the subreddit to show it.

  ```tsx
  const subreddit = await db.subreddit.findFirst({
    where: { name: slug },
    include: {
      posts: {
        include: {
          author: true,
          votes: true,
        },
      },
    },
  });

  const subscription = !session?.user
    ? undefined
    : await db.subscription.findFirst({
        where: {
          subreddit: {
            name: slug,
          },
          user: {
            id: session.user.id,
          },
        },
      });

  const isSubscribed = !!subscription;

  if (!subreddit) return notFound();

  const memberCount = await db.subscription.count({
    where: {
      subreddit: {
        name: slug,
      },
    },
  });
  ```

### Subscribe and unsubscribe

- On [./src/components/SubscribeLeaveToggle.tsx]:

  - Here we create a mutation using tanQuery for both calls.
  - We also make all the error handling based on the error type and status code received.
  - In case of success we refresh the screen to update to the ne estate and inform our user

  ```tsx
  const { mutate: subscribe, isLoading: isSubLoading } = useMutation({
    mutationFn: async () => {
      const payload: SubscribeToSubredditPaloyad = {
        subredditId,
      };

      const { data } = await axios.post('/api/subreddit/subscribe', payload);
      return data as string;
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
        title: 'Subscribed',
        description: `You are now subscribed to r/${subredditName}`,
      });
    },
  });
  ```

- Our button will be rendered contionally based on whether or not the user is subscribed:

  ```tsx
  return isSubscribed ? (
  <Button
    onClick={() => unsubscribe()}
    isLoading={isUnsubLoading}
    className="w-full mt-1 mb-4"
  >
    Leave community
  </Button>
  ) : (
  <Button
    onClick={() => subscribe()}
    isLoading={isSubLoading}
    className="w-full mt-1 mb-4"
  >
    Join to post
  </Button>
  ```

- On [./src/app/api/subreddit/unsubscribe/route.ts]:

  - Here is how one of our routes look like, we start by making some verifications, first whether the user is logged on or not, and in this case whether he already has a subscription and if the subreddit is theirs.
  - In case all is ok we delete the subscription from the db and say "Ok"
  - In our catch we treat other possible erros like zod ones, or unknown error which gives back a generic message
  - HTTP error handling
    - 401 for authetnication,
    - 400 (bad request) when it does not follow our business rules,
    - 422 when data is passed incorrectly
    - 500 as a server error and generic
    - 409 for concflict, when there's already a row with that unique data

  ```tsx
  import { getAuthSession } from '@/lib/auth';
  import { db } from '@/lib/db';
  import { SubredditSubscriptionValidator } from '@/lib/validators/subreddit';
  import { z } from 'zod';

  export async function POST(req: Request) {
    try {
      const session = await getAuthSession();

      if (!session?.user) {
        return new Response('Unauthorized', { status: 401 });
      }

      const body = await req.json();

      const { subredditId } = SubredditSubscriptionValidator.parse(body);

      const subscriptionExists = await db.subscription.findFirst({
        where: {
          subredditId,
          userId: session.user.id,
        },
      });

      //check if user is creator of subreddit
      const subreddit = await db.subreddit.findFirst({
        where: {
          id: subredditId,
          creatorId: session.user.id,
        },
      });

      if (subreddit) {
        return new Response('You can\t unsubscribe from a subreddit you own', {
          status: 400,
        });
      }

      if (!subscriptionExists) {
        return new Response('You are not subscribed to this subreddit.', {
          status: 400,
        });
      }

      await db.subscription.delete({
        where: {
          userId_subredditId: {
            subredditId,
            userId: session.user.id,
          },
        },
      });

      return new Response(subredditId);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return new Response('Invalid request data passed', { status: 422 });
      }
      return new Response('Could not unsubscribe to subreddit', {
        status: 500,
      });
    }
  }
  ```

### Creating a mf editor

- To create our editor we need to install a few dependencies, the first are all editorjs exodia parts we need to make our editor a multimedia behemot, an for react-textarea-autosize it will serve to change the textbox size according to the quanity of text inserted.

```json
{
  "@editorjs/code": "^2.8.0",
  "@editorjs/editorjs": "^2.27.0",
  "@editorjs/embed": "^2.5.3",
  "@editorjs/header": "^2.7.0",
  "@editorjs/image": "^2.8.1",
  "@editorjs/inline-code": "^1.4.0",
  "@editorjs/link": "^2.5.0",
  "@editorjs/list": "^1.8.0",
  "@editorjs/paragraph": "^2.9.0",
  "@editorjs/table": "^2.2.1",
  "editorjs-react-renderer": "^3.5.1",
  "react-textarea-autosize": "^8.4.1"
}
```

- On [./src/components/Post.tsx]
- It takes some time for our editor to load, and since we don't want to it to delay our whole page load we put inside an async callback where all parts of our editor are imported async and mounted through an object.

  ```tsx
  const initializeEditor = useCallback(async () => {
    const EditorJS = (await import('@editorjs/editorjs')).default;
    const Header = (await import('@editorjs/header')).default;
    const Embed = (await import('@editorjs/embed')).default;
    const Table = (await import('@editorjs/table')).default;
    const List = (await import('@editorjs/list')).default;
    const Code = (await import('@editorjs/code')).default;
    const LinkTool = (await import('@editorjs/link')).default;
    const InlineCode = (await import('@editorjs/inline-code')).default;
    const ImageTool = (await import('@editorjs/image')).default;

    if (!ref.current) {
      const editor = new EditorJS({
        holder: 'editor',
        onReady() {
          ref.current = editor;
        },
        placeholder: 'Type here to write your post...',
        inlineToolbar: true,
        data: { blocks: [] },
        tools: {
          header: Header,
          linkTool: {
            class: LinkTool,
            config: {
              endpoint: '/api/link',
            },
          },
          image: {
            class: ImageTool,
            config: {
              uploader: {
                async uploadByFile(file: File) {
                  const [res] = await uploadFiles([file], 'imageUploader');
                  return {
                    success: 1,
                    file: {
                      url: res.fileUrl,
                    },
                  };
                },
              },
            },
          },
          list: List,
          code: Code,
          inlineCode: InlineCode,
          table: Table,
          embed: Embed,
        },
      });
    }
  }, []);
  ```

  - We have here three different useEffects, one will check if the window loaded, the second will show us errors, while our last loads our editor, and focus on the title, after doing that it destorys the editor ref and makes it null.

  ```tsx
  const ref = useRef<EditorJSProps | null>(null);
  const _titleRef = useRef<HTMLTextAreaElement | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window !== undefined) {
      setIsMounted(true);
    }
  });

  useEffect(() => {
    if (Object.keys(errors).length) {
      for (const [_key, value] of Object.entries(errors)) {
        toast({
          title: "Something wen't wrong",
          description: (value as { message: string }).message,
          variant: 'destructive',
        });
      }
    }
  }, [errors]);

  useEffect(() => {
    const init = async () => {
      await initializeEditor();
    };

    setTimeout(() => {
      _titleRef.current?.focus();
    }, 0);

    if (isMounted) {
      init();

      return () => {
        ref.current?.destroy();
        ref.current = null;
      };
    }
  }, [isMounted, initializeEditor]);
  ```

  - To render our titlee component we first need to brake our `register(title)` in two, that's because our TextAutosize receives two of them, onf from our hookform and another for the autofocus.
  - As four our editor it will be rendered in our div with the id with the same nama the name which was dfined previously in our object`holder: 'editor',`

  ```tsx
  const { ref: titleRef, ...rest } = register('title');

  return (
    <div className="w-full p-4 bg-zinc-50 rounded-lg border border-zinc-200">
      <form
        id="subreddit-post-form"
        className="w-fit"
        onSubmit={handleSubmit((e) => onSubmit(e))}
      >
        <div className="prose prose-stone dark:prose-invert">
          <TextareaAutosize
            ref={(e) => {
              titleRef(e);
              _titleRef.current = e;
            }}
            {...rest}
            placeholder="Title"
            className="w-full resize-none appearence-none overflow-hidden bg-transparent text-5xl font-bold focus:outline-none"
          />
        </div>

        <div id="editor" className="min-h-[500px]" />
      </form>
    </div>
  );
  ```

### Editor API

- In [./src/app/api/link/route.ts]:

  - To show link previews we need a route first, which will receive our req url.
  - In case its valid we get the page and use regex to get the matching title, description and image, if any and return a json passing the data in the format asked by editorjs.

  ```tsx
  import axios from 'axios';

  export async function GET(req: Request) {
    const url = new URL(req.url);
    const href = url.searchParams.get('url');

    if (!href) {
      return new Response('Invalid href', { status: 400 });
    }

    const res = await axios.get(href);

    const titleMatch = res.data.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : '';

    const descriptionMatch = res.data.match(
      /<meta name="description" content="(.*?)"/
    );
    const description = descriptionMatch ? descriptionMatch[1] : '';

    const imageMatch = res.data.match(
      /<meta property="og:image" content="(.*?)"/
    );
    const imageUrl = imageMatch ? imageMatch[1] : '';

    return new Response(
      JSON.stringify({
        success: 1,
        meta: {
          title,
          description,
          image: {
            url: imageUrl,
          },
        },
      })
    );
  }
  ```

- In [./src/app/api/uploadthing/route.ts]:

  - Here we use uploadthing as our image bucket, using the basic docs setup

  ```tsx
  import { createUploadthing, type FileRouter } from 'uploadthing/next';

  const f = createUploadthing();

  const auth = (req: Request) => ({ id: 'fakeId' }); // Fake auth function

  export const ourFileRouter = {
    imageUploader: f({ image: { maxFileSize: '4MB' } })
      .middleware(async ({ req }) => {
        const user = await auth(req);

        if (!user) throw new Error('Unauthorized');

        return { userId: user.id };
      })
      .onUploadComplete(async ({ metadata, file }) => {
        console.log('Upload complete for userId:', metadata.userId);

        console.log('file url', file.url);
      }),
  } satisfies FileRouter;

  export type OurFileRouter = typeof ourFileRouter;
  ```

- On [./src/lib/uploadthing.ts]:
  - We invoke this when uploading our files, and it returns its url.

```tsx
import { generateReactHelpers } from '@uploadthing/react/hooks';

import type { OurFileRouter } from '@/app/api/uploadthing/core';

export const { uploadFiles } = generateReactHelpers<OurFileRouter>();
```

- On [./src/app/api/subreddit/post/create/route.ts]:

  - We check stuff, we put it on db.

  ```tsx
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
  ```
