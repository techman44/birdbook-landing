import { Metadata } from 'next';
import { Bird, ArrowLeft, Heart, Camera, MapPin, Users, Shield, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Community Guidelines | BirdBook',
  description: 'Community Guidelines for BirdBook - creating a welcoming space for bird enthusiasts',
};

export default function CommunityGuidelines() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/login"
          className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </Link>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <Bird className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Community Guidelines</h1>
              <p className="text-sm text-gray-500">Last updated: 10 June 2026</p>
            </div>
          </div>

          <div className="prose prose-gray max-w-none">
            <p className="text-lg text-gray-600 mb-8">
              BirdBook is a community of bird enthusiasts, photographers, and nature lovers.
              These guidelines help us maintain a welcoming, informative, and respectful environment for everyone.
            </p>

            <div className="bg-emerald-50 p-6 rounded-lg mb-8">
              <h2 className="flex items-center gap-2 mt-0">
                <Heart className="w-5 h-5 text-emerald-600" />
                Our Core Values
              </h2>
              <ul className="mb-0">
                <li><strong>Respect for Wildlife:</strong> Birds and their habitats come first</li>
                <li><strong>Accuracy:</strong> Honest and accurate species identifications</li>
                <li><strong>Kindness:</strong> Supportive and encouraging community interactions</li>
                <li><strong>Learning:</strong> We're all here to learn and share knowledge</li>
              </ul>
            </div>

            <h2 className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-600" />
              Photo Guidelines
            </h2>

            <h3>Do:</h3>
            <ul>
              <li>Share your own original bird photographs</li>
              <li>Provide accurate information about where and when photos were taken</li>
              <li>Credit others if you're sharing a photo with permission</li>
              <li>Accept AI identification suggestions as starting points, not gospel</li>
              <li>Help others identify birds in their photos</li>
            </ul>

            <h3>Don't:</h3>
            <ul>
              <li>Upload photos you don't have rights to share</li>
              <li>Share heavily manipulated images that misrepresent the bird</li>
              <li>Upload photos of captive birds without disclosure</li>
              <li>Intentionally misidentify species</li>
              <li>Share graphic images of injured or dead birds without appropriate warnings</li>
            </ul>

            <h2 className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              Location & Wildlife Ethics
            </h2>

            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 my-4">
              <h4 className="flex items-center gap-2 text-emerald-800 mt-0">
                <MapPin className="w-4 h-4" />
                Your Locations Power Conservation
              </h4>
              <p className="mb-0 text-emerald-800">
                Always upload with location enabled. Precise coordinates turn your sightings
                into real scientific records — BirdBook contributes occurrence data to
                conservation organisations and researchers working to protect species,
                especially threatened ones. BirdBook automatically blurs the publicly
                displayed location of your posts, so contributing exact coordinates never
                means broadcasting them.
              </p>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 my-4">
              <h4 className="flex items-center gap-2 text-amber-800 mt-0">
                <AlertTriangle className="w-4 h-4" />
                Keep Sensitive Spots Out of Public Text
              </h4>
              <p className="mb-0 text-amber-800">
                Let the platform handle location data — don't manually spell out precise
                nest, roost, or rare-species locations in captions, comments, or off-platform
                posts, where poachers or crowds could exploit them. Upload the exact location
                with your sighting; BirdBook shares it only through controlled conservation
                channels.
              </p>
            </div>

            <h3>Location Best Practices:</h3>
            <ul>
              <li>Upload with GPS/location on — exact coordinates make your sightings scientifically valuable</li>
              <li>Let BirdBook's automatic display-blurring protect sensitive sites, rather than omitting locations</li>
              <li>Don't manually describe precise sensitive locations in public captions or comments</li>
              <li>Respect private property - don't trespass for photos</li>
              <li>Follow all local wildlife regulations and protected area rules</li>
            </ul>

            <h3>Ethical Bird Photography:</h3>
            <ul>
              <li>Never bait, lure, or disturb birds for photographs</li>
              <li>Keep a respectful distance - use zoom lenses, not your feet</li>
              <li>Don't use playback or calls to attract birds</li>
              <li>Leave nesting areas undisturbed</li>
              <li>If a bird shows signs of stress, back away immediately</li>
            </ul>

            <h2 className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Community Behavior
            </h2>

            <h3>Be Welcoming:</h3>
            <ul>
              <li>Encourage beginners - we all started somewhere</li>
              <li>Offer constructive feedback on identifications</li>
              <li>Share knowledge generously</li>
              <li>Celebrate others' discoveries and achievements</li>
            </ul>

            <h3>Be Respectful:</h3>
            <ul>
              <li>Treat all members with courtesy and respect</li>
              <li>Disagree politely - it's okay to have different opinions on identifications</li>
              <li>Don't belittle others for misidentifications</li>
              <li>Respect cultural and regional differences in birding practices</li>
            </ul>

            <h3>Not Tolerated:</h3>
            <ul>
              <li>Harassment, bullying, or targeted attacks</li>
              <li>Hate speech or discrimination of any kind</li>
              <li>Spam, self-promotion, or commercial solicitation</li>
              <li>Sharing others' personal information without consent</li>
              <li>Creating multiple accounts to evade bans</li>
            </ul>

            <h2 className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Reporting & Enforcement
            </h2>

            <h3>How to Report:</h3>
            <p>
              If you encounter content or behavior that violates these guidelines:
            </p>
            <ul>
              <li>Use the report feature on posts or profiles</li>
              <li>Email us at{' '}
                <a href="mailto:support@birdbook.net" className="text-emerald-600 hover:underline">
                  support@birdbook.net
                </a>
              </li>
              <li>Include details and screenshots if possible</li>
            </ul>

            <h3>What Happens:</h3>
            <ul>
              <li><strong>First Offense:</strong> Warning and content removal (for minor violations)</li>
              <li><strong>Repeated Violations:</strong> Temporary account suspension</li>
              <li><strong>Severe Violations:</strong> Permanent account ban</li>
            </ul>
            <p>
              We reserve the right to remove content or accounts at our discretion to protect
              the community.
            </p>

            <h2>Questions?</h2>
            <p>
              If you have questions about these guidelines or need clarification,
              please contact us at{' '}
              <a href="mailto:support@birdbook.net" className="text-emerald-600 hover:underline">
                support@birdbook.net
              </a>
            </p>

            <div className="bg-gray-100 p-6 rounded-lg mt-8">
              <p className="text-center text-gray-600 mb-0">
                Together, we can make BirdBook a place where birders of all levels
                can share, learn, and celebrate our feathered friends.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
