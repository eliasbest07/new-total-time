'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Montserrat } from 'next/font/google'
import {
  Camera, LayoutGrid, MessageCircle, Clock, Target, BarChart3,
  Shield, Users, Zap, ChevronRight, CheckCircle, ArrowRight,
  Monitor, Eye, FileText, Bug, Headphones, DollarSign,
  Menu, X, Quote, MapPin, Briefcase, TrendingUp
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════
   FONT
   ═══════════════════════════════════════════════════════════════ */

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-montserrat',
})

/* ═══════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════ */

const features = [
  {
    id: 'screenshots',
    icon: Camera,
    title: 'Capturas Automáticas',
    subtitle: 'Ve exactamente qué está haciendo tu equipo',
    description: 'El sistema captura la pantalla de tus empleados mientras trabajan. Sin interrupciones, sin instalar nada extra. Tú decides la frecuencia. Cada captura queda registrada con fecha, hora y misión asociada.',
    bullets: ['Capturas periódicas configurables', 'Galería organizada por fecha', 'Asociadas a misiones y actividades'],
    gradient: 'from-blue-500 to-cyan-400',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.25)',
    glow: 'rgba(59,130,246,0.15)',
  },
  {
    id: 'pizarra',
    icon: LayoutGrid,
    title: 'Pizarra Interactiva',
    subtitle: 'Tu proyecto completo en un canvas infinito',
    description: 'Arrastra tarjetas de misiones, tareas, notas e imágenes. Conecta elementos para ver relaciones. Cada miembro del equipo tiene su propia pizarra, y la organización tiene una compartida en tiempo real.',
    bullets: ['14 tipos de tarjetas diferentes', 'Conexiones inteligentes entre cards', 'Sincronización en tiempo real'],
    gradient: 'from-purple-500 to-pink-400',
    bg: 'rgba(168,85,247,0.08)',
    border: 'rgba(168,85,247,0.25)',
    glow: 'rgba(168,85,247,0.15)',
  },
  {
    id: 'chat',
    icon: MessageCircle,
    title: 'Chat en Tiempo Real',
    subtitle: 'Comunícate sin salir de la plataforma',
    description: 'Mensajería instantánea con cada miembro de tu equipo. Comparte tarjetas de la pizarra directamente en el chat. El receptor puede agregarlas a su pizarra con un solo clic.',
    bullets: ['Mensajes en tiempo real', 'Comparte cards por chat', 'Indicadores de presencia online'],
    gradient: 'from-green-500 to-emerald-400',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
    glow: 'rgba(34,197,94,0.15)',
  },
  {
    id: 'tracking',
    icon: Clock,
    title: 'Tracking de Tiempo',
    subtitle: 'Cada minuto invertido queda registrado',
    description: 'Sabe exactamente cuánto tiempo dedica cada miembro a cada tarea. Calendario semanal con desglose por día. Métricas de tiempo hoy, esta semana y por actividad.',
    bullets: ['Tiempo por misión y actividad', 'Calendario semanal visual', 'Historial completo de sesiones'],
    gradient: 'from-orange-500 to-amber-400',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.25)',
    glow: 'rgba(249,115,22,0.15)',
  },
  {
    id: 'misiones',
    icon: Target,
    title: 'Gestión de Misiones',
    subtitle: 'Asigna, rastrea y completa tickets de trabajo',
    description: 'Crea misiones con descripción, horas estimadas, fechas límite y estado. Asígnalas a miembros del equipo. Vincula listas de tareas, notas y proyectos. Todo conectado.',
    bullets: ['Estados: pendiente, en progreso, completada', 'Horas estimadas vs tiempo real', 'Listas de tareas vinculadas'],
    gradient: 'from-red-500 to-rose-400',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
    glow: 'rgba(239,68,68,0.15)',
  },
  {
    id: 'reportes',
    icon: BarChart3,
    title: 'Reportes y Visibilidad',
    subtitle: 'Toma decisiones con datos reales',
    description: 'Dashboard con métricas de tu equipo. Historial de pizarras con snapshots diarios. Gráfico de barras con los últimos 5 días. Ve el progreso de cada proyecto y cada persona.',
    bullets: ['Dashboard de organización', 'Historial de snapshots diarios', 'Métricas por usuario y proyecto'],
    gradient: 'from-indigo-500 to-violet-400',
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.25)',
    glow: 'rgba(99,102,241,0.15)',
  },
]

