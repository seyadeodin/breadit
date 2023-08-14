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
    }

    const inter = Inter({ subsets: ['latin']});

    export default function RootLayout({
      children,
    }: {
      children: React.ReactNode
    }) {
      return (
        <html lang='en' className={cn('bg=white text-slate-900 antialiased light', inter.className)}>
          <body className='min-h-screen pt-12 bg-slate-50 antialiased'>
             <Navbar />

            <div className='container max-w-7xl mx-auto h-full pt-12'>
              {children}
            </div>
            <Toaster/>
          </body>
        </html>
      )
    }
    ```
### Applying shadcdn element style into another
- With shadcn we can apply, for exmaple, a button style into a Link by importing its variant into the Link classname:
    ```tsx
    <Link href="/sign-in" className={buttonVariants()}>Sign In</Link>
    ```
### Meging classes
- On utils we created a cn utility function which help us combine multiple classnames together
```tsx
    import { type ClassValue, clsx } from "clsx"
    import { twMerge } from "tailwind-merge"
     
    export function cn(...inputs: ClassValue[]) {
      return twMerge(clsx(inputs))
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
    import { cn } from '@/lib/utils'
    import { signIn } from 'next-auth/react'
    import { Icons } from './Icons';
    import { useToast } from '@/hooks/use-toast';

    interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement>{};

    const UserAuthForm: FC<UserAuthFormProps> = ({ className, ...props }) => {
      const [isLoading, setIsLoading] = useState(false);
      const { toast  } = useToast() 

      const loginWithGoogle = async () => {
        setIsLoading(true)

        try {
          await signIn('google');
        } catch (err) {
          toast({
            title: "There was a problem",
            description: "Error while trying to login with google",
            variant: "destructive"
          })
          
        } finally {
          setIsLoading(false);
        }
      }

      return (
        <div className={cn('flex, justify-center', className)} {...props}>
          <Button size="sm" className="w-full" onClick={loginWithGoogle} isLoading={isLoading}>
          {isLoading ? null : <Icons.google className="w-4 h-4 mr-2"/>}
            Google
          </Button>
        </div>
      )
    }

    export default UserAuthForm; 

    ```
### Authentication
- To make our authentication we created a [./src/app/api/auth/[...nextauth]/route.ts]
    - Here we simply create a handler for our nextauth make both our get anad post auth routs available.
    ```tsx
    import NextAuth from "next-auth/next";
    import { authOptions } from "@/lib/auth";

    const handler = NextAuth(authOptions)

    export {handler as GET, handler as POST}
    ```
- And for our [./src/lib/auth.ts]
    - Here wee configure our authhOptions lib passing our db, strategy, and google credentials.
    - We also create callbacks function, session will take our google data and pass it to our token.
    - JWT is w
    ```tsx
    //because we're preparaing a library to be used in our applicaiton
    import { NextAuthOptions } from "next-auth";
    import { db } from "./db";
    import { PrismaAdapter } from '@next-auth/prisma-adapter';
    import  GoogleProvider from 'next-auth/providers/google';
    import { nanoid } from 'nanoid';

    export const authOptions: NextAuthOptions = {
      adapter: PrismaAdapter(db),
      session: {
        strategy: 'jwt'
      },
      pages: {
        signIn: '/sign-in'
      },
      providers: [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        })
      ],
      callbacks: {
        async session({ token, session }) {
          if(token) {
            session.user.id = token.id;
            session.user.name = token.name;
            session.user.email = token.email;
            session.user.image  = token.picture;
            session.user.username = token.username;
          }
        },
        async jwt({ token, user}) {
          const dbUser = await db.user.findFirst({
            where: {
              email: token.email,
            }
          });
          
          if(!dbUser){
            token.id = user!.id
            return token
          }

          if(!dbUser.username){
            await db.user.update({
              where: {
                id: dbUser.id
              },
              data: {
                username: nanoid(10),
              }
            })
          }

          return {
            id: dbUser.id,
            name: dbUser.name,
            emai: dbUser.email,
            picture: dbUser.image,
            username: dbUser.username,
          }
        }, 
        redirect () {
          return '/'
        }
      },
    }
    ```
- On [./src/types/next-auth.d.ts]:
    -  Here we declare or jwt and next-auth with the inclusion of our usename and id.
    ```tsx
    import type { Session, User } from 'next-auth';
    import type  { JWT } from 'next-auth/jwt';

    type UserId = string;

    declare module 'next-auth/jwt' {
      interface JWT {
        id: UserId,
        username?: string | null
      }
    }

    declare module 'next-auth' {
      interface Session {
        user: User & {
          id: UserId,
          username?: string | null
        }
      }
    }

    ```


