// components/PricingCard.tsx
'use client';
import React from 'react';
import { FiCheck, FiStar } from 'react-icons/fi';

interface PricingCardProps {
  id: string;
  title: string;
  description: string;
  price: string;
  period: string;
  priceRange?: string;
  features: string[];
  limitations?: string[];
  isPopular?: boolean;
  paymentUrl: string;
  buttonText: string;
  contactNote?: string;
  onSubscribe?: (paymentUrl: string, planId: string) => void;
}

const PricingCard: React.FC<PricingCardProps> = ({
  id,
  title,
  description,
  price,
  period,
  priceRange,
  features,
  limitations,
  isPopular = false,
  paymentUrl,
  buttonText,
  contactNote,
  onSubscribe
}) => {
  const handleSubscribe = () => {
    if (onSubscribe) {
      onSubscribe(paymentUrl, id);
    } else {
      // Default behavior - open payment URL in new tab
      window.open(paymentUrl, '_blank');
    }
  };

  return (
    <div className={`
      bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ease-in-out
      relative border-2 border-transparent flex flex-col h-full w-full
      hover:-translate-y-2 hover:shadow-xl
      ${isPopular 
        ? 'border-blue-500 md:scale-105 shadow-blue-100 shadow-lg hover:md:scale-105 hover:-translate-y-2 hover:shadow-blue-200 hover:shadow-2xl' 
        : ''
      }
      motion-reduce:transition-none motion-reduce:hover:transform-none
      print:break-inside-avoid print:shadow-none print:border print:border-black
    `}>
      {isPopular && (
        <div className="
          absolute -top-px left-1/2 transform -translate-x-1/2 
          bg-gradient-to-r from-blue-500 to-blue-700 text-white 
          px-6 py-2 rounded-b-xl text-sm font-semibold 
          flex items-center gap-1 z-10 shadow-blue-300 shadow-sm
          print:bg-black print:text-white
        ">
          <FiStar size={16} />
          <span>Most Popular</span>
        </div>
      )}
      
      <div className={`
        px-6 pb-4 text-center border-b border-gray-200
        ${isPopular 
          ? 'bg-gradient-to-br from-blue-50 to-indigo-50 pt-14' 
          : 'bg-gradient-to-br from-gray-50 to-slate-50 pt-8'
        }
        sm:px-4 sm:pb-4 ${isPopular ? 'sm:pt-12' : 'sm:pt-6'}
        xs:px-3 xs:pb-3 ${isPopular ? 'xs:pt-10' : 'xs:pt-5'}
      `}>
        <h3 className="
          text-2xl font-bold text-gray-900 mt-2 mb-2 leading-tight
          sm:text-xl sm:mt-3
          xs:text-lg xs:mt-2
        ">
          {title}
        </h3>
        
        <p className="
          text-slate-600 text-sm mb-6 leading-relaxed min-h-10 
          flex items-center justify-center
          sm:text-sm sm:min-h-8
        ">
          {description}
        </p>
        
        <div className="flex items-baseline justify-center gap-1">
          <span className="
            text-5xl font-extrabold text-gray-900 leading-none
            bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent
            sm:text-4xl
            xs:text-3xl
          ">
            {price}
          </span>
          <span className="text-base text-slate-600 font-medium">
            {period}
          </span>
        </div>
        
        {priceRange && (
          <p className="text-xs text-slate-500 mt-2 font-medium">
            {priceRange}/month
          </p>
        )}
      </div>

      <div className="
        px-6 py-6 flex-1 flex flex-col
        sm:px-4 sm:py-4
        xs:px-3 xs:py-3
      ">
        <ul className="list-none p-0 m-0 flex flex-col gap-2 flex-1 max-h-96 overflow-y-auto pr-2">
          {features.map((feature, index) => (
            <li key={index} className="
              flex items-start gap-2 text-sm text-gray-700 leading-relaxed
              transition-colors duration-200 hover:text-gray-900
              xs:text-xs
            ">
              <FiCheck className="
                text-green-500 text-base mt-0.5 flex-shrink-0
                transition-all duration-200 hover:text-green-600 hover:scale-110
                motion-reduce:transition-none motion-reduce:hover:transform-none
                contrast-more:text-black
              " />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        
        {limitations && limitations.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-600 mb-2">Not included:</p>
            <ul className="list-none p-0 m-0 flex flex-col gap-2">
              {limitations.map((limitation, index) => (
                <li key={index} className="
                  flex items-start gap-2 text-xs text-gray-500 leading-relaxed
                  xs:text-xs
                ">
                  <span className="text-gray-400 mt-0.5 flex-shrink-0">✕</span>
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="
        px-6 py-6 border-t border-gray-200 bg-gray-50 mt-auto
        sm:px-4 sm:py-4
        xs:px-3 xs:py-3
      ">
        <button 
          className={`
            w-full py-3.5 px-6 border-2 rounded-xl text-base font-semibold
            cursor-pointer transition-all duration-300 ease-in-out
            uppercase tracking-wide relative overflow-hidden
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed
            disabled:hover:transform-none disabled:hover:shadow-none
            motion-reduce:transition-none motion-reduce:hover:transform-none
            contrast-more:border-black contrast-more:text-black
            contrast-more:hover:bg-black contrast-more:hover:text-white
            print:hidden
            sm:text-sm sm:py-3 sm:px-5
            xs:text-sm xs:py-3 xs:px-5
            ${isPopular
              ? `bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent
                 hover:bg-gradient-to-r hover:from-blue-500 hover:to-blue-700
                 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-300`
              : `bg-transparent text-indigo-500 border-indigo-500
                 hover:text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-300
                 before:content-[''] before:absolute before:top-0 before:-left-full 
                 before:w-full before:h-full before:bg-gradient-to-r before:from-indigo-500 
                 before:to-purple-600 before:transition-all before:duration-300 before:z-[-1]
                 hover:before:left-0`
            }
          `}
          onClick={handleSubscribe}
          aria-label={`Subscribe to ${title}`}
        >
          {buttonText}
        </button>
        
        {contactNote && (
          <p className="
            text-center text-xs text-slate-600 mt-3 mb-0 italic leading-snug
          ">
            {contactNote}
          </p>
        )}
      </div>
    </div>
  );
};

export default PricingCard;