const painPoints = [
  { icon: DollarSign, text: 'Pagas horas que no puedes verificar' },
  { icon: Eye, text: 'No sabes si están trabajando o en YouTube' },
  { icon: FileText, text: 'No tienes registro del flujo de trabajo' },
  { icon: Bug, text: 'Los errores se acumulan sin seguimiento' },
  { icon: Headphones, text: 'Dar soporte a tus usuarios es un caos' },
  { icon: Monitor, text: 'Cada quien usa herramientas diferentes' },
]

const steps = [
  { num: '01', title: 'Crea tu organización', desc: 'Regístrate y configura tu espacio de trabajo en menos de 2 minutos.' },
  { num: '02', title: 'Invita a tu equipo', desc: 'Cada miembro recibe su propia pizarra personal y acceso al chat.' },
  { num: '03', title: 'Asigna misiones', desc: 'Crea tickets, asigna tareas y define horas estimadas para cada misión.' },
  { num: '04', title: 'Ten control total', desc: 'Ve capturas, rastrea tiempo, revisa progreso. Todo desde un solo lugar.' },
]

const CARD_SCROLL_HEIGHT = 1100
const TOTAL_SECTIONS = 12

const sectionDots = [
  { label: 'Inicio', gradient: 'from-blue-500 to-cyan-400' },
  { label: 'El Reto', gradient: 'from-red-500 to-rose-400' },
  ...features.map(f => ({ label: f.title, gradient: f.gradient })),
  { label: 'Cómo Funciona', gradient: 'from-blue-500 to-cyan-400' },
  { label: 'Comparativa', gradient: 'from-green-500 to-emerald-400' },
  { label: 'Testimonio', gradient: 'from-blue-500 to-cyan-400' },
  { label: 'Comienza', gradient: 'from-blue-500 to-cyan-400' },
]

