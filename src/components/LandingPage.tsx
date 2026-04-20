import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const features = [
  {
    icon: InboxIcon,
    title: 'Unified Inbox',
    description: 'Capture tasks instantly and triage them later. Nothing falls through the cracks.',
    color: 'accent' as const,
  },
  {
    icon: FolderIcon,
    title: 'Projects & Sections',
    description: 'Organize work into nested projects with sections for clear structure at any scale.',
    color: 'teal' as const,
  },
  {
    icon: CalendarIcon,
    title: 'Today & Upcoming',
    description: 'See what needs attention now and plan ahead with deadline and due date views.',
    color: 'accent' as const,
  },
  {
    icon: RepeatIcon,
    title: 'Recurring Tasks',
    description: 'Set daily, weekly, or custom recurrence rules so routines manage themselves.',
    color: 'teal' as const,
  },
  {
    icon: SparklesIcon,
    title: 'Maestro AI',
    description: 'An AI assistant that understands your tasks and helps you prioritize what matters.',
    color: 'accent' as const,
  },
  {
    icon: CommandIcon,
    title: 'Command Palette',
    description: 'Navigate anywhere, create tasks, and switch views instantly with keyboard shortcuts.',
    color: 'teal' as const,
  },
]

export function LandingPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-50 via-white to-accent-50">
      <div className="flex flex-col">
        {/* Hero Section */}
        <section className="px-4 py-16 md:py-24">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left - Text content */}
              <div className="text-center md:text-left">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900">
                  Get things done,{' '}
                  <span className="text-accent-500">beautifully</span>
                </h1>
                <p className="mt-6 text-lg md:text-xl text-gray-600 leading-relaxed">
                  Intend is a task manager that stays out of your way. Organize projects, track deadlines, and let AI help you focus on what actually matters.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  {user ? (
                    <Link to="/inbox">
                      <button className="w-full sm:w-auto px-8 py-3 text-base font-medium rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all bg-accent-500 text-white hover:bg-accent-600">
                        Go to Inbox
                      </button>
                    </Link>
                  ) : (
                    <>
                      <Link to="/signup">
                        <button className="w-full sm:w-auto px-8 py-3 text-base font-medium rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all bg-accent-500 text-white hover:bg-accent-600">
                          Get Started
                        </button>
                      </Link>
                      <Link to="/login">
                        <button className="w-full sm:w-auto px-8 py-3 text-base font-medium rounded-xl border-2 border-gray-200 hover:border-accent-300 hover:bg-accent-50 hover:text-accent-500 transition-all bg-white text-gray-700">
                          Sign In
                        </button>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Right - Illustration placeholder */}
              <div className="hidden md:flex justify-center items-center">
                <div className="w-full max-w-md aspect-square bg-gradient-to-br from-accent-100 to-accent-50 rounded-3xl flex items-center justify-center shadow-inner">
                  <svg className="w-48 h-48 text-accent-400" viewBox="0 0 120 120" fill="none">
                    {/* Stylized octopus/task icon */}
                    <circle cx="60" cy="40" r="24" fill="currentColor" opacity="0.2" />
                    <circle cx="60" cy="40" r="16" fill="currentColor" opacity="0.4" />
                    <circle cx="54" cy="36" r="3" fill="white" />
                    <circle cx="66" cy="36" r="3" fill="white" />
                    <path d="M54 46 Q60 50 66 46" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                    {/* Tentacles as task lines */}
                    <path d="M44 56 C38 68 30 72 24 80" stroke="currentColor" opacity="0.3" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M50 58 C46 72 42 80 36 92" stroke="currentColor" opacity="0.3" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M56 60 C54 74 52 84 50 96" stroke="currentColor" opacity="0.3" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M64 60 C66 74 68 84 70 96" stroke="currentColor" opacity="0.3" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M70 58 C74 72 78 80 84 92" stroke="currentColor" opacity="0.3" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M76 56 C82 68 90 72 96 80" stroke="currentColor" opacity="0.3" strokeWidth="3" strokeLinecap="round" fill="none" />
                    {/* Checkmarks at tentacle ends */}
                    <circle cx="24" cy="82" r="5" fill="currentColor" opacity="0.15" />
                    <path d="M22 82 L23.5 83.5 L26.5 80.5" stroke="currentColor" opacity="0.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <circle cx="36" cy="94" r="5" fill="currentColor" opacity="0.15" />
                    <path d="M34 94 L35.5 95.5 L38.5 92.5" stroke="currentColor" opacity="0.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <circle cx="50" cy="98" r="5" fill="currentColor" opacity="0.15" />
                    <path d="M48 98 L49.5 99.5 L52.5 96.5" stroke="currentColor" opacity="0.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <circle cx="70" cy="98" r="5" fill="currentColor" opacity="0.15" />
                    <circle cx="84" cy="94" r="5" fill="currentColor" opacity="0.15" />
                    <circle cx="96" cy="82" r="5" fill="currentColor" opacity="0.15" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-4 py-16 bg-white/80">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-center text-gray-900 mb-12">
              Everything you need, nothing you don't
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-accent-200 hover:-translate-y-1 transition-all duration-200 bg-white p-6"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl ${
                        feature.color === 'accent'
                          ? 'bg-accent-50 text-accent-500'
                          : 'bg-teal-50 text-teal-500'
                      }`}
                    >
                      <feature.icon />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {feature.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="px-4 py-16">
          <div className="max-w-2xl mx-auto text-center bg-gradient-to-r from-accent-500 to-accent-600 rounded-3xl p-10 shadow-lg">
            <h2 className="text-2xl font-semibold text-white">
              Ready to take control of your tasks?
            </h2>
            <p className="mt-2 text-white/90">
              Your future self will thank you.
            </p>
            <div className="mt-6">
              {user ? (
                <Link to="/inbox">
                  <button className="bg-white text-gray-900 hover:bg-gray-100 rounded-xl px-8 py-3 font-medium shadow-md transition-all">
                    Go to Inbox
                  </button>
                </Link>
              ) : (
                <Link to="/signup">
                  <button className="bg-white text-gray-900 hover:bg-gray-100 rounded-xl px-8 py-3 font-medium shadow-md transition-all">
                    Get Started for Free
                  </button>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Simple Footer */}
        <footer className="px-4 py-8">
          <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} Intend. Built with care.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

// Icons (inline SVGs to avoid adding a dependency)
function InboxIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-17.5 0V6.75A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25v6.75m-17.5 0v4.5A2.25 2.25 0 006.75 21h10.5a2.25 2.25 0 002.25-2.25v-4.5" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function RepeatIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.356v4.992" />
    </svg>
  )
}

function SparklesIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}

function CommandIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )
}
