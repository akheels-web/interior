import type {Metadata} from 'next';
import {ArrowRight, ArrowUpRight, Check} from 'lucide-react';
import {Brand} from '../brand/Brand';
import MaterialBoard from '../marketing/MaterialBoard';
import LiveFilm from '../marketing/LiveFilm';
import MaterialBand from '../marketing/MaterialBand';
import ScrollEffects from '../marketing/ScrollEffects';
import {SITE_DESCRIPTION, publicIndexing, siteURL} from '../lib/site';
import '../marketing/landing.css';

export function generateMetadata(): Metadata {
  const title = 'PlanSaathi — From floor plan to a clear vision';
  return {
    title,
    description: SITE_DESCRIPTION,
    alternates: {canonical: new URL('/', siteURL()).href},
    robots: {index: publicIndexing(), follow: publicIndexing()},
    openGraph: {title, description: SITE_DESCRIPTION, type: 'website', locale: 'en_IN', url: new URL('/', siteURL()).href, siteName: 'PlanSaathi'},
    twitter: {card: 'summary_large_image', title, description: SITE_DESCRIPTION},
  };
}

const faqs = [
  ['Can I use my own floor plan?', 'Yes. Upload a PDF, PNG, JPEG or WebP, choose the page and confirm the scale. Trace room outlines and door openings against your plan, then refine the dimensions. Import is assisted reconstruction; a PDF does not automatically become a finished 3D model.'],
  ['What does a project credit cover?', 'One newly created project, whether blank or furnished. Editing, presenting or exporting existing projects does not use another creation credit.'],
  ['What happens after ten projects?', 'Buy two extra creation credits for ₹299, or wait for the next paid monthly cycle. Unused extra credits carry forward; monthly credits reset with each verified paid billing cycle. An active paid period is required to use creation credits.'],
  ['Are these construction or HVAC drawings?', 'PlanSaathi supports design concepts and client conversations. Airflow is illustrative, and furniture, electrical and fixture placement needs professional site verification before execution.'],
  ['Can I keep working after my allowance runs out?', 'Your saved projects remain editable. New projects require an active paid billing cycle and available creation credits.'],
];

export default function Home() {
  return (
    <div className="ps-landing">
      <ScrollEffects />
      <a href="#main" className="ps-skip">Skip to content</a>
      <header className="ps-topbar"><div className="ps-header ps-container">
        <Brand />
        <nav className="ps-navigation" aria-label="Public navigation">
          <a href="#story">Tour</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQs</a>
        </nav>
        <div className="ps-account-links">
          <a className="ps-login" href="/login">Sign in</a>
          <a className="ps-button ps-button-small" href="/register">Get started<ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      </div></header>

      <main id="main">
        <LiveFilm />

        <MaterialBand />

        <MaterialBoard />

        <section className="ps-pricing" id="pricing" aria-labelledby="pricing-title">
          <div className="ps-pricing-inner ps-container">
            <div className="ps-pricing-copy ps-reveal">
              <p className="ps-eyebrow">One plan. Room to create.</p>
              <h2 id="pricing-title">Built for your{' '}<br />next big idea.<ArrowUpRight aria-hidden="true" /></h2>
              <p>A private design workspace for your practice, with a straightforward monthly allowance.</p>
              <div className="ps-extra"><span>Busy month?</span><strong>₹299 for 2 extra projects</strong><p>Unused extra credits carry forward.</p></div>
            </div>
            <div className="ps-price-plan ps-reveal">
              <div className="ps-plan-label"><span>The studio plan</span><span>INR / monthly</span></div>
              <p className="ps-price">₹1,499<span>/ month</span></p>
              <p className="ps-plan-allowance">10 new projects per paid monthly cycle.</p>
              <ul>
                <li><Check size={18} aria-hidden="true" />Private projects and editable 3D rooms</li>
                <li><Check size={18} aria-hidden="true" />Furniture, finishes and lighting tools</li>
                <li><Check size={18} aria-hidden="true" />Concept presentation exports</li>
                <li><Check size={18} aria-hidden="true" />Existing projects stay editable</li>
              </ul>
              <a className="ps-button ps-button-white" href="/register">Create your workspace<ArrowRight size={18} aria-hidden="true" /></a>
              <p className="ps-purchase-note">Creating an account does not start a subscription.{' '}<br />Review billing before making a purchase.</p>
            </div>
          </div>
        </section>

        <section className="ps-faq ps-container" id="faq" aria-labelledby="faq-title">
          <div className="ps-reveal"><p className="ps-eyebrow">Good to know</p><h2 id="faq-title">A little clarity{' '}<br />before you begin.</h2></div>
          <div className="ps-faq-list ps-reveal">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
        </section>

        <section className="ps-final ps-container" aria-labelledby="final-title">
          <div className="ps-reveal"><p className="ps-eyebrow">Let’s put your ideas in perspective</p><h2 id="final-title">See what’s possible.</h2></div>
          <a className="ps-final-link" href="/register"><span>Create your workspace</span><ArrowUpRight aria-hidden="true" /></a>
        </section>
      </main>

      <footer className="ps-footer ps-container"><Brand /><p>A new perspective on interior concepts.</p><a href="/login">Sign in<ArrowUpRight size={16} aria-hidden="true" /></a></footer>
    </div>
  );
}
