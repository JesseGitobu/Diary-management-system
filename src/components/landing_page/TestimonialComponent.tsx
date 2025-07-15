import React from 'react';

type TestimonialProps = {
  comment: string;
  name: string;
  role: string;
  farm: string;
  className?: string;
  variant?: 'default' | 'card' | 'minimal' | 'featured';
};

export default function Testimonial({ 
  comment, 
  name, 
  role, 
  farm, 
  className = '',
  variant = 'default'
}: TestimonialProps) {
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return 'bg-white border border-gray-200 shadow-lg hover:shadow-xl';
      case 'minimal':
        return 'bg-transparent shadow-none border-l-4 border-blue-400 pl-6';
      case 'featured':
        return 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg hover:shadow-2xl';
      default:
        return 'bg-blue-100 shadow-md hover:shadow-lg';
    }
  };

  return (
    <div className={`
      ${getVariantStyles()}
      p-8 rounded-xl max-w-3xl w-full 
      flex flex-col items-center text-center
      transition-all duration-200 ease-in-out
      hover:-translate-y-0.5
      md:p-6 md:px-5
      ${className}
    `}>
      <p className="
        text-gray-600 text-xl mb-5 leading-relaxed italic relative mt-0
        before:content-['\0022'] before:text-3xl before:text-blue-300 
        before:absolute before:-left-5 before:-top-2
        after:content-['\0022'] after:text-3xl after:text-blue-300 
        after:absolute after:-right-5 after:-bottom-7
        md:text-lg md:before:hidden md:after:hidden
      ">
        {comment}
      </p>
      
      <h2 className="
        text-xl text-gray-800 mb-1 mt-0 font-semibold
      ">
        {name}
      </h2>
      
      <p className="
        text-base text-gray-500 font-normal mt-0 mb-0
      ">
        {role}, {farm}
      </p>
    </div>
  );
}