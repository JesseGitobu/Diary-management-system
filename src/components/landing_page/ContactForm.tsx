'use client';

import React, { useState } from 'react';
import { Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

// Import types
import {
  ContactFormData,
  FormErrors,
  InputChangeEvent,
  SubmitStatus,
  FarmSizeOption,
  ContactFormApiData,
  FarmSizeMapping,
  ContactFormProps
} from '@/types/database';

const ContactForm: React.FC<ContactFormProps> = ({
  onSubmissionSuccess,
  onSubmissionError,
  className = '',
  style = {}
}) => {
  const [formData, setFormData] = useState<ContactFormData>({
    firstName: '',
    lastName: '',
    email: '',
    farmSize: '',
    message: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');

  // Farm size mapping
  const farmSizeMapping: FarmSizeMapping = {
    lessThan100: 'less than 100 cows',
    between100and500: '100-500 cows',
    moreThan500: 'more than 500 cows'
  };

  const handleInputChange = (e: InputChangeEvent): void => {
    const { name, value } = e.target;
    setFormData((prev: ContactFormData) => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }

    // Clear submit status when user makes changes
    if (submitStatus !== 'idle') {
      setSubmitStatus('idle');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Farm size validation
    if (!formData.farmSize) {
      newErrors.farmSize = 'Please select your farm size';
    }

    // Message validation
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getFarmSizeLabel = (value: string): string => {
    return farmSizeMapping[value as FarmSizeOption] || '';
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Transform form data to match the API structure
      const apiData: ContactFormApiData = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        company: `Farm with ${getFarmSizeLabel(formData.farmSize)}`,
        message: formData.message,
        phone: '' // Optional, since this form doesn't have phone field
      };

      console.log('Sending data to API:', apiData);

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response received:', textResponse);
        
        // Try to extract meaningful error message from HTML
        let errorMessage = 'Server error occurred';
        if (textResponse.includes('404')) {
          errorMessage = 'API endpoint not found. Please ensure /api/contact route exists.';
        } else if (textResponse.includes('500')) {
          errorMessage = 'Internal server error. Please check server logs.';
        } else if (textResponse.includes('<!DOCTYPE')) {
          errorMessage = 'Server returned HTML instead of JSON. Check API route configuration.';
        }
        
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Invalid response format from server');
      }

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`);
      }

      console.log('Success response:', result);

      // Success - clear form and show success message
      const clearedFormData: ContactFormData = {
        firstName: '',
        lastName: '',
        email: '',
        farmSize: '',
        message: ''
      };
      
      setFormData(clearedFormData);
      setSubmitStatus('success');
      
      // Call success callback if provided
      onSubmissionSuccess?.(formData);

    } catch (error) {
      console.error('Contact form submission error:', error);
      let errorMessage = 'Failed to send message. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Add more specific error handling
      if (errorMessage.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (errorMessage.includes('API endpoint not found')) {
        errorMessage = 'Service temporarily unavailable. Please try again later.';
      }
      
      setErrors({ 
        submit: errorMessage
      });
      setSubmitStatus('error');
      
      // Call error callback if provided
      onSubmissionError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = (): void => {
    setSubmitStatus('idle');
    setErrors({});
  };

  // Success state
  if (submitStatus === 'success') {
    return (
      <div 
        className={`
          bg-white rounded-xl p-8 shadow-md max-w-lg w-full mx-auto text-center
          md:p-6 xs:p-4 xs:mx-4
          ${className}
        `} 
        style={style}
      >
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 xs:w-12 xs:h-12" />
        <h3 className="text-xl font-semibold text-gray-900 mb-3 xs:text-lg">
          Message Sent Successfully!
        </h3>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Thank you for contacting us. We'll get back to you within 24 hours with information tailored to your farm size.
        </p>
        <button
          onClick={resetForm}
          className="
            w-full bg-blue-500 text-white py-3.5 px-6 rounded-lg text-base font-medium
            hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300
            transition-colors duration-200
          "
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`
        bg-white rounded-xl p-8 shadow-md max-w-lg w-full mx-auto
        md:p-6 xs:p-4 xs:mx-4
        ${className}
      `} 
      style={style}
    >
      {/* Display submit error */}
      {errors.submit && (
        <div className="
          flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg 
          text-red-600 mb-6 text-sm
        ">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errors.submit}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-1 sm:gap-3">
          <div className="flex flex-col mb-6">
            <label htmlFor="firstName" className="
              font-medium mb-2 text-gray-700 text-sm block
            ">
              First Name *
            </label>
            <input 
              type="text" 
              id="firstName" 
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="Enter first name"
              disabled={isSubmitting}
              className={`
                p-3 border rounded-lg text-base transition-all duration-200 bg-white w-full
                ${errors.firstName 
                  ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-100' 
                  : 'border-gray-300 text-gray-700 focus:border-blue-500 focus:ring-blue-100'
                }
                focus:outline-none focus:ring-2
                disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60
              `}
            />
            {errors.firstName && (
              <span className="text-red-400 text-xs mt-1 block">{errors.firstName}</span>
            )}
          </div>
          
          <div className="flex flex-col mb-6">
            <label htmlFor="lastName" className="
              font-medium mb-2 text-gray-700 text-sm block
            ">
              Last Name *
            </label>
            <input 
              type="text" 
              id="lastName" 
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Enter last name"
              disabled={isSubmitting}
              className={`
                p-3 border rounded-lg text-base transition-all duration-200 bg-white w-full
                ${errors.lastName 
                  ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-100' 
                  : 'border-gray-300 text-gray-700 focus:border-blue-500 focus:ring-blue-100'
                }
                focus:outline-none focus:ring-2
                disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60
              `}
            />
            {errors.lastName && (
              <span className="text-red-400 text-xs mt-1 block">{errors.lastName}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col mb-6">
          <label htmlFor="email" className="
            font-medium mb-2 text-gray-700 text-sm block
          ">
            Email Address *
          </label>
          <input 
            type="email" 
            id="email" 
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your email address"
            disabled={isSubmitting}
            className={`
              p-3 border rounded-lg text-base transition-all duration-200 bg-white w-full
              ${errors.email 
                ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-100' 
                : 'border-gray-300 text-gray-700 focus:border-blue-500 focus:ring-blue-100'
              }
              focus:outline-none focus:ring-2
              disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60
            `}
          />
          {errors.email && (
            <span className="text-red-400 text-xs mt-1 block">{errors.email}</span>
          )}
        </div>

        <div className="flex flex-col mb-6">
          <label htmlFor="farmSize" className="
            font-medium mb-2 text-gray-700 text-sm block
          ">
            Farm Size (number of cows) *
          </label>
          <select 
            name="farmSize" 
            id="farmSize"
            value={formData.farmSize}
            onChange={handleInputChange}
            disabled={isSubmitting}
            className={`
              p-3 border rounded-lg text-base transition-all duration-200 bg-white w-full cursor-pointer
              ${errors.farmSize 
                ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-100' 
                : 'border-gray-300 text-gray-700 focus:border-blue-500 focus:ring-blue-100'
              }
              focus:outline-none focus:ring-2
              disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60
            `}
          >
            <option value="">Select farm size</option>
            <option value="lessThan100">Less than 100</option>
            <option value="between100and500">Between 100 and 500</option>
            <option value="moreThan500">More than 500</option>
          </select>
          {errors.farmSize && (
            <span className="text-red-400 text-xs mt-1 block">{errors.farmSize}</span>
          )}
        </div>

        <div className="flex flex-col mb-6">
          <label htmlFor="message" className="
            font-medium mb-2 text-gray-700 text-sm block
          ">
            Message *
          </label>
          <textarea 
            id="message"
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            placeholder="Tell us about your dairy farm and how we can help..."
            rows={5}
            disabled={isSubmitting}
            className={`
              p-3 border rounded-lg text-base transition-all duration-200 bg-white w-full
              resize-y min-h-[120px] font-inherit
              ${errors.message 
                ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-100' 
                : 'border-gray-300 text-gray-700 focus:border-blue-500 focus:ring-blue-100'
              }
              focus:outline-none focus:ring-2
              disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60
            `}
          />
          {errors.message && (
            <span className="text-red-400 text-xs mt-1 block">{errors.message}</span>
          )}
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="
            w-full bg-blue-500 text-white py-3.5 px-6 rounded-lg text-base font-medium
            cursor-pointer transition-colors duration-200 flex items-center justify-center gap-2 mt-2
            hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300
            disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-80
          "
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Send Message
            </>
          )}
        </button>
      </form>

      <p className="
        text-center text-xs text-gray-500 mt-4 mb-0
      ">
        We'll respond to your inquiry within 24 hours during business days.
      </p>
    </div>
  );
};

export default ContactForm;