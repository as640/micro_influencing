import MarketingHeaderBar from '../components/MarketingHeaderBar';

const teamRoles = [
  {
    title: 'Software Engineers',
    description:
      'Build and ship scalable products end-to-end, from prototype to production systems with clean architecture.'
  },
  {
    title: 'Product Designers',
    description:
      'Design intuitive interfaces and user journeys through research, prototyping, and interaction design.'
  },
  {
    title: 'Data Scientists',
    description:
      'Create and tune AI workflows, evaluate model quality, and transform data into product intelligence.'
  },
  {
    title: 'Product Managers',
    description:
      'Translate business goals into roadmaps, prioritize outcomes, and align teams around delivery.'
  },
  {
    title: 'AI Architects',
    description:
      'Design robust AI integrations across model selection, prompt systems, orchestration, and observability.'
  },
  {
    title: 'Technical Leadership',
    description:
      'Guide strategy, engineering excellence, and scaling practices to help teams move faster with confidence.'
  }
];

const values = [
  {
    title: 'Mastery',
    text: 'We continuously sharpen our craft in engineering, design, and product delivery.'
  },
  {
    title: 'Humanity',
    text: 'We support each other and collaborate with empathy, trust, and respect.'
  },
  {
    title: 'Courage',
    text: 'We make bold decisions, move quickly, and stay transparent in difficult moments.'
  },
  {
    title: 'Iteration',
    text: 'We improve in small, consistent steps to create sustainable product momentum.'
  },
  {
    title: 'Client Loyalty',
    text: 'We treat client goals like our own and stay invested beyond initial milestones.'
  },
  {
    title: 'Grit',
    text: 'We embrace difficult problems and finish what we start with discipline.'
  }
];

const founders = [
  { name: 'Alex Carter', role: 'CEO & Co-Founder' },
  { name: 'Mia Johnson', role: 'COO & Co-Founder' },
  { name: 'Noah Patel', role: 'Head of Strategy & Co-Founder' }
];

const people = [
  { name: 'Chris Walker', team: 'Engineering' },
  { name: 'Emma Lee', team: 'Engineering' },
  { name: 'Ryan Brooks', team: 'Engineering' },
  { name: 'Sofia Ahmed', team: 'Engineering' },
  { name: 'Daniel Ross', team: 'Product' },
  { name: 'Ava Kim', team: 'Product' },
  { name: 'Lucas Green', team: 'AI' },
  { name: 'Zara Khan', team: 'Design' }
];

function WhoWeArePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <MarketingHeaderBar />

      <main className="mx-auto max-w-6xl space-y-16 px-6 py-10">
        <section className="animate-fade-up rounded-3xl border border-slate-800 bg-slate-900/80 p-8 md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">Who We Are</p>
          <h1 className="mt-4 text-5xl font-bold leading-tight md:text-6xl">We are builders</h1>
          <p className="mt-6 max-w-4xl text-lg text-slate-300">
            Our delivery teams are fully embedded in modern AI software practices. We partner with founders and
            enterprises to design, build, and scale intelligent products that solve meaningful problems.
          </p>
        </section>

        <section className="space-y-6 animate-fade-up">
          <h2 className="text-3xl font-bold">Our Team</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {teamRoles.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 glow-hover">
                <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-slate-300">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-6 animate-fade-up">
          <h2 className="text-3xl font-bold">Our Values</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {values.map((value) => (
              <article key={value.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="text-xl font-semibold text-white">{value.title}</h3>
                <p className="mt-2 text-slate-300">{value.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="animate-fade-up rounded-3xl border border-slate-800 bg-slate-900/80 p-8 md:p-12">
          <h2 className="text-3xl font-bold">The Founding Story</h2>
          <p className="mt-5 text-lg text-slate-300">
            After building and scaling multiple technology practices, our founders set out to create a next-generation
            software consultancy focused on AI-native product development and practical transformation.
          </p>
          <p className="mt-4 text-lg text-slate-300">
            We combine proven delivery methods with top-tier cross-functional talent to help clients launch faster,
            iterate smarter, and build durable product capabilities.
          </p>
        </section>

        <section className="space-y-6 animate-fade-up">
          <h2 className="text-3xl font-bold">Meet The Founders</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {founders.map((founder) => (
              <article key={founder.name} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
                <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500" />
                <h3 className="mt-4 text-xl font-semibold">{founder.name}</h3>
                <p className="mt-1 text-slate-300">{founder.role}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="animate-fade-up rounded-3xl border border-slate-800 bg-slate-900/80 p-8 md:p-12">
          <h2 className="text-3xl font-bold">MicroFluence - [my-kroh-floo-uhns]</h2>
          <p className="mt-4 text-lg text-slate-300">A collective of craftspeople building software, systems, and strategy together.</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {people.map((person) => (
              <article key={person.name} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="h-20 rounded-lg bg-slate-800" />
                <p className="mt-3 font-semibold text-white">{person.name}</p>
                <p className="text-sm text-slate-400">{person.team}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default WhoWeArePage;
