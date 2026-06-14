import { Metadata } from 'next';
import { Bird, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | BirdBook',
  description:
    'Terms of Service for BirdBook — the social network for bird photographers.',
};

// Shared typographic styles (the Tailwind typography plugin is not installed,
// so legal pages style their own elements explicitly).
const h2 = 'mt-10 mb-3 text-xl font-semibold text-gray-900';
const para = 'mb-4 text-[15px] leading-7 text-gray-700';
const list = 'mb-4 ml-5 list-disc space-y-1.5 text-[15px] leading-7 text-gray-700';
const mail = 'text-emerald-600 hover:underline';

const CONTACT_EMAIL = 'dean.mcintosh@gmail.com';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/login"
          className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to BirdBook
        </Link>

        <div className="bg-white rounded-lg shadow-sm p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
              <Bird className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
              <p className="text-sm text-gray-500">Last updated: 10 June 2026</p>
            </div>
          </div>

          <p className={`${para} mt-6`}>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your use of BirdBook, the social
            network for bird photographers available at{' '}
            <a href="https://birdbook.net" className={mail}>
              birdbook.net
            </a>{' '}
            (&ldquo;the Service&rdquo;), operated from Australia. By creating an account or using
            the Service you agree to these Terms and to our{' '}
            <Link href="/privacy" className={mail}>
              Privacy Policy
            </Link>
            , including its provisions on data collection, AI training, and conservation data
            sharing. Acceptance of these Terms in full is a condition of use.{' '}
            <strong>If you do not agree, do not use the Service.</strong>
          </p>

          <h2 className={h2}>1. The Service</h2>
          <p className={para}>BirdBook lets you:</p>
          <ul className={list}>
            <li>upload and share bird photographs and audio recordings;</li>
            <li>receive AI-assisted species identification for your photos and recordings;</li>
            <li>keep a personal life list of sightings and explore community maps;</li>
            <li>follow other members, join groups and events, and exchange messages; and</li>
            <li>contribute to community resources such as the bird encyclopedia.</li>
          </ul>
          <p className={para}>
            We may add, change, limit, or withdraw any feature, or the Service as a whole, at any
            time at our sole discretion. We may introduce advertising, sponsorship, paid features,
            or other commercial offerings at any time without separate notice.
          </p>

          <h2 className={h2}>2. Accounts</h2>
          <ul className={list}>
            <li>You must be at least 13 years old to use BirdBook.</li>
            <li>You must provide accurate registration information and keep it up to date.</li>
            <li>
              You are responsible for keeping your credentials confidential and for all activity
              under your account. Notify us promptly at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className={mail}>
                {CONTACT_EMAIL}
              </a>{' '}
              if you suspect unauthorised use.
            </li>
            <li>One person per account; do not impersonate others or misrepresent who you are.</li>
          </ul>

          <h2 className={h2}>3. Your content and licence to BirdBook</h2>
          <ul className={list}>
            <li>
              <strong>You keep ownership.</strong> Photos, recordings, and text you upload remain
              yours. Nothing in these Terms transfers your copyright to us.
            </li>
            <li>
              <strong>Licence grant.</strong> By uploading or submitting content to the Service,
              you grant BirdBook a{' '}
              <strong>
                perpetual, irrevocable, worldwide, royalty-free, transferable, and sublicensable
              </strong>{' '}
              licence to host, store, reproduce, adapt, modify, resize, analyse, publish,
              distribute, publicly display, and create derivative works from your content and its
              associated metadata, for the purposes of: (a) operating, developing, and improving
              the Service; (b) promoting the Service; (c) scientific research; (d) training,
              fine-tuning, and evaluating BirdBook&rsquo;s AI and identification models; and (e)
              sharing occurrence and biodiversity data with conservation organisations,
              researchers, and biodiversity databases, including at precise location resolution,
              as described in the Privacy Policy.
            </li>
            <li>
              <strong>Survival.</strong> This licence survives deletion of your content or your
              account with respect to: occurrence records and derived or aggregated data; data
              already incorporated into trained models; data already shared with research or
              conservation partners; and content already shared into the community (for example,
              content reposted, quoted, or incorporated into community resources such as the
              encyclopedia). For other content, the licence ends a reasonable period after
              deletion, allowing for backup cycles.
            </li>
            <li>
              <strong>Your responsibility.</strong> You warrant that you own or have the rights to
              everything you upload, that your content does not infringe anyone else&rsquo;s
              rights, and that you are entitled to grant the licence above.
            </li>
          </ul>

          <h2 className={h2}>4. Acceptable use</h2>
          <p className={para}>You agree not to:</p>
          <ul className={list}>
            <li>harass, abuse, threaten, or defame other members;</li>
            <li>
              upload or post content that is unlawful, hateful, sexually explicit, violent,
              deceptive, or otherwise inappropriate or offensive — as determined by BirdBook at
              its sole discretion — or content that you have no right to share;
            </li>
            <li>
              scrape, crawl, harvest, or bulk-download content or data from the Service, or access
              it by automated means, without our prior written permission;
            </li>
            <li>attempt to access other members&rsquo; accounts or non-public data;</li>
            <li>probe, disrupt, overload, or interfere with the operation or security of the Service;</li>
            <li>send spam or use the Service for commercial solicitation; or</li>
            <li>deliberately submit false species identifications or misleading sighting records.</li>
          </ul>

          <h2 className={h2}>5. Wildlife protection</h2>
          <p className={para}>
            BirdBook exists because we care about birds. Members are encouraged to upload
            sightings with precise locations — this data powers conservation and research.
            The Service automatically fuzzes locations shown on public sightings, and BirdBook
            uses and shares full-precision occurrence data through controlled conservation and
            research channels under the Privacy Policy. We expect members to uphold the same
            ethic in what they post publicly:
          </p>
          <ul className={list}>
            <li>
              <strong>Do not manually publicise the precise location of threatened, endangered,
              or otherwise sensitive species</strong> — including nest sites, roosts, and leks —
              in captions, comments, or other public text. Upload exact coordinates with your
              sighting instead: the platform protects them in public view while making them
              available for conservation.
            </li>
            <li>
              Follow ethical fieldcraft: do not harass birds, disturb nests, or use playback or
              baiting in ways that harm wildlife in pursuit of a photograph.
            </li>
            <li>
              We may remove content, obscure locations, or restrict accounts where we believe
              wildlife is being put at risk.
            </li>
          </ul>

          <h2 className={h2}>6. AI identification disclaimer</h2>
          <p className={para}>
            Species suggestions for photos are produced by an AI vision model, and audio
            identifications by automated analysis. These are <strong>best-effort aids, not
            authoritative determinations</strong>. Identifications can be wrong, particularly for
            similar species, juveniles, and poor-quality media. Do not rely on them for
            scientific, conservation, regulatory, or any other consequential purpose without
            independent verification. We accept no liability for incorrect identifications.
          </p>

          <h2 className={h2}>7. Moderation, suspension, and termination</h2>
          <ul className={list}>
            <li>
              <strong>Sole discretion.</strong> We may moderate, edit the presentation of, remove,
              or refuse any content, and may suspend or terminate any account, at any time at our
              sole discretion, with or without notice and with or without cause — including, but
              not limited to, breaches of these Terms, the Community Guidelines, or the law, or
              conduct that puts members, wildlife, or the Service at risk.
            </li>
            <li>You may stop using the Service and request deletion of your account at any time.</li>
            <li>
              Termination does not affect the licence in section 3, which survives as stated
              there. Sections that by their nature should survive termination (including content
              licences, warranties, disclaimers, and limitations of liability) do survive.
            </li>
          </ul>

          <h2 className={h2}>8. Intellectual property</h2>
          <p className={para}>
            The BirdBook name, logo, software, design, and all data sets, models, and derived
            works created by BirdBook — excluding member-owned content — are owned by the operator
            of BirdBook and protected by intellectual property laws. You may not copy or reuse
            them without permission.
          </p>

          <h2 className={h2}>9. Disclaimers</h2>
          <p className={para}>
            The Service is provided <strong>&ldquo;as is&rdquo; and &ldquo;as
            available&rdquo;</strong>, without warranties of any kind beyond those that cannot
            lawfully be excluded. We do not guarantee uninterrupted availability, error-free
            operation, the accuracy of any identification or data, or that content will be
            preserved. Keep your own copies of your original photographs and recordings.
          </p>

          <h2 className={h2}>10. Limitation of liability</h2>
          <p className={para}>
            Nothing in these Terms excludes, restricts, or modifies any consumer guarantee, right,
            or remedy you have under the Australian Consumer Law or any other law that cannot
            lawfully be excluded. Subject to that:
          </p>
          <ul className={list}>
            <li>
              to the maximum extent permitted by law, we are not liable for any indirect,
              incidental, special, or consequential loss, loss of data, loss of opportunity, or
              loss arising from the use, sharing, or publication of your content or data as
              permitted by these Terms and the Privacy Policy; and
            </li>
            <li>
              where liability cannot be excluded but can be limited, our total liability is
              limited, at our option, to resupplying the Service or paying the cost of resupply.
            </li>
          </ul>

          <h2 className={h2}>11. Changes to these Terms</h2>
          <p className={para}>
            We may update these Terms at any time. <strong>Changes are effective when posted</strong>{' '}
            on this page, and the &ldquo;Last updated&rdquo; date above will change. Continued use
            of the Service after a change is posted constitutes acceptance of the updated Terms.
            If you do not accept updated Terms, your only remedy is to stop using the Service.
          </p>

          <h2 className={h2}>12. Governing law</h2>
          <p className={para}>
            These Terms are governed by the laws of New South Wales, Australia. You and we submit
            to the non-exclusive jurisdiction of the courts of New South Wales and the courts
            entitled to hear appeals from them.
          </p>

          <h2 className={h2}>13. Contact</h2>
          <p className={para}>
            Questions about these Terms:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className={mail}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>

          <div className="mt-10 pt-6 border-t text-sm text-gray-500">
            See also our{' '}
            <Link href="/privacy" className={mail}>
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link href="/guidelines" className={mail}>
              Community Guidelines
            </Link>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
