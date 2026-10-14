import { useEffect, useMemo, useState } from 'react';
import AuthScreen from './AuthScreen.jsx';
import CustomerPortal from './CustomerPortal.jsx';
import { formatMoney } from './format.js';

const iconPaths = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
  box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5M3 8v8l9 5 9-5V8M12 13v8" /></>,
  quote: <><path d="M8 3h8l4 4v14H4V3h4Z" /><path d="M8 3v5h8V3M8 13h8M8 17h5" /></>,
  receipt: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" /><path d="M8 8h8M8 12h8M8 16h4" /></>,
  people: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  sliders: <><path d="M4 7h16M7 12h10m-7 5h4" /><circle cx="8" cy="7" r="1.5" /><circle cx="15" cy="12" r="1.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  chevron: <><path d="m9 18 6-6-6-6" /></>,
  pump: <><path d="M4 9h11v9H4zM15 12h3l2 2v4h-5M7 9V6h5v3M7 18v2m6-2v2m6-4h1" /><circle cx="8" cy="13.5" r="1.5" /></>,
  bearing: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  valve: <><path d="M4 8h16M4 16h16M12 8v8M8 8l4-5 4 5m-8 8 4 5 4-5" /></>,
  seal: <><path d="M4 7h16v10H4z" /><path d="M7 10h10v4H7zM4 12H2m20 0h-2" /></>,
  motor: <><rect x="4" y="7" width="13" height="10" rx="2" /><path d="M17 10h3v4h-3M8 7V5m5 2V5M8 17v2m5-2v2" /></>,
  coupling: <><path d="M3 9h5v6H3zm13 0h5v6h-5zM8 10h3v4H8zm5 0h3v4h-3z" /></>,
  filter: <><path d="M5 4h14l-2 16H7L5 4Z" /><path d="M8 8h8M8 12h8M8 16h8" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.7-1.4-2.4L7.1 15a8 8 0 0 1-.1-2l-1.5-1 1.4-2.4 1.8.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.6 1.4 2.4-1.5 1a8 8 0 0 1 .2 2Z" /></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  sync: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2" /></>,
  trend: <><path d="m3 17 6-6 4 4 8-9" /><path d="M15 6h6v6" /></>,
  cart: <><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M2 3h2l2.6 12.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L22 8H5" /></>,
  plusSmall: <><path d="M12 5v14M5 12h14" /></>,
  subtract: <><path d="M5 12h14" /></>,
  logout: <><path d="M10 17l5-5-5-5m5 5H3m9-9h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-8" /></>
};

function Icon({ name, size = 20, className = '' }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name] || iconPaths.box}</svg>;
}

const navItems = [
  { id: 'overview', label: 'Overview', icon: 'grid', section: 'workspace' },
  { id: 'products', label: 'Product catalogue', icon: 'box', section: 'workspace' },
  { id: 'quotations', label: 'Quotations', icon: 'quote', section: 'workspace' },
  { id: 'invoices', label: 'Invoices', icon: 'receipt', section: 'workspace' },
  { id: 'sales-team', label: 'Sales team', icon: 'people', section: 'workspace' }
];

function PartIllustration({ product }) {
  return (
    <div className={`part-art part-art-${product.accent}`} aria-hidden="true">
      <div className="art-orbit art-orbit-one" />
      <div className="art-orbit art-orbit-two" />
      <div className="art-grid" />
      <Icon name={product.icon} size={69} className="part-art-icon" />
      <span className="part-art-code">{product.partNumber.split('-').slice(1).join('-')}</span>
    </div>
  );
}

function Metric({ label, value, note, icon, color }) {
  return (
    <article className="metric-card">
      <div className="metric-topline">
        <span className={`metric-icon metric-icon-${color}`}><Icon name={icon} size={19} /></span>
        <span className="metric-note"><Icon name="trend" size={14} /> {note}</span>
      </div>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
    </article>
  );
}

