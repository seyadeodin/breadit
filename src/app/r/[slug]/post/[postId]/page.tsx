import { FC } from 'react';

interface PageProps {
  params: {
    postId: string;
  };
}

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const page = ({ params }: PageProps) => {
  return <div>Post</div>;
};

export default page;
