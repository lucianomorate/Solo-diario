// Solo Diario - Loan Management Application
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  User, Lock, Search, Plus, Wallet, Users, CheckCircle2,
  ChevronLeft, ChevronRight, Phone, Calendar as CalendarIcon,
  CheckCircle, Download, Home, UserPlus, LogOut, Banknote,
  AlertTriangle, X, FileText, Landmark, Trash2, BarChart3,
} from 'lucide-react';
import './App.css';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
const INTERVALS = { Día: 1, Semana: 7, Quincena: 15, Mensual: 30 };
const backTargets = { agregar: 'dashboard', nuevoCliente: 'agregar', nuevoPrestamo: 'agregar', nuevoPrestamoForm: 'nuevoPrestamo', prestamos: 'dashboard', pago: 'dashboard', clientesPrestamos: 'dashboard', historial: 'dashboard', clientes: 'dashboard' };

function calcularSiguienteFecha(fecha, frecuencia) {
  const [year, month, day] = fecha.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const days = INTERVALS[frecuencia] || 7;
  d.setDate(d.getDate() + days);

  // Si es frecuencia "Día", saltar fines de semana (sábado=6, domingo=0)
  if (frecuencia === 'Día') {
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
  }

  return d.toISOString().split('T')[0];
}

function initials(name) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function formatShortDate(date) {
  // date is in YYYY-MM-DD format, parse it locally without UTC conversion
  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '');
}

