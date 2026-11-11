import type {Metadata} from 'next';
import {ArrowDown, ArrowRight, ArrowUpRight, Check, FileUp, LockKeyhole, Presentation, Ruler} from 'lucide-react';
import {Brand} from '../brand/Brand';
import ConceptPreview from '../marketing/ConceptPreview';
import RoomStory from '../marketing/RoomStory';
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
      <header className="ps-header ps-container">
        <Brand />
        <nav className="ps-navigation" aria-label="Public navigation">
          <a href="#story">Tour</a>
          <a href="#workflow">Product</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQs</a>
        </nav>
        <div className="ps-account-links">
          <a className="ps-login" href="/login">Sign in</a>
          <a className="ps-button ps-button-small" href="/register">Get started<ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      </header>

      <main id="main">
        <section className="ps-hero ps-container" aria-labelledby="hero-title">
          <div className="ps-hero-intro">
            <div className="ps-hero-heading">
              <p className="ps-eyebrow"><span className="ps-signal" aria-hidden="true" />A fresh perspective for interior designers</p>
              <h1 id="hero-title">From floor plan{' '}<br /><span>to a clear vision.</span></h1>
            </div>
            <div className="ps-hero-copy">
              <p>Give your ideas a little more dimension. Shape editable 3D rooms, explore materials and help clients see what you see.</p>
              <div className="ps-hero-actions">
                <a className="ps-button" href="/register">Create your workspace<ArrowRight size={18} aria-hidden="true" /></a>
                <a className="ps-text-link" href="#demo">Explore the demo<ArrowDown size={16} aria-hidden="true" /></a>
              </div>
              <span className="ps-hero-note">Your plans. Your private workspace.</span>
            </div>
          </div>
          <div className="ps-hero-demo">
            <ConceptPreview />
          </div>
          <div className="ps-demo-footnote"><span>One space. Plenty of possibilities.</span><span>Try a view. Change a color. Find your perspective.</span></div>
        </section>

        <div className="ps-capabilities" aria-label="Workspace capabilities">
          <div className="ps-container">
            <span className="ps-reveal"><FileUp size={20} aria-hidden="true" />PDF & image import</span>
            <span className="ps-reveal"><Ruler size={20} aria-hidden="true" />Metric & imperial units</span>
            <span className="ps-reveal"><LockKeyhole size={20} aria-hidden="true" />Private projects</span>
            <span className="ps-reveal"><Presentation size={20} aria-hidden="true" />Presentation exports</span>
          </div>
        </div>

        <RoomStory />

        <section className="ps-workflow ps-container" id="workflow" aria-labelledby="workflow-title">
          <div className="ps-section-heading ps-reveal">
            <div><p className="ps-eyebrow">The space between an idea and a yes</p><h2 id="workflow-title">Less explaining.{' '}<br />More exploring.</h2></div>
            <p>Keep the plan, the possibilities and the presentation in one place. Refine the details as your brief takes shape.</p>
          </div>
          <ol className="ps-steps">
            <li className="ps-reveal">
              <div className="ps-step-art ps-plan-art" aria-hidden="true">
                <svg viewBox="0 0 360 220" fill="none">
                  <path className="ps-art-grid" d="M0 40h360M0 80h360M0 120h360M0 160h360M0 200h360M40 0v220M80 0v220M120 0v220M160 0v220M200 0v220M240 0v220M280 0v220M320 0v220" />
                  <path className="ps-art-fill" d="M78 48h204v132H78z" />
                  <path className="ps-art-ink ps-art-draw" pathLength={1} strokeWidth="5" d="M78 144V48h204v132H120M196 48v52m0 40v40M78 112h66" />
                  <path className="ps-art-line" d="M196 140h40a40 40 0 0 0-40-40M120 180v-42a42 42 0 0 0-42 42" />
                  <path className="ps-art-line" d="M78 24h204M78 18v12m204-12v12M306 48v132m-6-132h12m-12 132h12" />
                  <path className="ps-art-accent ps-art-draw" pathLength={1} strokeWidth="3" d="M68 58V38h20m184 0h20v20M68 170v20h20m184 0h20v-20" />
                  <circle className="ps-art-dot" cx="196" cy="48" r="5" />
                </svg>
                <span className="ps-art-caption">Your plan, with a new dimension</span>
              </div>
              <div className="ps-step-heading"><span className="ps-step-number">01</span><h3>Bring the plan.</h3></div>
              <p>Upload a PDF or image, confirm the scale and trace your rooms. Adjust dimensions in the units you work in.</p>
              <span className="ps-step-note">Assisted reconstruction, with you in control.</span>
            </li>
            <li className="ps-reveal">
              <div className="ps-step-art ps-finish-art" aria-hidden="true">
                <svg viewBox="0 0 360 220" fill="none">
                  <path fill="var(--brand-surface)" d="m68 119 121-68 108 62-121 70z" />
                  <path className="ps-art-line" d="m68 119 121-68 108 62-121 70zM89 131l122-68M111 144l122-68m-99 81 122-68m-100 81 122-68" />
                  <path fill="var(--brand-primary)" d="m104 104 60-35 72 42-60 35z" />
                  <path fill="var(--brand-primary)" opacity=".7" d="M104 104v35l72 42v-35zm72 42 60-35v35l-60 35z" />
                  <path stroke="var(--brand-surface)" opacity=".6" d="m115 105 49-28 60 35-48 28zM176 146v27m-64-56 56 32" />
                  <circle fill="var(--brand-ink)" cx="275" cy="61" r="16" />
                  <circle fill="var(--brand-primary)" cx="275" cy="101" r="16" />
                  <circle fill="var(--brand-surface)" stroke="var(--brand-border)" cx="275" cy="141" r="16" />
                  <path stroke="var(--brand-surface)" strokeWidth="2" d="m269 100 4 4 8-8" />
                </svg>
                <span className="ps-art-caption">A palette of possibilities</span>
              </div>
              <div className="ps-step-heading"><span className="ps-step-number">02</span><h3>Make it feel right.</h3></div>
              <p>Arrange furniture. Explore floor finishes, sofa shapes and wall textures. Fine-tune colors to suit your vision.</p>
              <span className="ps-step-note">Every detail stays editable.</span>
            </li>
            <li className="ps-reveal">
              <div className="ps-step-art ps-present-art" aria-hidden="true">
                <svg viewBox="0 0 360 220" fill="none">
                  <path fill="var(--brand-surface)" stroke="var(--brand-border)" d="M78 34h204v152H78z" />
                  <path className="ps-art-line" d="M78 58h204" />
                  <circle className="ps-art-dot" cx="92" cy="46" r="2" /><circle className="ps-art-dot" cx="102" cy="46" r="2" /><circle className="ps-art-dot" cx="112" cy="46" r="2" />
                  <path fill="var(--brand-tint)" d="m118 134 60-34 64 36-60 34z" />
                  <path className="ps-art-line" d="M118 134V89l60-34 64 36v45M178 55v45m-60 34 60 36 64-34" />
                  <path className="ps-art-accent" strokeWidth="3" d="m140 127 24-14 34 20-24 14zm0 0v15l34 20 24-14v-15m-24 14v15" />
                  <path className="ps-art-ink" strokeWidth="3" d="M96 202h72m12 0h84" />
                  <path className="ps-art-accent" strokeWidth="3" d="M282 162h28m-10-10 10 10-10 10" />
                </svg>
                <span className="ps-art-caption">Ready for the conversation</span>
              </div>
              <div className="ps-step-heading"><span className="ps-step-number">03</span><h3>Share the perspective.</h3></div>
              <p>Switch views, explore lighting and export your concept presentation. Give clients a clearer way to consider the space.</p>
              <span className="ps-step-note">Concepts for discussion, before execution.</span>
            </li>
          </ol>
        </section>

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
