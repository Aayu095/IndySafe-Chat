import type { SVGProps } from 'react';

export default function IndySafeLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M12 2.25c-4.82 0-8.75 3.622-8.75 8.086 0 2.852 1.636 5.75 3.768 8.013l4.982 5.591 4.982-5.591c2.132-2.263 3.768-5.16 3.768-8.013C20.75 5.872 16.82 2.25 12 2.25zm0 11.5a3.25 3.25 0 100-6.5 3.25 3.25 0 000 6.5z"
        clipRule="evenodd"
      />
      <path d="M12 6.75a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 0112 6.75z" />
      <path
        d="M12.75 12.75a.75.75 0 00-1.5 0v.01a.75.75 0 001.5 0V12.75z"
        className="opacity-70"
      />
      <path 
        d="M7 17.5s0-2 2-3.5c0 0 .5 1.5 2.5 1.5s2.5-1.5 2.5-1.5c2 1.5 2 3.5 2 3.5H7z"
        fill="hsl(var(--background))"
        opacity="0.6"
        transform="translate(0 -2)"
       />
    </svg>
  );
}
