import { Link } from "react-router-dom";

const steps = [
  ["01", "Shape the site", "Draw a convex parcel, attach its entry road, and let the server calculate setbacks."],
  ["02", "Set requirements", "Choose only server-supported rooms, sizes, floor limits, and aspect ratios."],
  ["03", "Watch it evolve", "Follow candidate hints, live plan refinements, scoring, and recoverable solver events."],
];
const Home = () => (
  <div className="overflow-hidden bg-slate-950 text-white">
    <section className="relative isolate px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-24">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,.32),transparent_35%),radial-gradient(circle_at_80%_60%,rgba(14,165,233,.18),transparent_32%)]" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1.5 text-xs font-bold text-indigo-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> API v1 connected workflow
          </span>
          <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            From parcel lines to a plan you can inspect.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
            Define the buildable site, configure rooms from live server constraints, and watch generation progress directly on a precise spatial canvas.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/workspace" className="rounded-2xl bg-indigo-500 px-6 py-3.5 text-sm font-black shadow-xl shadow-indigo-950/40 transition hover:-translate-y-0.5 hover:bg-indigo-400">Start a floor plan →</Link>
            <a href="#workflow" className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-slate-200 hover:bg-white/10">See the workflow</a>
          </div>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-lg">
          <div className="absolute inset-0 rotate-3 rounded-[2.5rem] border border-indigo-400/20 bg-indigo-500/10" />
          <div className="absolute inset-6 -rotate-2 rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="grid h-full grid-cols-5 grid-rows-4 gap-2">
              <div className="col-span-3 row-span-2 rounded-2xl border border-indigo-300/30 bg-indigo-400/20 p-4 text-xs font-bold text-indigo-100">Living room</div>
              <div className="col-span-2 rounded-2xl border border-amber-300/30 bg-amber-400/20 p-4 text-xs font-bold text-amber-100">Kitchen</div>
              <div className="col-span-2 rounded-2xl border border-rose-300/30 bg-rose-400/20 p-4 text-xs font-bold text-rose-100">Dining</div>
              <div className="col-span-2 row-span-2 rounded-2xl border border-sky-300/30 bg-sky-400/20 p-4 text-xs font-bold text-sky-100">Bedroom 1</div>
              <div className="col-span-3 rounded-2xl border border-emerald-300/30 bg-emerald-400/20 p-4 text-xs font-bold text-emerald-100">Veranda</div>
              <div className="col-span-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/20 p-4 text-xs font-bold text-cyan-100">Bathroom</div>
              <div className="col-span-3 rounded-2xl border border-sky-300/30 bg-sky-400/20 p-4 text-xs font-bold text-sky-100">Bedroom 2</div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section id="workflow" className="border-t border-white/10 bg-white px-4 py-16 text-slate-950 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">One continuous workspace</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Every server decision remains visible.</h2>
        <div className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 md:grid-cols-3">
          {steps.map(([number, title, description]) => <article key={number} className="bg-white p-7">
            <span className="text-xs font-black text-indigo-600">{number}</span>
            <h3 className="mt-8 text-lg font-black">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </article>)}
        </div>
      </div>
    </section>
  </div>
);
export default Home;
