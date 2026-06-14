'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export function LandingPage() {
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-advance slides
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const goToSignUp = () => {
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-emerald-100 fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <span className="text-3xl">🐦</span>
              <span className="font-bold text-2xl text-gray-900">BirdBook</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-emerald-100 text-emerald-700 px-6 py-2 rounded-full font-semibold">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <span className="mr-2">🎉</span> Coming Soon
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                Share Your Bird{' '}
                <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-400 bg-clip-text text-transparent">
                  Sightings
                </span>{' '}
                With The World
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0">
                The social network for bird enthusiasts. Identify birds with AI, build your life
                list, and connect with fellow birders worldwide.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <span className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-xl shadow-emerald-200 flex items-center justify-center">
                  <span className="mr-2">🚀</span> Coming Soon
                </span>
                <a
                  href="#features"
                  className="border-2 border-emerald-200 text-emerald-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-50 transition-all flex items-center justify-center"
                >
                  Learn More <span className="ml-2">→</span>
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-emerald-100">
                <div>
                  <div className="text-3xl font-bold text-emerald-600">11,000+</div>
                  <div className="text-gray-500 text-sm">Bird Species</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-emerald-600">99%</div>
                  <div className="text-gray-500 text-sm">AI Accuracy</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-emerald-600">Free</div>
                  <div className="text-gray-500 text-sm">To Join</div>
                </div>
              </div>
            </div>

            {/* Right: Phone Mockup with GIF */}
            <div className="flex justify-center lg:justify-end">
              <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-[40px] p-3 shadow-2xl">
                <div className="rounded-[32px] overflow-hidden w-[280px] h-[560px] bg-white">
                  <Image
                    src="/images/promo/birdbook_demo.gif"
                    alt="BirdBook Demo"
                    width={280}
                    height={560}
                    className="w-full h-full object-cover object-top"
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Desktop product shot — right below the hero */}
      <section className="px-4 pb-12 -mt-4 bg-gradient-to-b from-emerald-50/40 to-white">
        <div className="max-w-5xl mx-auto rounded-xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200">
            <span className="w-3 h-3 rounded-full bg-red-400" />
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="w-3 h-3 rounded-full bg-green-400" />
            <div className="ml-4 flex-1 max-w-md bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200">
              birdbook.net/feed
            </div>
          </div>
          <Image
            src="/images/promo/screenshot_feed_desktop.png"
            alt="BirdBook feed on desktop"
            width={1440}
            height={1000}
            className="w-full h-auto"
            priority
          />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Birding
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From AI-powered identification to social sharing, BirdBook has all the tools to
              enhance your birding experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1: AI Identification */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-8 rounded-2xl border border-emerald-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-100">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI Bird Identification</h3>
              <p className="text-gray-600">
                Snap a photo and let our AI identify the species instantly. Works with 11,000+ bird
                species worldwide with 99% accuracy.
              </p>
            </div>

            {/* Feature 2: Life List */}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-8 rounded-2xl border border-amber-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-100">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Personal Life List</h3>
              <p className="text-gray-600">
                Track every species you&apos;ve spotted. Celebrate life birds and watch your
                collection grow over time.
              </p>
            </div>

            {/* Feature 3: Social Feed */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-8 rounded-2xl border border-blue-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-100">
              <div className="text-5xl mb-4">📱</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Social Feed</h3>
              <p className="text-gray-600">
                Share your sightings with the community. React, comment, and discover amazing bird
                photos from fellow enthusiasts.
              </p>
            </div>

            {/* Feature 4: Interactive Maps */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl border border-purple-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-100">
              <div className="text-5xl mb-4">🗺️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Interactive Maps</h3>
              <p className="text-gray-600">
                See where birds have been spotted on an interactive map. Find hotspots and plan your
                next birding adventure.
              </p>
            </div>

            {/* Feature 5: Encyclopedia */}
            <div className="bg-gradient-to-br from-rose-50 to-red-50 p-8 rounded-2xl border border-rose-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-100">
              <div className="text-5xl mb-4">📚</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Bird Encyclopedia</h3>
              <p className="text-gray-600">
                Explore detailed information about every species. Learn about habitats, behaviors,
                and conservation status.
              </p>
            </div>

            {/* Feature 6: Birding Groups */}
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-8 rounded-2xl border border-teal-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-100">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Birding Groups</h3>
              <p className="text-gray-600">
                Join local birding groups and clubs. Share sightings with your community and
                participate in group events.
              </p>
            </div>
          </div>

          {/* App Screenshots Gallery */}
          <div className="mt-20">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">See It In Action</h3>

            <div className="flex justify-center">
              <div className="relative">
                {/* Phone Frame */}
                <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-[40px] p-3 shadow-2xl">
                  <div className="rounded-[32px] overflow-hidden w-[300px] h-[600px] bg-white relative">
                    {/* Slides */}
                    <Image
                      src="/images/promo/screenshot_feed.png"
                      alt="Social Feed"
                      fill
                      className={`object-cover object-top transition-opacity duration-300 ${activeSlide === 0 ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <Image
                      src="/images/promo/screenshot_mybirds.png"
                      alt="My Birds Collection"
                      fill
                      className={`object-cover object-top transition-opacity duration-300 ${activeSlide === 1 ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <Image
                      src="/images/promo/screenshot_map.png"
                      alt="Interactive Map"
                      fill
                      className={`object-cover object-top transition-opacity duration-300 ${activeSlide === 2 ? 'opacity-100' : 'opacity-0'}`}
                    />
                  </div>
                </div>

                {/* Navigation Arrows */}
                <button
                  onClick={() => setActiveSlide((prev) => (prev - 1 + 3) % 3)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-emerald-50 transition-colors"
                >
                  <span className="text-2xl">←</span>
                </button>
                <button
                  onClick={() => setActiveSlide((prev) => (prev + 1) % 3)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-emerald-50 transition-colors"
                >
                  <span className="text-2xl">→</span>
                </button>
              </div>
            </div>

            {/* Slide Indicators & Labels */}
            <div className="flex justify-center gap-4 md:gap-8 mt-8">
              <button
                onClick={() => setActiveSlide(0)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeSlide === 0
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📱 Social Feed
              </button>
              <button
                onClick={() => setActiveSlide(1)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeSlide === 1
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🐦 My Birds
              </button>
              <button
                onClick={() => setActiveSlide(2)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeSlide === 2
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🗺️ Sightings Map
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gradient-to-br from-emerald-600 to-green-700 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-emerald-100 max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">📸</span>
              </div>
              <h3 className="text-xl font-bold mb-3">1. Snap a Photo</h3>
              <p className="text-emerald-100">
                Take a photo of any bird you spot in the wild or upload from your gallery.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🤖</span>
              </div>
              <h3 className="text-xl font-bold mb-3">2. AI Identifies</h3>
              <p className="text-emerald-100">
                Our advanced AI instantly identifies the species with detailed information.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🎉</span>
              </div>
              <h3 className="text-xl font-bold mb-3">3. Share & Celebrate</h3>
              <p className="text-emerald-100">
                Add to your life list and share your sighting with the birding community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Get Started Section */}
      <section id="get-started" className="py-20 px-4 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6">🐦</div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Ready to Start Birding?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Create your free account today and join thousands of bird enthusiasts sharing their sightings!
          </p>

          <div className="space-y-4 max-w-md mx-auto">
            <div className="block w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg shadow-lg shadow-emerald-200">
              <span className="flex items-center justify-center">
                <span className="mr-2">🚀</span> Coming Soon
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              We&apos;re putting the finishing touches on BirdBook. Check back soon!
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-6 md:mb-0">
              <span className="text-3xl">🐦</span>
              <span className="font-bold text-2xl">BirdBook</span>
            </div>
            <div className="text-center md:text-right">
              <div className="flex justify-center md:justify-end space-x-6 mb-3 text-sm">
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </div>
              <p className="text-gray-400">© 2025 BirdBook. All rights reserved.</p>
              <p className="text-sm mt-1 text-gray-500">Made with ❤️ for bird lovers everywhere</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
