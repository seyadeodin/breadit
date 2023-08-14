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
  const { toast } = useToast() ;

  const loginWithGoogle = async () => {
    setIsLoading(true)

    try {
      await signIn('google');
    } catch (err) {
      toast({
        title: "There was a problem",
        description: "Error while trying to login with google",
        variant: "destructive",
      });
      
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
