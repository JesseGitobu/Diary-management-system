import React from 'react';

type BenefitSectionProps = {
  title: string;
  description: string;
  points: string[];
  className?: string;
  variant?: 'default' | 'card' | 'minimal';
};

export default function BenefitSection({ 
  title, 
  description, 
  points, 
  className = '',
  variant = 'default' 
}: BenefitSectionProps) {
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return 'bg-white border border-gray-200 shadow-lg hover:shadow-xl hover:-translate-y-1';
      case 'minimal':
        return 'bg-transparent shadow-none hover:bg-gray-50';
      default:
        return 'bg-gray-50 shadow-sm hover:shadow-md hover:-translate-y-1';
    }
  };

  return (
    <div className={`
      ${getVariantStyles()}
      p-5 rounded-lg max-w-[500px] 
      transition-all duration-300 ease-in-out
      flex flex-col min-w-64 md:w-11/12
      ${className}
    `}>
      <h2 className="text-xl font-semibold text-gray-800 mb-2 ml-2">
        {title}
      </h2>
      
      <p className="text-gray-600 mb-4 ml-2 text-base leading-relaxed">
        {description}
      </p>
      
      <ul className="list-none pl-0 ml-5">
        {points.map((point, index) => (
          <li 
            key={index} 
            className="mb-2 text-gray-700 relative pl-4 leading-snug before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:bg-blue-600 before:rounded-full before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2"
          >
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}