const floatingSquares = [
  { size: 72, left: 8, duration: 28, delay: 3, radius: 10, isSlow: true },
  { size: 45, left: 22, duration: 22, delay: 8, radius: 8, isSlow: false },
  { size: 98, left: 37, duration: 35, delay: 1, radius: 12, isSlow: false },
  { size: 30, left: 52, duration: 20, delay: 14, radius: 7, isSlow: true },
  { size: 60, left: 68, duration: 26, delay: 6, radius: 9, isSlow: false },
  { size: 85, left: 15, duration: 32, delay: 11, radius: 14, isSlow: false },
  { size: 40, left: 80, duration: 24, delay: 2, radius: 8, isSlow: true },
  { size: 55, left: 45, duration: 30, delay: 17, radius: 11, isSlow: false },
  { size: 110, left: 90, duration: 38, delay: 5, radius: 13, isSlow: false },
  { size: 35, left: 60, duration: 21, delay: 9, radius: 7, isSlow: true },
  { size: 68, left: 3, duration: 27, delay: 15, radius: 10, isSlow: false },
  { size: 48, left: 75, duration: 23, delay: 4, radius: 9, isSlow: false },
  { size: 90, left: 30, duration: 34, delay: 12, radius: 15, isSlow: true },
  { size: 25, left: 55, duration: 19, delay: 7, radius: 6, isSlow: false },
  { size: 78, left: 42, duration: 29, delay: 18, radius: 11, isSlow: false },
]

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeCardIndex, setActiveCardIndex] = useState(0)
  const [heroVisible, setHeroVisible] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const stackContainerRef = useRef<HTMLDivElement>(null)
  const cardElementsRef = useRef<(HTMLDivElement | null)[]>([])
  const rafRef = useRef<number>(0)

  // Hero entrance animation
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 150)
    return () => clearTimeout(t)
  }, [])

  // Navbar scroll effect
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const handleScroll = () => {
      setNavScrolled(container.scrollTop > 40)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Card stack scroll handler
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const applyCardStyles = (activeIdx: number, progress: number) => {
      cardElementsRef.current.forEach((el, i) => {
        if (!el) return
        if (i < activeIdx) {
          // Past cards — hidden behind
          el.style.transform = 'scale(0.92)'
          el.style.opacity = '0'
          el.style.zIndex = '0'
          el.style.pointerEvents = 'none'
        } else if (i === activeIdx) {
          const isLast = i === TOTAL_SECTIONS - 1
          const p = isLast ? 0 : progress
          // Active card shrinks until it virtually disappears
          el.style.transform = `scale(${1 - p * 0.85})`
          el.style.opacity = `${1 - p * 0.6}`
          el.style.zIndex = '1'
          el.style.pointerEvents = p < 0.8 ? 'auto' : 'none'
        } else if (i === activeIdx + 1) {
          // Next card slides up from bottom, covering the current one
          el.style.transform = `translateY(${(1 - progress) * 100}%)`
          el.style.opacity = '1'
          el.style.zIndex = '2'
          el.style.pointerEvents = 'none'
        } else {
          // Future cards — hidden below
          el.style.transform = 'translateY(100%)'
          el.style.opacity = '0'
          el.style.zIndex = '0'
          el.style.pointerEvents = 'none'
        }
      })
    }

    const handleScroll = () => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0
        const runway = stackContainerRef.current
        if (!runway) return
        const rect = runway.getBoundingClientRect()
        const scrollIntoRunway = Math.max(0, -rect.top)
        const maxScroll = CARD_SCROLL_HEIGHT * TOTAL_SECTIONS
        const clamped = Math.min(scrollIntoRunway, maxScroll - 1)
        const idx = Math.min(Math.floor(clamped / CARD_SCROLL_HEIGHT), TOTAL_SECTIONS - 1)
        const progress = (clamped - idx * CARD_SCROLL_HEIGHT) / CARD_SCROLL_HEIGHT
        setActiveCardIndex(prev => prev !== idx ? idx : prev)
        applyCardStyles(idx, progress)
      })
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const scrollToCard = useCallback((index: number) => {
    const container = scrollRef.current
    const runway = stackContainerRef.current
    if (!container || !runway) return
    const rect = runway.getBoundingClientRect()
    container.scrollTo({
      top: container.scrollTop + rect.top + index * CARD_SCROLL_HEIGHT,
      behavior: 'smooth',
    })
  }, [])

  return (
    <div
      ref={scrollRef}
      className={`fixed inset-0 overflow-y-auto overflow-x-hidden hide-scrollbar ${montserrat.className}`}
      style={{ scrollBehavior: 'smooth', zIndex: 60 }}
    >
      {/* ═══ INLINE STYLES ═══ */}
      <style dangerouslySetInnerHTML={{ __html: `
        .landing-bg {
          background: linear-gradient(165deg, #0a0a1a 0%, #0f1729 30%, #0d1117 60%, #0a0a1a 100%);
        }
        @keyframes squareFloat {
          0% { transform: translateY(0) rotate(0deg); opacity: 0.7; }
          50% { opacity: 0.4; }
          100% { transform: translateY(-110vh) rotate(360deg); opacity: 0; }
        }
        @keyframes squareFloatSlow {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 0.5; }
          50% { transform: translateY(-55vh) rotate(180deg) scale(1.1); opacity: 0.3; }
          100% { transform: translateY(-110vh) rotate(360deg) scale(1); opacity: 0; }
        }
        .floating-square {
          position: absolute;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.06);
          background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
          backdrop-filter: blur(1px);
          animation: squareFloat linear infinite;
          bottom: -20%;
          pointer-events: none;
        }
        .floating-square-slow { animation-name: squareFloatSlow; }
        .card-stack-viewport {
          position: sticky;
          top: 0;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .card-stack-viewport > * { pointer-events: auto; }
        .stack-card {
          position: absolute;
          inset: 0;
          will-change: transform, opacity;
          transform-origin: center center;
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes heroSlideUp {
          from { opacity: 0; transform: translateY(60px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroBadgePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(59,130,246,0); }
        }
        .hero-animate { animation: heroSlideUp 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        .hero-badge-pulse { animation: heroBadgePulse 2s ease-in-out infinite; }
        .card-glow { transition: box-shadow 0.4s ease; }
        .card-glow:hover {
          box-shadow: 0 0 40px -10px var(--card-glow-color, rgba(59,130,246,0.3));
        }
        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.2s; }
        .stagger-3 { animation-delay: 0.3s; }
        .stagger-4 { animation-delay: 0.4s; }
        .stagger-5 { animation-delay: 0.5s; }
        .cta-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
          transition: transform 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease;
          position: relative; overflow: hidden;
        }
        .cta-primary:focus-visible {
          outline: 2px solid #60a5fa;
          outline-offset: 2px;
        }
        .cta-primary::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
          opacity: 0; transition: opacity 0.3s ease;
        }
        .cta-primary:hover::after { opacity: 1; }
        .cta-primary > * { position: relative; z-index: 1; }
        @keyframes testimonialGlow {
          0%, 100% { box-shadow: 0 0 30px -5px rgba(59,130,246,0.15); }
          50% { box-shadow: 0 0 50px -5px rgba(59,130,246,0.25); }
        }
        .testimonial-glow { animation: testimonialGlow 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .floating-square,
          .floating-square-slow,
          .hero-animate,
          .hero-badge-pulse,
          .testimonial-glow,
          .card-glow { animation: none !important; }
          .stack-card { transition: none !important; }
          .hero-animate { opacity: 1 !important; transform: none !important; }
        }
      ` }} />

      {/* ═══════════════════════════════════════════════════════
          PAGE WRAPPER
          ═══════════════════════════════════════════════════════ */}
      <div className="landing-bg min-h-screen relative">

        {/* ── Floating Squares Background ── */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true" style={{ zIndex: 0 }}>
          {floatingSquares.map((sq, i) => (
            <div
              key={i}
              className={`floating-square ${sq.isSlow ? 'floating-square-slow' : ''}`}
              style={{
                width: sq.size, height: sq.size,
                left: `${sq.left}%`,
                animationDuration: `${sq.duration}s`,
                animationDelay: `${sq.delay}s`,
                borderRadius: `${sq.radius}px`,
              }}
            />
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════
            NAVBAR
            ═══════════════════════════════════════════════════ */}
        <nav
          className={`fixed top-0 left-0 right-0 transition-[background-color,backdrop-filter,box-shadow] duration-300 ${
            navScrolled
              ? 'bg-[#0a0a1a]/90 backdrop-blur-xl shadow-lg shadow-black/20'
              : 'bg-[#0a0a1a]'
          }`}
          style={{ zIndex: 70 }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/getstarted" className="flex items-center gap-2.5 group focus-visible:outline-2 focus-visible:outline-blue-400 focus-visible:outline-offset-2 rounded-lg">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                  <Clock className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                <span className="text-white font-bold text-lg tracking-tight">Total Time</span>
              </Link>

              {/* Desktop links */}
              <div className="hidden md:flex items-center gap-8">
                <button onClick={() => scrollToCard(2)} className="text-gray-400 hover:text-white text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-400 focus-visible:outline-offset-2 rounded">
                  Funcionalidades
                </button>
                <button onClick={() => scrollToCard(8)} className="text-gray-400 hover:text-white text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-400 focus-visible:outline-offset-2 rounded">
                  Cómo funciona
                </button>
                <button onClick={() => scrollToCard(10)} className="text-gray-400 hover:text-white text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-400 focus-visible:outline-offset-2 rounded">
                  Testimonios
                </button>
              </div>

              {/* Desktop CTAs */}
              <div className="hidden md:flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-gray-400 hover:text-white text-sm font-medium transition-colors px-4 py-2"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/registre"
                  className="cta-primary px-5 py-2.5 rounded-lg text-white font-semibold text-sm flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
                >
                  <span>Comienza Gratis</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-400 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-blue-400 focus-visible:outline-offset-2 rounded-lg"
                aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
              </button>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
              <div className="md:hidden pb-4 border-t border-white/10 mt-2 pt-4 space-y-3">
                <button onClick={() => { scrollToCard(2); setMobileMenuOpen(false) }} className="block text-gray-300 hover:text-white text-sm font-medium py-2">Funcionalidades</button>
                <button onClick={() => { scrollToCard(8); setMobileMenuOpen(false) }} className="block text-gray-300 hover:text-white text-sm font-medium py-2">Cómo funciona</button>
                <button onClick={() => { scrollToCard(10); setMobileMenuOpen(false) }} className="block text-gray-300 hover:text-white text-sm font-medium py-2">Testimonios</button>
                <div className="flex gap-3 pt-2">
                  <Link href="/login" className="text-gray-400 hover:text-white text-sm font-medium py-2">Iniciar Sesión</Link>
                  <Link href="/registre" className="cta-primary px-5 py-2.5 rounded-lg text-white font-semibold text-sm"><span>Comienza Gratis</span></Link>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* ═══════════════════════════════════════════════════
            SCROLL RUNWAY - FULL PAGE CARD STACK
            ═══════════════════════════════════════════════════ */}
        <div
          ref={stackContainerRef}
          style={{ height: `calc(${CARD_SCROLL_HEIGHT * TOTAL_SECTIONS}px + 100vh)` }}
        >
          <div className="card-stack-viewport">

            {/* ── Card 0: HERO ── */}
            <div ref={(el) => { cardElementsRef.current[0] = el }} className="stack-card" style={{ opacity: 1 }}>
              <div className="flex items-center justify-center h-full px-4 sm:px-6" style={{ paddingTop: '80px' }}>
                <div className="max-w-5xl mx-auto text-center">
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm mb-5 hero-badge-pulse ${heroVisible ? 'hero-animate' : 'opacity-0'}`}
                  >
                    <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Plataforma de gestión para equipos remotos</span>
                  </div>

                  <h1
                    className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-4 tracking-tight [text-wrap:balance] ${heroVisible ? 'hero-animate stagger-1' : 'opacity-0'}`}
                  >
                    Tu equipo remoto trabaja.
                    <br />
                    <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                      Pero, ¿realmente sabes en qué?
                    </span>
                  </h1>

                  <p
                    className={`text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed font-light ${heroVisible ? 'hero-animate stagger-2' : 'opacity-0'}`}
                  >
                    Total Time te da <span className="text-white font-medium">visibilidad total</span> sobre tu equipo,
                    flujo de trabajo y tiempo invertido.
                    Sin complicaciones. Sin herramientas dispersas.
                    <span className="text-blue-400 font-medium"> Todo en un solo lugar.</span>
                  </p>

                  <div
                    className={`flex flex-col sm:flex-row gap-3 justify-center items-center ${heroVisible ? 'hero-animate stagger-3' : 'opacity-0'}`}
                  >
                    <Link
                      href="/registre"
                      className="cta-primary px-7 py-3.5 rounded-xl text-white font-bold text-base flex items-center gap-2 shadow-xl shadow-blue-500/25"
                    >
                      <span>Comienza Gratis</span>
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => scrollToCard(2)}
                      className="px-7 py-3.5 rounded-xl text-gray-300 font-medium text-base border border-white/10 hover:border-white/25 hover:bg-white/5 transition-[border-color,background-color] duration-200 flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-blue-400 focus-visible:outline-offset-2"
                    >
                      <span>Ver Funcionalidades</span>
                      <ChevronRight className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>

                  <div
                    className={`mt-8 flex flex-wrap items-center justify-center gap-6 text-gray-500 text-sm ${heroVisible ? 'hero-animate stagger-4' : 'opacity-0'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-green-500" aria-hidden="true" />
                      <span>Datos seguros</span>
                    </div>
                    <div className="hidden sm:block w-px h-4 bg-gray-700" aria-hidden="true" />
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-400" aria-hidden="true" />
                      <span>Setup en 2 minutos</span>
                    </div>
                    <div className="hidden sm:block w-px h-4 bg-gray-700" aria-hidden="true" />
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-purple-400" aria-hidden="true" />
                      <span>Para equipos de 1&nbsp;a&nbsp;50</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Card 1: PROBLEM ── */}
            <div ref={(el) => { cardElementsRef.current[1] = el }} className="stack-card" style={{ opacity: 0 }}>
              <div className="flex items-center justify-center h-full px-4 sm:px-6" style={{ paddingTop: '72px' }}>
                <div className="max-w-5xl mx-auto w-full">
                  <div className="max-w-3xl mx-auto mb-6">
                    <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-3">El reto de los equipos remotos</p>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4 tracking-tight [text-wrap:balance]">
                      Inviertes en tu equipo.
                      <br />
                      <span className="text-gray-400 font-bold">Pero no tienes forma de medir los resultados.</span>
                    </h2>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
                      <p className="text-gray-300 leading-relaxed text-sm sm:text-base font-light">
                        Manejar un equipo remoto sin las herramientas adecuadas significa depender de
                        la <span className="text-white font-semibold">confianza sin evidencia</span>.
                        No tienes visibilidad del flujo de trabajo, no sabes cuanto tiempo se dedica a cada tarea
                        y coordinar todo se vuelve un caos.
                      </p>
                      <p className="text-gray-300 leading-relaxed text-sm sm:text-base mt-3 font-light">
                        El resultado: <span className="text-red-400 font-medium">herramientas dispersas</span>,
                        {' '}<span className="text-red-400 font-medium">información fragmentada</span> y
                        {' '}<span className="text-red-400 font-medium">dinero invertido sin poder justificarlo</span>.
                        Necesitas un sistema que te de claridad.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {painPoints.map((point, i) => {
                      const Icon = point.icon
                      return (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/15 hover:border-red-500/30 transition-[border-color] duration-200"
                        >
                          <div className="p-1.5 rounded-lg bg-red-500/10 shrink-0">
                            <Icon className="w-4 h-4 text-red-400" aria-hidden="true" />
                          </div>
                          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">{point.text}</p>
                        </div>
                      )
                    })}
                  </div>

                  <div className="text-center mt-6">
                    <p className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                      Existe una forma mejor.
                    </p>
                    <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full mx-auto mt-3" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Cards 2-7: FEATURES ── */}
            {features.map((feature, index) => {
              const Icon = feature.icon
              const cardIndex = index + 2
              return (
                <div
                  key={feature.id}
                  ref={(el) => { cardElementsRef.current[cardIndex] = el }}
                  className="stack-card"
                  style={{
                    opacity: 0,
                    // @ts-expect-error CSS custom property
                    '--card-glow-color': feature.glow,
                  }}
                >
                  <div className="flex items-center justify-center h-full px-4 sm:px-6" style={{ paddingTop: '72px' }}>
                    <div className="w-full max-w-4xl">
                      <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-6">
                        Funcionalidades &middot; {index + 1} de {features.length}
                      </p>
                      <div
                        className="card-glow rounded-3xl border backdrop-blur-sm overflow-hidden"
                        style={{ background: feature.bg, borderColor: feature.border }}
                      >
                        <div className="p-8 sm:p-12">
                          <div className="flex items-start gap-6 mb-6">
                            <div
                              className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg shrink-0`}
                              style={{ boxShadow: `0 8px 32px -4px ${feature.glow}`, width: '4.5rem', height: '4.5rem' }}
                            >
                              <Icon className="w-9 h-9 text-white" aria-hidden="true" />
                            </div>
                            <div>
                              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight [text-wrap:balance]">{feature.title}</h3>
                              <p className="text-gray-400 text-base sm:text-lg font-medium">{feature.subtitle}</p>
                            </div>
                          </div>
                          <p className="text-gray-300 leading-relaxed mb-6 text-base sm:text-lg font-light">{feature.description}</p>
                          <div className="flex flex-col gap-3.5">
                            {feature.bullets.map((bullet, j) => (
                              <div key={j} className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" aria-hidden="true" />
                                <span className="text-gray-400 text-base">{bullet}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* ── Card 8: HOW IT WORKS ── */}
            <div ref={(el) => { cardElementsRef.current[8] = el }} className="stack-card" style={{ opacity: 0 }}>
              <div className="flex items-center justify-center h-full px-4 sm:px-6" style={{ paddingTop: '72px' }}>
                <div className="max-w-6xl mx-auto w-full">
                  <div className="text-center mb-10">
                    <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">Cómo funciona</p>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight [text-wrap:balance]">
                      En 4 pasos tienes control total
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                    {steps.map((step, i) => (
                      <div
                        key={i}
                        className="relative p-6 sm:p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5 transition-[border-color,background-color,color] duration-300 group"
                      >
                        <div className="relative">
                          <span className="text-4xl sm:text-5xl font-black text-white/10 group-hover:text-blue-500/15 transition-colors mb-3 block">{step.num}</span>
                          <h3 className="text-lg sm:text-xl font-bold text-white mb-2 tracking-tight">{step.title}</h3>
                          <p className="text-gray-400 text-sm sm:text-base leading-relaxed font-light">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Card 9: BEFORE / AFTER ── */}
            <div ref={(el) => { cardElementsRef.current[9] = el }} className="stack-card" style={{ opacity: 0 }}>
              <div className="flex items-center justify-center h-full px-4 sm:px-6" style={{ paddingTop: '72px' }}>
                <div className="max-w-5xl mx-auto w-full">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight [text-wrap:balance]">
                      Deja de improvisar.
                      <span className="text-gray-400"> Empieza a gestionar.</span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 sm:p-8 rounded-2xl bg-red-500/5 border border-red-500/20">
                      <h3 className="text-lg font-bold text-red-400 mb-5 flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center text-base font-black">X</span>
                        Sin Total Time
                      </h3>
                      <div className="space-y-3.5">
                        {[
                          'Coordinas por WhatsApp y pierdes mensajes',
                          'No sabes cuántas horas reales trabajan',
                          'Los bugs se reportan por mensaje de voz',
                          'Cada quien organiza su trabajo como quiere',
                          'Pagas a final de mes sin evidencia',
                          'Cambiar de empleado es empezar de cero',
                        ].map((item, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className="text-red-400 mt-0.5 text-sm font-bold">&#10007;</span>
                            <span className="text-gray-400 text-sm sm:text-base font-light">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 rounded-2xl bg-green-500/5 border border-green-500/20">
                      <h3 className="text-lg font-bold text-green-400 mb-5 flex items-center gap-3">
                        <CheckCircle className="w-9 h-9 p-1.5 rounded-lg bg-green-500/15" aria-hidden="true" />
                        Con Total Time
                      </h3>
                      <div className="space-y-3.5">
                        {[
                          'Chat integrado con historial y cards compartidas',
                          'Tracking automático de cada minuto trabajado',
                          'Misiones con bugs, tareas y seguimiento visual',
                          'Pizarra centralizada con flujo de trabajo claro',
                          'Capturas de pantalla como evidencia automática',
                          'Todo el contexto del proyecto queda registrado',
                        ].map((item, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 shrink-0" aria-hidden="true" />
                            <span className="text-gray-300 text-sm sm:text-base font-light">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Card 10: TESTIMONIAL ── */}
            <div ref={(el) => { cardElementsRef.current[10] = el }} className="stack-card" style={{ opacity: 0 }}>
              <div className="flex items-center justify-center h-full px-4 sm:px-6" style={{ paddingTop: '72px', paddingBottom: '24px' }}>
                <div className="max-w-5xl mx-auto w-full">
                  <div className="text-center mb-4">
                    <p className="text-blue-400 font-semibold text-xs uppercase tracking-widest mb-2">Caso real</p>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight [text-wrap:balance]">
                      La historia de Alvaro
                    </h2>
                  </div>

                  <div className="testimonial-glow rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-5">
                      {/* Left - Profile */}
                      <div className="lg:col-span-2 p-4 sm:p-6 flex flex-col items-center lg:items-start justify-center border-b lg:border-b-0 lg:border-r border-white/10 bg-gradient-to-br from-blue-500/5 to-transparent">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mb-3 shadow-xl shadow-blue-500/20">
                          <span className="text-2xl font-black text-white">A</span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-0.5 tracking-tight">Alvaro</h3>
                        <p className="text-gray-400 text-xs font-medium mb-3">Emprendedor digital</p>

                        <div className="space-y-2 w-full">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="text-gray-400 text-xs">Colombiano, vive en Estados Unidos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span className="text-gray-400 text-xs">Producto digital con clientes activos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            <span className="text-gray-400 text-xs">$500/mes en empleados remotos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="text-gray-400 text-xs">Gastos fijos de $2,800/mes</span>
                          </div>
                        </div>
                      </div>

                      {/* Right - Story */}
                      <div className="lg:col-span-3 p-4 sm:p-6 flex flex-col justify-center">
                        <Quote className="w-7 h-7 text-blue-500/30 mb-2" />

                        <p className="text-gray-200 text-xs sm:text-sm leading-relaxed mb-3 font-light">
                          Tengo 62 años y llevo más de una década creando productos digitales. Cada dólar que invierto
                          en mi equipo tiene que contar.
                        </p>
                        <p className="text-gray-200 text-xs sm:text-sm leading-relaxed mb-3 font-light">
                          Invierto <span className="text-white font-semibold">$500 mensuales en empleados remotos</span> que
                          desarrollan mi producto. Necesitaba saber que
                          mis trabajadores realmente estaban trabajando, llevar un registro de cada tarea y dar soporte sin perder el hilo.
                        </p>
                        <p className="text-gray-200 text-xs sm:text-sm leading-relaxed mb-4 font-light">
                          Con Total Time puedo ver capturas de mi equipo, asignar misiones, rastrear tiempo real
                          y comunicarme por chat sin salir de la plataforma. <span className="text-blue-400 font-medium">Por primera vez tengo control real
                          sobre mi inversión.</span>
                        </p>

                        {/* Results */}
                        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                              <span className="text-lg font-bold text-white">100%</span>
                            </div>
                            <span className="text-gray-500 text-[10px] sm:text-xs font-medium">Visibilidad</span>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              <Clock className="w-3.5 h-3.5 text-blue-400" />
                              <span className="text-lg font-bold text-white">0</span>
                            </div>
                            <span className="text-gray-500 text-[10px] sm:text-xs font-medium">Horas sin justificar</span>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              <Target className="w-3.5 h-3.5 text-purple-400" />
                              <span className="text-lg font-bold text-white">1</span>
                            </div>
                            <span className="text-gray-500 text-[10px] sm:text-xs font-medium">Plataforma</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Card 11: STATS + CTA + FOOTER ── */}
            <div ref={(el) => { cardElementsRef.current[11] = el }} className="stack-card" style={{ opacity: 0 }}>
              <div className="flex flex-col items-center justify-center h-full px-4 sm:px-6" style={{ paddingTop: '72px', paddingBottom: '24px' }}>
                <div className="w-full max-w-4xl mx-auto">
                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {[
                      { value: '14+', label: 'Tipos de tarjetas' },
                      { value: 'Real-time', label: 'Sincronización' },
                      { value: '6', label: 'Modulos integrados' },
                      { value: '100%', label: 'Control y visibilidad' },
                    ].map((stat, i) => (
                      <div key={i} className="text-center p-4 rounded-xl bg-white/[0.03] border border-white/5">
                        <div className="text-xl sm:text-2xl font-bold text-white mb-0.5">{stat.value}</div>
                        <div className="text-gray-500 text-xs font-medium">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="text-center mb-10">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight tracking-tight">
                      Cada día sin visibilidad es dinero
                      <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent"> que no puedes justificar</span>
                    </h2>
                    <p className="text-gray-400 text-base mb-6 max-w-xl mx-auto font-light">
                      Empieza hoy. Crea tu organización, invita a tu equipo
                      y ten el control que tu inversión merece.
                    </p>

                    <Link
                      href="/registre"
                      className="cta-primary inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base shadow-xl shadow-blue-500/25"
                    >
                      <span>Quiero Acceso Anticipado</span>
                      <ArrowRight className="w-5 h-5" />
                    </Link>

                    <p className="text-gray-600 text-sm mt-4 font-medium">
                      Sin tarjeta de crédito. Configura en 2 minutos.
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-white/5 pt-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/15">
                          <Clock className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-white font-bold text-sm">Total Time</span>
                        <span className="text-gray-600 text-xs">by BTM-Studio</span>
                      </div>
                      <div className="flex items-center gap-6 text-gray-500 text-sm font-medium">
                        <Link href="/login" className="hover:text-white transition-colors">Iniciar Sesión</Link>
                        <Link href="/registre" className="hover:text-white transition-colors">Acceso Anticipado</Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Dot indicators ── */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-row gap-2 sm:flex-col sm:gap-3 sm:bottom-auto sm:left-auto sm:translate-x-0 sm:right-6 sm:top-1/2 sm:-translate-y-1/2 z-10">
              {sectionDots.map((dot, index) => (
                <button
                  key={index}
                  onClick={() => scrollToCard(index)}
                  className="group relative flex items-center justify-center"
                  aria-label={dot.label}
                >
                  <div
                    className={`rounded-full transition-all duration-300 ${
                      index === activeCardIndex
                        ? `w-3 h-3 bg-gradient-to-br ${dot.gradient}`
                        : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                  {/* Tooltip (desktop only) */}
                  <span className="hidden lg:block absolute right-full mr-3 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-sm text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10">
                    {dot.label}
                  </span>
                </button>
              ))}
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
