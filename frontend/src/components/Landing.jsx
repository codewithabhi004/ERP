import { motion } from 'framer-motion'
import {
  ArrowRight, BellRing, BookOpenCheck, Check, ClipboardCheck,
  GraduationCap, IndianRupee, ShieldCheck, UsersRound
} from 'lucide-react'
import { Link } from 'react-router-dom'

const features = [
  { icon: GraduationCap, title: 'Every student, known', body: 'Admissions, class lists, parent contacts and a student ID—together, not scattered.' },
  { icon: ClipboardCheck, title: 'A clearer school day', body: 'Class teachers keep attendance and homework moving without the extra paperwork.' },
  { icon: IndianRupee, title: 'Fees without guesswork', body: 'See what is due, record counter payments in ₹, and issue a proper receipt.' },
  { icon: BellRing, title: 'One school voice', body: 'Keep families and staff in step with notices, classwork and timely updates.' }
]

const heroImage = 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1900&q=88'
const classroomImage = 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1100&q=85'
const libraryImage = 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1000&q=85'

export default function Landing() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link to="/" className="landing-brand">
          <span className="brand-mark"><GraduationCap size={22} /></span>
          <span>Evergreen <span className="brand-light">Public School</span></span>
        </Link>
        <nav className="landing-links" aria-label="Main navigation">
          <a href="#our-approach">Our approach</a>
          <a href="#what-you-can-do">What you can do</a>
          <Link to="/login" className="landing-login">School portal <ArrowRight size={15} /></Link>
        </nav>
      </header>

      <section className="hero-section" style={{ '--hero-image': `url("${heroImage}")` }}>
        <div className="hero-shade" />
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        >
          <span className="eyebrow light-eyebrow"><span className="eyebrow-dot" /> OUR SCHOOL, ALL IN SYNC</span>
          <h1>Room to grow.<br /><span>Space to shine.</span></h1>
          <p>Everything that makes a school day run—students, teachers, families and the little details in between.</p>
          <div className="hero-actions">
            <Link to="/login" className="hero-button">Open the school portal <ArrowRight size={17} /></Link>
            <a href="#our-approach" className="hero-text-link">Get to know us <ArrowRight size={15} /></a>
          </div>
        </motion.div>
        <motion.div
          className="hero-note"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          <span className="hero-note-icon"><ShieldCheck size={20} /></span>
          <span><strong>Everyone has their place</strong><small>One secure portal. The right view for each role.</small></span>
          <Check className="hero-note-check" size={18} />
        </motion.div>
        <a className="hero-scroll" href="#our-approach">SCROLL TO EXPLORE <span /></a>
      </section>

      <section className="intro-section" id="our-approach">
        <div className="intro-heading">
          <span className="eyebrow">A SCHOOL BUILT AROUND PEOPLE</span>
          <h2>Good systems make<br />more room for <em>good teaching.</em></h2>
        </div>
        <div className="intro-copy">
          <p>A modern school has a lot to look after. Evergreen brings the essential things into one friendly, dependable space—so staff can focus on students, and families can stay in the loop.</p>
          <Link to="/login" className="underlined-link">A better-connected school day <ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className="feature-section" id="what-you-can-do">
        <div className="section-heading">
          <div><span className="eyebrow">THE EVERYDAY, MADE EASIER</span><h2>One school. <em>Every detail.</em></h2></div>
          <p>Simple tools for the work that keeps a school moving.</p>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, title, body }, index) => (
            <motion.article
              className="feature-card"
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.38, delay: index * 0.07 }}
            >
              <span className="feature-icon"><Icon size={21} strokeWidth={1.8} /></span>
              <span className="feature-number">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="school-life-section">
        <div className="school-life-copy">
          <span className="eyebrow">MORE TIME FOR WHAT MATTERS</span>
          <h2>Less chasing forms.<br /><em>More learning.</em></h2>
          <p>From the first admission enquiry to a proud report-card day, the important moments have a home here.</p>
          <div className="school-values">
            <div><span><UsersRound size={17} /></span><p><strong>Made for the whole school</strong><small>Admin, staff, students and parents—with access that fits.</small></p></div>
            <div><span><BookOpenCheck size={17} /></span><p><strong>The learning stays central</strong><small>Attendance, classwork and academic progress, close at hand.</small></p></div>
            <div><span><ShieldCheck size={17} /></span><p><strong>School information stays protected</strong><small>Accounts are permission-based, with access controlled by role.</small></p></div>
          </div>
          <Link to="/login" className="underlined-link">Enter your school portal <ArrowRight size={15} /></Link>
        </div>
        <div className="school-photo-stack">
          <img className="school-photo-primary" src={classroomImage} alt="Students learning together in a bright classroom" loading="lazy" />
          <img className="school-photo-secondary" src={libraryImage} alt="A welcoming school library full of books" loading="lazy" />
          <div className="photo-caption"><span /> Every day, a chance to learn something new</div>
        </div>
      </section>

      <section className="closing-banner">
        <div><span className="eyebrow light-eyebrow">COME ON IN</span><h2>Ready for a smoother school day?</h2><p>Sign in to see the school through your own lens.</p></div>
        <Link to="/login" className="hero-button">Go to your portal <ArrowRight size={17} /></Link>
        <span className="closing-decoration" aria-hidden="true">E</span>
      </section>

      <footer className="landing-footer">
        <Link to="/" className="landing-brand"><span className="brand-mark"><GraduationCap size={19} /></span><span>Evergreen <span className="brand-light">Public School</span></span></Link>
        <span>Growing together, every day.</span>
        <Link to="/login">School portal <ArrowRight size={14} /></Link>
      </footer>
    </main>
  )
}
