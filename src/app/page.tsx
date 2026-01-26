// src/app/page.tsx
'use client';
import React, { useState } from 'react';
import Link from "next/link"
import BenefitSection from '@/components/landing_page/BenefitSection';
import Testimonial from '@/components/landing_page/TestimonialComponent';
import ContactForm from '@/components/landing_page/ContactForm';
import PricingCard from '@/components/landing_page/PricingCard';
import { Button } from "@/components/ui/Button"
import {
  IconCard,
  ResultCard
} from "@/components/ui/Card"

// Importing icons for the landing page
import { TbPresentationAnalytics } from "react-icons/tb";
import { GiCow } from "react-icons/gi";
import { MdOutlineInsights } from "react-icons/md";
import { IoCheckbox } from "react-icons/io5";
import { GrOptimize } from "react-icons/gr";
import { FaBars } from 'react-icons/fa';
import { FiFacebook, FiLinkedin, FiPhone, FiMail } from "react-icons/fi";
import { RiTwitterXFill } from "react-icons/ri";
import { FaInstagram } from "react-icons/fa";
import { HandCoins, ShieldPlus, Headset } from 'lucide-react';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const features = [
    {
      icon: <TbPresentationAnalytics />,
      title: 'Production Analytics',
      description: 'Track and analyze your dairy production metrics in real-time.',
    },
    {
      icon: <GiCow />,
      title: 'Herd Management',
      description: 'Monitor health, breeding, and productivity of your entire herd.'
    },
    {
      icon: <MdOutlineInsights />,
      title: 'Performance Insights',
      description: 'Get actionable insights to optimize your dairy operations.'
    },
    {
      icon: <IoCheckbox />,
      title: 'Quality Control',
      description: 'Ensure consistent product quality with automated monitoring.'
    },
    {
      icon: <GrOptimize />,
      title: 'Yield Optimization',
      description: 'Maximize your dairy yield with data-driven decisions.'
    },
  ];

  const results = [
    {
      title: "30%",
      description: "Average Productivity Increase"
    },
    {
      title: "25%",
      description: "Cost Reduction"
    },
    {
      title: "45%",
      description: "Time Saved on Management"
    }
  ];

  const benefits = [
    {
      title: "Smart Herd Management",
      description: "Track individual cow health, breeding cycles, and productivity with AI-powered insights.",
      points: [
        "Automated health monitoring",
        "Breeding optimization",
        "Individual cow tracking",
        "Performance analytics"
      ]
    },
    {
      title: "Streamlined Operations",
      description: "Reduce manual work and automate daily tasks with our integrated platform.",
      points: [
        "Automated data collection",
        "Real-time monitoring",
        "Task automation",
        "Resource optimization"
      ]
    },
    {
      title: "Quality Assurance",
      description: "Maintain consistent product quality with advanced monitoring and alerts.",
      points: [
        "Quality metrics tracking",
        "Automated quality checks",
        "Compliance monitoring",
        "Issue prevention"
      ]
    },
    {
      title: "Financial Impact",
      description: "Maximize profitability with data-driven decisions and cost optimization.",
      points: [
        "Cost tracking",
        "Revenue optimization",
        "Yield improvement",
        "Resource efficiency"
      ]
    }
  ];

  const testimonies = [
    {
      comment: "Since implementing DiaryTrack, we've seen an increase in productivity and significant cost savings. The platform has transformed how we manage our Dairy farm",
      name: "John Smith",
      role: "Owner",
      farm: "Smith Family Dairy Farm"
    }
  ];

  // Pricing tiers data - Updated with new structure
  const pricingTiers = [
    {
      id: 'starter',
      title: 'Starter Farmer',
      description: 'Perfect for smallholder farmers with 1–10 cows',
      price: 'KES 300',
      period: '/month',
      priceRange: '300–500',
      features: [
        // Animal & Production
        'Register up to 10 cows',
        'Basic animal profiles (ID, breed, age)',
        'Daily milk production recording',
        'Simple production history per cow',
        // Health
        'Basic health status tracking',
        'Vaccination & treatment log',
        'Manual reminders (in-app)',
        // Reports
        'Simple monthly production summary',
        'Individual cow history view',
        // Access & Use
        'Mobile & web access',
        'Offline data capture & sync',
        'Single user account (farm owner)',
        // Support
        'Self-help guides & FAQs',
        'In-app tips'
      ],
      paymentUrl: 'https://checkout.stripe.com/starter-farmer-demo',
      buttonText: 'Get Started Free',
      isPopular: false,
      limitations: [
        'In-app only alerts (no SMS)',
        'No financial tracking',
        'No feed & breeding modules',
        'No report exports'
      ]
    },
    {
      id: 'growing',
      title: 'Growing Farm',
      description: 'For serious small–medium farms with 11–50 cows',
      price: 'KES 2,500',
      period: '/month',
      features: [
        // Animal & Production
        'Up to 50 cows',
        'Lactation cycle tracking',
        'Production drop alerts (in-app + optional SMS)',
        // Health & Breeding
        'Full health records & history',
        'Vaccination schedules',
        'Breeding & AI records',
        'Pregnancy & calving tracking',
        // Feed & Nutrition
        'Feed inventory tracking',
        'Feed usage per animal',
        'Basic feed cost analysis',
        // Financials
        'Income tracking (milk sales)',
        'Expense tracking (feed, vet, labor)',
        'Monthly profit/loss summary',
        // Reports
        'Monthly & quarterly reports',
        'PDF / Excel export',
        // Users & Team
        'Up to 3 user accounts',
        'Role-based access (owner, worker)',
        // Support
        'Email & WhatsApp support',
        'One-time remote onboarding'
      ],
      paymentUrl: 'https://mpesa.payment.com/growing-farm-demo',
      buttonText: 'Subscribe Now',
      isPopular: true,
      limitations: [
        'SMS alerts capped (50–100/month)',
        'No equipment management',
        'No multi-farm support'
      ]
    },
    {
      id: 'commercial',
      title: 'Commercial Pro',
      description: 'For large commercial farms with 51–200 cows',
      price: 'KES 5,000',
      period: '/month',
      features: [
        // Scale & Operations
        'Up to 200 cows',
        'Multi-user access (up to 10 users)',
        'Audit logs (who did what, when)',
        // Advanced Health & Breeding
        'Disease trend analysis',
        'Breeding success metrics',
        'Advanced calving & fertility reports',
        // Inventory & Equipment
        'Equipment management',
        'Maintenance schedules',
        'Inventory reorder alerts',
        // Analytics & Alerts
        'Advanced dashboards',
        'Customizable alerts',
        'Higher SMS allowance (300–500/month)',
        // Reports
        'Advanced performance analytics',
        'Comparative reports (month vs month)',
        // Support & Training
        'Priority support',
        'Remote training sessions',
        'Discounted on-site visits'
      ],
      paymentUrl: 'https://checkout.stripe.com/commercial-pro-demo',
      buttonText: 'Subscribe Now',
      isPopular: false,
      limitations: [
        'No unlimited farms',
        'No custom integrations',
        'API access limited'
      ]
    },
    {
      id: 'enterprise',
      title: 'Enterprise / Cooperative',
      description: 'For cooperatives, processors, NGOs, and institutions',
      price: 'Custom',
      period: 'pricing',
      features: [
        // Multi-Farm & Aggregation
        'Unlimited farms & animals',
        'Cooperative-level dashboards',
        'Farmer performance comparison',
        'Aggregated production & quality data',
        // Advanced Analytics & Integrations
        'Custom reports',
        'API access',
        'System integrations (labs, processors, banks)',
        // Governance & Compliance
        'Advanced permission controls',
        'Data audit & compliance tools',
        'Export for lenders & insurers',
        // Support & Deployment
        'Dedicated account manager',
        'On-site training & onboarding',
        'SLA-backed support',
        'Custom workflows',
        // Billing & Sponsorship
        'Central billing',
        'Sponsored farmer accounts',
        'Bulk onboarding & training'
      ],
      paymentUrl: 'https://checkout.stripe.com/enterprise-demo',
      buttonText: 'Contact Sales',
      isPopular: false,
      contactNote: 'Annual contracts • Custom pricing • Contact our team for details'
    }
  ];

  // Function to handle subscription - now receives plan details
  const handleSubscribe = (paymentUrl: string, planId: string) => {
    // You can add analytics tracking here
    console.log(`User clicked subscribe for plan: ${planId}`);

    // You can also add custom logic based on plan type
    if (planId === 'enterprise') {
      // Maybe open a contact form instead
      console.log('Enterprise plan - consider opening contact form');
    }

    // Open payment URL
    window.open(paymentUrl, '_blank');
  };

  return (
    <main className='background'>
      <header className={'header'}>
        <div className={'header-container'}>
          {/* Logo */}
          <div className={"logo"}>DairyTrack Pro</div>

          {/* Hamburger Icon (Visible only on mobile) */}
          <FaBars
            className={"hamburger-menu"}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          />

          {/* Navigation Menu */}
          {/* Navigation Menu */}
          <nav className={`landing-nav-container ${isMenuOpen ? 'landing-nav-container-open' : 'landing-nav-container-closed'}`}>
            <ul className="landing-nav-list">
              <li className="landing-nav-item">
                {/* Mobile link */}
                <a href="#features" className="landing-nav-link-mobile">Features</a>
                {/* Desktop link */}
                <a href="#features" className="landing-nav-link-desktop">Features</a>
              </li>
              <li className="landing-nav-item">
                <a href="#benefits" className="landing-nav-link-mobile">Benefits</a>
                <a href="#benefits" className="landing-nav-link-desktop">Benefits</a>
              </li>
              <li className="landing-nav-item">
                <a href="#pricing" className="landing-nav-link-mobile">Pricing</a>
                <a href="#pricing" className="landing-nav-link-desktop">Pricing</a>
              </li>
              <li className="landing-nav-item">
                <a href="#contact" className="landing-nav-link-mobile">Contact</a>
                <a href="#contact" className="landing-nav-link-desktop">Contact</a>
              </li>
              <li className="landing-nav-item landing-nav-item-last">
                <Link href="/auth">
                  <Button variant="primary" size="default" primary={true}>Get Started</Button>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>


      {/* Hero Section */}
      <div className="hero relative overflow-hidden">
        <div className="hero-section-responsive relative z-10">
          <h1 className="hero-heading-responsive">
            Modern Dairy Management <br />
            <span className="hero-heading-gradient">Made Simple</span>
          </h1>
          <p className="hero-paragraph-responsive">
            Streamline your dairy production with real-time tracking, analytics, and intelligent insights.
          </p>
          <div className="hero-button-container">
            <Link href="/auth">
              <Button primary={true}>Start Free Trial</Button>
            </Link>
          </div>
        </div>
        {/* Decorative background image positioned below content */}
        <img
          src="/images/background.png"
          alt="Decorative farm background"
          className="absolute left-1/2 transform -translate-x-1/2 top-1/4 z-0 w-full max-w-6xl opacity-90 pointer-events-none hero-image-gradient"
        />
      </div>

      {/* Features Section */}
      <div id='features' className="features-section">
        <h2 className="features-heading">
          Everything you need to manage your dairy production
        </h2>
        <div className="features-card-grid">
          {features.map((feature, index) => (
            <IconCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>

      {/* Results Section */}
      <div className="results-section-responsive">
        <h2 className="results-section-heading-responsive">
          Proven Results for Dairy Farms
        </h2>
        <div className="result-card-grid-responsive">
          {results.map((result, index) => (
            <ResultCard
              key={index}
              title={result.title}
              description={result.description}
            />
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div id="benefits" className="benefit-sections">
        <div className="benefit-section-container">
          {benefits.map((benefit, index) => (
            <BenefitSection
              key={index}
              title={benefit.title}
              description={benefit.description}
              points={benefit.points}
            />
          ))}
        </div>
      </div>

      {/* Pricing Section */}

      <section id="pricing" className="pricing-section">
        <div className="pricing-container">
          <div className="pricing-section-header">
            <h2 className="pricing-section-title">
              Simple, Transparent Pricing
            </h2>
            <p className="pricing-section-subtitle">
              Choose the plan that fits your farm's size and needs. Start free, scale with confidence.
            </p>
          </div>

          <div className="pricing-grid">
            {pricingTiers.map((tier) => (
              <PricingCard
                key={tier.id}
                id={tier.id}
                title={tier.title}
                description={tier.description}
                price={tier.price}
                period={tier.period}
                priceRange={(tier as any).priceRange}
                features={tier.features}
                limitations={(tier as any).limitations}
                isPopular={tier.isPopular}
                paymentUrl={tier.paymentUrl}
                buttonText={tier.buttonText}
                contactNote={tier.contactNote}
                onSubscribe={handleSubscribe}
              />
            ))}
          </div>

          <div className="payment-methods">
            <p className="payment-text">We accept:</p>
            <div className="payment-icons">
              <span className="payment-method">M-Pesa</span>
              <span className="payment-method">Stripe</span>
              <span className="payment-method">Bank Transfer</span>
            </div>

            <div className="guarantee">
              <p className="guarantee-text">
                <span>
                  <HandCoins className="w-5 h-5" /> 30-day money-back guarantee
                </span>
                <span>•</span>
                <span>
                  <ShieldPlus className="w-5 h-5" /> Secure payments
                </span>
                <span>•</span>
                <span>
                  <Headset className="w-5 h-5" /> 24/7 support
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <div className={'testimonial-section'}>
        {testimonies.map((testimony, index) => (
          <Testimonial
            key={index}
            comment={testimony.comment}
            name={testimony.name}
            role={testimony.role}
            farm={testimony.farm}
          />
        ))}
      </div>

      {/* Contact Section */}
      <div id="contact" className={'get-in-touch-section'}>
        <h2 className="get-in-touch-heading">Get in Touch with Us</h2>
        <h3 className="get-in-touch-subheading">Have questions about DairyTrack? We&apos;re here to help you optimize your dairy operations.</h3>
        <div className={'contact-container'}>
          <ContactForm />
          <div className={'contact-side'}>
            <div className={'contact-info-box'}>
              <h3 className={'contact-info-heading'}>Contact Information</h3>
              <p className={'contact-info-text'}>Off-outering Road <br />Matigari House <br />Ruaraka, Nairobi </p>
              <div className="contact-info-phone">
                <a
                  href="tel:+254702689812"
                  aria-label="Customer-care-contact"
                  className="contact-info-item"
                >
                  <div>
                    <FiPhone className="contact-info-icon" />
                  </div>
                  <p className="contact-info-text">+254 702 689812</p>
                </a>
              </div>

              <div className="contact-info-email">
                <a
                  href="mailto:support@dairytrack.com"
                  aria-label="Customer-care-contact"
                  className="contact-info-item"
                >
                  <div>
                    <FiMail className="contact-info-icon" />
                  </div>
                  <p className="contact-info-text">support@dairytrack.com</p>
                </a>
              </div>

            </div>
            <div className={'business-hours-box'}>
              <h3 className={'business-hours-heading'}>Business Hours</h3>
              <p className={'business-hours-text'}>Monday - Friday: 8:00 AM - 6:00 PM <br /> Saturday: 9:00 AM - 3:00 PM <br /> Sunday: Closed</p>
            </div>
            <div className={'connect-with-us-box'}>
              <h3 className={'connect-with-us-heading'}>Connect With Us</h3>
              <div className={'social-icons'}>
                <a href="#" aria-label="Facebook" className="social-icon"><FiFacebook /></a>
                <a href="#" aria-label="Twitter" className="social-icon"><RiTwitterXFill /></a>
                <a href="#" aria-label="Instagram" className="social-icon"><FaInstagram /></a>
                <a href="#" aria-label="LinkedIn" className="social-icon"><FiLinkedin /></a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <footer className={'footer'}>
        <div className={'footer-container'}>
          <p>
            <span className={'footer-ready'}>Ready to get started?</span> <br />
            <span className={'footer-start'}>Start your free trial today.</span>
          </p>
          <Link href="/auth">
            <button className={'footer-button'}>Get Started</button>
          </Link>
        </div>
      </footer>
    </main>
  )
}