async function descargarPDF(nodeRef, nombreCliente) {
  const canvas = await html2canvas(nodeRef.current, { scale: 2, backgroundColor: '#F6F1E6' });
  const img = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
  pdf.addImage(img, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
  pdf.save(`solo-diario-${nombreCliente.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

function DayDots({ streak }) {
  return (
    <div className="flex gap-1">
      {streak.map((s, i) => (
        <span key={i} className={`sd-dot ${s === true ? 'sd-dot-paid' : s === false ? 'sd-dot-missed' : ''}`} />
      ))}
    </div>
  );
}

function StepProgress({ total, paid }) {
  const items = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="sd-steps">
      {items.map((n) => {
        const isPaid = n <= paid;
        const isCurrent = n === paid + 1;
        return (
          <div key={n} className={`sd-step ${isPaid ? 'paid' : isCurrent ? 'current' : ''}`}>{n}</div>
        );
      })}
    </div>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="sd-segmented">
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => onChange(opt)} className={`sd-seg-btn ${value === opt ? 'active' : ''}`}>{opt}</button>
      ))}
    </div>
  );
}

function formatThousands(digits) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function MoneyInput({ value, onChange, placeholder }) {
  const inputRef = useRef(null);
  const display = value === '' || value === undefined || value === null ? '' : formatThousands(String(value));
  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    onChange(digits === '' ? '' : Number(digits));
  };
  useEffect(() => {
    if (inputRef.current && inputRef.current.value) {
      const digits = inputRef.current.value.replace(/\D/g, '');
      if (digits && !value) onChange(Number(digits));
    }
  }, []);
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.88rem' }}>$</span>
      <input ref={inputRef} className="sd-input sd-mono" style={{ paddingLeft: '26px' }} inputMode="numeric" placeholder={placeholder} value={display} onChange={handleChange} onInput={handleChange} />
    </div>
  );
}

function MiniCalendar({ selected, onSelect }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const base = new Date();
  const today = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
  const viewDate = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const rawLabel = viewDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const monthWord = rawLabel.split(' ')[0];
  const monthLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
  const weekdays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="sd-card" style={{ padding: '14px' }}>
      <div className="flex items-center justify-between mb-3">
        <button className="sd-icon-btn" style={{ width: '28px', height: '28px' }} onClick={() => setMonthOffset((m) => m - 1)}><ChevronLeft size={14} /></button>
        <span className="sd-display" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CalendarIcon size={13} style={{ color: 'var(--muted)' }} /> {monthLabel}
        </span>
        <button className="sd-icon-btn" style={{ width: '28px', height: '28px' }} onClick={() => setMonthOffset((m) => m + 1)}><ChevronRight size={14} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdays.map((w, i) => (<div key={i} style={{ textAlign: 'center', fontSize: '0.6rem', color: 'var(--muted)' }}>{w}</div>))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const displayValue = `${d} ${monthWord}`;
          const isSelected = selected === isoDate;
          const isToday = isoDate === today;
          const dayStyle = isSelected
            ? { background: 'var(--amber)', color: '#15130F', fontWeight: 700 }
            : isToday
            ? { border: '2px solid var(--amber)', fontWeight: 600 }
            : {};
          return (
            <button key={i} onClick={() => onSelect(isoDate)} className="sd-day-cell" style={dayStyle}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone = 'amber', onClick }) {
  const bg = tone === 'red' ? 'rgba(242,102,90,0.14)' : 'rgba(245,179,1,0.1)';
  const color = tone === 'red' ? 'var(--red)' : 'var(--amber)';
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp type={onClick ? 'button' : undefined} onClick={onClick} className={`sd-card sd-stat ${onClick ? 'sd-stat-clickable' : ''}`}>
      <div className="sd-stat-icon" style={{ background: bg, color }}>{icon}</div>
      <div className="min-w-0">
        <div className="sd-mono sd-stat-value" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
        <div className="sd-stat-label">{label}</div>
      </div>
    </Comp>
  );
}

function ClientRow({ client, onClick, badgeStatus }) {
  return (
    <button onClick={onClick} className="sd-client-row">
      <div className="sd-avatar">{initials(client.nombre)}</div>
      <div className="sd-client-info">
        <div className="sd-client-name">{client.nombre}</div>
        <DayDots streak={client.streak || [null, null, null, null, null, null, null]} />
      </div>
      <div className="sd-client-right">
        <div className="sd-mono sd-client-amount">{fmt(client.valor_cuota)}</div>
        <span className={`sd-badge ${badgeStatus.cls}`}>{badgeStatus.text}</span>
      </div>
    </button>
  );
}

function LoginView({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      onLogin();
    }
  };

  return (
    <div className="sd-login-wrap">
      <div className="sd-login-card">
        <div className="flex flex-col items-center gap-3" style={{ marginBottom: '28px' }}>
          <div className="sd-logo-mark" style={{ width: '52px', height: '52px', fontSize: '1.4rem' }}>S</div>
          <div style={{ textAlign: 'center' }}>
            <div className="sd-display" style={{ fontSize: '1.25rem', fontWeight: 700 }}>Solo Diario</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '2px' }}>Gestión de préstamos y cobros</div>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <span className="sd-label">Email</span>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input className="sd-input" style={{ paddingLeft: '34px' }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
            </div>
          </div>
          <div>
            <span className="sd-label">Contraseña</span>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input className="sd-input" style={{ paddingLeft: '34px' }} type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          {error && <div style={{ fontSize: '0.75rem', color: 'var(--red)' }}>{error}</div>}
          <button className="sd-btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading} onClick={handleLogin}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.66rem', color: 'var(--muted)', marginTop: '22px' }}>Acceso exclusivo · un solo usuario</div>
      </div>
    </div>
  );
}

function Sidebar({ screen, goTo, onLogout }) {
  return (
    <div className="sd-sidebar hidden md:flex">
      <div className="sd-sidebar-logo">
        <div className="sd-logo-mark">S</div>
        <div className="sd-logo-word">Solo Diario</div>
      </div>
      <div className="flex flex-col gap-1">
        <button className={`sd-nav-link ${screen === 'dashboard' || screen === 'pago' ? 'active' : ''}`} onClick={() => goTo('dashboard')}><Home size={16} /> Inicio</button>
        <button className={`sd-nav-link ${screen === 'clientes' ? 'active' : ''}`} onClick={() => goTo('clientes')}><Users size={16} /> Clientes</button>
        <button className={`sd-nav-link ${screen === 'historial' ? 'active' : ''}`} onClick={() => goTo('historial')}><BarChart3 size={16} /> Historial</button>
        <button className={`sd-nav-link ${screen === 'agregar' || screen === 'nuevoCliente' || screen === 'nuevoPrestamo' || screen === 'nuevoPrestamoForm' ? 'active' : ''}`} onClick={() => goTo('agregar')}><Plus size={16} /> Agregar</button>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <button className="sd-nav-link" onClick={onLogout}><LogOut size={16} /> Cerrar sesión</button>
      </div>
    </div>
  );
}

function BottomNav({ screen, goTo, onLogout }) {
  return (
    <div className="sd-bottomnav md:hidden">
      <button className={`sd-bottomnav-btn ${screen === 'dashboard' || screen === 'pago' ? 'active' : ''}`} onClick={() => goTo('dashboard')}>
        <Home size={19} /> Inicio
      </button>
      <button className={`sd-bottomnav-btn ${screen === 'clientes' ? 'active' : ''}`} onClick={() => goTo('clientes')}>
        <Users size={19} /> Clientes
      </button>
      <button className="sd-bottomnav-btn" onClick={() => goTo('agregar')}>
        <div className="sd-fab"><Plus size={20} /></div>
      </button>
      <button className={`sd-bottomnav-btn ${screen === 'historial' ? 'active' : ''}`} onClick={() => goTo('historial')}>
        <BarChart3 size={19} /> Historial
      </button>
    </div>
  );
}

function TopBar({ screen, goBack, dateLabel }) {
  const titles = { dashboard: 'Solo Diario', agregar: 'Agregar', nuevoCliente: 'Nuevo cliente', nuevoPrestamo: 'Nuevo préstamo', nuevoPrestamoForm: 'Nuevo préstamo', pago: 'Cobro', historial: 'Historial Mensual', clientes: 'Planilla de Clientes' };
  return (
    <div className="sd-topbar">
      <div className="flex items-center gap-3">
        {screen !== 'dashboard' ? (
          <button className="sd-icon-btn" onClick={goBack}><ChevronLeft size={18} /></button>
        ) : (
          <div className="sd-logo-mark md:hidden" style={{ width: '30px', height: '30px', fontSize: '0.82rem' }}>S</div>
        )}
        <div>
          <div className="sd-display" style={{ fontSize: '0.92rem', fontWeight: 700 }}>{titles[screen] || 'Solo Diario'}</div>
          {screen === 'dashboard' && <div style={{ fontSize: '0.66rem', color: 'var(--muted)' }}>{dateLabel}</div>}
        </div>
      </div>
    </div>
  );
}

function PrestamosCliente({ client, prestamos, prestamoMap, cuotasPorCliente, onSelectPrestamo, onBack, onDeleteClient }) {
  if (!client) return null;
  const clientePrestamos = Object.values(prestamoMap || {}).filter((p) => p.cliente_id === client.id);

  return (
    <div className="max-w-md mx-auto px-4 py-6 md:py-10 flex flex-col gap-5 pb-10">
      <div className="flex items-center gap-3">
        <div className="sd-avatar" style={{ width: '52px', height: '52px', fontSize: '1rem' }}>{initials(client.nombre)}</div>
        <div>
          <div className="sd-display" style={{ fontSize: '1.05rem', fontWeight: 700 }}>{client.nombre}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
            <Phone size={12} /> {client.telefono}
          </div>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '0.74rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>Préstamos</h2>
        {clientePrestamos.length === 0 ? (
          <p style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>Sin préstamos activos</p>
        ) : (
          <div className="flex flex-col gap-2">
            {clientePrestamos.filter(p => (cuotasPorCliente[p.id] || []).length > 0).map((p) => {
              const cuotas = cuotasPorCliente[p.id] || [];
              const cuotasPagadas = cuotas.filter((c) => c.pagada).length;
              const progreso = cuotas.length > 0 ? Math.round((cuotasPagadas / cuotas.length) * 100) : 0;
              const nextCuota = cuotas.find((c) => !c.pagada);
              const cuotaPendiente = nextCuota ? nextCuota.monto : 0;

              return (
                <button
                  key={p.id}
                  onClick={() => onSelectPrestamo(p.id)}
                  style={{
                    padding: '14px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    background: 'var(--card-bg)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                  className="hover:bg-opacity-80"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{fmt(cuotaPendiente)}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{cuotasPagadas}/{cuotas.length} cuotas</div>
                  </div>
                  <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        background: progreso === 100 ? '#10b981' : '#f59e0b',
                        width: `${progreso}%`,
                        transition: 'width 0.3s'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '6px' }}>{progreso}% completado</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="sd-btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={onBack}>
          <ChevronLeft size={17} /> Volver
        </button>
        <button className="sd-btn-danger" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={onDeleteClient}>
          <Trash2 size={17} /> Eliminar
        </button>
      </div>
    </div>
  );
}

function Dashboard({ clients, dueToday, filtered, query, setQuery, openPago, openPagoFromPrestamo, goToClientePrestamos, goTo, stats, onOpenAtrasados }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-5 md:px-8 md:py-8 flex flex-col gap-6">
      <div>
        <h1 className="sd-display" style={{ fontSize: '1.25rem', fontWeight: 700 }}>Clientes de hoy</h1>
        {dueToday.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.84rem', marginTop: '8px' }}>No hay cobros programados para hoy.</p>
        ) : (
          <div className="flex flex-col gap-2 mt-3">
            {dueToday.map((c) => (
              <ClientRow key={c.prestamo_id} client={c} onClick={() => c.prestamo_id ? openPagoFromPrestamo(c.prestamo_id, c.id) : openPago(c.id)} badgeStatus={c.badgeStatus} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 style={{ fontSize: '0.74rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Estadísticas</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3 mt-3">
          <StatCard icon={<Wallet size={17} />} label="Prestado" value={fmt(stats.totalPrestado)} />
          <StatCard icon={<Users size={17} />} label="Clientes" value={stats.clientes} />
          <StatCard icon={<CheckCircle2 size={17} />} label="Pagos hoy" value={stats.pagosHoy} />
          <StatCard icon={<AlertTriangle size={17} />} label="Atrasados" value={stats.atrasados} tone="red" onClick={stats.atrasados > 0 ? onOpenAtrasados : undefined} />
          <StatCard icon={<Landmark size={17} />} label="Cartera pendiente" value={fmt(stats.carteraPendiente)} />
        </div>
      </div>

      <div>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input className="sd-input" style={{ paddingLeft: '36px' }} placeholder="Buscar cliente" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="sd-btn-primary" style={{ width: '100%', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => goTo('agregar')}>
          <Plus size={17} /> Agregar cliente
        </button>
      </div>

      <div>
        <h2 style={{ fontSize: '0.74rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>Todos los clientes</h2>
        <div className="flex flex-col gap-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => goToClientePrestamos(c.id)}
              style={{
                padding: '12px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--card-bg)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                fontSize: '0.9rem',
              }}
              className="hover:bg-opacity-80"
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanillaClientes({ clients, prestamos, cuotasPorCliente, onDeleteClient }) {
  // Calcular datos para cada cliente
  const datosClientes = clients.map((cliente) => {
    const clientePrestamos = Object.values(prestamos).filter((p) => p.cliente_id === cliente.id);

    let totalPrestado = 0;
    let totalGanancia = 0;

    clientePrestamos.forEach((prestamo) => {
      totalPrestado += prestamo.monto_prestado;
      // Ganancia = (cantidad_cuotas × valor_cuota) - monto_prestado
      const totalARecibir = prestamo.cantidad_cuotas * prestamo.valor_cuota;
      const gananciaPrestamo = totalARecibir - prestamo.monto_prestado;
      totalGanancia += gananciaPrestamo;
    });

    return {
      id: cliente.id,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      totalPrestado,
      totalGanancia,
    };
  });

  // Ordenar por nombre
  const clientesOrdenados = datosClientes.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-AR'));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 flex flex-col gap-5 pb-10">
      <div>
        <h1 className="sd-display" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Planilla de Clientes</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Resumen de prestado y ganancia por cliente</p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ fontSize: '0.9rem' }}>
          <div style={{ borderBottom: '2px solid var(--border)', background: 'var(--card-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', flex: 1, alignItems: 'center' }}>
              <div style={{ flex: 1, fontWeight: 700, color: 'var(--muted)' }}>Cliente</div>
              <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--muted)', minWidth: '100px' }}>Prestado</div>
              <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--muted)', minWidth: '100px' }}>Ganancia</div>
            </div>
            <div style={{ minWidth: '120px', textAlign: 'right', fontWeight: 700, color: 'var(--muted)' }}>Acción</div>
          </div>
          <div>
            {clientesOrdenados.map((cliente) => (
              <tr key={cliente.id} style={{ borderBottom: '1px solid var(--border)', background: cliente.totalPrestado > 0 ? 'var(--card-bg)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', flex: 1, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{cliente.nombre}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{cliente.telefono}</div>
                  </div>
                  <div style={{ textAlign: 'right', color: 'var(--amber)', fontWeight: 700, minWidth: '100px' }}>
                    {fmt(cliente.totalPrestado)}
                  </div>
                  <div style={{ textAlign: 'right', color: cliente.totalGanancia > 0 ? '#10b981' : 'var(--muted)', fontWeight: 700, minWidth: '100px' }}>
                    {fmt(Math.round(cliente.totalGanancia))}
                  </div>
                </div>
                <button
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    background: 'rgba(239,68,68,0.1)',
                    color: 'var(--red, #ef4444)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    marginLeft: '12px'
                  }}
                  onClick={() => onDeleteClient(cliente.id)}
                  title="Eliminar cliente"
                >
                  🗑 Eliminar
                </button>
              </tr>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '12px' }}>
        <div className="sd-card" style={{ padding: '14px' }}>
          <div className="sd-stat-label" style={{ marginBottom: '5px' }}>Total Clientes</div>
          <div className="sd-mono" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            {clientesOrdenados.length}
          </div>
        </div>
        <div className="sd-card" style={{ padding: '14px' }}>
          <div className="sd-stat-label" style={{ marginBottom: '5px' }}>Total Prestado</div>
          <div className="sd-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--amber)' }}>
            {fmt(clientesOrdenados.reduce((a, c) => a + c.totalPrestado, 0))}
          </div>
        </div>
        <div className="sd-card" style={{ padding: '14px' }}>
          <div className="sd-stat-label" style={{ marginBottom: '5px' }}>Total Ganancia</div>
          <div className="sd-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>
            {fmt(Math.round(clientesOrdenados.reduce((a, c) => a + c.totalGanancia, 0)))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HistorialMensual({ prestamos, cuotasPorCliente }) {
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // Calcular datos por mes
  const datosPorMes = {};
  const now = new Date();

  // Inicializar últimos 12 meses
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    datosPorMes[key] = { prestado: 0, ganancia: 0, mes: monthNames[d.getMonth()], año: d.getFullYear() };
  }

  // Procesar préstamos (prestado)
  Object.values(prestamos).forEach((p) => {
    const [year, month] = p.fecha_inicio.split('-');
    const key = `${year}-${month}`;
    if (datosPorMes[key]) {
      datosPorMes[key].prestado += p.monto_prestado;
    }
  });

  // Procesar cuotas pagadas (ganancia)
  Object.values(cuotasPorCliente).forEach((cuotas) => {
    cuotas.forEach((c) => {
      if (c.pagada && c.fecha_pago) {
        const [year, month] = c.fecha_pago.split('-');
        const key = `${year}-${month}`;
        if (datosPorMes[key]) {
          // Ganancia = valor de cuota - parte proporcional del monto prestado
          const prestamo = Object.values(prestamos).find((p) => p.id === c.prestamo_id);
          if (prestamo) {
            const gananciaPorCuota = c.monto - (prestamo.monto_prestado / prestamo.cantidad_cuotas);
            datosPorMes[key].ganancia += gananciaPorCuota;
          }
        }
      }
    });
  });

  const mesesOrdenados = Object.keys(datosPorMes).sort().reverse();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 flex flex-col gap-5 pb-10">
      <div>
        <h1 className="sd-display" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Historial Mensual</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Resumen de prestado y ganancia por mes</p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--card-bg)' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)' }}>Mes</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--muted)' }}>Prestado</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--muted)' }}>Ganancia</th>
            </tr>
          </thead>
          <tbody>
            {mesesOrdenados.map((key, idx) => {
              const dato = datosPorMes[key];
              const hasDatos = dato.prestado > 0 || dato.ganancia > 0;
              return (
                <tr key={key} style={{ borderBottom: '1px solid var(--border)', background: hasDatos ? 'var(--card-bg)' : 'transparent' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{dato.mes} {dato.año}</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: 'var(--amber)' }}>
                    <span style={{ fontWeight: 700 }}>{fmt(dato.prestado)}</span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: dato.ganancia > 0 ? '#10b981' : 'var(--muted)' }}>
                    <span style={{ fontWeight: 700 }}>{fmt(Math.round(dato.ganancia))}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '12px' }}>
        <div className="sd-card" style={{ padding: '14px' }}>
          <div className="sd-stat-label" style={{ marginBottom: '5px' }}>Total Prestado (12 meses)</div>
          <div className="sd-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--amber)' }}>
            {fmt(mesesOrdenados.reduce((a, k) => a + datosPorMes[k].prestado, 0))}
          </div>
        </div>
        <div className="sd-card" style={{ padding: '14px' }}>
          <div className="sd-stat-label" style={{ marginBottom: '5px' }}>Total Ganancia (12 meses)</div>
          <div className="sd-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>
            {fmt(Math.round(mesesOrdenados.reduce((a, k) => a + datosPorMes[k].ganancia, 0)))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Agregar({ goTo }) {
  return (
    <div className="max-w-md mx-auto px-4 py-6 md:py-10 flex flex-col gap-3">
      <h1 className="sd-display" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '4px' }}>Agregar</h1>
      <button className="sd-option-card" onClick={() => goTo('nuevoCliente')}>
        <div className="sd-stat-icon" style={{ width: '44px', height: '44px' }}><UserPlus size={20} /></div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Nuevo cliente</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Cargar datos y primer préstamo</div>
        </div>
      </button>
      <button className="sd-option-card" onClick={() => goTo('nuevoPrestamo')}>
        <div className="sd-stat-icon" style={{ width: '44px', height: '44px' }}><Banknote size={20} /></div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Nuevo préstamo</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Para un cliente que ya existe</div>
        </div>
      </button>
    </div>
  );
}

function NuevoClienteForm({ onSave, onCancel, showError }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [monto, setMonto] = useState(0);
  const [cuotas, setCuotas] = useState('');
  const [frecuencia, setFrecuencia] = useState('Semana');
  const [fecha, setFecha] = useState('');
  const [cuotaMonto, setCuotaMonto] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Number(monto) > 0 && Number(cuotas) > 0) {
      setCuotaMonto(Math.round(Number(monto) / Number(cuotas)));
    }
  }, [monto, cuotas]);

  const canSave = nombre.trim() && telefono.trim() && Number(monto) > 0 && Number(cuotas) > 0 && Number(cuotaMonto) > 0 && fecha;

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: cliente, error: clienteErr } = await supabase
        .from('clientes')
        .insert([{ nombre, telefono }])
        .select()
        .single();

      if (clienteErr) throw clienteErr;

      const fechaInicio = fecha;
      const { data: prestamo, error: prestamoErr } = await supabase
        .from('prestamos')
        .insert([{
          cliente_id: cliente.id,
          monto_prestado: Number(monto),
          cantidad_cuotas: Number(cuotas),
          valor_cuota: Number(cuotaMonto),
          frecuencia,
          fecha_inicio: fechaInicio,
        }])
        .select()
        .single();

      if (prestamoErr) throw prestamoErr;

      const cuotasData = [];
      let fechaActual = fechaInicio;
      for (let i = 1; i <= Number(cuotas); i++) {
        cuotasData.push({
          prestamo_id: prestamo.id,
          numero: i,
          fecha_vencimiento: fechaActual,
          monto: Number(cuotaMonto),
          pagada: false,
        });
        fechaActual = calcularSiguienteFecha(fechaActual, frecuencia);
      }

      const { error: cuotasErr } = await supabase
        .from('cuotas')
        .insert(cuotasData);

      if (cuotasErr) throw cuotasErr;

      onSave();
    } catch (err) {
      if (showError) showError('Error al cargar cliente: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 md:py-10 flex flex-col gap-4 pb-10">
      <h1 className="sd-display" style={{ fontSize: '1.15rem', fontWeight: 700 }}>Nuevo cliente</h1>

      <div>
        <span className="sd-label">Nombre</span>
        <input className="sd-input" placeholder="Nombre y apellido" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div>
        <span className="sd-label">Teléfono</span>
        <input className="sd-input" placeholder="351 555 0000" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
      </div>
      <div>
        <span className="sd-label">Cantidad prestada</span>
        <MoneyInput value={monto} onChange={setMonto} placeholder="0" />
      </div>
      <div>
        <span className="sd-label">Cuotas</span>
        <input className="sd-input" type="number" placeholder="Cantidad de cuotas" value={cuotas} onChange={(e) => setCuotas(e.target.value)} />
      </div>
      <div>
        <span className="sd-label">Frecuencia de pago</span>
        <Segmented options={['Día', 'Semana', 'Quincena', 'Mensual']} value={frecuencia} onChange={setFrecuencia} />
      </div>
      <div>
        <span className="sd-label">Fecha de inicio</span>
        <MiniCalendar selected={fecha} onSelect={setFecha} />
      </div>
      <div>
        <span className="sd-label">Cantidad por cuota</span>
        <MoneyInput value={cuotaMonto} onChange={setCuotaMonto} placeholder="0" />
        {Number(monto) > 0 && Number(cuotas) > 0 && (
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '6px' }}>
            Sin interés sería {fmt(Math.round(Number(monto) / Number(cuotas)))} — cargá el valor real con interés
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-2">
        <button className="sd-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={loading}>Cancelar</button>
        <button className="sd-btn-primary" style={{ flex: 2 }} disabled={!canSave || loading} onClick={handleSave}>{loading ? 'Guardando...' : 'Guardar cliente'}</button>
      </div>
    </div>
  );
}

function NuevoPrestamoPicker({ clients, onPick }) {
  const [q, setQ] = useState('');
  const filtered = clients.filter((c) => c.nombre.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="max-w-md mx-auto px-4 py-6 md:py-10 flex flex-col gap-3">
      <h1 className="sd-display" style={{ fontSize: '1.15rem', fontWeight: 700 }}>Nuevo préstamo</h1>
      <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Elegí el cliente para cargar el préstamo</p>
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
        <input className="sd-input" style={{ paddingLeft: '36px' }} placeholder="Buscar cliente" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2 mt-1">
        {filtered.map((c) => (
          <button key={c.id} className="sd-client-row" onClick={() => onPick(c.id)}>
            <div className="sd-avatar">{initials(c.nombre)}</div>
            <div className="sd-client-info">
              <div className="sd-client-name">{c.nombre}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{c.phone_or_cuotas}</div>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--muted)' }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function NuevoPrestamoForm({ client, onSave, onCancel }) {
  const [monto, setMonto] = useState(0);
  const [cuotas, setCuotas] = useState('');
  const [frecuencia, setFrecuencia] = useState('Semana');
  const [fecha, setFecha] = useState('');
  const [cuotaMonto, setCuotaMonto] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Number(monto) > 0 && Number(cuotas) > 0) {
      setCuotaMonto(Math.round(Number(monto) / Number(cuotas)));
    }
  }, [monto, cuotas]);

  const canSave = Number(monto) > 0 && Number(cuotas) > 0 && Number(cuotaMonto) > 0 && fecha;

  const handleSave = async () => {
    setLoading(true);
    try {
      const fechaInicio = fecha;
      const { data: prestamo, error: prestamoErr } = await supabase
        .from('prestamos')
        .insert([{
          cliente_id: client.id,
          monto_prestado: Number(monto),
          cantidad_cuotas: Number(cuotas),
          valor_cuota: Number(cuotaMonto),
          frecuencia,
          fecha_inicio: fechaInicio,
        }])
        .select()
        .single();

      if (prestamoErr) throw prestamoErr;

      const cuotasData = [];
      let fechaActual = fechaInicio;
      for (let i = 1; i <= Number(cuotas); i++) {
        cuotasData.push({
          prestamo_id: prestamo.id,
          numero: i,
          fecha_vencimiento: fechaActual,
          monto: Number(cuotaMonto),
          pagada: false,
        });
        fechaActual = calcularSiguienteFecha(fechaActual, frecuencia);
      }

      const { error: cuotasErr } = await supabase
        .from('cuotas')
        .insert(cuotasData);

      if (cuotasErr) throw cuotasErr;

      onSave();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 md:py-10 flex flex-col gap-4 pb-10">
      <h1 className="sd-display" style={{ fontSize: '1.15rem', fontWeight: 700 }}>Nuevo préstamo</h1>
      <div className="sd-card" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="sd-avatar">{initials(client.nombre)}</div>
        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{client.nombre}</div>
      </div>
      <div>
        <span className="sd-label">Cantidad prestada</span>
        <MoneyInput value={monto} onChange={setMonto} placeholder="0" />
      </div>
      <div>
        <span className="sd-label">Cuotas</span>
        <input className="sd-input" type="number" placeholder="Cantidad de cuotas" value={cuotas} onChange={(e) => setCuotas(e.target.value)} />
      </div>
      <div>
        <span className="sd-label">Frecuencia de pago</span>
        <Segmented options={['Día', 'Semana', 'Quincena', 'Mensual']} value={frecuencia} onChange={setFrecuencia} />
      </div>
      <div>
        <span className="sd-label">Fecha de inicio</span>
        <MiniCalendar selected={fecha} onSelect={setFecha} />
      </div>
      <div>
        <span className="sd-label">Cantidad por cuota</span>
        <MoneyInput value={cuotaMonto} onChange={setCuotaMonto} placeholder="0" />
        {Number(monto) > 0 && Number(cuotas) > 0 && (
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '6px' }}>
            Sin interés sería {fmt(Math.round(Number(monto) / Number(cuotas)))} — cargá el valor real con interés
          </div>
        )}
      </div>
      <div className="flex gap-3 mt-2">
        <button className="sd-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={loading}>Cancelar</button>
        <button className="sd-btn-primary" style={{ flex: 2 }} disabled={!canSave || loading} onClick={handleSave}>{loading ? 'Guardando...' : 'Guardar préstamo'}</button>
      </div>
    </div>
  );
}

function PagoScreen({ client, cuotas, onConfirm, onDownload, onDelete, onModify, onUndoPayment, loading, prestamo }) {
  if (!client) return null;
  const historial = cuotas.filter((c) => c.pagada).sort((a, b) => a.numero - b.numero);
  const sectionLabel = { fontSize: '0.74rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' };
  const completed = cuotas.length > 0 && cuotas.every((c) => c.pagada);
  const cuotasPagadas = cuotas.filter((c) => c.pagada).length;
  const nextCuota = cuotas.find((c) => !c.pagada);
  const cuotaMonto = nextCuota ? nextCuota.monto : 0;
  console.log('PagoScreen rendered', {
    total: cuotas.length,
    pagadas: cuotasPagadas,
    cuotaDetalles: cuotas.map(c => ({ id: c.id, numero: c.numero, pagada: c.pagada, fecha_pago: c.fecha_pago }))
  });

  return (
    <div className="max-w-md mx-auto px-4 py-6 md:py-10 flex flex-col gap-5 pb-10">
      <div className="flex items-center gap-3">
        <div className="sd-avatar" style={{ width: '52px', height: '52px', fontSize: '1rem' }}>{initials(client.nombre)}</div>
        <div>
          <div className="sd-display" style={{ fontSize: '1.05rem', fontWeight: 700 }}>{client.nombre}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
            <Phone size={12} /> {client.telefono}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="sd-card" style={{ padding: '14px' }}>
          <div className="sd-stat-label" style={{ marginBottom: '5px' }}>Cuota pendiente</div>
          <div className="sd-mono" style={{ fontSize: '1.05rem', fontWeight: 700 }}>{fmt(cuotaMonto)}</div>
        </div>
        <div className="sd-card" style={{ padding: '14px' }}>
          <div className="sd-stat-label" style={{ marginBottom: '5px' }}>Cuotas</div>
          <div className="sd-mono" style={{ fontSize: '1.05rem', fontWeight: 700 }}>{cuotas.length} totales</div>
        </div>
      </div>

      <div>
        <h2 style={sectionLabel}>Progreso del préstamo</h2>
        <StepProgress total={cuotas.length} paid={cuotasPagadas} />
      </div>

      <div>
        <h2 style={sectionLabel}>Historial de pagos</h2>
        {historial.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Todavía no hay pagos registrados.</p>
        ) : (
          <div className="sd-card" style={{ padding: '4px 14px' }}>
            {historial.map((c) => (
              <div key={c.id} className="sd-hist-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light, rgba(0,0,0,0.05))' }}>
                <div style={{ display: 'flex', gap: '12px', flex: 1, alignItems: 'center' }}>
                  <span className="sd-mono sd-hist-date">{formatShortDate(c.fecha_pago)}</span>
                  <span className="sd-hist-label">Cuota {c.numero}</span>
                  <span className="sd-mono sd-hist-amount">{fmt(c.monto)}</span>
                </div>
                <button
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    background: 'rgba(239,68,68,0.1)',
                    color: 'var(--red, #ef4444)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={() => onUndoPayment(c.id)}
                  disabled={loading}
                  title="Deshacer este pago"
                >
                  ↶ Deshacer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {completed ? (
        <div className="sd-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={22} style={{ color: 'var(--green)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--green)' }}>Préstamo completado</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>Ya pagó las {cuotas.length} cuotas</div>
          </div>
        </div>
      ) : (
        <button className="sd-btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={loading} onClick={() => {
          console.log('=== CLICK REGISTRAR PAGO ===');
          console.log('onConfirm type:', typeof onConfirm);
          console.log('loading:', loading);
          console.log('cuotas:', cuotas.length);
          onConfirm();
        }}>
          <CheckCircle size={18} /> {loading ? 'Registrando...' : 'Registrar pago'}
        </button>
      )}

      <button className="sd-btn-outline" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={onDownload}>
        <FileText size={17} /> Exportar PDF
      </button>

      <button
        className="sd-btn-primary"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: 'rgba(245,158,11,0.2)',
          color: 'var(--amber)',
          border: '1px solid var(--amber)'
        }}
        onClick={onModify}
      >
        <FileText size={17} /> Modificar préstamo
      </button>
      {cuotasPagadas > 0 && (
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textAlign: 'center', background: 'rgba(245,179,1,0.05)', padding: '8px', borderRadius: '6px' }}>
          ℹ️ Los {cuotasPagadas} pago(s) registrado(s) se conservarán. Solo se ajustarán los pagos pendientes.
        </div>
      )}

      <button className="sd-btn-danger" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={loading} onClick={onDelete}>
        <Trash2 size={17} /> {loading ? 'Eliminando...' : 'Eliminar préstamo'}
      </button>
    </div>
  );
}

function PdfPreviewModal({ client, prestamo, cuotas, onClose, onDownload, pdfSheetRef }) {
  if (!client) return null;
  const totalPagado = cuotas.filter((c) => c.pagada).reduce((a, c) => a + c.monto, 0);
  const saldo = cuotas.filter((c) => !c.pagada).reduce((a, c) => a + c.monto, 0);
  const cuotasPagadas = cuotas.filter((c) => c.pagada).length;
  const cuotasPendientes = cuotas.filter((c) => !c.pagada).length;
  const montoPrestado = prestamo ? prestamo.monto_prestado : client.monto_prestado;

  const today = new Date();
  const dateStr = today.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="sd-modal-overlay" onClick={onClose}>
      <div className="sd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sd-modal-header">
          <div className="flex items-center gap-2">
            <FileText size={16} style={{ color: 'var(--amber-soft)' }} />
            <span className="sd-display" style={{ fontSize: '0.85rem', fontWeight: 700 }}>Vista previa</span>
          </div>
          <button className="sd-icon-btn" style={{ width: '30px', height: '30px' }} onClick={onClose}><X size={15} /></button>
        </div>
        <div className="sd-modal-body">
          <div className="sd-pdf-sheet" ref={pdfSheetRef}>
            <div className="sd-display" style={{ fontSize: '1.05rem', fontWeight: 800 }}>Solo Diario</div>
            <div style={{ fontSize: '0.72rem', color: '#6B6458', marginTop: '1px' }}>Resumen de préstamo</div>
            <div style={{ fontSize: '0.68rem', color: '#8a7d5f', marginBottom: '14px' }}>Generado el {dateStr}</div>

            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{client.nombre}</div>
            <div style={{ fontSize: '0.7rem', color: '#6B6458', marginBottom: '12px' }}>{client.telefono} · Préstamo #{String(client.id).slice(-4).padStart(4, '0')}</div>

            <div className="sd-pdf-amount-box">
              <div className="sd-pdf-section-label" style={{ marginBottom: '2px' }}>Monto prestado</div>
              <div className="sd-mono" style={{ fontWeight: 700, fontSize: '1rem' }}>{fmt(montoPrestado)}</div>
            </div>

            <div className="sd-pdf-table-head">
              <span>Fecha</span><span>Cuota</span><span>Monto</span><span style={{ textAlign: 'right' }}>Estado</span>
            </div>
            {cuotas.sort((a, b) => a.numero - b.numero).map((r) => {
              const isOverdue = !r.pagada && new Date(r.fecha_vencimiento) < new Date();
              const statusColor = r.pagada ? '#2F8F5B' : isOverdue ? '#dc2626' : '#8A8071';
              const statusText = r.pagada ? 'Pagado' : isOverdue ? 'Atrasado' : 'Pendiente';
              return (
                <div key={r.id} className="sd-pdf-table-row">
                  <span style={{ color: '#6B6458' }}>{formatShortDate(r.fecha_vencimiento)}</span>
                  <span>Cuota {r.numero}</span>
                  <span>{fmt(r.monto)}</span>
                  <span style={{ textAlign: 'right', fontWeight: 600, color: statusColor }}>{statusText}</span>
                </div>
              );
            })}

            <div className="sd-pdf-summary">
              <div className="sd-pdf-summary-box" style={{ background: 'rgba(92,214,139,0.22)' }}>
                <div className="sd-pdf-summary-label" style={{ color: '#1f7a4c' }}>Cuotas</div>
                <div className="sd-pdf-summary-value" style={{ color: '#1f7a4c' }}>{cuotasPagadas}/{cuotas.length}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="sd-modal-actions">
          <button className="sd-btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={onDownload}>
            <Download size={17} /> Descargar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function OverdueModal({ clients, onClose, onSelect }) {
  return (
    <div className="sd-modal-overlay" onClick={onClose}>
      <div className="sd-modal" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
        <div className="sd-modal-header">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} style={{ color: 'var(--red)' }} />
            <span className="sd-display" style={{ fontSize: '0.85rem', fontWeight: 700 }}>Clientes atrasados</span>
          </div>
          <button className="sd-icon-btn" style={{ width: '30px', height: '30px' }} onClick={onClose}><X size={15} /></button>
        </div>
        <div className="sd-modal-body">
          <div className="flex flex-col gap-2">
            {clients.map((c) => (
              <ClientRow key={c.id} client={c} onClick={() => onSelect(c.id)} badgeStatus={c.badgeStatus} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditarPrestamoModal({ prestamo, client, cuotas, onCancel, onConfirm, loading }) {
  if (!prestamo || !client) return null;
  const [monto, setMonto] = useState(prestamo.monto_prestado);
  const [cantidadCuotas, setCantidadCuotas] = useState(prestamo.cantidad_cuotas);
  const [frecuencia, setFrecuencia] = useState(prestamo.frecuencia);
  const [valorCuota, setValorCuota] = useState(prestamo.valor_cuota);
  const [fechaInicio, setFechaInicio] = useState(prestamo.fecha_inicio);
  const [autoCalcular, setAutoCalcular] = useState(false);

  const montoSinInteres = Math.round(Number(monto) / Number(cantidadCuotas));

  const hasChanges = monto !== prestamo.monto_prestado ||
                     cantidadCuotas !== prestamo.cantidad_cuotas ||
                     frecuencia !== prestamo.frecuencia ||
                     valorCuota !== prestamo.valor_cuota ||
                     fechaInicio !== prestamo.fecha_inicio;

  return (
    <div className="sd-modal-overlay" onClick={onCancel}>
      <div className="sd-modal" style={{ maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="sd-modal-header">
          <div className="flex items-center gap-2">
            <FileText size={16} style={{ color: 'var(--amber)' }} />
            <span className="sd-display" style={{ fontSize: '0.85rem', fontWeight: 700 }}>Modificar préstamo</span>
          </div>
          <button className="sd-icon-btn" style={{ width: '30px', height: '30px' }} onClick={onCancel}><X size={15} /></button>
        </div>
        <div className="sd-modal-body">
          <div className="flex items-center gap-3" style={{ marginBottom: '14px' }}>
            <div className="sd-avatar">{initials(client.nombre)}</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{client.nombre}</div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <span className="sd-label">Monto del préstamo</span>
            <MoneyInput value={monto} onChange={setMonto} placeholder="0" />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <span className="sd-label">Cantidad de cuotas</span>
            <input className="sd-input" type="number" placeholder="Cantidad de cuotas" value={cantidadCuotas} onChange={(e) => setCantidadCuotas(Number(e.target.value))} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <span className="sd-label">Frecuencia de pago</span>
            <Segmented options={['Día', 'Semana', 'Quincena', 'Mensual']} value={frecuencia} onChange={setFrecuencia} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <span className="sd-label">Monto por cuota</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <MoneyInput value={valorCuota} onChange={setValorCuota} placeholder="0" />
              <button
                className="sd-btn-outline"
                style={{ padding: '8px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                onClick={() => {
                  setAutoCalcular(!autoCalcular);
                  if (!autoCalcular) {
                    setValorCuota(montoSinInteres);
                  }
                }}
              >
                {autoCalcular ? '🔒' : '📐'}
              </button>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
              {Number(monto) > 0 && Number(cantidadCuotas) > 0 && (
                <>
                  <div>Sin interés: {fmt(montoSinInteres)} por cuota</div>
                  <div>Con interés: {fmt(valorCuota)} por cuota (diferencia: {fmt(valorCuota - montoSinInteres)})</div>
                  <div>Total con interés: {fmt(Number(valorCuota) * Number(cantidadCuotas))}</div>
                </>
              )}
            </div>
          </div>

          <div>
            <span className="sd-label">Fecha de inicio del pago</span>
            <MiniCalendar selected={fechaInicio} onSelect={setFechaInicio} />
          </div>
        </div>
        <div className="sd-modal-actions">
          <button className="sd-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={loading}>Cancelar</button>
          <button
            className="sd-btn-primary"
            style={{ flex: 1 }}
            disabled={!hasChanges || loading || Number(monto) <= 0 || Number(cantidadCuotas) <= 0 || Number(valorCuota) <= 0}
            onClick={() => onConfirm({ monto, cantidadCuotas, frecuencia, valorCuota, fechaInicio })}
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

function UndoPaymentModal({ client, cuota, onCancel, onConfirm, loading }) {
  if (!client || !cuota) return null;
  return (
    <div className="sd-modal-overlay" onClick={onCancel}>
      <div className="sd-modal" style={{ maxWidth: '360px' }} onClick={(e) => e.stopPropagation()}>
        <div className="sd-modal-header">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} style={{ color: 'var(--amber)' }} />
            <span className="sd-display" style={{ fontSize: '0.85rem', fontWeight: 700 }}>Deshacer pago</span>
          </div>
          <button className="sd-icon-btn" style={{ width: '30px', height: '30px' }} onClick={onCancel}><X size={15} /></button>
        </div>
        <div className="sd-modal-body">
          <div className="flex items-center gap-3" style={{ marginBottom: '14px' }}>
            <div className="sd-avatar">{initials(client.nombre)}</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{client.nombre}</div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '12px' }}>
            ¿Deshacer el pago de la cuota {cuota.numero}?
          </p>
          <div style={{ background: 'rgba(245,179,1,0.1)', padding: '10px 12px', borderRadius: '6px', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '4px' }}>Importe: {fmt(cuota.monto)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Fecha de pago: {formatShortDate(cuota.fecha_pago)}</div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            La cuota volverá a aparecer como pendiente.
          </p>
        </div>
        <div className="sd-modal-actions">
          <button className="sd-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={loading}>Cancelar</button>
          <button className="sd-btn-primary" style={{ flex: 1, background: 'rgba(245,179,1,0.2)', color: 'var(--amber)', border: '1px solid var(--amber)' }} disabled={loading} onClick={onConfirm}>{loading ? 'Deshaciendo...' : 'Deshacer pago'}</button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ client, onCancel, onConfirm, loading }) {
  if (!client) return null;
  return (
    <div className="sd-modal-overlay" onClick={onCancel}>
      <div className="sd-modal" style={{ maxWidth: '360px' }} onClick={(e) => e.stopPropagation()}>
        <div className="sd-modal-header">
          <div className="flex items-center gap-2">
            <Trash2 size={16} style={{ color: 'var(--red)' }} />
            <span className="sd-display" style={{ fontSize: '0.85rem', fontWeight: 700 }}>Eliminar cliente</span>
          </div>
          <button className="sd-icon-btn" style={{ width: '30px', height: '30px' }} onClick={onCancel}><X size={15} /></button>
        </div>
        <div className="sd-modal-body">
          <div className="flex items-center gap-3" style={{ marginBottom: '14px' }}>
            <div className="sd-avatar">{initials(client.nombre)}</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{client.nombre}</div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
            Ya pagó todas las cuotas de su préstamo. Al eliminarlo vas a borrar su historial de pagos de Solo Diario. Esta acción no se puede deshacer.
          </p>
        </div>
        <div className="sd-modal-actions">
          <button className="sd-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={loading}>Cancelar</button>
          <button className="sd-btn-danger-solid" style={{ flex: 1 }} disabled={loading} onClick={onConfirm}>{loading ? 'Eliminando...' : 'Eliminar'}</button>
        </div>
      </div>
    </div>
  );
}

export default function SoloDiarioApp() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [screen, setScreen] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPrestamoId, setSelectedPrestamoId] = useState(null);
  const [prestamoTargetId, setPrestamoTargetId] = useState(null);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const [pdfPreviewId, setPdfPreviewId] = useState(null);
  const [showAtrasados, setShowAtrasados] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [editingPrestamoId, setEditingPrestamoId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [undoPaymentId, setUndoPaymentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cuotasPorCliente, setCuotasPorCliente] = useState({});
  const [prestamoMap, setPrestamoMap] = useState({});
  const [prestamos, setPrestamos] = useState([]);
  const pdfSheetRef = useRef(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setLoggedIn(true);
        loadData();
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, user) => {
      if (user) {
        setLoggedIn(true);
        loadData();
      } else {
        setLoggedIn(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const loadData = async () => {
    try {
      const { data: clientesData, error: clientesErr } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientesErr) throw clientesErr;

      const { data: prestamosData, error: prestamosErr } = await supabase
        .from('prestamos')
        .select('*');

      if (prestamosErr) throw prestamosErr;

      const { data: cuotasData, error: cuotasErr } = await supabase
        .from('cuotas')
        .select('*');

      if (cuotasErr) throw cuotasErr;

      const grouped = {};
      const prestamoMap = {};
      (prestamosData || []).forEach((p) => { prestamoMap[p.id] = p; });
      (cuotasData || []).forEach((c) => {
        if (!grouped[c.prestamo_id]) grouped[c.prestamo_id] = [];
        grouped[c.prestamo_id].push(c);
      });

      const enrichedClients = (clientesData || []).map((c) => {
        const prestamoIds = Object.keys(prestamoMap).filter((pid) => prestamoMap[pid].cliente_id === c.id);
        const monto = prestamoIds.length > 0 ? prestamoMap[prestamoIds[0]].monto_prestado : 0;
        const valor_cuota = prestamoIds.length > 0 ? prestamoMap[prestamoIds[0]].valor_cuota : 0;
        return { ...c, monto_prestado: monto, valor_cuota };
      });

      setClients(enrichedClients);
      setPrestamoMap(prestamoMap);
      setCuotasPorCliente(grouped);
      setPrestamos(prestamosData || []);
    } catch (err) {
      alert('Error al cargar datos: ' + err.message);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setLoggedIn(false);
    setScreen('dashboard');
  };

  const goTo = (s) => setScreen(s);
  const goBack = () => setScreen(backTargets[screen] || 'dashboard');
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  };

  const openPago = (id) => { setSelectedId(id); setSelectedPrestamoId(null); goTo('clientesPrestamos'); };
  const openPagoFromPrestamo = (prestamoId, clienteId) => { setSelectedId(clienteId); setSelectedPrestamoId(prestamoId); goTo('pago'); };
  const goToClientePrestamos = (id) => { setSelectedId(id); goTo('clientesPrestamos'); };

  const getToday = () => {
    const now = new Date();
    return now.getFullYear() + '-' +
           String(now.getMonth() + 1).padStart(2, '0') + '-' +
           String(now.getDate()).padStart(2, '0');
  };

  const confirmPago = async (clientId, prestamoId) => {
    setLoading(true);
    try {
      const cuotas = (cuotasPorCliente[prestamoId] || []).sort((a, b) => a.numero - b.numero);
      const unpaidCuota = cuotas.find((c) => !c.pagada);

      if (unpaidCuota) {
        const today = getToday();
        const { error } = await supabase
          .from('cuotas')
          .update({ pagada: true, fecha_pago: today })
          .eq('id', unpaidCuota.id);

        if (error) throw error;

        await loadData();

        // Verificar si todas las cuotas están pagadas
        const allCuotasAhora = cuotas.map((c) => c.id === unpaidCuota.id ? { ...c, pagada: true } : c);
        const todasPagadas = allCuotasAhora.every((c) => c.pagada);

        if (todasPagadas) {
          // Eliminar el préstamo
          const { error: deleteError } = await supabase
            .from('prestamos')
            .delete()
            .eq('id', prestamoId);

          if (deleteError) throw deleteError;
          await loadData();
          showToast('Préstamo completado y eliminado ✓');
        } else {
          showToast('Pago registrado ✓');
        }
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (clientId) => {
    setLoading(true);
    try {
      console.log('=== DELETING CLIENT ===', clientId);

      // First delete all cuotas for all prestamos of this client
      const clientPrestamos = Object.values(prestamoMap).filter((p) => p.cliente_id === clientId);
      console.log('Found prestamos for client:', clientPrestamos.length, clientPrestamos);

      for (const prestamo of clientPrestamos) {
        console.log('Deleting cuotas for prestamo:', prestamo.id);
        const { error: cuotasError, data } = await supabase
          .from('cuotas')
          .delete()
          .eq('prestamo_id', prestamo.id);
        if (cuotasError) {
          console.log('Error deleting cuotas:', cuotasError);
          throw cuotasError;
        }
        console.log('Cuotas deleted successfully');
      }

      // Then delete all prestamos
      for (const prestamo of clientPrestamos) {
        console.log('Deleting prestamo:', prestamo.id);
        const { error: prestamoError } = await supabase
          .from('prestamos')
          .delete()
          .eq('id', prestamo.id);
        if (prestamoError) {
          console.log('Error deleting prestamo:', prestamoError);
          throw prestamoError;
        }
        console.log('Prestamo deleted successfully');
      }

      // Finally delete the client
      console.log('Deleting client:', clientId);
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clientId);

      if (error) {
        console.log('Error deleting client:', error);
        throw error;
      }
      console.log('Client deleted successfully');

      showToast('Cliente eliminado ✓');
      setDeleteTargetId(null);
      setLoading(false);

      // Force hard reload after delete to ensure fresh data
      setTimeout(() => {
        console.log('Reloading page...');
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('DELETE CLIENT ERROR:', err);
      alert('Error: ' + err.message);
      setLoading(false);
    }
  };

  const deletePrestamo = async (prestamoId) => {
    console.log('=== DELETE PRESTAMO CALLED ===', prestamoId);
    setLoading(true);
    try {
      if (!prestamoId) {
        throw new Error('No prestamo ID provided');
      }

      // First delete all cuotas for this prestamo
      console.log('Step 1: Deleting cuotas for prestamo', prestamoId);
      const { error: cuotasError } = await supabase
        .from('cuotas')
        .delete()
        .eq('prestamo_id', prestamoId);

      if (cuotasError) {
        console.log('Error deleting cuotas:', cuotasError);
        throw cuotasError;
      }
      console.log('Step 1 complete: Cuotas deleted');

      // Then delete the prestamo
      console.log('Step 2: Deleting prestamo', prestamoId);
      const { error: prestamoError } = await supabase
        .from('prestamos')
        .delete()
        .eq('id', prestamoId);

      if (prestamoError) {
        console.log('Error deleting prestamo:', prestamoError);
        throw prestamoError;
      }
      console.log('Step 2 complete: Prestamo deleted');

      console.log('Delete successful, reloading data');
      await loadData();
      setDeleteTargetId(null);
      showToast('Préstamo eliminado ✓');

      // Small delay to ensure state updates
      setTimeout(() => {
        setLoading(false);
        goTo('clientesPrestamos');
      }, 300);
    } catch (err) {
      console.log('Caught error:', err);
      alert('Error: ' + err.message);
      setLoading(false);
    }
  };

  const modificarPrestamo = async (prestamoId, cambios) => {
    setLoading(true);
    try {
      const prestamo = prestamoMap[prestamoId];
      if (!prestamo) throw new Error('Préstamo no encontrado');

      // Get all current cuotas for this prestamo
      const { data: cuotasActuales, error: cuotasError } = await supabase
        .from('cuotas')
        .select('*')
        .eq('prestamo_id', prestamoId)
        .order('numero', { ascending: true });

      if (cuotasError) throw cuotasError;

      // Update the prestamo record
      const { error: updateError } = await supabase
        .from('prestamos')
        .update({
          monto_prestado: Number(cambios.monto),
          cantidad_cuotas: Number(cambios.cantidadCuotas),
          valor_cuota: Number(cambios.valorCuota),
          frecuencia: cambios.frecuencia,
          fecha_inicio: cambios.fechaInicio,
        })
        .eq('id', prestamoId);

      if (updateError) throw updateError;

      // Find the last paid cuota
      const ultimaCuotaPagada = cuotasActuales.filter((c) => c.pagada).sort((a, b) => b.numero - a.numero)[0];

      // Delete existing unpaid cuotas
      const { error: deleteError } = await supabase
        .from('cuotas')
        .delete()
        .eq('prestamo_id', prestamoId)
        .eq('pagada', false);

      if (deleteError) throw deleteError;

      // Calculate the starting number for new cuotas
      const ultimoNumeroPagado = ultimaCuotaPagada ? ultimaCuotaPagada.numero : 0;
      const nuevasCuotasNeeded = Number(cambios.cantidadCuotas) - ultimoNumeroPagado;

      // Calculate the starting date for new cuotas
      let fechaInicioNuevasCuotas = cambios.fechaInicio;

      // If user changed the start date, use it. Otherwise calculate from last paid cuota
      const fechaInicioCambio = cambios.fechaInicio;
      const fechaInicioOriginal = prestamo.fecha_inicio;

      if (ultimaCuotaPagada && fechaInicioCambio === fechaInicioOriginal) {
        // User didn't change the start date, calculate from last payment
        const fechaReferencia = ultimaCuotaPagada.fecha_pago || ultimaCuotaPagada.fecha_vencimiento;
        fechaInicioNuevasCuotas = calcularSiguienteFecha(fechaReferencia, cambios.frecuencia);
      } else if (ultimaCuotaPagada) {
        // User changed the start date, but we still need to start from where payments ended
        // Use the first change date only if it's after the last payment
        const [yearPago, monthPago, dayPago] = (ultimaCuotaPagada.fecha_pago || ultimaCuotaPagada.fecha_vencimiento).split('-').map(Number);
        const [yearCambio, monthCambio, dayCambio] = fechaInicioCambio.split('-').map(Number);
        const fechaPago = new Date(yearPago, monthPago - 1, dayPago);
        const fechaCambio = new Date(yearCambio, monthCambio - 1, dayCambio);

        if (fechaCambio > fechaPago) {
          fechaInicioNuevasCuotas = fechaInicioCambio;
        } else {
          // If new start date is before or equal to last payment, calculate from payment
          const fechaReferencia = ultimaCuotaPagada.fecha_pago || ultimaCuotaPagada.fecha_vencimiento;
          fechaInicioNuevasCuotas = calcularSiguienteFecha(fechaReferencia, cambios.frecuencia);
        }
      }

      // Generate new unpaid cuotas
      const cuotasData = [];
      let fechaActual = fechaInicioNuevasCuotas;
      for (let i = ultimoNumeroPagado + 1; i <= Number(cambios.cantidadCuotas); i++) {
        cuotasData.push({
          prestamo_id: prestamoId,
          numero: i,
          fecha_vencimiento: fechaActual,
          monto: Number(cambios.valorCuota),
          pagada: false,
        });
        fechaActual = calcularSiguienteFecha(fechaActual, cambios.frecuencia);
      }

      if (cuotasData.length > 0) {
        const { error: insertError } = await supabase
          .from('cuotas')
          .insert(cuotasData);

        if (insertError) throw insertError;
      }

      await loadData();
      setShowEditModal(false);
      showToast('Préstamo modificado ✓');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const undoPayment = async (cuotaId) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('cuotas')
        .update({ pagada: false, fecha_pago: null })
        .eq('id', cuotaId);

      if (error) throw error;

      await loadData();
      setUndoPaymentId(null);
      showToast('Pago deshecho ✓');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const dateLabel = (() => {
    const s = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  const filtered = clients.filter((c) => c.nombre.toLowerCase().includes(query.toLowerCase()));

  const dueToday = [];
  clients.forEach((c) => {
    const today = getToday();
    const clientPrestamos = Object.values(prestamoMap).filter((p) => p.cliente_id === c.id);

    clientPrestamos.forEach((prestamo) => {
      const prestamosCuotas = cuotasPorCliente[prestamo.id] || [];
      const cuotasVencidasHoy = prestamosCuotas.filter((q) => q.fecha_vencimiento === today && !q.pagada);

      if (cuotasVencidasHoy.length > 0) {
        const totalCuotasHoy = cuotasVencidasHoy.reduce((sum, q) => sum + parseFloat(q.monto || 0), 0);
        dueToday.push({
          clienteId: c.id,
          cliente: c,
          prestamo: prestamo,
          totalCuotasHoy: totalCuotasHoy
        });
      }
    });
  });

  const stats = (() => {
    const allCuotas = Object.values(cuotasPorCliente).flat();
    const totalPrestado = clients.reduce((a, c) => {
      const prestamos = clients.filter(() => true);
      return a;
    }, 0);

    let totalAmount = 0;
    Object.values(cuotasPorCliente).forEach((cuotas) => {
      const maxMonto = Math.max(...cuotas.map((c) => c.monto), 0);
      const cantCuotas = cuotas.length;
      totalAmount += maxMonto * cantCuotas;
    });

    const pagosHoyCount = allCuotas.filter((c) => c.fecha_pago === getToday()).length;

    const atrasados = clients.filter((c) => {
      const clientPrestamos = Object.values(prestamoMap).filter((p) => p.cliente_id === c.id);
      const clientCuotas = clientPrestamos.flatMap((p) => cuotasPorCliente[p.id] || []);
      return clientCuotas.some((q) => !q.pagada && new Date(q.fecha_vencimiento) < new Date());
    }).length;

    const carteraPendiente = allCuotas
      .filter((c) => !c.pagada)
      .reduce((a, c) => a + c.monto, 0);

    return {
      totalPrestado: totalAmount || 0,
      clientes: clients.length,
      pagosHoy: pagosHoyCount || 0,
      atrasados,
      carteraPendiente,
    };
  })();

  const selected = clients.find((c) => c.id === selectedId) || (selectedPrestamoId ? clients.find((c) => prestamoMap[selectedPrestamoId]?.cliente_id === c.id) : null);
  const prestamoTarget = clients.find((c) => c.id === prestamoTargetId);
  const pdfClient = clients.find((c) => c.id === pdfPreviewId);
  const deleteTarget = clients.find((c) => c.id === deleteTargetId);

  const selectedPrestamo = selectedPrestamoId || (selected ? (() => {
    const prestamoIds = Object.keys(prestamoMap).filter((pid) => prestamoMap[pid].cliente_id === selected.id);
    if (prestamoIds.length === 0) return null;
    const prestamosConCuotas = prestamoIds.filter((pid) => (cuotasPorCliente[pid] || []).length > 0);
    const result = prestamosConCuotas.length > 0 ? prestamosConCuotas[prestamosConCuotas.length - 1] : prestamoIds[prestamoIds.length - 1];
    if (screen === 'pago') console.log('selectedPrestamo calculation:', { prestamoIds, prestamosConCuotas, result, cuotas: cuotasPorCliente[result]?.length });
    return result;
  })() : null);

  const pdfPrestamo = selectedPrestamo;

  const overdueClients = clients.filter((c) => {
    const clientPrestamos = Object.values(prestamoMap).filter((p) => p.cliente_id === c.id);
    const clientCuotas = clientPrestamos.flatMap((p) => cuotasPorCliente[p.id] || []);
    return clientCuotas.some((q) => !q.pagada && new Date(q.fecha_vencimiento) < new Date());
  });

  const enriquecerClientes = (clientList) => {
    return clientList.map((c) => {
      const clientPrestamos = Object.values(prestamoMap).filter((p) => p.cliente_id === c.id);
      const allClientCuotas = clientPrestamos.flatMap((p) => cuotasPorCliente[p.id] || []);
      const completed = allClientCuotas.length > 0 && allClientCuotas.every((cu) => cu.pagada);
      let badge = { cls: 'pending', text: 'Pendiente' };
      if (completed) badge = { cls: 'paid', text: 'Completado' };
      return { ...c, badgeStatus: badge, streak: [null, null, null, null, null, null, null] };
    });
  };

  const enrichedClients = enriquecerClientes(clients).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-AR'));
  const enrichedDueToday = dueToday.map((item) => {
    const allPrestamosCuotas = cuotasPorCliente[item.prestamo.id] || [];
    const completed = allPrestamosCuotas.length > 0 && allPrestamosCuotas.every((cu) => cu.pagada);
    let badge = { cls: 'pending', text: 'Pendiente' };
    if (completed) badge = { cls: 'paid', text: 'Completado' };
    return {
      ...item.cliente,
      valor_cuota: item.totalCuotasHoy,
      badgeStatus: badge,
      streak: [null, null, null, null, null, null, null],
      prestamo_id: item.prestamo.id
    };
  });
  const enrichedOverdue = enriquecerClientes(overdueClients);

  return (
    <div className="sd-root">
      {!loggedIn ? (
        <LoginView onLogin={() => { loadData(); }} />
      ) : (
        <div className="flex min-h-screen">
          <Sidebar screen={screen} goTo={goTo} onLogout={logout} />
          <div className="flex-1 flex flex-col min-h-screen">
            <TopBar screen={screen} goBack={goBack} dateLabel={dateLabel} />
            <main className="flex-1 sd-main-content">
              {screen === 'dashboard' && (
                <Dashboard
                  clients={enrichedClients}
                  dueToday={enrichedDueToday}
                  filtered={enrichedClients.filter((c) => c.nombre.toLowerCase().includes(query.toLowerCase()))}
                  query={query}
                  setQuery={setQuery}
                  openPago={openPago}
                  openPagoFromPrestamo={openPagoFromPrestamo}
                  goToClientePrestamos={goToClientePrestamos}
                  goTo={goTo}
                  stats={stats}
                  onOpenAtrasados={() => setShowAtrasados(true)}
                />
              )}
              {screen === 'agregar' && <Agregar goTo={goTo} />}
              {screen === 'prestamos' && selected && (
                <PrestamosCliente
                  client={selected}
                  prestamos={prestamos}
                  prestamoMap={prestamoMap}
                  cuotasPorCliente={cuotasPorCliente}
                  onSelectPrestamo={openPagoFromPrestamo}
                  onBack={() => goTo('dashboard')}
                  onDeleteClient={() => setDeleteTargetId(selected.id)}
                />
              )}
              {screen === 'clientesPrestamos' && selected && (
                <PrestamosCliente
                  client={selected}
                  prestamos={prestamos}
                  prestamoMap={prestamoMap}
                  cuotasPorCliente={cuotasPorCliente}
                  onSelectPrestamo={openPagoFromPrestamo}
                  onBack={() => goTo('dashboard')}
                  onDeleteClient={() => setDeleteTargetId(selected.id)}
                />
              )}
              {screen === 'nuevoCliente' && (
                <NuevoClienteForm
                  onCancel={() => goTo('agregar')}
                  onSave={() => { showToast('¡Perfecto! Cliente cargado ✓'); loadData(); goTo('dashboard'); }}
                  showError={showToast}
                />
              )}
              {screen === 'nuevoPrestamo' && (
                <NuevoPrestamoPicker clients={enrichedClients} onPick={(id) => { setPrestamoTargetId(id); goTo('nuevoPrestamoForm'); }} />
              )}
              {screen === 'nuevoPrestamoForm' && prestamoTarget && (
                <NuevoPrestamoForm
                  client={prestamoTarget}
                  onCancel={() => goTo('nuevoPrestamo')}
                  onSave={() => { showToast('Préstamo agregado ✓'); loadData(); goTo('dashboard'); }}
                />
              )}
              {screen === 'pago' && selected && (
                <PagoScreen
                  client={selected}
                  prestamo={selectedPrestamo ? prestamoMap[selectedPrestamo] : null}
                  cuotas={selectedPrestamo ? (cuotasPorCliente[selectedPrestamo] || []) : []}
                  onConfirm={() => confirmPago(selected.id, selectedPrestamo)}
                  onDownload={() => setPdfPreviewId(selected.id)}
                  onDelete={() => deletePrestamo(selectedPrestamo)}
                  onModify={() => { setEditingPrestamoId(selectedPrestamo); setShowEditModal(true); }}
                  onUndoPayment={(cuotaId) => setUndoPaymentId(cuotaId)}
                  loading={loading}
                />
              )}
              {screen === 'clientes' && (
                <PlanillaClientes
                  clients={clients}
                  prestamos={prestamoMap}
                  cuotasPorCliente={cuotasPorCliente}
                  onDeleteClient={(id) => setDeleteTargetId(id)}
                />
              )}
              {screen === 'historial' && (
                <HistorialMensual
                  prestamos={prestamoMap}
                  cuotasPorCliente={cuotasPorCliente}
                />
              )}
            </main>
          </div>
          <BottomNav screen={screen} goTo={goTo} onLogout={logout} />
        </div>
      )}
      {pdfClient && (
        <PdfPreviewModal
          client={pdfClient}
          prestamo={pdfPrestamo ? prestamoMap[pdfPrestamo] : null}
          cuotas={pdfPrestamo ? (cuotasPorCliente[pdfPrestamo] || []) : []}
          onClose={() => setPdfPreviewId(null)}
          onDownload={() => { descargarPDF(pdfSheetRef, pdfClient.nombre); showToast('PDF descargado ✓'); setPdfPreviewId(null); }}
          pdfSheetRef={pdfSheetRef}
        />
      )}
      {showAtrasados && (
        <OverdueModal
          clients={enrichedOverdue}
          onClose={() => setShowAtrasados(false)}
          onSelect={(id) => { setShowAtrasados(false); openPago(id); }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          client={deleteTarget}
          onCancel={() => setDeleteTargetId(null)}
          onConfirm={() => deleteClient(deleteTarget.id)}
          loading={loading}
        />
      )}
      {showEditModal && editingPrestamoId && (
        <EditarPrestamoModal
          prestamo={prestamoMap[editingPrestamoId]}
          client={selected}
          cuotas={cuotasPorCliente[editingPrestamoId] || []}
          onCancel={() => setShowEditModal(false)}
          onConfirm={(cambios) => modificarPrestamo(editingPrestamoId, cambios)}
          loading={loading}
        />
      )}
      {undoPaymentId && (() => {
        const allCuotas = Object.values(cuotasPorCliente).flat();
        const cuota = allCuotas.find((c) => c.id === undoPaymentId);
        return (
          <UndoPaymentModal
            client={selected}
            cuota={cuota}
            onCancel={() => setUndoPaymentId(null)}
            onConfirm={() => undoPayment(undoPaymentId)}
            loading={loading}
          />
        );
      })()}
      {toast && <div className="sd-toast">{toast}</div>}
    </div>
  );
}
