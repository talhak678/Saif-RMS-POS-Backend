import Link from "next/link";

export default function Home() {
  const modules = [
    { name: "Auth", endpoints: ["/api/auth/login", "/api/auth/register", "/api/auth/logout"], color: "bg-blue-500" },
    { name: "Users & RBAC", endpoints: ["/api/users", "/api/roles", "/api/permissions"], color: "bg-purple-500" },
    { name: "Multi-Tenancy", endpoints: ["/api/restaurants", "/api/branches", "/api/settings"], color: "bg-amber-500" },
    { name: "Catalog", endpoints: ["/api/categories", "/api/menu-items"], color: "bg-emerald-500" },
    { name: "Inventory", endpoints: ["/api/ingredients", "/api/stocks", "/api/recipes"], color: "bg-rose-500" },
    { name: "Sales & POS", endpoints: ["/api/orders", "/api/payments"], color: "bg-sky-500" },
    { name: "Customers", endpoints: ["/api/customers", "/api/loyalty-transactions"], color: "bg-indigo-500" },
    { name: "Marketing", endpoints: ["/api/marketing/discounts", "/api/marketing/reviews", "/api/cms/banners"], color: "bg-pink-500" },
    { name: "Delivery", endpoints: ["/api/riders", "/api/notifications"], color: "bg-orange-500" },
    { name: "Operations", endpoints: ["/api/reservations", "/api/dashboard", "/api/cms/faq"], color: "bg-cyan-500" },
  ];

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-mono selection:bg-primary/30">
      {/* Header Section */}
      <header className="max-w-7xl mx-auto mb-20 border-b border-white/5 pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 bg-primary text-black text-xs font-black rounded uppercase">Production</span>
              <span className="text-zinc-500 text-xs">v1.2.0</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic">
              Saif <span className="text-primary italic">Engine</span>
            </h1>
            <p className="text-zinc-500 mt-2 max-w-xl text-sm leading-relaxed">
              Core Backend Infrastructure for Restaurant Management & POS.
              Enterprise-grade isolation logic with cross-module security layers.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/api/dashboard" className="px-6 py-3 bg-white text-black font-black uppercase text-xs hover:bg-primary transition-all">
              Explorer Dashboard
            </Link>
            <div className="px-6 py-3 glass-card border-white/10 text-xs font-black uppercase">
              Status: <span className="text-emerald-400">Operational</span>
            </div>
          </div>
        </div>
      </header>

      {/* Architecture Visualizer */}
      <section className="max-w-7xl mx-auto mb-32">
        <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] mb-10">System Architecture & Relations</h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-12 glass-card p-1 bg-white/5 border-white/10 rounded-2xl">
            <div className="bg-[#0a0a0a] rounded-xl p-8 md:p-12 overflow-x-auto">
              <div className="min-w-[800px] flex flex-col items-center space-y-12">

                {/* Level 1: Global */}
                <div className="flex flex-col items-center">
                  <div className="px-8 py-4 border-2 border-primary rounded-xl bg-primary/5 text-primary text-sm font-black uppercase tracking-widest shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                    Super Admin Control Plane
                  </div>
                  <div className="h-10 w-0.5 bg-gradient-to-b from-primary to-white/20"></div>
                </div>

                {/* Level 2: Isolation Layer */}
                <div className="relative flex items-center justify-center w-full px-20">
                  <div className="absolute inset-x-0 h-0.5 bg-white/10 top-1/2 -z-10"></div>
                  <div className="px-10 py-6 glass-card border-white/20 bg-white/5 rounded-2xl text-center group">
                    <div className="text-[10px] text-zinc-500 font-bold mb-1 uppercase">Isolation Boundary</div>
                    <div className="text-xl font-black italic tracking-tight uppercase">Restaurant Tenant</div>
                    <div className="mt-4 flex gap-2 justify-center opacity-60">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    </div>
                  </div>
                </div>

                {/* Level 3: Modules */}
                <div className="grid grid-cols-4 gap-4 w-full">
                  {[
                    { title: "Identity", items: ["Users", "Roles", "Perms"], icon: "👤" },
                    { title: "Physical", items: ["Branches", "Stocks", "Riders"], icon: "🏢" },
                    { title: "Commerce", items: ["Orders", "Payments", "Menu"], icon: "💳" },
                    { title: "Customer", items: ["Loyalty", "Reviews", "Discounts"], icon: "🌟" }
                  ].map((mod, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="h-10 w-0.5 bg-white/10 mb-2"></div>
                      <div className="w-full glass-card p-4 rounded-xl text-center bg-white/[0.02]">
                        <div className="text-lg mb-2">{mod.icon}</div>
                        <div className="text-xs font-black uppercase mb-3 text-white">{mod.title}</div>
                        <div className="flex flex-col gap-1">
                          {mod.items.map(item => (
                            <span key={item} className="text-[9px] text-zinc-500 uppercase tracking-tighter">{item}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* API Index */}
      <section className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em]">API Explorer Registry</h2>
          <span className="text-[10px] text-zinc-600 font-mono italic">Indexing 48 Endpoint Groups...</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module, i) => (
            <div key={i} className="glass-card overflow-hidden group">
              <div className={`h-1 w-full ${module.color} opacity-30 group-hover:opacity-100 transition-opacity`} />
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="font-black text-sm uppercase tracking-wider">{module.name}</h3>
                  <div className={`w-2 h-2 rounded-full ${module.color} shadow-[0_0_10px_currentcolor]`} />
                </div>
                <div className="space-y-2">
                  {module.endpoints.map(ep => (
                    <div key={ep} className="flex items-center justify-between text-[11px] font-mono p-2 bg-white/[0.03] rounded hover:bg-white/[0.07] transition-colors cursor-pointer border border-transparent hover:border-white/5 group/link">
                      <span className="text-zinc-400 truncate mr-2">{ep}</span>
                      <span className="text-zinc-600 group-hover/link:text-primary transition-colors">→</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security Layer Specs */}
      <section className="max-w-7xl mx-auto mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="glass-card p-8 border-l-4 border-l-blue-500">
          <h4 className="text-xs font-black uppercase text-blue-500 mb-4">Auth Strategy</h4>
          <p className="text-xs text-zinc-500 leading-relaxed font-mono">
            Next-Auth (jose) JWT + HttpOnly Cookies. Role-based matching (RBAC) at function level decorator.
          </p>
        </div>
        <div className="glass-card p-8 border-l-4 border-l-rose-500">
          <h4 className="text-xs font-black uppercase text-rose-500 mb-4">Proxy Layer</h4>
          <p className="text-xs text-zinc-500 leading-relaxed font-mono">
            Edge-runtime Proxy.ts interceptor for global CORS, security headers, and request sanitization.
          </p>
        </div>
        <div className="glass-card p-8 border-l-4 border-l-primary">
          <h4 className="text-xs font-black uppercase text-primary mb-4">Multi-Tenancy</h4>
          <p className="text-xs text-zinc-500 leading-relaxed font-mono">
            Prisma-level WHERE clause isolation using `restaurantId` context extracted from secure session tokens.
          </p>
        </div>
      </section>

      <footer className="max-w-7xl mx-auto mt-32 py-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center space-x-2 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-crosshair">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center font-bold text-black text-[10px]">S</div>
          <span className="text-xs font-black tracking-widest uppercase">Saif RMS Engine</span>
        </div>
        <div className="text-[9px] text-zinc-600 uppercase tracking-[0.2em]">
          Optimized for PostgreSQL & Edge Runtime
        </div>
      </footer>
    </main>
  );
}
