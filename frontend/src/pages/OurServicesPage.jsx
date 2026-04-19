import { Link } from 'react-router-dom';
import MarketingHeaderBar from '../components/MarketingHeaderBar';

const featureCards = [
  {
    title: 'Built for speed',
    description: 'Launch discovery and creator applications in hours, not weeks.'
  },
  {
    title: 'Designed for scale',
    description: 'Run dozens of campaigns in parallel without adding manual overhead.'
  },
  {
    title: 'ROI-focused execution',
    description: 'Turn performance data into repeatable, high-impact creator programs.'
  }
];

const aiInsights = [
  'Audience demographics and engagement quality',
  'Brand affinity and creator content behavior',
  'Performance trend signals and campaign fit scoring'
];

const workflowSteps = [
  'Set filters and audience targets',
  'Let creators apply in one click',
  'Approve, reject, or launch instantly',
  'Adjust campaign live with real-time controls'
];

const successStories = [
  { metric: '14x ROI', title: 'Style Brand boosts affiliate sales with creator-led launches' },
  { metric: '6x ROI', title: 'Experience Brand scales niche creator partnerships at speed' },
  { metric: '11M+ Reach', title: 'Travel Brand reaches high-intent audiences through micro-creators' }
];

const faqs = [
  {
    q: 'What does a creator marketplace include?',
    a: 'A creator marketplace combines discovery, applications, workflow management, messaging, and payouts into one platform.'
  },
  {
    q: 'Can we combine AI matching and manual selection?',
    a: 'Yes. Teams can use AI recommendations for speed while keeping manual curation for quality control.'
  },
  {
    q: 'How quickly can we launch?',
    a: 'Most teams can go from setup to first campaign launch in the same day using templated workflows.'
  }
];

function OurServicesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <MarketingHeaderBar />

      <main>
        <section className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-2 md:items-center">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">Creator Marketplace</p>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">AI-driven campaigns. Zero guesswork. Faster launches.</h1>
            <p className="text-lg text-slate-300">
              A complete creator marketplace experience that helps brands discover creators, launch campaigns, and manage
              results from a single workspace.
            </p>
            <Link
              to="/registration"
              className="inline-block rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Get Started
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <div className="h-72 rounded-2xl bg-gradient-to-br from-emerald-900/30 to-cyan-900/30" />
            <p className="mt-3 text-sm font-medium text-slate-400">Marketplace preview container (replace with real visual later)</p>
          </div>
        </section>

        <section className="border-y border-slate-800 bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <h2 className="text-3xl font-bold text-white">12M+ creators, ready to work</h2>
            <p className="mt-3 max-w-3xl text-slate-300">
              No more slow outreach cycles. Let creators come to you and cut hours of manual work every week.
            </p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {featureCards.map((card) => (
                <article key={card.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="text-xl font-semibold text-white">{card.title}</h3>
                  <p className="mt-2 text-slate-300">{card.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-8 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
              <h3 className="text-2xl font-bold text-white">Campaigns that launch in hours</h3>
              <p className="mt-3 text-slate-300">
                From idea to execution in one afternoon with creator applications, live approvals, and streamlined payouts.
              </p>
              <Link
                to="/registration"
                className="mt-5 inline-block rounded-lg bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-white"
              >
                Get Started
              </Link>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
              <h3 className="text-2xl font-bold text-white">Integrated AI for precise campaign fit</h3>
              <ul className="mt-4 space-y-3 text-slate-300">
                {aiInsights.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="border-y border-slate-800 bg-slate-900/40">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
              <h3 className="text-2xl font-bold text-white">Hands-on or automated, your choice</h3>
              <p className="mt-3 text-slate-300">Run campaigns your way while keeping full visibility and control.</p>
              <ul className="mt-5 space-y-2 text-slate-300">
                {workflowSteps.map((step) => (
                  <li key={step}>- {step}</li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
              <h3 className="text-2xl font-bold text-white">AI outreach + manual curation</h3>
              <p className="mt-3 text-slate-300">
                Blend automation for scale and human curation for quality in one campaign flow.
              </p>
              <div className="mt-6 h-44 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700" />
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-3xl font-bold text-white">Client success stories</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {successStories.map((story) => (
              <article key={story.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">{story.metric}</p>
                <p className="mt-3 text-lg font-semibold leading-snug text-white">{story.title}</p>
                <button className="mt-5 rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800">
                  Read story
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-800 bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <h2 className="text-3xl font-bold text-white">Frequently asked questions</h2>
            <div className="mt-7 space-y-4">
              {faqs.map((item) => (
                <article key={item.q} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="text-lg font-semibold text-white">{item.q}</h3>
                  <p className="mt-2 text-slate-300">{item.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 px-8 py-12 text-white md:px-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Final CTA</p>
            <h2 className="mt-4 text-4xl font-bold">AI-powered campaigns at your fingertips</h2>
            <p className="mt-3 max-w-3xl text-slate-300">
              Replace this section with your final service positioning and conversion copy when ready.
            </p>
            <Link
              to="/registration"
              className="mt-7 inline-block rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Get Started
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default OurServicesPage;
