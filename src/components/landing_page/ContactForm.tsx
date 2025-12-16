// src/components/landing_page/ContactForm.tsx
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
    phone: '', // ✅ Initialize phone
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

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }

    if (submitStatus !== 'idle') {
      setSubmitStatus('idle');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name Validation
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone Validation (Basic check for length and allowed characters)
    const phoneRegex = /^[+]?[\d\s-]{10,15}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Farm Size & Message
    if (!formData.farmSize) newErrors.farmSize = 'Please select your farm size';
    if (!formData.message.trim()) newErrors.message = 'Message is required';

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
      // ✅ Include phone in API payload
      const apiData: ContactFormApiData = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone, 
        company: `Farm with ${getFarmSizeLabel(formData.farmSize)}`,
        message: formData.message,
      };

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server error: Invalid response format');
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`);
      }

      // Clear form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        farmSize: '',
        message: ''
      });
      setSubmitStatus('success');
      onSubmissionSuccess?.(formData);

    } catch (error) {
      console.error('Contact form error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message.';
      setErrors({ submit: errorMessage });
      setSubmitStatus('error');
      onSubmissionError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = (): void => {
    setSubmitStatus('idle');
    setErrors({});
  };

  if (submitStatus === 'success') {
    return (
      <div className={`bg-white rounded-xl p-8 shadow-md max-w-lg w-full mx-auto text-center md:p-6 xs:p-4 xs:mx-4 ${className}`} style={style}>
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Message Sent Successfully!</h3>
        <p className="text-gray-600 mb-6">We'll get back to you within 24 hours.</p>
        <button onClick={resetForm} className="w-full bg-blue-500 text-white py-3.5 px-6 rounded-lg font-medium hover:bg-blue-600 transition-colors">
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl p-8 shadow-md max-w-lg w-full mx-auto md:p-6 xs:p-4 xs:mx-4 ${className}`} style={style}>
      {errors.submit && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 mb-6 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errors.submit}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Row 1: Name */}
        <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-1 sm:gap-3">
          <div className="flex flex-col">
            <label htmlFor="firstName" className="font-medium mb-2 text-gray-700 text-sm block">First Name *</label>
            <input 
              type="text" id="firstName" name="firstName"
              value={formData.firstName} onChange={handleInputChange}
              disabled={isSubmitting}
              className={`p-3 border rounded-lg w-full ${errors.firstName ? 'border-red-400 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
            />
            {errors.firstName && <span className="text-red-400 text-xs mt-1">{errors.firstName}</span>}
          </div>
          
          <div className="flex flex-col">
            <label htmlFor="lastName" className="font-medium mb-2 text-gray-700 text-sm block">Last Name *</label>
            <input 
              type="text" id="lastName" name="lastName"
              value={formData.lastName} onChange={handleInputChange}
              disabled={isSubmitting}
              className={`p-3 border rounded-lg w-full ${errors.lastName ? 'border-red-400 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
            />
            {errors.lastName && <span className="text-red-400 text-xs mt-1">{errors.lastName}</span>}
          </div>
        </div>

        {/* Row 2: Email & Phone */}
        <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-1 sm:gap-3">
          <div className="flex flex-col">
            <label htmlFor="email" className="font-medium mb-2 text-gray-700 text-sm block">Email Address *</label>
            <input 
              type="email" id="email" name="email"
              value={formData.email} onChange={handleInputChange}
              disabled={isSubmitting}
              className={`p-3 border rounded-lg w-full ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
            />
            {errors.email && <span className="text-red-400 text-xs mt-1">{errors.email}</span>}
          </div>

          <div className="flex flex-col">
            <label htmlFor="phone" className="font-medium mb-2 text-gray-700 text-sm block">Phone Number *</label>
            <input 
              type="tel" id="phone" name="phone"
              value={formData.phone} onChange={handleInputChange}
              placeholder="+254..."
              disabled={isSubmitting}
              className={`p-3 border rounded-lg w-full ${errors.phone ? 'border-red-400 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
            />
            {errors.phone && <span className="text-red-400 text-xs mt-1">{errors.phone}</span>}
          </div>
        </div>

        {/* Farm Size */}
        <div className="flex flex-col mb-6">
          <label htmlFor="farmSize" className="font-medium mb-2 text-gray-700 text-sm block">Farm Size *</label>
          <select 
            name="farmSize" id="farmSize"
            value={formData.farmSize} onChange={handleInputChange}
            disabled={isSubmitting}
            className={`p-3 border rounded-lg w-full bg-white cursor-pointer ${errors.farmSize ? 'border-red-400 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
          >
            <option value="">Select farm size</option>
            <option value="lessThan100">Less than 100 cows</option>
            <option value="between100and500">100 - 500 cows</option>
            <option value="moreThan500">More than 500 cows</option>
          </select>
          {errors.farmSize && <span className="text-red-400 text-xs mt-1">{errors.farmSize}</span>}
        </div>

        {/* Message */}
        <div className="flex flex-col mb-6">
          <label htmlFor="message" className="font-medium mb-2 text-gray-700 text-sm block">Message *</label>
          <textarea 
            id="message" name="message"
            value={formData.message} onChange={handleInputChange}
            rows={5} disabled={isSubmitting}
            className={`p-3 border rounded-lg w-full resize-y min-h-[120px] ${errors.message ? 'border-red-400 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
          />
          {errors.message && <span className="text-red-400 text-xs mt-1">{errors.message}</span>}
        </div>

        <button 
          type="submit" disabled={isSubmitting}
          className="w-full bg-blue-500 text-white py-3.5 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mt-2 hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</> : <><Send className="w-5 h-5" /> Send Message</>}
        </button>
      </form>
      <p className="text-center text-xs text-gray-500 mt-4">We'll respond within 24 hours.</p>
    </div>
  );
};

export default ContactForm;