function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [page, setPage] = useState('overview');
  const [products, setProducts] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [salesRepresentatives, setSalesRepresentatives] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [representativeForm, setRepresentativeForm] = useState({ name: '', email: '' });
  const [representativeSaving, setRepresentativeSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All parts');
  const [sort, setSort] = useState('Featured');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Unable to load the product catalogue.');
    setProducts(await response.json());
  };

  const loadQuotations = async () => {
    const response = await fetch('/api/admin/quotations');
    if (!response.ok) throw new Error('Unable to load quotations.');
    setQuotations(await response.json());
  };

  const loadSalesWorkspace = async () => {
    const [representativesResponse, customersResponse] = await Promise.all([
      fetch('/api/admin/sales-representatives'),
      fetch('/api/admin/customers')
    ]);
    if (!representativesResponse.ok || !customersResponse.ok) {
      throw new Error('Unable to load sales representatives and customers.');
    }
    const [representatives, customerList] = await Promise.all([
      representativesResponse.json(),
      customersResponse.json()
    ]);
    setSalesRepresentatives(representatives);
    setCustomers(customerList);
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to restore your sign-in session.');
        const result = await response.json();
        setAuthUser(result.user);
      })
      .catch((requestError) => setAuthError(requestError.message))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!authUser || authUser.role !== 'admin') return undefined;
    Promise.all([loadProducts(), loadQuotations(), loadSalesWorkspace()])
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
    return undefined;
  }, [authUser]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const categories = useMemo(() => ['All parts', ...new Set(products.map((product) => product.category))], [products]);
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = products.filter((product) => (
      (category === 'All parts' || product.category === category) &&
      (!query || `${product.name} ${product.partNumber} ${product.description} ${product.category}`.toLowerCase().includes(query))
    ));
    if (sort === 'Price: low to high') return [...filtered].sort((a, b) => a.price - b.price);
    if (sort === 'Price: high to low') return [...filtered].sort((a, b) => b.price - a.price);
    return filtered;
  }, [products, search, category, sort]);

  const pendingCount = quotations.filter((quotation) => ['New', 'In review', 'Counter offer'].includes(quotation.status)).length;
  const paidCount = quotations.filter((quotation) => ['Paid', 'Invoiced'].includes(quotation.status)).length;

  const createRepresentative = async (event) => {
    event.preventDefault();
    setError('');
    setRepresentativeSaving(true);
    try {
      const response = await fetch('/api/admin/sales-representatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(representativeForm)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to add the representative.');
      setRepresentativeForm({ name: '', email: '' });
      await loadSalesWorkspace();
      setNotice(`${result.name} added to the sales team.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRepresentativeSaving(false);
    }
  };

  const deleteRepresentative = async (representative) => {
    setError('');
    try {
      const response = await fetch(`/api/admin/sales-representatives/${representative.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Unable to remove the representative.');
      }
      await Promise.all([loadSalesWorkspace(), loadQuotations()]);
      setNotice(`${representative.name} removed. Their customers are now unassigned.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const assignRepresentative = async (customer, value) => {
    setError('');
    const salesRepresentativeId = value ? Number(value) : null;
    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/sales-representative`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesRepresentativeId })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to assign the representative.');
      setCustomers((current) => current.map((item) => item.id === customer.id ? {
        ...item,
        salesRepresentativeId: result.salesRepresentativeId,
        salesRepresentative: result.salesRepresentative
      } : item));
      await loadQuotations();
      setNotice(result.salesRepresentative
        ? `${result.salesRepresentative} assigned to ${customer.company}.`
        : `${customer.company} is now unassigned.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateStatus = async (quotation, status) => {
    setError('');
    try {
      const response = await fetch(`/api/admin/quotations/${quotation.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update this quotation.');
      setQuotations((current) => current.map((item) => item.id === result.id ? { ...item, status: result.status } : item));
      setNotice(`${quotation.reference} moved to ${status.toLowerCase()}.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const navTo = (nextPage) => {
    setPage(nextPage);
    setSearch('');
    setError('');
  };

  const pageLabel = {
    overview: 'Overview',
    products: 'Product catalogue',
    quotations: 'Quotations',
    invoices: 'Invoices',
    'sales-team': 'Sales team'
  }[page] || 'Overview';

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthUser(null);
    setPage('overview');
  };

  if (authLoading) {
    return <div className="auth-loading"><span className="brand-mark"><span>W</span></span><p>Opening your W-COM workspace…</p></div>;
  }
  if (!authUser) {
    return <AuthScreen initialError={authError} onAuthenticated={(user) => { setAuthError(''); setAuthUser(user); }} />;
  }
  if (authUser.role === 'customer') {
    return <CustomerPortal user={authUser} onSignOut={signOut} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); navTo('overview'); }}>
          <span className="brand-mark"><span>W</span></span>
          <span className="brand-copy"><strong>W-COM</strong><small>WAHAN COMMERCE</small></span>
        </a>
        <div className="workspace-switch">
          <span className="workspace-monogram">WE</span>
          <span className="workspace-info"><strong>Wahan Engineering</strong><small>Business workspace</small></span>
          <Icon name="chevron" size={16} className="workspace-chevron" />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button key={item.id} className={`nav-item ${page === item.id ? 'nav-item-active' : ''}`} onClick={() => navTo(item.id)}>
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
              {item.id === 'quotations' && pendingCount > 0 && <span className="nav-count">{pendingCount}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <section className="integration-card">
          <div className="integration-head"><span className="integration-pulse" /> DATA CONNECTIONS</div>
          <div className="connection-row"><span className="connection-symbol odoo-symbol">O</span><span>Odoo ERP</span><span className="connection-tag">PLANNED</span></div>
          <div className="connection-row"><span className="connection-symbol sheets-symbol"><span /></span><span>Google Sheets</span><span className="connection-tag">PLANNED</span></div>
          <p>External integrations are not connected in this demo.</p>
        </section>
        <button className="profile-button" onClick={signOut}>
          <span className="profile-avatar">AD</span>
          <span className="profile-copy"><strong>{authUser.email}</strong><small>Administrator · Sign out</small></span>
          <Icon name="logout" size={17} className="profile-more" />
        </button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Wahan Engineering</span><Icon name="chevron" size={14} /><strong>{pageLabel}</strong></div>
          <div className="topbar-actions">
            <label className="top-search">
              <Icon name="search" size={17} />
              <input value={search} onChange={(event) => { setSearch(event.target.value); if (page !== 'products') setPage('products'); }} placeholder="Search parts, part numbers..." aria-label="Search parts" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice('You’re all caught up.')}>
              <Icon name="bell" size={19} /><span className="notification-dot" />
            </button>
            <button className="top-avatar" aria-label="Wahan Engineering profile">WE</button>
          </div>
        </header>

        <div className="page-content">
          {error && <div className="alert alert-error" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><Icon name="close" size={16} /></button></div>}

          {page === 'overview' && (
            <>
              <section className="welcome-row">
                <div><div className="eyebrow"><span className="eyebrow-dot" /> WAHAN ENGINEERING CORPORATION</div><h1>Good morning, <span>Wahan team</span></h1><p>Everything you need to find parts and move business forward.</p></div>
                <button className="button button-primary" onClick={() => navTo('quotations')}><Icon name="quote" size={17} /> Review quotations</button>
              </section>
              <section className="hero-banner">
                <div className="hero-content">
                  <span className="hero-kicker"><span /> W-COM CATALOGUE PREVIEW</span>
                  <h2>The right parts.<br /><span>Right when you need them.</span></h2>
                  <p>Explore Wahan’s catalogue and send your requirements to our team in just a few clicks.</p>
                  <button className="button hero-button" onClick={() => navTo('products')}>Explore catalogue <Icon name="arrow" size={16} /></button>
                </div>
                <div className="hero-visual" aria-hidden="true">
                  <div className="hero-visual-glow" />
                  <div className="hero-ring hero-ring-outer" />
                  <div className="hero-ring hero-ring-inner" />
                  <div className="hero-hub"><span>W</span><small>WAHAN</small></div>
                  <div className="hero-orbit-chip chip-one"><Icon name="pump" size={20} /></div>
                  <div className="hero-orbit-chip chip-two"><Icon name="bearing" size={19} /></div>
                  <div className="hero-orbit-chip chip-three"><Icon name="valve" size={19} /></div>
                  <div className="hero-orbit-chip chip-four"><Icon name="gear" size={18} /></div>
                  <div className="hero-spark spark-one" /><div className="hero-spark spark-two" /><div className="hero-spark spark-three" />
                </div>
                <div className="hero-bottom"><span><i /> SAMPLE PRODUCT CATALOGUE</span><span>BUILT FOR BETTER BUSINESS <b>↗</b></span></div>
              </section>
              <section className="metrics-grid">
                <Metric label="Catalogue parts" value={products.length.toLocaleString('en-IN')} note="Available to explore" icon="box" color="blue" />
                <Metric label="Open quotations" value={pendingCount.toString().padStart(2, '0')} note="Needs attention" icon="quote" color="amber" />
                <Metric label="Completed orders" value={paidCount.toString().padStart(2, '0')} note="Paid or invoiced" icon="check" color="green" />
                <Metric label="Planned connections" value="02" note="Odoo · Sheets" icon="sync" color="violet" />
              </section>
              <section className="section-heading"><div><span className="section-eyebrow">THE CATALOGUE</span><h2>Popular parts</h2><p>Quality components, ready to quote.</p></div><button className="text-link" onClick={() => navTo('products')}>View all parts <Icon name="arrow" size={16} /></button></section>
              <ProductGrid products={products.slice(0, 4)} loading={loading} />
              <section className="workflow-strip"><div className="workflow-copy"><span className="workflow-spark">✳</span><span><strong>Simple from search to send.</strong><small>Find a part. Build your list. We’ll take it from there.</small></span></div><div className="workflow-steps"><span><i>01</i> Discover</span><b>—</b><span><i>02</i> Request</span><b>—</b><span><i>03</i> Connect</span></div></section>
            </>
          )}

          {page === 'products' && (
            <>
              <section className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> PARTS & COMPONENTS</div><h1>Product catalogue</h1><p>Find the right components for your next project.</p></div></section>
              <section className="catalogue-toolbar">
                <div className="catalogue-search"><Icon name="search" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, part number, or keyword..." aria-label="Search catalogue" /></div>
                <div className="filter-control"><Icon name="sliders" size={17} /><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
                <select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort parts"><option>Featured</option><option>Price: low to high</option><option>Price: high to low</option></select>
              </section>
              <div className="catalogue-result-line"><span><strong>{visibleProducts.length}</strong> parts found</span><span><i /> SAMPLE INVENTORY</span></div>
              <ProductGrid products={visibleProducts} loading={loading} />
              {!loading && visibleProducts.length === 0 && <div className="empty-state"><span className="empty-icon"><Icon name="search" size={24} /></span><h3>No matching parts</h3><p>Try another search or choose a different category.</p><button className="text-link" onClick={() => { setSearch(''); setCategory('All parts'); }}>Clear filters <Icon name="arrow" size={15} /></button></div>}
            </>
          )}

          {page === 'quotations' && (
            <>
              <section className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> SALES WORKSPACE</div><h1>Quotations</h1><p>Review incoming requests and keep every conversation moving.</p></div><span className="overview-date"><Icon name="clock" size={16} /> {pendingCount} awaiting action</span></section>
              <div className="table-card">
                <div className="table-heading"><div><h2>All requests</h2><p>Quotation requests submitted through W-COM.</p></div><span className="table-total">{quotations.length} TOTAL</span></div>
                {quotations.length === 0 ? <div className="empty-state table-empty"><span className="empty-icon"><Icon name="quote" size={23} /></span><h3>No requests yet</h3><p>New customer quotation requests will appear here.</p><button className="text-link" onClick={() => navTo('products')}>Browse catalogue <Icon name="arrow" size={15} /></button></div> : (
                  <div className="quote-list">
                    {quotations.map((quotation) => (
                      <article className="quote-row" key={quotation.id}>
                        <div className="quote-reference"><span className="quote-doc"><Icon name="quote" size={18} /></span><span><strong>{quotation.reference}</strong><small>{new Date(`${quotation.createdAt.replace(' ', 'T')}Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</small></span></div>
                        <div className="quote-customer"><strong>{quotation.company || quotation.customerName}</strong><small>{quotation.email} · {quotation.gstNo || 'Legacy request'}</small></div>
                        <div className="quote-part-count"><strong>{quotation.items.reduce((sum, item) => sum + item.quantity, 0)} parts</strong><small>{quotation.items.length} line items</small></div>
                        <div className="quote-amount">{formatMoney(quotation.total)}<small>{quotation.paymentDays === 0 ? 'Immediate' : `${quotation.paymentDays} days`}</small></div>
                        <div className="quote-representative">{quotation.salesRepresentative || 'Unassigned'}</div>
                        <StatusBadge status={quotation.status} />
                        <select className="status-select" aria-label={`Update ${quotation.reference} status`} value={quotation.status} onChange={(event) => updateStatus(quotation, event.target.value)}>{['New', 'In review', 'Quoted', 'Counter offer', 'Paid', 'Invoiced'].map((status) => <option key={status}>{status}</option>)}</select>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {page === 'invoices' && (
            <>
              <section className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> ACCOUNTS</div><h1>Invoices</h1><p>Keep track of paid quotations ready for invoice conversion.</p></div></section>
              <div className="table-card">
                <div className="table-heading"><div><h2>Invoice-ready orders</h2><p>Mark a paid quotation as invoiced in the quotations workspace.</p></div><span className="table-total">{quotations.filter((quotation) => quotation.status === 'Paid' || quotation.status === 'Invoiced').length} ORDERS</span></div>
                {quotations.filter((quotation) => quotation.status === 'Paid' || quotation.status === 'Invoiced').length === 0 ? <div className="empty-state table-empty"><span className="empty-icon"><Icon name="receipt" size={23} /></span><h3>No invoices to show</h3><p>Quotations marked as paid will appear here for invoice conversion.</p><button className="text-link" onClick={() => navTo('quotations')}>View quotations <Icon name="arrow" size={15} /></button></div> : (
                  <div className="quote-list">
                    {quotations.filter((quotation) => quotation.status === 'Paid' || quotation.status === 'Invoiced').map((quotation) => <article className="quote-row" key={quotation.id}>
                      <div className="quote-reference"><span className="quote-doc invoice-doc"><Icon name="receipt" size={18} /></span><span><strong>{quotation.reference}</strong><small>{new Date(`${quotation.createdAt.replace(' ', 'T')}Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</small></span></div>
                      <div className="quote-customer"><strong>{quotation.customerName}</strong><small>{quotation.company || quotation.email}</small></div>
                      <div className="quote-part-count"><strong>{quotation.items.reduce((sum, item) => sum + item.quantity, 0)} parts</strong><small>{quotation.items.length} line items</small></div>
                      <div className="quote-amount">{formatMoney(quotation.total)}</div>
                      <StatusBadge status={quotation.status} />
                      {quotation.status === 'Paid' ? <button className="button button-small" onClick={() => updateStatus(quotation, 'Invoiced')}>Convert to invoice <Icon name="arrow" size={14} /></button> : <span className="invoice-created"><Icon name="check" size={15} /> Invoiced</span>}
                    </article>)}
                  </div>
                )}
              </div>
              <div className="invoice-note"><Icon name="receipt" size={18} /><span><strong>PDF and delivery integrations</strong><small>PDF generation, email, and WhatsApp delivery can be added when those service connections are configured.</small></span></div>
            </>
          )}

          {page === 'sales-team' && (
            <>
              <section className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> CUSTOMER ASSIGNMENTS</div><h1>Sales team</h1><p>Manage representatives and assign an owner to each customer.</p></div><span className="overview-date"><Icon name="people" size={16} /> {salesRepresentatives.length} representatives</span></section>
              <section className="sales-layout">
                <div className="table-card sales-team-card">
                  <div className="table-heading"><div><h2>Sales representatives</h2><p>Add and manage your customer-facing team.</p></div><span className="table-total">{salesRepresentatives.length} ACTIVE</span></div>
                  <form className="representative-form" onSubmit={createRepresentative}>
                    <label className="form-field"><span>Representative name</span><input required minLength="2" maxLength="100" value={representativeForm.name} onChange={(event) => setRepresentativeForm({ ...representativeForm, name: event.target.value })} placeholder="e.g. Priya Shah" /></label>
                    <label className="form-field"><span>Work email</span><input required type="email" maxLength="254" value={representativeForm.email} onChange={(event) => setRepresentativeForm({ ...representativeForm, email: event.target.value })} placeholder="priya@wahan.com" /></label>
                    <button className="button button-primary" type="submit" disabled={representativeSaving}><Icon name="plus" size={16} /> {representativeSaving ? 'Adding…' : 'Add representative'}</button>
                  </form>
                  {salesRepresentatives.length === 0 ? <div className="sales-empty">No representatives added yet. Add a representative to assign customer accounts.</div> : (
                    <div className="representative-list">{salesRepresentatives.map((representative) => (
                      <article className="representative-row" key={representative.id}>
                        <span className="representative-avatar">{representative.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
                        <span className="representative-info"><strong>{representative.name}</strong><small>{representative.email}</small></span>
                        <span className="representative-customer-count">{customers.filter((customer) => customer.salesRepresentativeId === representative.id).length} customers</span>
                        <button className="remove-representative" onClick={() => deleteRepresentative(representative)} aria-label={`Delete ${representative.name}`} title="Delete representative"><Icon name="close" size={17} /></button>
                      </article>
                    ))}</div>
                  )}
                </div>
                <div className="table-card customer-assignment-card">
                  <div className="table-heading"><div><h2>Customer assignments</h2><p>Assign representatives to registered customer GST numbers.</p></div><span className="table-total">{customers.length} CUSTOMERS</span></div>
                  {customers.length === 0 ? <div className="empty-state table-empty"><span className="empty-icon"><Icon name="people" size={23} /></span><h3>No customers yet</h3><p>Customers appear here after their first quotation request.</p></div> : (
                    <div className="customer-assignment-list">{customers.map((customer) => (
                      <article className="customer-assignment-row" key={customer.id}>
                        <div className="assignment-customer"><strong>{customer.company}</strong><small>GST {customer.gstNo} · {customer.email} · {customer.phone}</small></div>
                        <span className="assignment-quotes">{customer.quotationCount} requests</span>
                        <label className="assignment-select-label"><span className="sr-only">Assign representative for {customer.company}</span><select value={customer.salesRepresentativeId || ''} onChange={(event) => assignRepresentative(customer, event.target.value)} aria-label={`Assign sales representative to ${customer.company}`}><option value="">Unassigned</option>{salesRepresentatives.map((representative) => <option key={representative.id} value={representative.id}>{representative.name}</option>)}</select></label>
                      </article>
                    ))}</div>
                  )}
                </div>
              </section>
            </>
          )}
          <footer className="page-footer"><span>© 2025 Wahan Engineering Corporation</span><span><i /> BUSINESS DATA, BETTER CONNECTED</span></footer>
        </div>
      </main>

      {notice && <div className="toast" role="status"><span className="toast-check"><Icon name="check" size={15} /></span>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message"><Icon name="close" size={15} /></button></div>}
    </div>
  );
}

function ProductGrid({ products, loading }) {
  if (loading) return <div className="product-grid">{[1, 2, 3, 4].map((number) => <div className="product-skeleton" key={number}><div /><span /><i /></div>)}</div>;
  return <div className="product-grid">{products.map((product, index) => (
    <article className="product-card" key={product.id}>
      <div className="product-image-wrap"><PartIllustration product={product} /><span className="product-position">0{index + 1}</span></div>
      <div className="product-details"><div className="product-category">{product.category}</div><h3>{product.name}</h3><p className="product-part-number">{product.partNumber}</p><div className="product-card-bottom"><span className="product-price">{formatMoney(product.price)}<small> / unit</small></span><span className={`stock-pill ${product.stock > 0 ? 'stock-in' : 'stock-out'}`}><i /> {product.stock > 0 ? `${product.stock} in stock` : 'Contact us'}</span></div></div>
    </article>
  ))}</div>;
}

function StatusBadge({ status }) {
  const statusClass = status.toLowerCase().replace(' ', '-');
  return <span className={`status-badge status-${statusClass}`}><i /> {status}</span>;
}

export { Icon, ProductGrid, StatusBadge };
export default App;
